-- ============================================================
-- SEMENTARA: kembalikan attend_booking ke formula LAMA (v1).
-- Alasan: migration v2 (20260613000003) sudah ter-apply ke DB production,
-- tapi frontend v2 (model assignment-centric) BELUM live. Selama app prod
-- masih versi lama, komisi harus tetap pakai formula lama agar tidak salah hitung.
--
-- Saat frontend v2 sudah di-deploy: buat migration baru yang RE-APPLY isi
-- attend_booking v2 dari 20260613000003 (formula (harga/session_count)×persen
-- + commission_flat untuk paket durasi).
-- ============================================================
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

  if v_booking.member_package_id is null then
    raise exception 'Pembayaran belum dilakukan untuk booking ini';
  end if;

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

  select commission_percentage into v_comm_pct
  from package_coaches
  where package_id = v_booking.package_id
    and coach_id   = v_booking.coach_id;

  if v_comm_pct is not null and v_comm_pct > 0 then
    insert into coach_commissions (
      commission_id, studio_id, coach_id, booking_id, member_id,
      package_price, commission_percentage, commission_amount, date, created_at
    ) values (
      gen_random_uuid(), p_studio_id, v_booking.coach_id, p_booking_id, v_booking.member_id,
      v_booking.package_price, v_comm_pct,
      v_booking.package_price * v_comm_pct / 100,
      v_booking.booking_date, now()
    );
  end if;

  update bookings
  set booking_status = 'attended', updated_at = now()
  where booking_id = p_booking_id;

  return jsonb_build_object('ok', true);
end;
$$;
