-- ============================================================
-- features: dari array → object ber-status. App belum ada user → reset aman.
-- + RPC start_feature_trial (self-serve, sekali per fitur).
-- ============================================================
alter table licenses alter column features set default '{}'::jsonb;
update licenses set features = '{}'::jsonb where jsonb_typeof(features) <> 'object';

create or replace function start_feature_trial(
  p_license_id  uuid,
  p_feature     text,
  p_trial_days  int,
  p_studio_id   uuid
) returns jsonb
language plpgsql security definer as $$
declare
  v_features jsonb;
  v_entry    jsonb;
begin
  select features into v_features from licenses
  where id = p_license_id and id = p_studio_id;
  if not found then raise exception 'Lisensi tidak ditemukan'; end if;

  v_entry := v_features -> p_feature;
  if v_entry is not null and coalesce((v_entry->>'trial_used')::boolean, false) then
    raise exception 'Trial sudah pernah dipakai';
  end if;
  if v_entry is not null and (v_entry->>'status') = 'active' then
    raise exception 'Fitur sudah aktif';
  end if;

  v_features := jsonb_set(
    coalesce(v_features, '{}'::jsonb),
    array[p_feature],
    jsonb_build_object(
      'status', 'trial',
      'trial_ends_at', to_char((now() + make_interval(days => p_trial_days)) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'trial_used', true
    ),
    true
  );
  update licenses set features = v_features where id = p_license_id;
  return jsonb_build_object('ok', true);
end;
$$;
