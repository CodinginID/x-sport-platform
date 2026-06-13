-- ============================================================
-- Jadwal Sesi v2 — schema (assignment-centric)
-- Sesi = slot waktu + kapasitas member. Coach & paket = atribut peserta (bookings).
-- ============================================================

do $$ begin
  create type training_session_status as enum ('scheduled', 'cancelled');
exception when duplicate_object then null; end $$;

-- Sesi latihan = slot (tanggal+jam) + kapasitas jumlah member. TANPA paket/coach.
create table if not exists training_sessions (
  training_session_id uuid                     primary key,
  studio_id           uuid                     not null references licenses(id) on delete cascade,
  session_date        text                     not null default '',
  session_time        text                     not null default '',
  capacity            integer                  not null default 1,  -- maks jumlah member per sesi
  status              training_session_status  not null default 'scheduled',
  created_at          timestamptz              not null default now(),
  updated_at          timestamptz              not null default now()
);
create index if not exists idx_tsession_studio on training_sessions(studio_id);
create index if not exists idx_tsession_date   on training_sessions(studio_id, session_date);

-- Peserta = booking dgn referensi sesi. coach_id/package_id/member_package_id/package_price sudah ada di bookings.
alter table bookings
  add column if not exists training_session_id uuid references training_sessions(training_session_id);
create index if not exists idx_bookings_tsession on bookings(studio_id, training_session_id);

-- package_coaches di-repurpose jadi tarif komisi coach×service.
-- commission_percentage (existing) utk paket berbasis sesi; commission_flat utk paket durasi.
alter table package_coaches
  add column if not exists commission_flat numeric not null default 0;

-- RLS training_sessions (pola anon spt tabel studio lain)
alter table if exists training_sessions enable row level security;
drop policy if exists "anon_insert_tsession" on training_sessions;
drop policy if exists "anon_select_tsession" on training_sessions;
drop policy if exists "anon_update_tsession" on training_sessions;
drop policy if exists "anon_delete_tsession" on training_sessions;
create policy "anon_insert_tsession" on training_sessions for insert with check (true);
create policy "anon_select_tsession" on training_sessions for select using (true);
create policy "anon_update_tsession" on training_sessions for update using (true) with check (true);
create policy "anon_delete_tsession" on training_sessions for delete using (true);
