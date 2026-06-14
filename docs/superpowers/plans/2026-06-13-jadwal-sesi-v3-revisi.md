# Jadwal Sesi v3 — Plan Revisi (paket berkategori + komisi coach×kategori)

> REQUIRED SUB-SKILL: superpowers:executing-plans. Revisi branch `feature/jadwal-sesi` (lanjutan v2). Steps checkbox.

**Goal:** Paket = kategori (Reguler/Pribadi) + jumlah sesi (hapus durasi). Komisi pindah ke coach: tiap coach punya persen Reguler & persen Pribadi; komisi per hadir = (harga paket ÷ jumlah sesi) × persen kategori. Buang `package_coaches`. Harga tetap dari paket.

**Spec:** `docs/superpowers/specs/2026-06-12-jadwal-sesi-design.md` bagian **"REVISI v3"**.

**ATURAN DB PENTING:** migration 000001–000004 SUDAH ter-apply ke prod → **JANGAN diedit**. v3 = migration BARU append-only (000005, 000006). **JANGAN jalankan `supabase db push`** — prod `attend_booking` harus tetap v1 sampai deploy. Branch cukup build + unit test (tanpa DB).

**Guardrail:** JANGAN sentuh/commit file printer (btPrinter.ts, DevicesSection.tsx, usePrinterAutoReconnect.ts, stores/printer.ts, usePrintReceipt.ts, PrinterConnectBanner.tsx, AppLayout.tsx). Commit `git add <path spesifik>`. JANGAN push.

---

## Task 1: Migration 000005 — kategori paket + komisi coach (additive)

**Create:** `supabase/migrations/20260613000005_package_category_coach_commission.sql`

- [ ] **Step 1:**
```sql
-- ============================================================
-- v3: paket berkategori + komisi per coach×kategori
-- ============================================================
-- Kategori paket (reguler/pribadi). package_type lama dibiarkan (tidak dipakai UI).
alter table packages
  add column if not exists package_category text not null default 'reguler';

-- Komisi nempel di coach: persen untuk paket reguler vs pribadi
alter table coaches
  add column if not exists commission_regular_pct numeric not null default 0,
  add column if not exists commission_private_pct numeric not null default 0;
```
- [ ] **Step 2: Commit** `git add supabase/migrations/20260613000005_package_category_coach_commission.sql && git commit -m "feat(db): package_category + komisi persen per coach (reguler/pribadi)"`

> JANGAN `supabase db push`.

---

## Task 2: Migration 000006 — attend_booking v3

**Create:** `supabase/migrations/20260613000006_attend_booking_v3_category_commission.sql`

- [ ] **Step 1:**
```sql
-- ============================================================
-- attend_booking v3: komisi = (package_price / session_count) × persen kategori
-- persen dari coaches.commission_regular_pct / commission_private_pct sesuai
-- packages.package_category. TIDAK pakai package_coaches lagi.
-- (JANGAN apply ke prod sampai frontend v3 live.)
-- ============================================================
create or replace function attend_booking(
  p_booking_id uuid,
  p_studio_id  uuid
) returns jsonb
language plpgsql security definer as $$
declare
  v_booking bookings%rowtype;
  v_mp      member_packages%rowtype;
  v_scount  integer;
  v_cat     text;
  v_pct     numeric;
  v_amount  numeric := 0;
begin
  select * into v_booking from bookings
  where booking_id = p_booking_id and studio_id = p_studio_id;
  if not found then raise exception 'Booking tidak ditemukan'; end if;
  if v_booking.member_package_id is null then
    raise exception 'Pembayaran belum dilakukan untuk booking ini';
  end if;

  select * into v_mp from member_packages
  where member_package_id = v_booking.member_package_id;
  if found and v_mp.remaining_sessions > 0 then
    update member_packages set
      remaining_sessions = v_mp.remaining_sessions - 1,
      status = case when v_mp.remaining_sessions - 1 <= 0 then 'depleted'::mp_status_type
                    else 'active'::mp_status_type end
    where member_package_id = v_booking.member_package_id;
  end if;

  select session_count, package_category into v_scount, v_cat
  from packages where package_id = v_booking.package_id;

  select case when v_cat = 'pribadi' then commission_private_pct
              else commission_regular_pct end
    into v_pct
  from coaches where coach_id = v_booking.coach_id;

  if coalesce(v_scount, 0) > 0 then
    v_amount := (v_booking.package_price / v_scount) * coalesce(v_pct, 0) / 100;
  end if;

  if v_amount > 0 then
    insert into coach_commissions (
      commission_id, studio_id, coach_id, booking_id, member_id,
      package_price, commission_percentage, commission_amount, date, created_at
    ) values (
      gen_random_uuid(), p_studio_id, v_booking.coach_id, p_booking_id, v_booking.member_id,
      v_booking.package_price, coalesce(v_pct, 0), v_amount, v_booking.booking_date, now()
    );
  end if;

  update bookings set booking_status = 'attended', updated_at = now()
  where booking_id = p_booking_id;
  return jsonb_build_object('ok', true);
end;
$$;
```
- [ ] **Step 2: Commit** `git add supabase/migrations/20260613000006_attend_booking_v3_category_commission.sql && git commit -m "feat(db): attend_booking v3 komisi per coach×kategori (belum di-apply ke prod)"`

---

## Task 3: Types

**Modify:** `src/types/index.ts`

