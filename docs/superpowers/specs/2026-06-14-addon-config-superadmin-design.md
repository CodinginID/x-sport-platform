# Desain: Konfigurasi Add-on oleh Superadmin

**Tanggal:** 2026-06-14
**Status:** Disetujui (brainstorming) — implementasi langsung
**Tujuan:** Harga per fitur, nomor WA admin, dan info rekening pembayaran dikonfigurasi superadmin (tidak hardcoded).

**Lanjutan:** marketplace+trial (`2026-06-14-marketplace-trial-design.md`). Branch `feature/entitlement-framework`.

---

## 1. Model Data — tabel `platform_config` (single-row global)
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | int primary key default 1 (check id=1) | singleton |
| `admin_wa` | text default '' | nomor WA admin (format internasional tanpa +) |
| `bank_name` | text default '' | mis. "BCA" |
| `bank_account_number` | text default '' | no rekening |
| `bank_account_holder` | text default '' | atas nama |
| `feature_prices` | jsonb default '{}' | `{ "premium_booking": 99000 }` |
| `updated_at` | timestamptz default now() | |

**RLS:** anon **SELECT** boleh (marketplace owner baca harga/rekening/WA). Tulis hanya via
**service key** (dashboard /superadmin bypass RLS) — owner tidak bisa ubah harga.
Seed 1 baris (`insert ... id=1 on conflict do nothing`).

## 2. Katalog `features.ts` (revisi)
Buang `price` & `ADMIN_WA`. Sisakan `label`, `description`, `trial_days`.

## 3. Sisi Owner (marketplace)
- Hook `usePlatformConfig()` (anon query single-row `platform_config`).
- `AddonsPage`: harga per fitur dari `config.feature_prices[key]` (fallback "—"); modal beli
  tampil **info rekening** (bank/no/nama) + tombol WhatsApp ke `config.admin_wa`. Bila WA kosong
  → tombol disabled + pesan "hubungi admin".

## 4. Sisi Superadmin (`/superadmin` dashboard)
Card **"Pengaturan Add-on"** (setelah Stats, sebelum Tabel). Form: `admin_wa`, `bank_name`,
`bank_account_number`, `bank_account_holder`, dan **harga per fitur** (loop `FEATURE_KEYS`).
Baca & simpan via `adminClient` (service key) ke `platform_config` id=1.

## 5. Testing
- Manual: superadmin isi config → owner marketplace lihat harga & rekening; tombol WA benar.
- Build hijau; test existing tidak bertambah gagal.

## 6. Di Luar Scope
- Per-studio pricing (harga global per fitur, sama semua studio).
- Multi-rekening (satu rekening).
