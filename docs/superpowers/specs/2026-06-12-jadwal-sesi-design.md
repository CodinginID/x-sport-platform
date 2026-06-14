# Desain: Jadwal Sesi Latihan (Session-Based Booking)

**Tanggal:** 2026-06-12
**Status:** Disetujui (brainstorming) — siap masuk rencana implementasi
**Pendekatan:** A — ganti total alur booking jam-bebas dengan sesi terjadwal

---

## 1. Latar Belakang & Masalah

Alur saat ini memperlakukan **booking sebagai janji individual**: 1 member, jam diketik
bebas oleh admin, tanpa konsep kapasitas. Kebutuhan client berbeda secara fundamental:

> Setiap hari dibuka beberapa **sesi latihan**. Tiap sesi punya **coach** sendiri,
> **jam** sendiri, dan **slot peserta** (kapasitas) sendiri. Member yang sudah beli paket
> dan punya sisa sesi **wajib tanya admin** untuk tahu bisa latihan hari apa, dengan coach
> siapa, di sesi mana yang slotnya masih tersedia. Member **tidak** mendaftar sendiri.
> Saat member **hadir**, sisa sesi (`remaining_sessions`) pada paketnya berkurang.

**Gap inti:** belum ada entitas "sesi terjadwal" dengan jam tetap + kapasitas slot yang
dipakai bersama beberapa member.

**Yang sudah benar:** pengurangan `remaining_sessions` saat hadir sudah berjalan via RPC
`attend_booking`.

---

## 2. Konsep

```
1 Hari
 ├── Sesi 08:00 · Paket Muay Thai · Coach Budi  · slot 5/8
 ├── Sesi 10:00 · Paket Yoga      · Coach Sinta · slot PENUH
 └── Sesi 16:00 · Paket Muay Thai · Coach Budi  · slot 2/8
```

- **1 sesi = 1 paket** → hanya member dengan paket itu (aktif, sisa > 0) yang boleh ikut.
- **1 sesi = 1 coach** → coach dipilih dari yang terhubung ke paket (`package_coaches`).
- **Kapasitas** = default dari paket, bisa di-override per sesi.
- **Status "penuh" dihitung** dari jumlah peserta vs kapasitas (tidak disimpan).
- **Admin-driven**: tidak ada self-service member.

---

## 3. Model Data

### 3.1 `Package` — tambah field
| Field | Tipe | Keterangan |
|---|---|---|
| `default_capacity` | int | Kuota peserta default untuk tiap sesi paket ini |

### 3.2 `training_sessions` — tabel BARU
> ⚠️ Nama tabel **`sessions` sudah dipakai untuk auth session (cookie login)** —
> lihat `20260608000003_sessions.sql`. Maka tabel sesi latihan = **`training_sessions`**.

| Field | Tipe | Keterangan |
|---|---|---|
| `training_session_id` | PK | |
| `studio_id` | FK | scoping multi-tenant (konsisten pola existing) |
| `package_id` | FK | 1 sesi = 1 paket |
| `coach_id` | FK | 1 coach per sesi |
| `session_date` | text | tanggal sesi (pola existing `bookings.booking_date` = text) |
| `session_time` | text | jam sesi (inti — 1 hari banyak sesi) |
| `capacity` | int | default `package.default_capacity`, bisa diubah |
| `status` | enum/text | `scheduled` \| `cancelled` (selesai diturunkan dari tanggal lewat) |
| `created_at`, `updated_at` | timestamptz | |

> "Penuh" TIDAK disimpan — dihitung: `count(peserta non-cancelled) >= capacity`.

### 3.3 `bookings` — di-repurpose jadi "peserta sesi"
Semantik berubah: satu baris = **pendaftaran satu member ke satu sesi**.

| Field | Status | Keterangan |
|---|---|---|
| `booking_id` | tetap (PK) | |
| `studio_id` | tetap | |
| `training_session_id` | **BARU**, nullable | peserta merujuk ke sesi latihan |
| `member_id` | tetap | |
| `member_package_id` | tetap | paket yang dipakai (sumber pengurangan sisa sesi) |
| `booking_status` | tetap | `booked` \| `attended` \| `cancelled` |
| `created_at`, `updated_at` | tetap | |
| `booking_date`, `booking_time`, `coach_id`, `package_id`, `package_price` | **legacy** | tidak diisi lagi untuk peserta baru; diturunkan dari sesi. Dipertahankan untuk arsip booking lama. |

