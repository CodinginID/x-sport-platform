-- ============================================================
-- Jadwal Sesi Latihan — schema
-- Catatan: nama `sessions` sudah dipakai untuk AUTH session (cookie login),
-- maka tabel sesi latihan = `training_sessions`.
-- ============================================================

-- Status sesi latihan
do $$ begin
  create type training_session_status as enum ('scheduled', 'cancelled');
exception when duplicate_object then null; end $$;

-- Kapasitas default per paket (dipakai saat membuat sesi)
alter table packages
  add column if not exists default_capacity integer not null default 1;

-- Tabel sesi latihan
create table if not exists training_sessions (
  training_session_id uuid                     primary key,
  studio_id           uuid                     not null references licenses(id) on delete cascade,
  package_id          uuid                     not null references packages(package_id),
  coach_id            uuid                     not null references coaches(coach_id),
  session_date        text                     not null default '',
  session_time        text                     not null default '',
  capacity            integer                  not null default 1,
  status              training_session_status  not null default 'scheduled',
  created_at          timestamptz              not null default now(),
  updated_at          timestamptz              not null default now()
);

create index if not exists idx_tsession_studio on training_sessions(studio_id);
create index if not exists idx_tsession_date   on training_sessions(studio_id, session_date);
create index if not exists idx_tsession_pkg    on training_sessions(studio_id, package_id);

-- Peserta sesi = booking dengan referensi ke sesi (kolom legacy lain dibiarkan untuk arsip)
alter table bookings
  add column if not exists training_session_id uuid references training_sessions(training_session_id);

create index if not exists idx_bookings_tsession on bookings(studio_id, training_session_id);

-- RLS: anon client (app) boleh kelola training_sessions (pola sama seperti tabel studio lain)
alter table if exists training_sessions enable row level security;
drop policy if exists "anon_insert_tsession" on training_sessions;
drop policy if exists "anon_select_tsession" on training_sessions;
drop policy if exists "anon_update_tsession" on training_sessions;
drop policy if exists "anon_delete_tsession" on training_sessions;
create policy "anon_insert_tsession" on training_sessions for insert with check (true);
create policy "anon_select_tsession" on training_sessions for select using (true);
create policy "anon_update_tsession" on training_sessions for update using (true) with check (true);
create policy "anon_delete_tsession" on training_sessions for delete using (true);
