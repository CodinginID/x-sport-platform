# Pro per-Halaman — lapisan premium di semua tampilan

> REQUIRED SUB-SKILL: superpowers:executing-plans. Branch `feature/pro-bundle`.

**Goal:** Tambah lapisan Pro (insight/visual) di halaman yang belum: **Pembayaran, Komisi, Penjualan, Produk, Member**. Semua gated `useFeature('pro')`. Fungsi inti tiap halaman TETAP GRATIS (lapisan Pro hanya tambahan di atas konten existing).

**Prinsip:** tanpa pro = halaman persis seperti sekarang (tidak ada regresi). Pakai recharts (sudah ada). Build hijau tiap task. JANGAN push/printer/DB.

---

Pola umum: `const isPro = useFeature('pro')`; bila isPro, render blok premium (grafik/insight) DI ATAS konten existing. Komponen grafik kecil boleh inline atau di file per modul.

## Task 1: Pembayaran (MemberPaymentPage)
- [ ] isPro → blok premium: grafik tren penerimaan harian (dari `payments` yg sudah di-fetch) + ringkasan per metode bayar (cash/transfer/qris). Tabel/hero existing tetap.

## Task 2: Komisi (CommissionsPage)
- [ ] isPro → grafik komisi per coach (bar) + tren harian. Konten existing tetap.

## Task 3: Penjualan (ProductSalesPage)
- [ ] isPro → grafik produk terlaris + tren omзет harian (dari sales existing). Konten existing tetap.

## Task 4: Produk (ProductsPage)
- [ ] isPro → insight: kartu ringkasan (nilai inventori = Σ stock×harga, jumlah low-stock) + highlight low-stock. Konten existing tetap.

## Task 5: Member (MembersPage)
- [ ] isPro → insight: segmentasi (aktif punya paket vs belum), jumlah paket mau habis (sisa ≤2 / mau expired), ringkasan. Konten existing tetap.

## Task 6: Verifikasi
- [ ] `npm run build && npx vitest run` — build hijau; test tidak bertambah gagal (baseline 8).
- [ ] Tanpa pro: tiap halaman = seperti sekarang. Dengan pro: blok premium muncul.

## Catatan
- Commit per task path spesifik. JANGAN git add -A/push/printer/migration/npm install.
- JANGAN kunci fungsi inti. Data ambil dari hook/fetch yang sudah ada di tiap halaman (hindari query berat baru bila bisa).
