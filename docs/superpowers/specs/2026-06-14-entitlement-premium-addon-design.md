# Desain: Entitlement & Premium Add-on Framework

**Tanggal:** 2026-06-14
**Status:** Disetujui (brainstorming) — siap masuk rencana implementasi
**Tujuan:** Monetisasi via fitur premium add-on per studio, diaktifkan manual oleh superadmin, dengan kerangka yang siap berkembang jadi marketplace.

---

## 1. Latar Belakang

Aplikasi sudah punya sistem lisensi per-studio (`licenses`, `LicenseGuard`, `validateLicense`)
dengan field `plan` (basic/pro/enterprise) yang saat ini hanya ditampilkan. Pemilik produk
ingin menjual **fitur premium add-on per fitur** (bukan sekadar tier), dimulai dari satu
fitur, tapi fondasinya siap untuk **marketplace add-on** ke depan.

Model bisnis v1: studio bayar (transfer), **superadmin mengaktifkan** fitur untuk studio itu
secara manual (seperti alur approve lisensi). Belum ada payment gateway.

**Fitur premium pertama (arah):** "cari tanggal/slot sesi yang masih kosong dengan paling
mudah" (availability finder). **Desain visualnya dibrainstorm terpisah** — spec ini fokus ke
KERANGKA entitlement, bukan UI premium-nya.

---

## 2. Keputusan Inti

- **Entitlement = daftar fitur per lisensi** (bukan satu tier). Disimpan sebagai jsonb array.
- **Pendekatan A** (jsonb di `licenses`), bukan tabel relasional penuh — YAGNI; migrasi ke
  relasional mudah bila marketplace tumbuh.
- **Gating client-side** cukup untuk v1: entitlement ikut payload `validateLicense` yang sudah
  divalidasi server tiap sesi. Fitur premium pertama bersifat kosmetik/presentasional (data
  sama), jadi risiko revenue dari bypass rendah. Fitur sensitif di masa depan bisa diperketat
  server-side.
- **Aktivasi manual** oleh superadmin via toggle per fitur per studio.
- **Satu codebase.** Fitur premium TIDAK di branch terpisah permanen — disembunyikan oleh
  `<FeatureGate>`. Branch hanya untuk pengembangan, lalu di-merge.

---

## 3. Model Data

### 3.1 `licenses` — tambah kolom
| Kolom | Tipe | Keterangan |
|---|---|---|
| `features` | jsonb, not null, default `'[]'` | Array string fitur aktif, mis. `["premium_booking"]` |

### 3.2 Payload validasi lisensi
`validateLicense` & `LicenseInfo` (`src/types/index.ts`) menyertakan `features: string[]`.
Tersimpan di `licenseInfo` (auth store) → tersedia di seluruh app tanpa fetch tambahan.

### 3.3 Katalog fitur (frontend, sumber kebenaran daftar fitur)
`src/config/features.ts`:
```ts
export const FEATURES = {
  premium_booking: {
    label: 'Tampilan Booking Premium',
    description: 'Cari tanggal & slot sesi kosong dengan lebih mudah.',
  },
} as const;
export type FeatureKey = keyof typeof FEATURES;
```
Dipakai oleh: panel toggle superadmin (render daftar) & dokumentasi marketplace nanti.

---

## 4. Komponen Frontend

### 4.1 `useFeature(key: FeatureKey): boolean`
`src/hooks/useFeature.ts` — baca `licenseInfo.features` dari auth store, kembalikan apakah
`key` ada. Superadmin (role superadmin) dianggap selalu punya akses (untuk preview/QA).

### 4.2 `<FeatureGate feature fallback>`
`src/components/FeatureGate.tsx`:
```tsx
<FeatureGate feature="premium_booking" fallback={<JadwalSesiDefault/>}>
  <JadwalSesiPremium/>
</FeatureGate>
```
Render `children` bila `useFeature(feature)` true, selain itu `fallback` (default UI). Bila
`fallback` tidak diberi → render `null`.

---

## 5. Aktivasi oleh Superadmin

Di area SuperAdmin (`SuperAdminPage` / `LicensesPage`), tiap lisensi punya panel
**"Add-on / Fitur Premium"**:
- Render daftar fitur dari `FEATURES` (katalog), tiap fitur punya **toggle** on/off.
- Toggle menulis `licenses.features` (tambah/hapus string) via mutation Supabase
  (`update licenses set features = ... where id = ...`).
- Studio melihat efeknya pada validasi lisensi berikutnya (refresh/sesi baru).

**Alur jual v1:** studio bayar → superadmin toggle fitur ON → fitur tampil di app studio.

---

## 6. Fitur Premium Pertama (placeholder gate)

`BookingsPage` membungkus tampilan dengan gate:
```tsx
<FeatureGate feature="premium_booking" fallback={<current default list>}>
  <PremiumBookingView/>
</FeatureGate>
```
Untuk spec INI, `PremiumBookingView` cukup berupa **placeholder minimal** (atau sementara =
default view) — pembuktian kerangka gating bekerja. **Desain & implementasi UI premium
(availability finder) = brainstorm + spec terpisah.**

---

## 7. Workflow Git & Rilis

1. **Sekarang:** `feature/jadwal-sesi` → merge `release/prod` → rilis (fitur sesi inti +
   perbaikan printer; semua studio).
2. **`feature/entitlement-framework`:** Bagian 3–5 (kolom `features`, `useFeature`,
   `FeatureGate`, katalog, toggle superadmin) + gate placeholder di booking → merge → rilis.
   Tidak mengubah tampilan studio manapun (belum ada fitur premium nyata).
3. **`feature/premium-booking-availability`:** fitur "cari slot kosong" di balik
   `FeatureGate` → merge → rilis. Muncul hanya untuk studio yang di-ON-kan.

Satu codebase; gating by entitlement, bukan pemisahan branch permanen.

---

## 8. Testing
- Unit: `useFeature` (ada/tidak ada fitur; superadmin selalu true).
- Unit: `FeatureGate` (render children vs fallback).
- Manual: superadmin toggle fitur → studio melihat gate terbuka setelah validasi ulang.

---

## 9. Di Luar Scope (YAGNI)
- Payment gateway / self-serve purchase (v1 manual superadmin).
- Tabel relasional katalog fitur + metadata harga (cukup jsonb + katalog frontend).
- Server-side hard enforcement (cukup client-side untuk fitur kosmetik).
- Desain visual & implementasi "Premium Booking / availability finder" (spec terpisah).
