# Paket Pro — Fase 1: Fondasi + Dashboard Premium

> REQUIRED SUB-SKILL: superpowers:executing-plans. Steps checkbox.

**Goal:** (A) Konsolidasi entitlement ke satu key `pro`. (B) Dashboard premium ber-grafik di balik `FeatureGate feature="pro"`, fallback dashboard default tetap gratis.

**Spec:** `docs/superpowers/specs/2026-06-15-paket-pro-bundle-design.md`. **Branch:** `feature/pro-bundle` (dari release/prod).

**Prinsip:** fungsi inti gratis; Pro = lapisan UI/insight. Build hijau tiap task. JANGAN push.

---

## Task 1: Konsolidasi katalog fitur → `pro`

**Modify:** `src/config/features.ts`

- [ ] Ganti entry `premium_booking` menjadi `pro`:
```ts
export const FEATURES = {
  pro: {
    label: 'Paket Pro',
    description: 'Buka semua tampilan premium: dashboard grafik, jadwal cantik, laporan, dan UI yang lebih mulus.',
    trial_days: 3,
    details: [
      'Dashboard grafik & insight: tren pendapatan, kehadiran, jam tersibuk, okupansi',
      'Jadwal sesi tampilan premium: cari slot kosong lebih cepat',
      'Dropdown & loading yang lebih mulus saat memuat data',
      'Laporan dengan grafik + export PDF/Excel',
    ],
  },
} as const;
export type FeatureKey = keyof typeof FEATURES;
export const FEATURE_KEYS = Object.keys(FEATURES) as FeatureKey[];
```

## Task 2: Update semua referensi `premium_booking` → `pro`

**Modify:** `src/modules/bookings/BookingsPage.tsx` (FeatureGate feature → `pro`),
`src/modules/addons/AddonsPage.tsx` (FEATURE_PREVIEWS key → `pro`),
`src/test/useFeature.test.ts` (semua `'premium_booking'` → `'pro'`).
`src/test/featureState.test.ts` boleh tetap (key string arbitrary), tapi ganti ke `'pro'` agar konsisten.

- [ ] `grep -rn "premium_booking" src/` → ganti semua ke `pro`. `npm run build` hijau, `npx vitest run src/test/useFeature.test.ts src/test/featureState.test.ts` lulus.

## Task 3: Install recharts

- [ ] `npm install recharts`. Pastikan masuk dependencies. `npm run build` hijau.

## Task 4: Hook data dashboard premium (time-series)

**Create:** `src/hooks/useDashboardPro.ts`

Query data untuk grafik & insight (scope studio):
- Pendapatan harian 30 hari terakhir: gabung `member_payments.amount` by `payment_date` + `product_sales.total` by `transaction_date`.
- Kehadiran harian 30 hari: `bookings` status `attended` group by `booking_date`.
- Okupansi sesi: dari `training_sessions` + jumlah peserta (`bookings` non-cancelled) → rata-rata terisi/kapasitas.
- Jam tersibuk: hitung distribusi `bookings.booking_time`.
- Paket/coach terlaris: agregasi sederhana.
Pakai pola hook existing (getStudioId, react-query). Kembalikan struktur siap pakai chart.

- [ ] Implementasi + `npm run build` hijau.

## Task 5: Komponen Dashboard premium

**Create:** `src/modules/dashboard/DashboardPro.tsx`

Render dengan `recharts`:
- KPI cards (pendapatan bulan ini, kehadiran, member aktif, okupansi rata-rata).
- Area/line chart pendapatan 30 hari.
- Bar chart kehadiran harian / jam tersibuk.
- List "paket terlaris" & "coach teraktif".
Gaya visual ikut tema zen (rounded-3xl, zen-brand). Responsif.

- [ ] Implementasi + `npm run build` hijau.

## Task 6: Gate Dashboard

**Modify:** `src/modules/dashboard/DashboardPage.tsx`

- [ ] Bungkus: `<FeatureGate feature="pro" fallback={<DashboardDefaultExisting/>}><DashboardPro/></FeatureGate>`. Pertahankan dashboard existing sebagai fallback (extract isi existing jadi komponen lokal `DashboardDefault` bila perlu). `npm run build` hijau.

## Task 7: Preview Dashboard di marketplace (multi-tab)

**Create:** `src/modules/addons/DashboardProPreview.tsx` (render DashboardPro dgn data contoh, read-only).
**Modify:** `src/modules/addons/AddonsPage.tsx` — preview jadi multi-tab: tab "Jadwal" (PremiumBookingPreview existing) + tab "Dashboard" (DashboardProPreview). Registry `FEATURE_PREVIEWS['pro']` = komponen multi-tab.

- [ ] Implementasi + `npm run build` hijau.

## Task 8: Verifikasi

- [ ] `npm run build && npx vitest run` — build hijau; test useFeature/featureState lulus; kegagalan lain tidak bertambah dari baseline.
- [ ] Smoke manual: superadmin aktifkan `pro` → owner lihat Dashboard premium + booking premium; preview multi-tab tampil.

## Catatan
- Branch `feature/pro-bundle`. JANGAN push. JANGAN sentuh file printer/core di luar scope.
- Commit per task dgn path spesifik.