---

## 4. Aturan Inti (ditegakkan di server / RPC, bukan hanya UI)

1. **Boleh daftar?** Member punya `member_package` aktif untuk `session.package_id`
   dengan `remaining_sessions > 0`.
2. **Slot tersedia?** `count(peserta non-cancelled di sesi) < session.capacity`.
   Dicek **atomik** dalam satu transaksi RPC (hitung + insert) agar 2 admin tidak
   merebut slot terakhir bersamaan.
3. **Cegah duplikat:** 1 member maksimal 1 slot aktif (non-cancelled) per sesi.
4. **Hadir:** kurangi `remaining_sessions` member 1× (RPC `attend_booking`, diadaptasi
   ke basis sesi). **Tidak bisa di-undo** — sekali hadir, potongan final.
5. **Batalkan peserta** (status `booked` → `cancelled`): slot balik kosong; sisa sesi
   tidak terpotong (karena belum hadir).
6. **Batalkan sesi** yang sudah ada peserta: seluruh peserta `booked` ikut `cancelled`;
   tidak ada pemotongan sisa sesi.
7. **Coach** hanya bisa dipilih dari `package_coaches` paket terkait — komisi tetap kebaca.

---

## 5. Alur & Layar (UI)

Halaman **Booking → "Jadwal Sesi"**. Scope MVP: **per hari** (belum per minggu).

### ① Jadwal Sesi (layar utama)
- Pilih **tanggal** (default hari ini) + filter **paket** (opsional).
- Daftar sesi hari itu **diurut jam**. Tiap kartu: `jam · paket · coach · [terisi/kapasitas]`,
  warna hijau bila ada slot, merah bila penuh.
- Tombol **"+ Buat Sesi"**.

### ② Buat Sesi (modal)
- Pilih **paket** → kapasitas auto-isi dari `default_capacity` (bisa diubah).
- Pilih **coach** (hanya yang terhubung ke paket).
- **Tanggal + jam**. Simpan.

### ③ Detail Sesi + Peserta
- Header: jam, paket, coach, slot `5/8`.
- **Daftar peserta** (nama + status booked/attended).
- **"+ Daftarkan Member"** → pilih member; sistem cek paket aktif + sisa > 0 + slot.
  Bila tak punya paket → tolak dengan pesan jelas; bila penuh → tombol disabled.
- Per peserta: **Hadir** (kurangi sisa sesi, final) · **Batal** (slot balik kosong).

### Walk-in
Diganti: **daftarkan member ke sesi lalu tekan Hadir**. Tidak ada layar walk-in terpisah.

### Skenario "member tanya admin: saya bisa latihan kapan?"
Admin buka Jadwal Sesi → filter paket sesuai paket member → lihat sesi yang masih ada
slot → daftarkan member ke sesi itu.

---

## 6. Migrasi Data (branch `release/prod`, ada data booking lama)

- Tambah kolom `training_session_id` **nullable** di `bookings`.
- Booking lama **diarsipkan apa adanya** (laporan historis tetap valid). **Tidak ada**
  konversi paksa booking lama → sesi.
- Peserta baru selalu punya `training_session_id`; field legacy (`booking_time`,
  `coach_id`, dst.) tidak diisi lagi untuk peserta baru.

---

## 7. Komisi Coach

Logika `attend` tetap mencatat komisi coach. Sumber `coach_id` = dari **sesi** (bukan
per-booking lagi), persentase dari `package_coaches`. Query/invalidasi
`coachCommissions` menyesuaikan ke basis sesi.

---

## 8. Testing

Unit/integration test minimal:
- Tolak daftar saat sesi **penuh**.
- Tolak daftar saat member **tak punya paket aktif** untuk paket sesi.
- **Sisa sesi berkurang** tepat 1 saat Hadir; tidak berkurang saat hanya booked/cancelled.
- **Cegah duplikat** pendaftaran member ke sesi yang sama.
- **Race slot terakhir**: dua pendaftaran bersamaan, hanya satu berhasil.

