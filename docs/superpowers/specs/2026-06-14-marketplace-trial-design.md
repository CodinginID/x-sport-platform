# Desain: Marketplace Add-on + Trial

**Tanggal:** 2026-06-14
**Status:** Disetujui (brainstorming) — siap masuk rencana implementasi
**Tujuan:** Menu marketplace fitur premium add-on dengan trial self-serve (default 3 hari, sekali per fitur), lalu beli via konfirmasi WhatsApp → diaktifkan superadmin.

**Membangun di atas:** spec entitlement (`2026-06-14-entitlement-premium-addon-design.md`) — **merevisi** model `features` dari `string[]` ke object ber-status. Dikerjakan di branch `feature/entitlement-framework` (belum di-merge).

---

## 0. Prinsip — HANYA fitur add-on
Entitlement/marketplace/trial **HANYA** mengatur fitur premium add-on. **Fitur utama
(member, booking dasar, produk, pembayaran, paket, coach, laporan, dll) TIDAK disentuh** —
selalu tersedia tanpa gating. `FeatureGate` hanya membungkus lapisan premium; tanpa
entitlement, jatuh ke tampilan default (fitur inti tetap jalan).

---

## 1. Model Data (revisi)

`licenses.features` berubah dari `string[]` → **jsonb object** ber-status:
```json
{
  "premium_booking": {
    "status": "trial",            // 'trial' | 'active'
    "trial_ends_at": "2026-06-17T10:00:00Z",
    "trial_used": true
  }
}
```
- Key tidak ada → fitur **terkunci** (belum pernah disentuh).
- `status: 'active'` → aktif permanen (ikut masa lisensi, tanpa expiry terpisah).
- `status: 'trial'` + `trial_ends_at` → aktif selama `now < trial_ends_at`; lewat itu →
  terkunci (dihitung **lazy** saat render, tanpa cron).
- `trial_used: true` → trial sudah dipakai, tidak bisa trial lagi.

Migrasi: kolom `features` sudah ada (jsonb default `[]` dari spec sebelumnya). Karena app
belum punya user, ubah default ke `'{}'::jsonb` dan tidak perlu konversi data lama.

---

## 2. Katalog Fitur (revisi `src/config/features.ts`)
```ts
export const FEATURES = {
  premium_booking: {
    label: 'Tampilan Booking Premium',
    description: 'Cari tanggal & slot sesi kosong dengan lebih mudah.',
    trial_days: 3,
    price: 99000,            // Rp, ditampilkan di alur beli
  },
} as const;
export type FeatureKey = keyof typeof FEATURES;
export const FEATURE_KEYS = Object.keys(FEATURES) as FeatureKey[];

export const ADMIN_WA = '628xxxxxxxxxx'; // nomor WhatsApp admin (placeholder, diisi nyata)
```

### Helper status (dipakai marketplace + superadmin)
`featureState(features, key, nowISO)` → salah satu:
`'locked' | 'trial' | 'trial_expired' | 'active'`, plus `trialDaysLeft` bila trial.
- `active` → status active
- `trial` → status trial & now < trial_ends_at
- `trial_expired` → status trial & now >= trial_ends_at
- `locked` → key tidak ada

---

## 3. Gating (`useFeature`)
`useFeature(key)` true bila: role superadmin, ATAU `featureState === 'active'`, ATAU
`featureState === 'trial'`. False untuk `locked`/`trial_expired`.

---

## 4. Mulai Trial — RPC `start_feature_trial`
Self-serve oleh owner. RPC (security definer) untuk menegakkan aturan server-side:
`start_feature_trial(p_license_id uuid, p_feature text, p_trial_days int, p_studio_id uuid)`:
1. Ambil baris `licenses` (scope `id` + cocok dengan sesi studio).
2. Baca `features->p_feature`. Bila sudah ada (`trial_used` true atau status apapun) → raise
   `'Trial sudah pernah dipakai'`.
3. Set `features = jsonb_set(features, '{p_feature}', {status:'trial', trial_ends_at: now()+interval, trial_used:true})`.
4. Return ok.

> Status `active` TIDAK bisa di-set lewat RPC ini — hanya superadmin (Bagian 6).

---

## 5. Halaman Marketplace `/addons`
- Menu nav baru **"Add-on"** (owner-only; staff tidak melihat).
- Kartu per fitur dari `FEATURE_KEYS`, tampil sesuai `featureState`:

| State | Tampilan | Aksi |
|---|---|---|
| `locked` | "Coba gratis {trial_days} hari" | **Coba {trial_days} Hari** → `start_feature_trial` |
| `trial` | "Trial — sisa {trialDaysLeft} hari" | **Beli Sekarang** → modal beli |
| `trial_expired` | "Trial selesai — beli untuk lanjut" | **Beli Sekarang** → modal beli |
| `active` | badge "✓ Aktif" | — |

**Modal Beli:** tampil harga (`FEATURES[key].price`) + instruksi transfer + tombol
**Konfirmasi via WhatsApp** = link `https://wa.me/${ADMIN_WA}?text=...` ter-isi otomatis
(nama studio + label fitur + license key). Setelah owner konfirmasi & transfer, superadmin
yang mengaktifkan.

---

## 6. Sisi Superadmin (revisi panel di `LicensesPage`)
Panel "Add-on / Fitur Premium" per lisensi (sudah ada dari spec sebelumnya) diperluas dari
on/off → **status-aware**:
- Tampilkan state tiap fitur (Terkunci / Trial sisa N hari / Trial habis / Aktif).
- Aksi superadmin: **Aktifkan** (set `status:'active'`) — dipakai setelah konfirmasi bayar;
  **Cabut** (hapus key / set locked). Menulis `licenses.features` langsung (pola existing).

---

## 7. Contoh konsumen: Booking
Badge "✨ Premium" di header Booking tetap (placeholder dari spec sebelumnya) — kini terbuka
saat trial maupun active. Fitur premium NYATA (availability finder) menyusul terpisah.

---

## 8. Enforcement (catatan)
Gating & trial-expiry dihitung client-side dari payload `validateLicense` (divalidasi server
tiap sesi). Mulai trial via RPC (server menegakkan sekali-per-fitur). Status `active` di-set
superadmin. Lisensi memang client-writable di app ini (posture existing), jadi bypass `active`
punya risiko sama seperti bagian lain — untuk fitur add-on kosmetik, diterima v1. Fitur
sensitif di masa depan bisa diperketat server-side.

---

## 9. Workflow Git
Semua dikerjakan di **`feature/entitlement-framework`** (belum di-merge): revisi model
`string[]`→object, `useFeature`, panel superadmin; tambah RPC `start_feature_trial`, halaman
`/addons` + menu, helper `featureState`, alur WA. Lalu merge `release/prod` → rilis.

---

## 10. Testing
- `featureState`: locked/trial/trial_expired/active + trialDaysLeft (unit, pakai nowISO param).
- `useFeature`: active true, trial true, trial_expired false, locked false, superadmin true.
- Manual: owner Coba 3 Hari → terbuka; trial kedua ditolak; lewat tanggal → terkunci; Beli →
  WA link benar; superadmin Aktifkan → aktif.

---

## 11. Di Luar Scope (YAGNI)
- Payment gateway otomatis (pakai konfirmasi WA + aktivasi superadmin).
- Tabel `license_features` relasional (cukup jsonb object).
- Expiry/langganan per-fitur (active ikut masa lisensi).
- Pengingat otomatis trial mau habis (cukup countdown di kartu).
- UI & implementasi fitur premium nyata "availability finder" (spec terpisah).
