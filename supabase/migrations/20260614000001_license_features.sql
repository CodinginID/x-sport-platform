-- ============================================================
-- Entitlement fitur premium add-on per studio.
-- features = array string fitur aktif, mis. ["premium_booking"].
-- ============================================================
alter table licenses
  add column if not exists features jsonb not null default '[]'::jsonb;
