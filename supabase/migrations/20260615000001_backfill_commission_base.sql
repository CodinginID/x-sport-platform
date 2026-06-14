-- ============================================================
-- Backfill base komisi: baris lama menyimpan harga PAKET PENUH di package_price,
-- padahal commission_amount dihitung dari harga PER SESI. Set ulang package_price
-- = base yang menghasilkan amount (amount / persen) agar tampilan "X% dari [base]"
-- konsisten. Idempotent: baris yang sudah benar tidak berubah.
-- ============================================================
update coach_commissions
set package_price = commission_amount / (commission_percentage / 100.0)
where commission_percentage > 0;
