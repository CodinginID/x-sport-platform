# Paket Pro — Fase 4: Jadwal Booking Premium+

> REQUIRED SUB-SKILL: superpowers:executing-plans. Branch `feature/pro-bundle` (lanjutan).

**Goal:** Perkaya tampilan jadwal premium (`SchedulePremium`) yang sudah ada dengan: (1) filter **"hanya yang ada slot kosong"**, (2) **ringkasan okupansi per tanggal** (heatmap warna), (3) info slot lebih jelas. Hanya aktif saat `pro` (BookingsPage sudah gate `pro` → premium, fallback `ScheduleDefault` gratis). Tidak ada perubahan DB.

**Prinsip:** default (gratis) tidak berubah. Build hijau tiap task. JANGAN push/sentuh DB/printer.

---

## Task 1: Filter "ada slot kosong" + ringkasan di view premium

**Modify:** `src/modules/bookings/ScheduleViews.tsx` (`SchedulePremium`), `src/modules/bookings/BookingsPage.tsx`

- [ ] Tambah prop/kontrol **toggle "Hanya ada slot kosong"** untuk view premium. Saat aktif, sembunyikan sesi yang penuh. Letakkan toggle di BookingsPage (hanya tampil saat pro — bisa cek `useFeature('pro')`), diteruskan ke SchedulePremium, ATAU kelola di dalam SchedulePremium sendiri (state lokal) — pilih yang paling rapi.
- [ ] Tiap kartu tanggal di SchedulePremium: tambah indikator **okupansi** (mis. bar/persentase total terisi vs total kapasitas hari itu) sebagai "heatmap" warna (hijau banyak slot, kuning sedang, merah hampir penuh).
- [ ] `npm run build` hijau.

## Task 2: Heatmap warna per tanggal

**Modify:** `src/modules/bookings/ScheduleViews.tsx`

- [ ] Hitung okupansi harian = sum(terisi)/sum(kapasitas) untuk sesi di tanggal itu. Warnai header kartu tanggal sesuai rasio (mis. <50% hijau, 50–85% kuning, >85% merah). Tampilkan teks "X slot kosong dari Y total".
- [ ] `npm run build` hijau.

## Task 3: Verifikasi

- [ ] `npm run build && npx vitest run` — build hijau; test tidak bertambah gagal (baseline 8).
- [ ] Smoke: pro aktif → toggle "ada slot kosong" menyaring; heatmap warna muncul. Tanpa pro → ScheduleDefault tetap (tidak berubah).

## Catatan
- Jangan ubah ScheduleDefault (versi gratis). Commit per task path spesifik. JANGAN push/DB/printer.
- Preview (DashboardProPreview/PremiumBookingPreview) tetap berfungsi; PremiumBookingPreview pakai SchedulePremium — pastikan masih jalan dgn data dummy.
