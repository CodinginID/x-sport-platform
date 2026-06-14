-- ============================================================
-- v4: coach pindah ke SESI (1 sesi = 1 coach). Banyak coach dalam 1 jam =
-- sesi-sesi paralel berbeda, bukan 1 sesi banyak coach.
-- Coach di-set saat buat/edit sesi. Peserta TIDAK pilih coach (ikut coach sesi).
-- ============================================================

-- Coach pada sesi (nullable: bisa ditambahkan saat edit sesi)
alter table training_sessions
  add column if not exists coach_id uuid references coaches(coach_id);

-- register_session_participant: hapus parameter p_coach_id (coach diambil dari sesi).
-- Ganti signature → DROP dulu fungsi lama, lalu CREATE versi baru.
drop function if exists register_session_participant(uuid, uuid, uuid, uuid, numeric, uuid);

create or replace function register_session_participant(
  p_training_session_id uuid,
  p_member_id           uuid,
  p_member_package_id   uuid,
  p_price               numeric,
  p_studio_id           uuid
) returns jsonb
language plpgsql security definer as $$
declare
  v_session    training_sessions%rowtype;
  v_mp         member_packages%rowtype;
  v_count      integer;
  v_booking_id uuid := gen_random_uuid();
begin
  select * into v_session
  from training_sessions
  where training_session_id = p_training_session_id and studio_id = p_studio_id
  for update;
  if not found then raise exception 'Sesi tidak ditemukan'; end if;
  if v_session.status = 'cancelled' then raise exception 'Sesi sudah dibatalkan'; end if;
  if v_session.coach_id is null then raise exception 'Sesi belum punya coach'; end if;

  -- Cegah duplikat member di sesi ini
  select count(*) into v_count from bookings
  where training_session_id = p_training_session_id and member_id = p_member_id
    and booking_status <> 'cancelled';
  if v_count > 0 then raise exception 'Member sudah terdaftar di sesi ini'; end if;

  -- Kapasitas = jumlah member non-cancelled di sesi
  select count(*) into v_count from bookings
  where training_session_id = p_training_session_id and booking_status <> 'cancelled';
  if v_count >= v_session.capacity then raise exception 'Slot sesi sudah penuh'; end if;

  -- member_package milik member tsb, aktif, sisa > 0
  select * into v_mp from member_packages
  where member_package_id = p_member_package_id and studio_id = p_studio_id
    and member_id = p_member_id and status = 'active' and remaining_sessions > 0;
  if not found then raise exception 'Paket member tidak valid / sisa sesi habis'; end if;

  insert into bookings (
    booking_id, studio_id, training_session_id,
    booking_date, booking_time, member_id, coach_id, package_id,
    member_package_id, package_price, booking_status, created_at, updated_at
  ) values (
    v_booking_id, p_studio_id, p_training_session_id,
    v_session.session_date, v_session.session_time, p_member_id, v_session.coach_id, v_mp.package_id,
    p_member_package_id, coalesce(p_price, 0), 'booked', now(), now()
  );

  return jsonb_build_object('ok', true, 'booking_id', v_booking_id);
end;
$$;
