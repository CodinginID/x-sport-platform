-- Enable RLS on users table (staff accounts added by studio owner)
alter table users enable row level security;

drop policy if exists "anon_select_users" on users;
drop policy if exists "anon_insert_users" on users;
drop policy if exists "anon_update_users" on users;
drop policy if exists "anon_delete_users" on users;

create policy "anon_select_users" on users for select using (true);
create policy "anon_insert_users" on users for insert with check (true);
create policy "anon_update_users" on users for update using (true) with check (true);
create policy "anon_delete_users" on users for delete using (true);
