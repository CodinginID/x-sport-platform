-- ============================================================
-- attend_booking v2 — komisi model baru.
-- Paket sesi: (package_price / session_count) × commission_percentage/100
-- Paket durasi (session_count null/0): commission_flat (nominal per hadir)
-- Tarif dari package_coaches(package_id, coach_id). Snapshot ke coach_commissions.
-- ============================================================
create or replace function attend_booking(
  p_booking_id uuid,
  p_studio_id  uuid
) returns jsonb
language plpgsql security definer as $$
declare
  v_booking   bookings%rowtype;
  v_mp        member_packages%rowtype;
  v_scount    integer;
  v_pct       numeric;
  v_flat      numeric;
  v_amount    numeric := 0;
begin
  select * into v_booking from bookings
  where booking_id = p_booking_id and studio_id = p_studio_id;
  if not found then raise exception 'Booking tidak ditemukan'; end if;
  if v_booking.member_package_id is null then
    raise exception 'Pembayaran belum dilakukan untuk booking ini';
  end if;

  -- Kurangi sisa sesi (untuk paket berbasis sesi)
  select * into v_mp from member_packages
  where member_package_id = v_booking.member_package_id;
  if found and v_mp.remaining_sessions > 0 then
    update member_packages set
      remaining_sessions = v_mp.remaining_sessions - 1,
      status = case when v_mp.remaining_sessions - 1 <= 0 then 'depleted'::mp_status_type
                    else 'active'::mp_status_type end
    where member_package_id = v_booking.member_package_id;
  end if;

  -- Tarif komisi coach×service
  select session_count into v_scount from packages where package_id = v_booking.package_id;
  select commission_percentage, commission_flat into v_pct, v_flat
  from package_coaches
  where package_id = v_booking.package_id and coach_id = v_booking.coach_id;

  if coalesce(v_scount, 0) > 0 then
    v_amount := (v_booking.package_price / v_scount) * coalesce(v_pct, 0) / 100;
  else
    v_amount := coalesce(v_flat, 0);  -- paket durasi: nominal flat
  end if;

  if v_amount > 0 then
    insert into coach_commissions (
      commission_id, studio_id, coach_id, booking_id, member_id,
      package_price, commission_percentage, commission_amount, date, created_at
    ) values (
      gen_random_uuid(), p_studio_id, v_booking.coach_id, p_booking_id, v_booking.member_id,
      v_booking.package_price, coalesce(v_pct, 0), v_amount, v_booking.booking_date, now()
    );
  end if;

  update bookings set booking_status = 'attended', updated_at = now()
  where booking_id = p_booking_id;
  return jsonb_build_object('ok', true);
end;
$$;
