-- ============================================================
-- v3: paket berkategori + komisi per coach×kategori
-- ============================================================
-- Kategori paket (reguler/pribadi). package_type lama dibiarkan (tidak dipakai UI).
alter table packages
  add column if not exists package_category text not null default 'reguler';

-- Komisi nempel di coach: persen untuk paket reguler vs pribadi
alter table coaches
  add column if not exists commission_regular_pct numeric not null default 0,
  add column if not exists commission_private_pct numeric not null default 0;
