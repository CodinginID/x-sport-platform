-- ============================================================
-- Batalkan paket yang masih 'pending' (belum dibayar). Hanya pending yang boleh dihapus.
-- Membersihkan paket menggantung & membebaskan member untuk beli paket sama lagi.
-- ============================================================
create or replace function cancel_pending_package(
  p_member_package_id uuid,
  p_studio_id         uuid
) returns jsonb
language plpgsql security definer as $$
declare
  v_status mp_status_type;
begin
  select status into v_status from member_packages
  where member_package_id = p_member_package_id and studio_id = p_studio_id;
  if not found then raise exception 'Paket tidak ditemukan'; end if;
  if v_status <> 'pending' then raise exception 'Hanya paket belum bayar yang bisa dibatalkan'; end if;

  delete from member_packages where member_package_id = p_member_package_id and studio_id = p_studio_id;
  return jsonb_build_object('ok', true);
end;
$$;