---

---

## REVISI v2 (2026-06-13) — Model "assignment-centric" (MENGGANTIKAN bagian terkait di atas)

Berdasarkan foto jadwal nyata ("Aluna - Booking Schedule") + klarifikasi client, model berubah:
dalam **satu slot jam ada banyak coach** melayani service berbeda. Maka **coach & paket
BUKAN atribut sesi** — keduanya atribut **peserta**. Sesi = slot waktu + kapasitas member.

### v2.1 Perubahan model data
- **`packages`**: hapus relevansi `default_capacity` (kapasitas kini properti sesi, di-set admin saat buat sesi). Paket murni: harga + (opsional) jumlah sesi. Ada 2 jenis: **berbasis sesi** (`session_count` > 0) dan **durasi** (`session_count` null).
- **`training_sessions`**: **BUANG `package_id` & `coach_id`**. Sisakan: `training_session_id, studio_id, session_date, session_time, capacity (jumlah member), status`. Kapasitas = maksimal member per sesi (mis. 6); member ke-7 → sesi lain.
- **`bookings` (peserta)**: sumber kebenaran paket+coach+harga. Field sudah ada: `coach_id` (di-assign admin), `package_id`, `member_package_id`, `package_price`, `training_session_id`.
- **`package_coaches` (REPURPOSE → tarif komisi coach × service)**: fungsi whitelist gugur (coach bebas di-assign). Pakai sebagai tarif komisi per `(package_id, coach_id)`. Tambah kolom **`commission_flat numeric default 0`** (nominal komisi per hadir untuk paket durasi); `commission_percentage` existing untuk paket sesi.

### v2.2 Pendaftaran — `register_session_participant`
Parameter: `(p_training_session_id, p_member_id, p_member_package_id, p_coach_id, p_studio_id)`.
- Validasi `member_package` = milik member tsb, `active`, `remaining_sessions > 0`. (TIDAK lagi dikunci ke `package_id` sesi — sesi tak punya paket.)
- Kapasitas: `count(peserta non-cancelled di sesi) < capacity`. Lock baris sesi `FOR UPDATE` (tetap).
- Cegah duplikat member di sesi sama.
- Insert booking: `coach_id = p_coach_id`, `package_id`/`member_package_id`/`package_price` dari member_package terpilih, `training_session_id` dari sesi.

### v2.3 Komisi — `attend_booking` (formula baru)
Lookup tarif dari `package_coaches` by `(booking.package_id, booking.coach_id)`:
- **Paket berbasis sesi** (`packages.session_count > 0`):
  `komisi = (package_price / session_count) × commission_percentage / 100`
- **Paket durasi** (`session_count` null/0):
  `komisi = commission_flat` (nominal tetap per hadir)
- Bila tidak ada baris `package_coaches` untuk kombinasi itu → komisi 0 (admin perlu set tarif dulu).
- **Snapshot** nilai komisi ke `coach_commissions` saat hadir (jangan hitung ulang dari paket di laporan, karena harga/persen bisa berubah).
- Pengurangan `remaining_sessions` saat hadir tetap (paket durasi: bila tak berbasis sesi, tidak ada sisa sesi yang dikurangi — kehadiran dicatat saja).

### v2.4 UI
- **CreateSessionModal**: hanya tanggal + jam + kapasitas (hapus pilih paket & coach).
- **SessionDetailSheet**: tiap peserta tampil `member · service(paket) · coach · harga` (mirip baris spreadsheet). Form "Daftar" pilih **member + paket(member_package) + coach**.
- **BookingsPage**: kartu sesi tampil `jam · slot terisi/kapasitas` (tanpa paket/coach). Filter paket berbasis peserta (opsional) atau dihapus.
- **UI tarif komisi**: tempat admin set `commission_percentage` & `commission_flat` per coach × service (di menu Paket / Coach — pakai ulang UI package_coaches existing, relabel "Tarif Komisi").

