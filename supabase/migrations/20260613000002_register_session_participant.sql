-- ============================================================
-- Pendaftaran peserta ke sesi latihan — ATOMIK.
-- Mengunci baris sesi (FOR UPDATE) agar dua admin tidak merebut
-- slot terakhir bersamaan. Mengisi field booking dari sesi & paket
-- sehingga attend_booking (RPC existing) jalan tanpa diubah.
-- ============================================================
create or replace function register_session_participant(
  p_training_session_id uuid,
  p_member_id           uuid,
  p_studio_id           uuid
) returns jsonb
language plpgsql security definer as $$
declare
  v_session   training_sessions%rowtype;
  v_pkg       packages%rowtype;
  v_mp        member_packages%rowtype;
  v_count     integer;
  v_booking_id uuid := gen_random_uuid();
begin
  -- Kunci baris sesi → serialize pendaftaran per sesi
  select * into v_session
  from training_sessions
  where training_session_id = p_training_session_id and studio_id = p_studio_id
  for update;
  if not found then
    raise exception 'Sesi tidak ditemukan';
  end if;
  if v_session.status = 'cancelled' then
    raise exception 'Sesi sudah dibatalkan';
  end if;

  -- Cegah duplikat: member sudah punya slot aktif di sesi ini?
  select count(*) into v_count
  from bookings
  where training_session_id = p_training_session_id
    and member_id = p_member_id
    and booking_status <> 'cancelled';
  if v_count > 0 then
    raise exception 'Member sudah terdaftar di sesi ini';
  end if;

  -- Slot tersedia? (hitung peserta non-cancelled)
  select count(*) into v_count
  from bookings
  where training_session_id = p_training_session_id
    and booking_status <> 'cancelled';
  if v_count >= v_session.capacity then
    raise exception 'Slot sesi sudah penuh';
  end if;

  -- Paket member aktif untuk paket sesi ini (FIFO: paling lama dulu)
  select * into v_mp
  from member_packages
  where studio_id = p_studio_id
    and member_id = p_member_id
    and package_id = v_session.package_id
    and status = 'active'
    and remaining_sessions > 0
  order by created_at asc
  limit 1;
  if not found then
    raise exception 'Member tidak punya paket aktif yang sesuai (atau sisa sesi habis)';
  end if;

  select * into v_pkg from packages where package_id = v_session.package_id;

  -- Insert peserta (isi field legacy dari sesi/paket agar attend_booking jalan)
  insert into bookings (
    booking_id, studio_id, training_session_id,
    booking_date, booking_time, member_id, coach_id, package_id,
    member_package_id, package_price, booking_status, created_at, updated_at
  ) values (
    v_booking_id, p_studio_id, p_training_session_id,
    v_session.session_date, v_session.session_time, p_member_id, v_session.coach_id, v_session.package_id,
    v_mp.member_package_id, coalesce(v_pkg.package_price, 0), 'booked', now(), now()
  );

  return jsonb_build_object('ok', true, 'booking_id', v_booking_id);
end;
$$;
