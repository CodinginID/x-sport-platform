-- ============================================================
-- Walk-in attendance: check-in langsung tanpa booking terlebih dahulu.
-- Membuat booking dengan status 'attended' + mengurangi sesi sekaligus.
-- ============================================================

create or replace function walk_in_attendance(
  p_studio_id        uuid,
  p_member_id        uuid,
  p_member_package_id uuid,
  p_coach_id         uuid,
  p_date             date,
  p_time             text          -- format HH:MM
) returns jsonb
language plpgsql security definer as $$
declare
  v_mp        member_packages%rowtype;
  v_pkg_price numeric;
  v_booking_id uuid;
  v_comm_pct   numeric;
begin
  -- Validasi dan lock member_package
  select * into v_mp
  from member_packages
  where member_package_id = p_member_package_id
    and studio_id          = p_studio_id
    and member_id          = p_member_id
    and status             = 'active'
    and remaining_sessions > 0;

  if not found then
    raise exception 'Paket tidak aktif atau sesi sudah habis';
  end if;

  -- Ambil harga paket untuk referensi di booking
  select package_price into v_pkg_price
  from packages
  where package_id = v_mp.package_id and studio_id = p_studio_id;

  -- Kurangi sesi
  update member_packages
  set
    remaining_sessions = remaining_sessions - 1,
    status = case
      when remaining_sessions - 1 <= 0 then 'depleted'::mp_status_type
      else 'active'::mp_status_type
    end,
    updated_at = now()
  where member_package_id = p_member_package_id;

  -- Buat booking langsung dengan status attended
  v_booking_id := gen_random_uuid();
  insert into bookings (
    booking_id, studio_id, member_id, coach_id, package_id,
    member_package_id, package_price,
    booking_date, booking_time,
    booking_status, created_at, updated_at
  ) values (
    v_booking_id, p_studio_id, p_member_id, p_coach_id, v_mp.package_id,
    p_member_package_id, coalesce(v_pkg_price, 0),
    p_date, p_time::time,
    'attended', now(), now()
  );

  -- Komisi coach jika ada
  select commission_percentage into v_comm_pct
  from package_coaches
  where package_id = v_mp.package_id and coach_id = p_coach_id;

  if v_comm_pct is not null and v_comm_pct > 0 then
    insert into coach_commissions (
      commission_id, studio_id, coach_id, booking_id, member_id,
      package_price, commission_percentage, commission_amount,
      date, created_at
    ) values (
      gen_random_uuid(),
      p_studio_id, p_coach_id, v_booking_id, p_member_id,
      coalesce(v_pkg_price, 0),
      v_comm_pct,
      coalesce(v_pkg_price, 0) * v_comm_pct / 100,
      p_date, now()
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'booking_id', v_booking_id,
    'remaining_sessions', (select remaining_sessions from member_packages where member_package_id = p_member_package_id)
  );
end;
$$;