### v2.5 Dampak implementasi
Branch `feature/jadwal-sesi` **direvisi** (bukan tulis ulang). Kompleksitas BESAR tapi fondasi
(RLS, RPC atomik row-lock, hooks, `bookings`) tetap dipakai. Lihat plan untuk task revisi.

---

## REVISI v3 (2026-06-13) — Paket berkategori + komisi per coach×kategori (MENGGANTIKAN bagian komisi v2)

Alur final: (1) daftar member → (2) beli paket → (3) bayar → (4) member ajukan jadwal →
(5) admin assign coach per peserta. Perubahan dari v2:

### v3.1 Paket
- **Hapus konsep "durasi".** Semua paket berbasis **jumlah sesi**.
- Paket punya **kategori**: `package_category` = `'reguler' | 'pribadi'`. Paket = nama + kategori + `session_count` + `package_price`. **Tidak ada coach di paket.**
- Kolom lama `package_type` ('session'/'duration') tidak dipakai lagi di UI (DB kolom dibiarkan default agar tidak merusak insert existing — cleanup belakangan).

### v3.2 Komisi — pindah ke COACH × kategori
- **`package_coaches` DIHAPUS** (dari kode: types, `usePackageCoaches`, UI Paket/Coach, seed, db, BackupSection). Tabel DB di-drop saat deploy (bukan sekarang — `attend_booking` v1 di prod masih refer).
- **`coaches` tambah 2 kolom:** `commission_regular_pct numeric default 0`, `commission_private_pct numeric default 0`. Di-set saat tambah/edit coach ("fee jika melatih paket reguler vs pribadi").
- **Formula komisi (attend):** `komisi = (package_price / session_count) × persen_kategori / 100`, dengan `persen_kategori` = `coaches.commission_regular_pct` bila paket kategori reguler, `commission_private_pct` bila pribadi. Snapshot ke `coach_commissions` saat hadir.
- Tidak ada lagi `commission_flat` / paket durasi (v2 dibatalkan untuk bagian ini).

### v3.3 Harga
- **Tetap dari paket** (tidak ada override per member). `register` mengisi `bookings.package_price` dari `packages.package_price`. (Param `p_price` register v2 boleh tetap ada — frontend kirim harga paket — agar tidak mengubah fungsi yang sudah ter-apply di prod.)

### v3.4 Pendaftaran & sesi (tetap dari v2)
- Sesi = slot (tanggal+jam+kapasitas member). Coach di-assign **per peserta** saat daftar (di foto: 1 jam banyak coach). Saat daftar: pilih member → member_package aktif → coach. Harga = harga paket (otomatis).
- Hadir → `remaining_sessions` berkurang.

### v3.5 attend_booking v3
`create or replace` (migration BARU, append-only — JANGAN edit 000001–000004 yang sudah di prod):
```
v_scount  := packages.session_count (by booking.package_id)
v_cat     := packages.package_category
v_pct     := case v_cat when 'pribadi' then coaches.commission_private_pct else coaches.commission_regular_pct end (by booking.coach_id)
komisi    := (booking.package_price / nullif(v_scount,0)) × coalesce(v_pct,0) / 100   -- 0 bila session_count 0/null
```

### v3.6 Cleanup (hapus yang tidak dipakai)
- Kode `package_coaches` / `PackageCoach` / `usePackageCoaches` / `commission_flat` (v2) → dihapus dari types, hooks, UI, seed, db, BackupSection.
- UI Paket: ganti pilihan tipe (sesi/durasi) → kategori (reguler/pribadi); hapus field durasi.

### v3.7 DB production — strategi aman
Migration v3 (000005 dst.) **tidak di-apply ke prod sekarang**. `attend_booking` prod tetap v1
(sudah di-rollback di 000004). Semua v3 di-apply **bersamaan dengan deploy frontend v3**, termasuk
drop `package_coaches`. Sampai itu: branch hanya build + unit test (tanpa DB).

---

## 9. Di Luar Scope (YAGNI — bisa menyusul)

- Template jadwal berulang (auto-generate sesi harian). MVP: buat sesi manual per hari.
- Tampilan kalender per minggu/bulan.
- Self-service member (member daftar sendiri).
- Konversi booking lama menjadi sesi.
- Undo "Hadir".
