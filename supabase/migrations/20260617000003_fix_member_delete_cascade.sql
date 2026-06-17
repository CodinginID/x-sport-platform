-- ============================================================
-- Fix: tambah ON DELETE CASCADE pada FK yang hilang.
-- Sebelumnya delete member gagal karena bookings, member_payments,
-- dan coach_commissions masih referencing member_id tanpa cascade.
-- ============================================================

-- bookings.member_id → members
alter table bookings
  drop constraint if exists bookings_member_id_fkey,
  add constraint bookings_member_id_fkey
    foreign key (member_id) references members(member_id) on delete cascade;

-- member_payments.member_id → members
alter table member_payments
  drop constraint if exists member_payments_member_id_fkey,
  add constraint member_payments_member_id_fkey
    foreign key (member_id) references members(member_id) on delete cascade;

-- coach_commissions.member_id → members
alter table coach_commissions
  drop constraint if exists coach_commissions_member_id_fkey,
  add constraint coach_commissions_member_id_fkey
    foreign key (member_id) references members(member_id) on delete cascade;

-- coach_commissions.booking_id → bookings (perlu cascade agar hapus booking tidak block)
alter table coach_commissions
  drop constraint if exists coach_commissions_booking_id_fkey,
  add constraint coach_commissions_booking_id_fkey
    foreign key (booking_id) references bookings(booking_id) on delete cascade;
