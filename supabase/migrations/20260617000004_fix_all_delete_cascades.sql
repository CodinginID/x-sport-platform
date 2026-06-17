-- ============================================================
-- Fix: FK constraints komprehensif untuk semua operasi delete.
--
-- COACH DELETE  → SET NULL di training_sessions, bookings, coach_commissions
-- PACKAGE DELETE → CASCADE ke member_packages; SET NULL di bookings, member_payments
-- MEMBER_PACKAGE DELETE → SET NULL di bookings.member_package_id
-- ============================================================

-- ─── COACH DELETE ────────────────────────────────────────────────────

-- training_sessions.coach_id: sudah nullable, tambahkan SET NULL action
alter table training_sessions
  drop constraint if exists training_sessions_coach_id_fkey,
  add constraint training_sessions_coach_id_fkey
    foreign key (coach_id) references coaches(coach_id) on delete set null;

-- bookings.coach_id: drop NOT NULL, ubah ke SET NULL (preserve booking history)
alter table bookings alter column coach_id drop not null;
alter table bookings
  drop constraint if exists bookings_coach_id_fkey,
  add constraint bookings_coach_id_fkey
    foreign key (coach_id) references coaches(coach_id) on delete set null;

-- coach_commissions.coach_id: drop NOT NULL, ubah ke SET NULL
alter table coach_commissions alter column coach_id drop not null;
alter table coach_commissions
  drop constraint if exists coach_commissions_coach_id_fkey,
  add constraint coach_commissions_coach_id_fkey
    foreign key (coach_id) references coaches(coach_id) on delete set null;

-- ─── PACKAGE DELETE ──────────────────────────────────────────────────

-- member_packages.package_id: CASCADE (rekaman pembelian ikut terhapus)
alter table member_packages
  drop constraint if exists member_packages_package_id_fkey,
  add constraint member_packages_package_id_fkey
    foreign key (package_id) references packages(package_id) on delete cascade;

-- bookings.package_id: drop NOT NULL, ubah ke SET NULL
alter table bookings alter column package_id drop not null;
alter table bookings
  drop constraint if exists bookings_package_id_fkey,
  add constraint bookings_package_id_fkey
    foreign key (package_id) references packages(package_id) on delete set null;

-- member_payments.package_id: drop NOT NULL, ubah ke SET NULL
alter table member_payments alter column package_id drop not null;
alter table member_payments
  drop constraint if exists member_payments_package_id_fkey,
  add constraint member_payments_package_id_fkey
    foreign key (package_id) references packages(package_id) on delete set null;

-- ─── MEMBER_PACKAGE DELETE ───────────────────────────────────────────

-- bookings.member_package_id: sudah nullable, tambahkan SET NULL action
alter table bookings
  drop constraint if exists bookings_member_package_id_fkey,
  add constraint bookings_member_package_id_fkey
    foreign key (member_package_id) references member_packages(member_package_id) on delete set null;
