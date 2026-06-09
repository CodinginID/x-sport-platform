-- ============================================================
-- Fix: link booking → member_package after payment,
--      block attend_booking when payment not yet done.
-- ============================================================

-- ─── attend_booking: block if not yet paid ───────────────────
create or replace function attend_booking(
  p_booking_id uuid,
  p_studio_id  uuid
) returns jsonb
language plpgsql security definer as $$
declare
  v_booking  bookings%rowtype;
  v_mp       member_packages%rowtype;
  v_comm_pct numeric;
begin
  select * into v_booking
  from bookings
  where booking_id = p_booking_id and studio_id = p_studio_id;
  if not found then
    raise exception 'Booking tidak ditemukan';
  end if;

  -- Guard: payment must be done before attendance
  if v_booking.member_package_id is null then
    raise exception 'Pembayaran belum dilakukan untuk booking ini';
  end if;

  -- Decrement member package sessions
  select * into v_mp
  from member_packages
  where member_package_id = v_booking.member_package_id;

  if found and v_mp.remaining_sessions > 0 then
    update member_packages
    set
      remaining_sessions = v_mp.remaining_sessions - 1,
      status = case
        when v_mp.remaining_sessions - 1 <= 0 then 'depleted'::mp_status_type
        else 'active'::mp_status_type
      end
    where member_package_id = v_booking.member_package_id;
  end if;

  -- Get commission rate
  select commission_percentage into v_comm_pct
  from package_coaches
  where package_id = v_booking.package_id
    and coach_id   = v_booking.coach_id;

  -- Insert commission if applicable
  if v_comm_pct is not null and v_comm_pct > 0 then
    insert into coach_commissions (
      commission_id, studio_id, coach_id, booking_id, member_id,
      package_price, commission_percentage, commission_amount,
      date, created_at
    ) values (
      gen_random_uuid(),
      p_studio_id,
      v_booking.coach_id,
      p_booking_id,
      v_booking.member_id,
      v_booking.package_price,
      v_comm_pct,
      v_booking.package_price * v_comm_pct / 100,
      v_booking.booking_date,
      now()
    );
  end if;

  update bookings
  set booking_status = 'attended', updated_at = now()
  where booking_id = p_booking_id;

  return jsonb_build_object('ok', true);
end;
$$;


-- ─── create_member_payment: link to booking after pay ────────
create or replace function create_member_payment(
  p_studio_id   uuid,
  p_payment     jsonb,
  p_member_package jsonb,
  p_booking_id  uuid DEFAULT NULL
) returns jsonb
language plpgsql security definer as $$
declare
  v_payment_id uuid;
  v_mp_id      uuid;
begin
  v_payment_id := gen_random_uuid();
  v_mp_id      := gen_random_uuid();

  insert into member_payments (
    payment_id, studio_id, payment_date, member_id, package_id,
    amount, payment_method, notes, created_at
  ) values (
    v_payment_id,
    p_studio_id,
    p_payment->>'payment_date',
    (p_payment->>'member_id')::uuid,
    (p_payment->>'package_id')::uuid,
    (p_payment->>'amount')::numeric,
    (p_payment->>'payment_method')::payment_method_type,
    coalesce(p_payment->>'notes', ''),
    now()
  );

  insert into member_packages (
    member_package_id, studio_id, member_id, package_id,
    purchase_date, expired_date,
    total_sessions, remaining_sessions, status, created_at
  ) values (
    v_mp_id,
    p_studio_id,
    (p_member_package->>'member_id')::uuid,
    (p_member_package->>'package_id')::uuid,
    p_member_package->>'purchase_date',
    p_member_package->>'expired_date',
    (p_member_package->>'total_sessions')::integer,
    (p_member_package->>'remaining_sessions')::integer,
    'active'::mp_status_type,
    now()
  );

  -- Link the booking to the newly created member_package
  if p_booking_id is not null then
    update bookings
    set member_package_id = v_mp_id, updated_at = now()
    where booking_id = p_booking_id
      and studio_id  = p_studio_id
      and member_package_id is null;
  end if;

  return jsonb_build_object(
    'ok', true,
    'payment_id', v_payment_id,
    'member_package_id', v_mp_id
  );
end;
$$;
