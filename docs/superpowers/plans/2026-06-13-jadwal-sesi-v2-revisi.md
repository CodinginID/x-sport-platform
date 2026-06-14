# Jadwal Sesi v2 — Plan Revisi (assignment-centric)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Revisi branch `feature/jadwal-sesi` yang sudah ada (v1). Steps checkbox `- [ ]`.

**Goal:** Revisi implementasi v1 ke model v2: sesi = slot waktu + kapasitas member; coach & paket & harga = atribut peserta; komisi per coach×service (persen utk paket sesi, nominal flat utk paket durasi); harga bisa beda per member.

**Basis:** branch `feature/jadwal-sesi` (v1 sudah ada). Spec final: `docs/superpowers/specs/2026-06-12-jadwal-sesi-design.md` bagian **"REVISI v2"**. Migrasi v1 BELUM diterapkan ke DB → file migration v1 boleh DIEDIT langsung (bukan bikin migration koreksi), KECUALI `attend_booking` (ada di migration historis yang sudah di prod → buat migration BARU `create or replace`).

**Tech:** React+TS, Zustand, TanStack Query, Supabase plpgsql, Vitest. Komentar Indonesia.

---

## Task 1: Revisi migration schema (EDIT file v1)

**Files:** Modify `supabase/migrations/20260613000001_training_sessions.sql`

- [ ] **Step 1: Ganti isi file jadi:**

```sql
-- ============================================================
-- Jadwal Sesi v2 — schema (assignment-centric)
-- Sesi = slot waktu + kapasitas member. Coach & paket = atribut peserta (bookings).
-- ============================================================

do $$ begin
  create type training_session_status as enum ('scheduled', 'cancelled');
exception when duplicate_object then null; end $$;

-- Sesi latihan = slot (tanggal+jam) + kapasitas jumlah member. TANPA paket/coach.
create table if not exists training_sessions (
  training_session_id uuid                     primary key,
  studio_id           uuid                     not null references licenses(id) on delete cascade,
  session_date        text                     not null default '',
  session_time        text                     not null default '',
  capacity            integer                  not null default 1,  -- maks jumlah member per sesi
  status              training_session_status  not null default 'scheduled',
  created_at          timestamptz              not null default now(),
  updated_at          timestamptz              not null default now()
);
create index if not exists idx_tsession_studio on training_sessions(studio_id);
create index if not exists idx_tsession_date   on training_sessions(studio_id, session_date);

-- Peserta = booking dgn referensi sesi. coach_id/package_id/member_package_id/package_price sudah ada di bookings.
alter table bookings
  add column if not exists training_session_id uuid references training_sessions(training_session_id);
create index if not exists idx_bookings_tsession on bookings(studio_id, training_session_id);

-- package_coaches di-repurpose jadi tarif komisi coach×service.
-- commission_percentage (existing) utk paket berbasis sesi; commission_flat utk paket durasi.
alter table package_coaches
  add column if not exists commission_flat numeric not null default 0;

-- RLS training_sessions (pola anon spt tabel studio lain)
alter table if exists training_sessions enable row level security;
drop policy if exists "anon_insert_tsession" on training_sessions;
drop policy if exists "anon_select_tsession" on training_sessions;
drop policy if exists "anon_update_tsession" on training_sessions;
drop policy if exists "anon_delete_tsession" on training_sessions;
create policy "anon_insert_tsession" on training_sessions for insert with check (true);
create policy "anon_select_tsession" on training_sessions for select using (true);
create policy "anon_update_tsession" on training_sessions for update using (true) with check (true);
create policy "anon_delete_tsession" on training_sessions for delete using (true);
```

> Catatan: `packages.default_capacity` v1 DIHAPUS dari rencana (kapasitas kini di sesi). Bila kolom sudah terlanjur dibuat di file lain, biarkan—tidak dipakai. JANGAN tambah default_capacity lagi.

- [ ] **Step 2:** `grep -c "create policy" supabase/migrations/20260613000001_training_sessions.sql` → `4`.
- [ ] **Step 3: Commit** `git add supabase/migrations/20260613000001_training_sessions.sql && git commit -m "refactor(db): sesi v2 tanpa paket/coach + package_coaches.commission_flat"`

---

## Task 2: Revisi RPC pendaftaran (EDIT file v1)

**Files:** Modify `supabase/migrations/20260613000002_register_session_participant.sql`

- [ ] **Step 1: Ganti isi file jadi:**

