# Superadmin Restructure — /licenses jadi 3 tab

> REQUIRED SUB-SKILL: superpowers:executing-plans. Branch `feature/pro-bundle`.

**Goal:** Pecah `src/modules/superadmin/LicensesPage.tsx` jadi shell ber-tab: **Dashboard** (insight cantik), **Lisensi** (list+filter+aksi existing), **Pengaturan** (AddonConfigPanel existing). Siap berkembang.

**Prinsip:** tidak menghilangkan fungsi existing (approve/disable/reset activation/toggle fitur/config). Build hijau tiap task. JANGAN push/printer/DB migration.

---

## Task 1: Hook data dashboard superadmin
**Create:** `src/hooks/useSuperadminStats.ts` (atau hitung di komponen dari `licenses` + `sessions` yang sudah di-fetch di LicensesPage). Boleh derive dari data existing tanpa query baru.
Data: total, aktif, online, menunggu, dinonaktifkan, mau expired (≤14 hari), jumlah pakai Pro (features.pro status active/trial), pendaftaran per bulan (dari created_at), distribusi plan.

## Task 2: Komponen tab
**Create:**
- `src/modules/superadmin/tabs/SuperDashboardTab.tsx` — KPI cards + grafik pendaftaran per bulan (recharts BarChart) + distribusi plan + list "mau expired ≤14 hari". Gaya zen/glass-card.
- `src/modules/superadmin/tabs/SettingsTab.tsx` — pindahkan `AddonConfigPanel` ke sini (boleh import dari LicensesPage atau extract ke file sendiri `src/modules/superadmin/AddonConfigPanel.tsx` lalu dipakai SettingsTab).
- `src/modules/superadmin/tabs/LicenseListTab.tsx` — pindahkan konten list (search, filter tab status, daftar LicenseTableRow, pagination/footer) ke sini. Terima props/handlers yang perlu dari LicensesPage (atau pindah state terkait ke tab ini).

> Catatan: agar minim risiko, boleh pertahankan logika fetch + handlers di `LicensesPage` dan oper ke tab via props; ATAU pindahkan utuh ke LicenseListTab. Pilih yang paling rapi & build hijau.

## Task 3: Shell tab di LicensesPage
**Modify:** `src/modules/superadmin/LicensesPage.tsx` — header "Manajemen Lisensi" + **tab switcher** (Dashboard / Lisensi / Pengaturan), render tab aktif. AddonConfigPanel TIDAK lagi di atas list (pindah ke tab Pengaturan). Stats strip pindah ke Dashboard.

## Task 4: Verifikasi
- [ ] `npm run build && npx vitest run` — build hijau; test tidak bertambah gagal (baseline 8).
- [ ] Semua fungsi existing tetap jalan: approve, reject, disable, enable, reset activation, force logout, copy key, toggle fitur per lisensi, simpan config add-on.

## Catatan
- Commit per task path spesifik. JANGAN git add -A/push/printer/migration/npm install. recharts sudah terpasang.
- Jaga file < 500 baris bila bisa (pecah ke tabs/).
