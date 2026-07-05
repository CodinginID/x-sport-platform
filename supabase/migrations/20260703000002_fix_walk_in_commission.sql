-- ============================================================
-- Perbaikan komisi walk-in: versi lama masih membaca package_coaches
-- yang sudah di-drop (20260613000007), sehingga walk-in gagal/nol komisi.
-- Samakan dengan attend_booking v4: base = harga paket / jumlah sesi,
-- persen dari coaches.commission_regular_pct / commission_private_pct
-- sesuai package_category; simpan BASE per sesi ke package_price.
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
  v_scount    integer;
  v_cat       text;
  v_pct       numeric;
  v_base      numeric := 0;
  v_amount    numeric := 0;
  v_booking_id uuid;
begin
  -- Validasi member_package aktif dan masih punya sesi
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

  select package_price, session_count, package_category
    into v_pkg_price, v_scount, v_cat
  from packages
  where package_id = v_mp.package_id and studio_id = p_studio_id;

  -- Kurangi sesi
  update member_packages
  set
    remaining_sessions = remaining_sessions - 1,
    status = case
      when remaining_sessions - 1 <= 0 then 'depleted'::mp_status_type
      else 'active'::mp_status_type
    end
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

  -- Komisi coach: formula v4 (paritas attend_booking)
  select case when v_cat = 'pribadi' then commission_private_pct
              else commission_regular_pct end
    into v_pct
  from coaches where coach_id = p_coach_id;

  if coalesce(v_scount, 0) > 0 then
    v_base   := coalesce(v_pkg_price, 0) / v_scount;   -- harga per sesi
    v_amount := v_base * coalesce(v_pct, 0) / 100;
  end if;

  if v_amount > 0 then
    insert into coach_commissions (
      commission_id, studio_id, coach_id, booking_id, member_id,
      package_price, commission_percentage, commission_amount,
      date, created_at
    ) values (
      gen_random_uuid(),
      p_studio_id, p_coach_id, v_booking_id, p_member_id,
      v_base,                                            -- simpan BASE per sesi
      coalesce(v_pct, 0), v_amount,
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