```sql
-- ============================================================
-- Pendaftaran peserta ke sesi v2 — ATOMIK.
-- Admin pilih member + member_package (paket yg dibeli) + coach + harga.
-- Lock baris sesi (FOR UPDATE) → cegah rebutan slot.
-- ============================================================
create or replace function register_session_participant(
  p_training_session_id uuid,
  p_member_id           uuid,
  p_member_package_id   uuid,
  p_coach_id            uuid,
  p_price               numeric,
  p_studio_id           uuid
) returns jsonb
language plpgsql security definer as $$
declare
  v_session    training_sessions%rowtype;
  v_mp         member_packages%rowtype;
  v_count      integer;
  v_booking_id uuid := gen_random_uuid();
begin
  select * into v_session
  from training_sessions
  where training_session_id = p_training_session_id and studio_id = p_studio_id
  for update;
  if not found then raise exception 'Sesi tidak ditemukan'; end if;
  if v_session.status = 'cancelled' then raise exception 'Sesi sudah dibatalkan'; end if;

  -- Cegah duplikat member di sesi ini
  select count(*) into v_count from bookings
  where training_session_id = p_training_session_id and member_id = p_member_id
    and booking_status <> 'cancelled';
  if v_count > 0 then raise exception 'Member sudah terdaftar di sesi ini'; end if;

  -- Kapasitas = jumlah member non-cancelled di sesi
  select count(*) into v_count from bookings
  where training_session_id = p_training_session_id and booking_status <> 'cancelled';
  if v_count >= v_session.capacity then raise exception 'Slot sesi sudah penuh'; end if;

  -- member_package harus milik member tsb, aktif, sisa > 0
  select * into v_mp from member_packages
  where member_package_id = p_member_package_id and studio_id = p_studio_id
    and member_id = p_member_id and status = 'active' and remaining_sessions > 0;
  if not found then raise exception 'Paket member tidak valid / sisa sesi habis'; end if;

  insert into bookings (
    booking_id, studio_id, training_session_id,
    booking_date, booking_time, member_id, coach_id, package_id,
    member_package_id, package_price, booking_status, created_at, updated_at
  ) values (
    v_booking_id, p_studio_id, p_training_session_id,
    v_session.session_date, v_session.session_time, p_member_id, p_coach_id, v_mp.package_id,
    p_member_package_id, coalesce(p_price, 0), 'booked', now(), now()
  );

  return jsonb_build_object('ok', true, 'booking_id', v_booking_id);
end;
$$;
```

- [ ] **Step 2: Commit** `git add supabase/migrations/20260613000002_register_session_participant.sql && git commit -m "refactor(db): register_session_participant v2 (pilih member_package+coach+harga)"`

---

## Task 3: Migration BARU — attend_booking komisi v2

**Files:** Create `supabase/migrations/20260613000003_attend_booking_session_commission.sql`

Formula: paket sesi (`session_count > 0`) → `(package_price/session_count) × pct/100`; paket durasi (`session_count` null/0) → `commission_flat`. Tarif dari `package_coaches(package_id, coach_id)`. Snapshot ke `coach_commissions`.

- [ ] **Step 1: Tulis file:**

