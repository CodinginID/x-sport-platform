-- ============================================================
-- RPC: request_addon_payment
-- Dipanggil client saat user klik "Konfirmasi via WhatsApp".
-- Set status fitur ke 'pending_payment', simpan invoice & timestamp.
-- Superadmin lalu approve via ProAddonsDashboard → status jadi 'active'.
-- ============================================================

create or replace function request_addon_payment(
  p_license_id uuid,
  p_feature    text,
  p_invoice    text,
  p_studio_id  uuid
) returns jsonb
language plpgsql security definer as $$
declare
  v_features jsonb;
  v_entry    jsonb;
begin
  select features into v_features from licenses
  where id = p_license_id and id = p_studio_id;
  if not found then raise exception 'Lisensi tidak ditemukan'; end if;

  v_entry := coalesce(v_features -> p_feature, '{}'::jsonb);

  if (v_entry->>'status') = 'active' then
    raise exception 'Fitur sudah aktif';
  end if;

  -- Pertahankan data trial, tambahkan pending_payment status + invoice
  v_entry := v_entry || jsonb_build_object(
    'status',       'pending_payment',
    'invoice',      p_invoice,
    'requested_at', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );

  update licenses
  set features = jsonb_set(coalesce(v_features, '{}'::jsonb), array[p_feature], v_entry, true)
  where id = p_license_id;

  return jsonb_build_object('ok', true);
end;
$$;
