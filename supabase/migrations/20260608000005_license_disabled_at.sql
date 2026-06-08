-- Track when superadmin manually disables a license
-- Distinguishes "pending (never approved)" from "disabled by admin"
alter table licenses add column if not exists disabled_at timestamptz null;
