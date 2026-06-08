-- Session table for custom auth (no Supabase Auth)
-- Session ID is stored in a browser cookie and validated against this table.

create table if not exists sessions (
  id             uuid        primary key default gen_random_uuid(),
  studio_id      uuid        not null references licenses(id) on delete cascade,
  user_db_id     text        not null,
  user_email     text        not null,
  user_full_name text        not null,
  user_role      text        not null default 'staff',
  license_data   jsonb       not null default '{}',
  remember_me    boolean     not null default false,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null,
  last_used_at   timestamptz not null default now()
);

create index idx_sessions_expires   on sessions(expires_at);
create index idx_sessions_studio    on sessions(studio_id);
create index idx_sessions_email     on sessions(user_email);
