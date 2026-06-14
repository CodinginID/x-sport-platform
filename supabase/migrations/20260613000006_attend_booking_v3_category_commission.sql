-- ============================================================
-- attend_booking v3: komisi = (package_price / session_count) × persen kategori
-- persen dari coaches.commission_regular_pct / commission_private_pct sesuai
-- packages.package_category. TIDAK pakai package_coaches lagi.
-- (JANGAN apply ke prod sampai frontend v3 live.)
-- ============================================================
create or replace function attend_booking(
  p_booking_id uuid,
  p_studio_id  uuid
) returns jsonb
language plpgsql security definer as $$
declare
  v_booking bookings%rowtype;
  v_mp      member_packages%rowtype;
  v_scount  integer;
  v_cat     text;
  v_pct     numeric;
  v_amount  numeric := 0;
begin
  select * into v_booking from bookings
  where booking_id = p_booking_id and studio_id = p_studio_id;
  if not found then raise exception 'Booking tidak ditemukan'; end if;
  if v_booking.member_package_id is null then
    raise exception 'Pembayaran belum dilakukan untuk booking ini';
  end if;

  select * into v_mp from member_packages
  where member_package_id = v_booking.member_package_id;
  if found and v_mp.remaining_sessions > 0 then
    update member_packages set
      remaining_sessions = v_mp.remaining_sessions - 1,
      status = case when v_mp.remaining_sessions - 1 <= 0 then 'depleted'::mp_status_type
                    else 'active'::mp_status_type end
    where member_package_id = v_booking.member_package_id;
  end if;

  select session_count, package_category into v_scount, v_cat
  from packages where package_id = v_booking.package_id;

  select case when v_cat = 'pribadi' then commission_private_pct
              else commission_regular_pct end
    into v_pct
  from coaches where coach_id = v_booking.coach_id;

  if coalesce(v_scount, 0) > 0 then
    v_amount := (v_booking.package_price / v_scount) * coalesce(v_pct, 0) / 100;
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
