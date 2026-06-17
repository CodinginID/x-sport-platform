# Desain: Paket Pro (Bundle Premium)

**Tanggal:** 2026-06-15
**Status:** Disetujui (brainstorming) — dipecah jadi sub-proyek bertahap
**Tujuan:** Satu langganan "Pro" membuka semua tampilan/insight premium. Fungsi inti tetap gratis.

**Membangun di atas:** entitlement + marketplace + trial yang sudah ada. Branch kerja: per-fase.

---

## 0. Prinsip
Fungsi INTI gratis. Pro = lapisan **UI cantik + insight** di balik satu entitlement `pro`.
Beli sekali → semua fitur Pro terbuka. Trial & beli pakai mekanisme yang sudah jadi.

## 1. Konsolidasi entitlement → satu key `pro`
- Katalog `src/config/features.ts`: ganti `premium_booking` → **`pro`** (label "Paket Pro",
  description bundle, `details[]` mencakup semua benefit, `trial_days: 3`).
- Semua `<FeatureGate>` & `useFeature` pakai key `pro` (gate booking yang ada → `pro`).
- Superadmin & marketplace: 1 kartu "Paket Pro". Preview **multi-tab** (Booking/Dashboard/dst).
- `featureState`/trial/`pay`/cancel — tidak berubah (bekerja per-key, sekarang key-nya `pro`).

## 2. Isi Pro v1 (dipilih user) — dikerjakan BERTAHAP, semua gated `pro`
| Fase | Sub-fitur | Catatan |
|---|---|---|
| 1 | **Fondasi Pro** | konsolidasi key `pro`, kartu Pro, shell preview multi-tab |
| 2 | **Dashboard premium** | grafik tren pendapatan & kehadiran, KPI, jam tersibuk, okupansi, terlaris (lib `recharts`) |
| 3 | **Dropdown/Select cantik + skeleton** | komponen reusable: searchable select + skeleton loading saat fetch, dipakai lintas halaman |
| 4 | **Jadwal booking premium+** | kalender mingguan + filter "ada slot saja" + heatmap (lengkapi view premium yg ada) |
| 5 | **Laporan + export** | grafik + export PDF (`jsPDF` ada) & Excel (lib `xlsx`) |

Tiap fase = spec/plan/implementasi sendiri. Default (gratis) tetap dirender sebagai fallback
`FeatureGate`. Tidak ada fungsi inti yang dikunci.

## 3. Preview multi-tab
Modal preview di marketplace punya tab per area (Booking/Dashboard/Laporan), tiap tab render
komponen premium asli dgn data contoh (pola `PremiumBookingPreview` yang sudah ada).

## 4. Dependensi baru
- `recharts` (grafik dashboard & laporan).
- `xlsx` (export Excel laporan). `jsPDF`/autotable sudah ada untuk PDF.

## 5. Di luar scope (nanti)
Tema/branding, member insight, komisi premium grafik — fase lanjutan setelah v1.

---

## Catatan eksekusi
Migrasi data: tidak perlu (key entitlement berubah di kode + katalog; data `features` lama
yang masih pakai `premium_booking` boleh diabaikan/di-set ulang oleh superadmin karena belum ada user).
