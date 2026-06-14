-- ============================================================
-- Cegah duplikat: jangan buat paket pending baru bila sudah ada
-- paket pending untuk member + paket yang sama (hindari riwayat dobel).
-- ============================================================
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
  v_dup  integer;
begin
  select * into v_pkg from packages where package_id = p_package_id and studio_id = p_studio_id;
  if not found then raise exception 'Paket tidak ditemukan'; end if;

  -- Sudah ada paket ini yang menunggu pembayaran?
  select count(*) into v_dup from member_packages
  where studio_id = p_studio_id and member_id = p_member_id
    and package_id = p_package_id and status = 'pending';
  if v_dup > 0 then
    raise exception 'Paket ini sudah menunggu pembayaran. Selesaikan pembayaran dulu.';
  end if;

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
