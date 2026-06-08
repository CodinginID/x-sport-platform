-- Add RLS policies for sessions table so anon client (app) can manage sessions
-- Without these, login fails with "new row violates row-level security policy"

alter table if exists sessions enable row level security;

-- DROP existing policies if any (idempotent re-run safety)
drop policy if exists "anon_insert_session"  on sessions;
drop policy if exists "anon_select_session"  on sessions;
drop policy if exists "anon_update_session"  on sessions;
drop policy if exists "anon_delete_session"  on sessions;

-- App creates a session on every login
create policy "anon_insert_session" on sessions
  for insert with check (true);

-- App reads session by ID (cookie token) on every page load
create policy "anon_select_session" on sessions
  for select using (true);

-- App refreshes last_used_at and license_data on every validated request
create policy "anon_update_session" on sessions
  for update using (true) with check (true);

-- App deletes session on logout
create policy "anon_delete_session" on sessions
  for delete using (true);
