-- ============================================================
-- 1) Tipe sesi (reguler/pribadi) — sesi terpisah meski jam sama.
-- 2) Status paket 'pending' (dibeli, belum bayar).
-- 3) RPC purchase_package (buat paket pending) & pay_member_package (settle).
-- 4) register_session_participant cek kecocokan kategori paket vs sesi.
-- ============================================================

alter table training_sessions
  add column if not exists session_category text not null default 'reguler';

alter type mp_status_type add value if not exists 'pending';

-- ─── Beli paket: buat member_package PENDING (belum bayar) ────
create or replace function purchase_package(
  p_member_id  uuid,
  p_package_id uuid,
  p_studio_id  uuid
) returns jsonb
language plpgsql security definer as $$
declare
  v_pkg  packages%rowtype;
  v_id   uuid := gen_random_uuid();
  v_exp  text;
begin
  select * into v_pkg from packages where package_id = p_package_id and studio_id = p_studio_id;
  if not found then raise exception 'Paket tidak ditemukan'; end if;

  v_exp := to_char((now() + make_interval(days => coalesce(v_pkg.valid_days, 0))) at time zone 'UTC', 'YYYY-MM-DD');

  insert into member_packages (
    member_package_id, studio_id, member_id, package_id,
    purchase_date, expired_date, total_sessions, remaining_sessions, status, created_at
  ) values (
    v_id, p_studio_id, p_member_id, p_package_id,
    to_char(now() at time zone 'UTC', 'YYYY-MM-DD'), v_exp,
    coalesce(v_pkg.session_count, 0), 0, 'pending'::mp_status_type, now()
  );
  return jsonb_build_object('ok', true, 'member_package_id', v_id);
end;
$$;

-- ─── Bayar paket pending → aktifkan + catat pembayaran ───────
create or replace function pay_member_package(
  p_member_package_id uuid,
  p_payment           jsonb,
  p_studio_id         uuid
) returns jsonb
language plpgsql security definer as $$
declare
  v_mp member_packages%rowtype;
begin
  select * into v_mp from member_packages
  where member_package_id = p_member_package_id and studio_id = p_studio_id;
  if not found then raise exception 'Paket tidak ditemukan'; end if;
  if v_mp.status <> 'pending' then raise exception 'Paket ini sudah dibayar'; end if;

  update member_packages set
    status = 'active'::mp_status_type,
    remaining_sessions = total_sessions,
    purchase_date = to_char(now() at time zone 'UTC', 'YYYY-MM-DD')
  where member_package_id = p_member_package_id;

  insert into member_payments (
    payment_id, studio_id, payment_date, member_id, package_id,
    amount, payment_method, notes, created_at
  ) values (
    gen_random_uuid(), p_studio_id,
    coalesce(p_payment->>'payment_date', to_char(now() at time zone 'UTC', 'YYYY-MM-DD')),
    v_mp.member_id, v_mp.package_id,
    (p_payment->>'amount')::numeric,
    (p_payment->>'payment_method')::payment_method_type,
    coalesce(p_payment->>'notes', ''),
    now()
  );
  return jsonb_build_object('ok', true);
end;
$$;

-- ─── register: tambah cek kecocokan kategori paket ↔ sesi ────
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
  v_pkg_cat    text;
  v_count      integer;
  v_booking_id uuid := gen_random_uuid();
begin
  select * into v_session from training_sessions
  where training_session_id = p_training_session_id and studio_id = p_studio_id
  for update;
  if not found then raise exception 'Sesi tidak ditemukan'; end if;
  if v_session.status = 'cancelled' then raise exception 'Sesi sudah dibatalkan'; end if;
  if v_session.coach_id is null then raise exception 'Sesi belum punya coach'; end if;

  select count(*) into v_count from bookings
  where training_session_id = p_training_session_id and member_id = p_member_id
    and booking_status <> 'cancelled';
  if v_count > 0 then raise exception 'Member sudah terdaftar di sesi ini'; end if;

  select count(*) into v_count from bookings
  where training_session_id = p_training_session_id and booking_status <> 'cancelled';
  if v_count >= v_session.capacity then raise exception 'Slot sesi sudah penuh'; end if;

  select * into v_mp from member_packages
  where member_package_id = p_member_package_id and studio_id = p_studio_id
    and member_id = p_member_id and status = 'active' and remaining_sessions > 0;
  if not found then raise exception 'Paket member tidak valid / sisa sesi habis'; end if;

  -- Kategori paket harus cocok dengan kategori sesi
  select package_category into v_pkg_cat from packages where package_id = v_mp.package_id;
  if coalesce(v_pkg_cat, 'reguler') <> v_session.session_category then
    raise exception 'Kategori paket (%) tidak cocok dengan sesi (%)', coalesce(v_pkg_cat, 'reguler'), v_session.session_category;
  end if;

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
