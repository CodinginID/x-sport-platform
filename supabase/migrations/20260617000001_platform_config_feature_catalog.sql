-- Tambah kolom feature_catalog ke platform_config
alter table platform_config
  add column if not exists feature_catalog jsonb not null default '{}'::jsonb;
