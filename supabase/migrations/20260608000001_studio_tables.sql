-- ============================================================
-- Migration: Studio Tables for Full-Online SaaS Architecture
-- Branch: feat/migrate-supabase-full-online
-- Issue: #39
-- ============================================================

-- ─── ENUMS ──────────────────────────────────────────────────
create type gender_type         as enum ('male', 'female', 'other');
create type booking_status_type as enum ('booked', 'attended', 'cancelled', 'completed');
create type pkg_type_enum       as enum ('session', 'duration');
create type payment_method_type as enum ('cash', 'transfer', 'qris');
create type mp_status_type      as enum ('active', 'expired', 'depleted');
create type user_role_type      as enum ('owner', 'staff');

-- ─── TABLES ─────────────────────────────────────────────────

-- users: custom auth (password_hash), scoped to studio
create table if not exists users (
  id             uuid        primary key default gen_random_uuid(),
  studio_id      uuid        not null references licenses(id) on delete cascade,
  email          text        not null,
  password_hash  text        not null,
  full_name      text        not null,
  role           user_role_type not null default 'staff',
  created_at     timestamptz not null default now(),
  unique (studio_id, email)
);

-- members
create table if not exists members (
  member_id      uuid        primary key,
  studio_id      uuid        not null references licenses(id) on delete cascade,
  full_name      text        not null default '',
  phone_number   text        not null default '',
  email          text        not null default '',
  gender         gender_type not null default 'other',
  birth_date     text        not null default '',
  address        text        not null default '',
  join_date      text        not null default '',
  status_active  boolean     not null default true,
  notes          text        not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- coaches
create table if not exists coaches (
  coach_id       uuid        primary key,
  studio_id      uuid        not null references licenses(id) on delete cascade,
  full_name      text        not null default '',
  phone_number   text        not null default '',
  email          text        not null default '',
  active_status  boolean     not null default true,
  notes          text        not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- products
create table if not exists products (
  product_id     uuid        primary key,
  studio_id      uuid        not null references licenses(id) on delete cascade,
  product_name   text        not null default '',
  category       text        not null default '',
  stock          integer     not null default 0,
  unit           text        not null default 'pcs',
  selling_price  numeric     not null default 0,
  cost_price     numeric     not null default 0,
  active_status  boolean     not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- packages
create table if not exists packages (
  package_id     uuid          primary key,
  studio_id      uuid          not null references licenses(id) on delete cascade,
  package_name   text          not null default '',
  package_type   pkg_type_enum not null default 'session',
  session_count  integer,
  valid_days     integer       not null default 30,
  package_price  numeric       not null default 0,
  description    text          not null default '',
  active_status  boolean       not null default true,
  created_at     timestamptz   not null default now(),
  updated_at     timestamptz   not null default now()
);

-- package_coaches: junction package ↔ coach with commission rate
create table if not exists package_coaches (
  package_coach_id      uuid    primary key,
  studio_id             uuid    not null references licenses(id) on delete cascade,
  package_id            uuid    not null references packages(package_id) on delete cascade,
  coach_id              uuid    not null references coaches(coach_id) on delete cascade,
  commission_percentage numeric not null default 0,
  created_at            timestamptz not null default now(),
  unique (package_id, coach_id)
);

-- member_packages: purchased packages per member
create table if not exists member_packages (
  member_package_id  uuid         primary key,
  studio_id          uuid         not null references licenses(id) on delete cascade,
  member_id          uuid         not null references members(member_id) on delete cascade,
  package_id         uuid         not null references packages(package_id),
  purchase_date      text         not null default '',
  expired_date       text         not null default '',
  total_sessions     integer      not null default 0,
  remaining_sessions integer      not null default 0,
  status             mp_status_type not null default 'active',
  created_at         timestamptz  not null default now()
);

-- bookings
create table if not exists bookings (
  booking_id         uuid                 primary key,
  studio_id          uuid                 not null references licenses(id) on delete cascade,
  booking_date       text                 not null default '',
  booking_time       text                 not null default '',
  member_id          uuid                 not null references members(member_id),
  coach_id           uuid                 not null references coaches(coach_id),
  package_id         uuid                 not null references packages(package_id),
  member_package_id  uuid                 references member_packages(member_package_id),
  package_price      numeric              not null default 0,
  booking_status     booking_status_type  not null default 'booked',
  created_at         timestamptz          not null default now(),
  updated_at         timestamptz          not null default now()
);

-- product_sales (items stored as jsonb array)
create table if not exists product_sales (
  transaction_id    uuid                 primary key,
  studio_id         uuid                 not null references licenses(id) on delete cascade,
  transaction_date  text                 not null default '',
  customer_name     text                 not null default '',
  items             jsonb                not null default '[]',
  subtotal          numeric              not null default 0,
  discount          numeric              not null default 0,
  total             numeric              not null default 0,
  payment_method    payment_method_type  not null default 'cash',
  cash_received     numeric              not null default 0,
  change            numeric              not null default 0,
  notes             text                 not null default '',
  created_at        timestamptz          not null default now()
);

-- member_payments
create table if not exists member_payments (
  payment_id      uuid                 primary key,
  studio_id       uuid                 not null references licenses(id) on delete cascade,
  payment_date    text                 not null default '',
  member_id       uuid                 not null references members(member_id),
  package_id      uuid                 not null references packages(package_id),
  amount          numeric              not null default 0,
  payment_method  payment_method_type  not null default 'cash',
  notes           text                 not null default '',
  created_at      timestamptz          not null default now()
);

-- coach_commissions
create table if not exists coach_commissions (
  commission_id          uuid        primary key,
  studio_id              uuid        not null references licenses(id) on delete cascade,
  coach_id               uuid        not null references coaches(coach_id),
  booking_id             uuid        not null references bookings(booking_id),
  member_id              uuid        not null references members(member_id),
  package_price          numeric     not null default 0,
  commission_percentage  numeric     not null default 0,
  commission_amount      numeric     not null default 0,
  date                   text        not null default '',
  created_at             timestamptz not null default now()
);

-- ─── INDEXES ────────────────────────────────────────────────

-- Studio isolation (primary filter on every query)
create index idx_users_studio          on users(studio_id);
create index idx_members_studio        on members(studio_id);
create index idx_coaches_studio        on coaches(studio_id);
create index idx_products_studio       on products(studio_id);
create index idx_packages_studio       on packages(studio_id);
create index idx_package_coaches_pkg   on package_coaches(studio_id, package_id);
create index idx_member_packages_studio on member_packages(studio_id);
create index idx_bookings_studio       on bookings(studio_id);
create index idx_product_sales_studio  on product_sales(studio_id);
create index idx_member_payments_studio on member_payments(studio_id);
create index idx_coach_commissions_studio on coach_commissions(studio_id);

-- Common query patterns
create index idx_members_active        on members(studio_id, status_active);
create index idx_coaches_active        on coaches(studio_id, active_status);
create index idx_products_active       on products(studio_id, active_status);
create index idx_bookings_date         on bookings(studio_id, booking_date);
create index idx_bookings_status       on bookings(studio_id, booking_status);
create index idx_bookings_member       on bookings(studio_id, member_id);
create index idx_member_pkgs_member    on member_packages(studio_id, member_id);
create index idx_member_pkgs_status    on member_packages(studio_id, status);
create index idx_payments_date         on member_payments(studio_id, payment_date);
create index idx_payments_member       on member_payments(studio_id, member_id);
create index idx_sales_date            on product_sales(studio_id, transaction_date);
create index idx_commissions_coach     on coach_commissions(studio_id, coach_id);
create index idx_commissions_date      on coach_commissions(studio_id, date);
