-- ============================================================
-- platform_config: konfigurasi global add-on (single-row).
-- Harga per fitur, WA admin, info rekening. Diatur superadmin (service key).
-- ============================================================
create table if not exists platform_config (
  id                  int         primary key default 1 check (id = 1),
  admin_wa            text        not null default '',
  bank_name           text        not null default '',
  bank_account_number text        not null default '',
  bank_account_holder text        not null default '',
  feature_prices      jsonb       not null default '{}'::jsonb,
  updated_at          timestamptz not null default now()
);

-- Seed baris singleton
insert into platform_config (id) values (1) on conflict (id) do nothing;

-- RLS: anon boleh baca (marketplace owner). Tulis hanya via service key (bypass RLS).
alter table platform_config enable row level security;
drop policy if exists "anon_select_platform_config" on platform_config;
create policy "anon_select_platform_config" on platform_config for select using (true);
