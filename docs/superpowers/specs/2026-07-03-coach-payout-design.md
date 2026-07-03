# Rekap & Slip Gaji Komisi Coach — Design Spec

Tanggal: 2026-07-03 · Branch: `feature/coach-payout` · Status: disetujui user

## Latar belakang

Tanggal gajian coach tidak tentu, sehingga owner butuh rekap komisi per coach dalam
rentang waktu bebas: total komisi, kelas apa saja yang diajar, penanda lunas agar
komisi tidak terhitung dua kali atau terlewat, dan cetak slip gaji/komisi.

Halaman Komisi sudah punya filter rentang tanggal (7d/30d/bulan/custom) dan filter
coach, tapi: (a) rincian tidak menampilkan kelas/paket yang diajar, (b) tidak ada
penanda sudah dibayar, (c) tidak ada slip.

## Keputusan desain (disetujui)

- Tetap list data coach di halaman Komisi; filter/detail per coach via sheet.
- Penanda lunas: kolom `payout_id` di `coach_commissions` (NULL = belum dibayar).
  Satu komisi hanya bisa masuk satu slip → mustahil dobel bayar.
- Slip = baris di tabel `coach_payouts`; bisa dicetak ulang kapan saja.
- Format slip: PDF (preview/download) + printer thermal ESC/POS 58/80mm,
  pakai ulang pola `usePrintReceipt` (coba Bluetooth dulu, fallback PDF).
- Ikut memperbaiki RPC `walk_in_attendance` yang masih membaca tabel
  `package_coaches` (sudah di-drop di `20260613000007`) — komisi walk-in rusak.

## 1. Model data

### Migration `20260703000001_coach_payouts.sql`

```sql
create table if not exists coach_payouts (
  payout_id      uuid primary key default gen_random_uuid(),
  studio_id      uuid not null references licenses(id) on delete cascade,
  coach_id       uuid references coaches(coach_id) on delete set null,
  coach_name     text not null default '',   -- snapshot utk cetak ulang slip
  period_start   text not null default '',   -- 'YYYY-MM-DD' (selaras coach_commissions.date)
  period_end     text not null default '',
  total_amount   numeric not null default 0,
  session_count  integer not null default 0,
  notes          text not null default '',
  paid_at        timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

alter table coach_commissions
  add column if not exists payout_id uuid references coach_payouts(payout_id) on delete set null;
```

Index: `coach_payouts(studio_id, coach_id)`, partial index
`coach_commissions(studio_id, coach_id) where payout_id is null` (query "belum dibayar").
RLS: pola anon penuh seperti `20260608000007` (tenant isolation di aplikasi).

### RPC `create_coach_payout(p_studio_id, p_coach_id, p_period_start, p_period_end, p_notes)`

Atomik dalam satu transaksi:
1. Validasi coach ada di studio; snapshot `full_name`.
2. Insert baris `coach_payouts` (total sementara 0).
3. `update coach_commissions set payout_id = <baru> where studio_id/coach_id cocok
   and payout_id is null and date between p_period_start and p_period_end`.
4. Bila 0 baris ter-update → `raise exception` (rollback, tidak ada slip kosong).
5. Update total_amount + session_count di payout dari hasil update.
6. Return jsonb `{ok, payout_id, total_amount, session_count}`.

Race dua owner klik bersamaan: UPDATE kedua menunggu lock, re-evaluasi
`payout_id is null` → 0 baris → exception → aman.

### Migration `20260703000002_fix_walk_in_commission.sql`

Redefine `walk_in_attendance`: ganti lookup `package_coaches` (dropped) dengan
formula v4 — `base = package_price / session_count`,
`pct = kategori 'pribadi' ? commission_private_pct : commission_regular_pct`,
simpan base per sesi ke `coach_commissions.package_price` (konsisten `attend_booking` v4).
Paket durasi (session_count null/0) tetap tanpa komisi (paritas v4).

## 2. Types & hooks

- `CoachCommission`: + `payout_id: string | null` + relasi opsional
  `bookings?: { booking_time, packages?: { package_name, package_category } }`.
- Interface baru `CoachPayout`.
- `useCoachCommissions`: select jadi
  `*, bookings(booking_time, packages(package_name, package_category))`;
  filter baru `unpaidOnly` → `.is('payout_id', null)`.
- Hook baru di `usePayments.ts`: `useCoachPayouts(coach_id?)` dan
  `useCreateCoachPayout()` (invalidate `coachCommissions` + `coachPayouts`).
- Ekspor via `hooks/index.ts`.

## 3. Slip gaji

Isi slip: nama+alamat studio, "SLIP KOMISI COACH", no slip (8 char), nama coach,
periode, breakdown per kelas (`N× nama paket … subtotal`), TOTAL, tanggal bayar,
catatan opsional.

- `pdf.ts`: `generatePayoutSlip(...)` — 80mm, pola `generatePaymentReceipt`.
- `escpos.ts`: `buildPayoutSlip(d: PayoutSlipData, paper)` — pola `buildPaymentReceipt`.
- `usePrintReceipt.ts`: `printPayout(...)` — Bluetooth dulu, fallback PDF preview.

## 4. UI (halaman Komisi)

- **List coach** (owner): per coach dalam periode terpilih — total komisi + badge
  nominal belum dibayar. Klik → `CoachPayoutSheet` (file baru
  `src/modules/commissions/CoachPayoutSheet.tsx`, pakai `DetailSheet`).
- **CoachPayoutSheet**: rentang tanggal sendiri (default bulan berjalan),
  toggle "belum dibayar saja" (default aktif), total + jumlah sesi, breakdown per
  kelas, daftar sesi (tanggal, jam, kelas, member, nominal, badge lunas),
  tombol **Bayar & Cetak Slip** (owner; konfirmasi dulu), riwayat slip + cetak ulang.
- Rincian komisi yang ada: tampilkan nama kelas/paket di tiap baris + badge lunas.
- Role coach: hanya data sendiri, tanpa tombol bayar (pola akses existing).
- i18n `commissions.*` di `id.json` + `en.json`.

## Batasan scope

- Tanpa komponen gaji lain (gaji pokok/bonus/potongan) — slip murni rekap komisi.
- Tanpa pembatalan slip di UI (fase 2 bila perlu).
- Migration TIDAK diterapkan otomatis ke DB — user yang apply ke Supabase.

## Testing

- Unit: `buildPayoutSlip` di `src/test/escpos.test.ts` (pola test existing).
- `npm run build && npm test` harus hijau.
- Commit lokal saja; push menunggu konfirmasi testing user.