```sql
-- ============================================================
-- attend_booking v2 — komisi model baru.
-- Paket sesi: (package_price / session_count) × commission_percentage/100
-- Paket durasi (session_count null/0): commission_flat (nominal per hadir)
-- Tarif dari package_coaches(package_id, coach_id). Snapshot ke coach_commissions.
-- ============================================================
create or replace function attend_booking(
  p_booking_id uuid,
  p_studio_id  uuid
) returns jsonb
language plpgsql security definer as $$
declare
  v_booking   bookings%rowtype;
  v_mp        member_packages%rowtype;
  v_scount    integer;
  v_pct       numeric;
  v_flat      numeric;
  v_amount    numeric := 0;
begin
  select * into v_booking from bookings
  where booking_id = p_booking_id and studio_id = p_studio_id;
  if not found then raise exception 'Booking tidak ditemukan'; end if;
  if v_booking.member_package_id is null then
    raise exception 'Pembayaran belum dilakukan untuk booking ini';
  end if;

  -- Kurangi sisa sesi (untuk paket berbasis sesi)
  select * into v_mp from member_packages
  where member_package_id = v_booking.member_package_id;
  if found and v_mp.remaining_sessions > 0 then
    update member_packages set
      remaining_sessions = v_mp.remaining_sessions - 1,
      status = case when v_mp.remaining_sessions - 1 <= 0 then 'depleted'::mp_status_type
                    else 'active'::mp_status_type end
    where member_package_id = v_booking.member_package_id;
  end if;

  -- Tarif komisi coach×service
  select session_count into v_scount from packages where package_id = v_booking.package_id;
  select commission_percentage, commission_flat into v_pct, v_flat
  from package_coaches
  where package_id = v_booking.package_id and coach_id = v_booking.coach_id;

  if coalesce(v_scount, 0) > 0 then
    v_amount := (v_booking.package_price / v_scount) * coalesce(v_pct, 0) / 100;
  else
    v_amount := coalesce(v_flat, 0);  -- paket durasi: nominal flat
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

- [ ] **Step 2: Commit** `git add supabase/migrations/20260613000003_attend_booking_session_commission.sql && git commit -m "feat(db): attend_booking v2 komisi per coach×service + paket durasi"`

---

## Task 4: Types

**Files:** Modify `src/types/index.ts`

- [ ] **Step 1:** Hapus `default_capacity` dari `Package` (revert v1).
- [ ] **Step 2:** Tambah ke `PackageCoach`: `commission_flat: number;` (setelah `commission_percentage`).
- [ ] **Step 3:** Ubah `TrainingSession` → hapus `package_id` & `coach_id`:
```ts
export interface TrainingSession {
  training_session_id: string;
  session_date: string;
  session_time: string;
  capacity: number;
  status: 'scheduled' | 'cancelled';
  created_at: string;
  updated_at: string;
}
```
- [ ] **Step 4:** `npx tsc --noEmit` (akan muncul error di file yang pakai field lama → diperbaiki di task berikut). Commit setelah Task 7 build hijau. Untuk sekarang: `git add src/types/index.ts && git commit -m "refactor(types): TrainingSession v2 tanpa paket/coach + PackageCoach.commission_flat"`

---

## Task 5: Hooks

**Files:** Modify `src/hooks/useTrainingSessions.ts`, `src/hooks/useBookings.ts`

- [ ] **Step 1:** `useTrainingSessionMutation` create — payload sesi hanya `{ session_date, session_time, capacity }`. Ubah tipe Pick jadi `Pick<TrainingSession, 'session_date' | 'session_time' | 'capacity'>`. Hapus package_id/coach_id dari row insert.
- [ ] **Step 2:** `useRegisterParticipant` — argumen jadi `{ training_session_id, member_id, member_package_id, coach_id, price }`, panggil RPC dgn param `p_member_package_id`, `p_coach_id`, `p_price` (+ yang lama). 
```ts
const { error } = await supabase.rpc('register_session_participant', {
  p_training_session_id: vars.training_session_id,
  p_member_id: vars.member_id,
  p_member_package_id: vars.member_package_id,
  p_coach_id: vars.coach_id,
  p_price: vars.price,
  p_studio_id: studioId,
});
```
- [ ] **Step 3:** `useBookings.ts` — di create booking, baris `training_session_id` tetap; tidak ada perubahan lain dibutuhkan (training_session_id sudah ditambahkan v1).
- [ ] **Step 4:** Build sanity nanti di Task 7. Commit: `git add src/hooks/useTrainingSessions.ts && git commit -m "refactor(hooks): sesi v2 (create slot saja, register pilih paket+coach+harga)"`

---

## Task 6: UI — CreateSessionModal (sederhanakan)

**Files:** Modify `src/modules/bookings/CreateSessionModal.tsx`

- [ ] **Step 1:** Hapus pemilihan Paket & Coach + import `usePackages`/`usePackageCoaches`/`useCoaches`. Form jadi: Tanggal, Jam, Kapasitas (jumlah member). State `{ session_date, session_time, capacity }`. Submit `mutation.mutate({ action:'create', session })`. `valid = session_date && session_time && capacity > 0`.
- [ ] **Step 2:** `npm run build` (boleh masih ada error di file lain) lalu commit: `git add src/modules/bookings/CreateSessionModal.tsx && git commit -m "refactor(ui): buat sesi cukup tanggal/jam/kapasitas"`

---

## Task 7: UI — SessionDetailSheet (peserta dgn paket+coach+harga)

**Files:** Modify `src/modules/bookings/SessionDetailSheet.tsx`

Form "Daftar" sekarang: pilih **member** → pilih **member_package aktif milik member itu** (pakai `useActiveMemberPackages(memberId)` yang sudah ada di hooks) → pilih **coach** (`useCoaches`) → input **harga** (prefill dari `packages.package_price` paket terpilih, editable). Tombol Daftar panggil `useRegisterParticipant`.

Header sesi: `jam · slot terisi/kapasitas` (tanpa paket/coach). Tiap peserta tampil: nama member + nama paket (dari `packages` by `p.package_id`) + nama coach (by `p.coach_id`) + harga. Tombol Hadir/Batal tetap (`useBookingMutation`).

- [ ] **Step 1:** Tulis ulang komponen sesuai di atas. State form: `{ memberId, memberPackageId, coachId, price }`. Saat pilih memberPackage, set price default dari `packages.find(package_id == mp.package_id).package_price`. Submit:
```ts
register.mutate({ training_session_id: session.training_session_id, member_id: memberId, member_package_id: memberPackageId, coach_id: coachId, price }, { onSuccess: resetForm });
```
Gunakan `slotInfo(participants.length, session.capacity)` untuk disable form saat penuh. Hapus referensi `session.package_id`/`session.coach_id`.
- [ ] **Step 2:** `npm run build` → sukses. Commit: `git add src/modules/bookings/SessionDetailSheet.tsx && git commit -m "refactor(ui): peserta sesi pilih paket+coach+harga per member"`

---

## Task 8: UI — BookingsPage (kartu sesi tanpa paket/coach)

**Files:** Modify `src/modules/bookings/BookingsPage.tsx`

- [ ] **Step 1:** Hapus filter "Semua paket" yang berbasis `s.package_id`. Kartu sesi tampil: `session_time` + badge `slotInfo` (terisi/kapasitas / PENUH). Hapus `pkgMap`/`coachMap` untuk kartu (tidak relevan di level sesi). Hapus props paket/coach pada kartu. Tetap pakai `useSessionCounts`.
- [ ] **Step 2:** `npm run build` → sukses. Commit: `git add src/modules/bookings/BookingsPage.tsx && git commit -m "refactor(ui): kartu Jadwal Sesi tampil jam+slot saja"`

---

## Task 9: UI tarif komisi (package_coaches: persen + flat)

**Files:** Modify `src/modules/packages/PackagesPage.tsx`

- [ ] **Step 1:** Revert input `default_capacity` (dari v1) bila ada.
- [ ] **Step 2:** Pada UI relasi coach↔paket (package_coaches) yang sudah ada: pastikan ada input `commission_percentage` (persen, untuk paket sesi) DAN `commission_flat` (nominal Rp, untuk paket durasi). Relabel bagian ini "Tarif Komisi Coach". Bila UI package_coaches belum ada di PackagesPage, baca dulu file untuk menemukan tempat mengelola coach per paket; bila benar-benar tidak ada, tambahkan baris input flat di samping persen pada tempat package_coaches dikelola.
- [ ] **Step 3:** `npm run build` → sukses. Commit: `git add src/modules/packages/PackagesPage.tsx && git commit -m "refactor(ui): tarif komisi coach (persen + flat) per service"`

---

## Task 10: Sesuaikan test & verifikasi akhir

**Files:** Modify `src/test/training-sessions.test.ts` (bila perlu), `src/test/hooks.test.ts` (additive type)

- [ ] **Step 1:** `slotInfo` test tetap valid (tidak berubah). Bila ada test yang refer field TrainingSession lama, sesuaikan.
- [ ] **Step 2:** Jika `hooks.test.ts` fixture Package pakai `default_capacity`, hapus (karena field dibuang). Jika fixture PackageCoach dipakai, tambah `commission_flat: 0`.
- [ ] **Step 3:** `npm run build && npx vitest run` — build hijau; `training-sessions.test.ts` lulus. 9 kegagalan pre-existing (auth/schemas/hooks-Dexie) boleh tetap ada — verifikasi tidak BERTAMBAH dari sebelumnya.
- [ ] **Step 4:** Commit bila ada perubahan: `git add -A -- src/test && git commit -m "test(sessions): sesuaikan fixture model v2"` (HATI-HATI: jangan ikutkan file printer—hanya path src/test).

---

## Catatan Eksekusi
- Branch tetap `feature/jadwal-sesi`. JANGAN sentuh/commit file printer (btPrinter.ts, DevicesSection.tsx, usePrinterAutoReconnect.ts, stores/printer.ts, usePrintReceipt.ts, PrinterConnectBanner.tsx, AppLayout.tsx). Pakai `git add <path spesifik>`.
- Migration BELUM diterapkan ke DB (butuh kredensial Supabase) — tulis file saja, lanjut. Build & unit test tidak butuh DB.
- Harga peserta di-snapshot per booking (bisa beda tiap member) → komisi pakai `booking.package_price`.
- JANGAN push ke remote.