- [ ] **Step 1:** `Package`: ganti `package_type: 'session' | 'duration';` → `package_category: 'reguler' | 'pribadi';`. Hapus `default_capacity` bila masih ada. (Biarkan `session_count`, `valid_days`, `package_price`.)
- [ ] **Step 2:** `Coach`: tambah `commission_regular_pct: number;` dan `commission_private_pct: number;`.
- [ ] **Step 3:** Hapus interface `PackageCoach` sepenuhnya.
- [ ] **Step 4: Commit** `git add src/types/index.ts && git commit -m "refactor(types): Package.package_category, Coach komisi, hapus PackageCoach"`

---

## Task 4: Hapus package_coaches dari kode

**Delete:** `src/hooks/usePackageCoaches.ts`
**Modify:** `src/hooks/index.ts`, `src/database/db.ts`, `src/database/seed.ts`, `src/modules/settings/BackupSection.tsx`

- [ ] **Step 1:** Baca tiap file dulu (`grep -n "package_coaches\|PackageCoach\|packageCoaches\|usePackageCoaches"` di src/). Hapus semua referensi: export di hooks/index.ts, store/table di db.ts, data seed package_coaches di seed.ts, entри backup di BackupSection.tsx. Hapus file usePackageCoaches.ts.
- [ ] **Step 2:** `npx tsc --noEmit` — perbaiki sisa referensi sampai bersih (selain error yang akan dibereskan di task UI).
- [ ] **Step 3: Commit** `git add src/hooks/index.ts src/database/db.ts src/database/seed.ts src/modules/settings/BackupSection.tsx && git rm src/hooks/usePackageCoaches.ts && git commit -m "chore: hapus package_coaches dari kode (komisi pindah ke coach)"`

---

## Task 5: UI Coach — input 2 persen komisi

**Modify:** `src/modules/coaches/CoachesPage.tsx`

- [ ] **Step 1:** Baca file. Pada form tambah/edit coach, tambah 2 input number (label "Komisi Reguler (%)" & "Komisi Pribadi (%)", min 0, max 100) → simpan ke `commission_regular_pct` & `commission_private_pct`. Hapus referensi package_coaches bila ada di halaman ini (mis. assign coach ke paket). Pastikan create/update coach mengirim 2 field ini.
- [ ] **Step 2:** `npm run build` → sukses. Commit `git add src/modules/coaches/CoachesPage.tsx && git commit -m "feat(coaches): input persen komisi reguler & pribadi"`

---

## Task 6: UI Paket — kategori (reguler/pribadi)

**Modify:** `src/modules/packages/PackagesPage.tsx`

- [ ] **Step 1:** Baca file. Ganti pilihan tipe `session/duration` → select **Kategori**: Reguler / Pribadi (`package_category`). Hapus field/cabang "durasi" (valid_days boleh tetap sebagai masa berlaku bila dipakai; jangan tampilkan opsi durasi). Hapus seluruh UI assign coach ke paket (package_coaches) bila ada di halaman ini. Form kirim `package_category`. Hapus input `default_capacity` bila masih ada.
- [ ] **Step 2:** `npm run build` → sukses. Commit `git add src/modules/packages/PackagesPage.tsx && git commit -m "refactor(packages): kategori reguler/pribadi, buang durasi & assign coach"`

---

## Task 7: SessionDetailSheet — harga otomatis dari paket

**Modify:** `src/modules/bookings/SessionDetailSheet.tsx`

- [ ] **Step 1:** Baca file. Pada form daftar peserta: hapus input harga manual. Saat memilih member_package, tentukan harga otomatis = `packages.find(package_id == mp.package_id).package_price`. Tetap kirim ke `useRegisterParticipant` sebagai `price` = harga paket itu (fungsi RPC register tetap terima p_price). Pilihan member → member_package → coach tetap. Tampilan peserta tetap tampil paket·coach·harga.
- [ ] **Step 2:** `npm run build` → sukses. Commit `git add src/modules/bookings/SessionDetailSheet.tsx && git commit -m "refactor(ui): harga peserta otomatis dari paket"`

---

## Task 8: Sesuaikan test & verifikasi akhir

**Modify:** `src/test/hooks.test.ts` (fixtures), `src/test/training-sessions.test.ts` (bila perlu)

- [ ] **Step 1:** Baca `src/test/hooks.test.ts`. Pada fixture Package: ganti `package_type` → `package_category: 'reguler'`. Hapus referensi `package_coaches`/`PackageCoach` bila ada. Pada fixture Coach (bila ada): tambah `commission_regular_pct: 0, commission_private_pct: 0`.
- [ ] **Step 2:** `npm run build && npx vitest run`. Build hijau; `training-sessions.test.ts` lulus; jumlah kegagalan test TIDAK bertambah dari baseline (9 pre-existing: auth/schemas/hooks-Dexie). Jika ada kegagalan BARU akibat perubahan, perbaiki.
- [ ] **Step 3: Commit** `git add -A -- src/test && git commit -m "test: sesuaikan fixture model v3 (kategori + komisi coach)"`

---

## Catatan Eksekusi
- **JANGAN `supabase db push`** — semua v3 di-apply saat deploy frontend nanti. Prod attend_booking tetap v1.
- `package_coaches` TABEL di DB tidak di-drop sekarang (attend_booking v1 prod masih refer) — hanya dihapus dari KODE. Drop saat deploy.
- Harga tetap dari paket (tidak ada override per member).
- JANGAN push ke remote. JANGAN sentuh file printer.
