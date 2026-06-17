-- ============================================================
-- Izinkan update platform_config dari app (superadmin in-app pakai anon client),
-- konsisten dgn pola update licenses. Config = harga add-on, WA admin, rekening.
-- Anon SELECT sudah ada (owner baca harga). Tambah INSERT/UPDATE.
-- ============================================================
drop policy if exists "anon_update_platform_config" on platform_config;
drop policy if exists "anon_insert_platform_config" on platform_config;
create policy "anon_update_platform_config" on platform_config for update using (true) with check (true);
create policy "anon_insert_platform_config" on platform_config for insert with check (true);

-- pastikan baris singleton ada
insert into platform_config (id) values (1) on conflict (id) do nothing;
