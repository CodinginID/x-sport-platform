-- ============================================================
-- Migration: RLS policies for studio data tables
-- ============================================================
-- The studio tables (20260608000001_studio_tables.sql) were created
-- without RLS policies. Supabase enables row-level security on tables
-- by default, so every anon write failed with error 42501
-- ("new row violates row-level security policy") and every read
-- silently returned 0 rows.
--
-- This app authenticates with the public anon key and isolates tenants
-- in application queries (`.eq('studio_id', studioId)`); there is no
-- Supabase Auth / auth.uid(). So we grant full anon access here, matching
-- the existing pattern used for users (20260608000006) and sessions
-- (20260608000004). Idempotent: safe to re-run.
-- ============================================================

do $$
declare
  t text;
  studio_tables text[] := array[
    'members',
    'coaches',
    'products',
    'packages',
    'package_coaches',
    'member_packages',
    'bookings',
    'product_sales',
    'member_payments',
    'coach_commissions'
  ];
begin
  foreach t in array studio_tables loop
    execute format('alter table %I enable row level security', t);

    execute format('drop policy if exists "anon_select_%1$s" on %1$I', t);
    execute format('drop policy if exists "anon_insert_%1$s" on %1$I', t);
    execute format('drop policy if exists "anon_update_%1$s" on %1$I', t);
    execute format('drop policy if exists "anon_delete_%1$s" on %1$I', t);

    execute format('create policy "anon_select_%1$s" on %1$I for select using (true)', t);
    execute format('create policy "anon_insert_%1$s" on %1$I for insert with check (true)', t);
    execute format('create policy "anon_update_%1$s" on %1$I for update using (true) with check (true)', t);
    execute format('create policy "anon_delete_%1$s" on %1$I for delete using (true)', t);
  end loop;
end $$;
