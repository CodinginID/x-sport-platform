-- ============================================================
-- v3: drop tabel package_coaches.
-- Komisi sudah pindah ke coaches.commission_regular_pct / commission_private_pct
-- (lihat 20260613000005 & attend_booking v3 di 20260613000006).
-- attend_booking v3 tidak lagi mereferensikan package_coaches, jadi aman di-drop.
-- App belum punya user → full migrasi aman.
-- ============================================================
drop table if exists package_coaches cascade;
