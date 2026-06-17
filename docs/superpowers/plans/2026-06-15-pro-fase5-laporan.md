# Paket Pro — Fase 5: Laporan Premium (grafik + export Excel)

> REQUIRED SUB-SKILL: superpowers:executing-plans. Branch `feature/pro-bundle` (lanjutan).

**Goal:** Tambah lapisan premium di Laporan: (1) **grafik** ringkasan per tab (recharts), (2) **export Excel** (`xlsx`). Keduanya gated `pro`. **PDF export & tabel existing tetap GRATIS** (tidak dikunci).

**Prinsip:** fungsi inti (lihat laporan, export PDF) tetap gratis. Premium = grafik + Excel. Build hijau tiap task. JANGAN push/DB/printer.

---

## Task 1: Tambah dependency xlsx

**Modify:** `package.json`

- [ ] Tambah `"xlsx": "^0.18.5"` ke dependencies. (npm install dijalankan user/lead — JANGAN jalankan npm install sendiri.) Kode boleh ditulis memakai xlsx; build mungkin gagal sampai install — itu wajar, lapor di akhir.

## Task 2: Util export Excel

**Create:** `src/utils/excel.ts`

```ts
import * as XLSX from 'xlsx';
/** Export array of objects ke file .xlsx. */
export function exportToExcel(rows: Record<string, unknown>[], filename: string, sheetName = 'Sheet1') {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
```

## Task 3: Grafik premium per tab (gated pro)

**Modify:** `src/modules/reports/ReportsPage.tsx`

- [ ] `const isPro = useFeature('pro')` (dari @/hooks/useFeature).
- [ ] Untuk tab dgn data deret (sales, payments, commission, profit): bila `isPro`, render **grafik recharts** (mis. BarChart/LineChart agregasi per tanggal atau per kategori) DI ATAS tabel existing. Bila tidak pro → tabel saja (seperti sekarang).
- [ ] Komponen grafik kecil bisa dibuat inline atau file `src/modules/reports/ReportCharts.tsx` (opsional). Gaya zen.
- [ ] `npm run build` hijau (recharts sudah ada).

## Task 4: Tombol Export Excel (gated pro)

**Modify:** `src/modules/reports/ReportsPage.tsx`

- [ ] Di tiap tab yang punya export PDF, tambah tombol **"Export Excel"** yang HANYA tampil bila `isPro`. Panggil `exportToExcel(rows, namaFile)` dgn data tab aktif (bentuk rows yang rapi: kolom sesuai tabel). PDF export existing TIDAK diubah (tetap untuk semua).

## Task 5: Verifikasi

- [ ] `npm run build` (akan hijau setelah xlsx terpasang — bila belum, catat sebagai blocker install). `npx vitest run` — tidak ada kegagalan baru (baseline 8).
- [ ] Smoke: tanpa pro → laporan = tabel + PDF (seperti sekarang). Dengan pro → muncul grafik + tombol Export Excel.

## Catatan
- PDF export & tabel existing JANGAN dikunci (tetap gratis).
- Commit per task path spesifik. JANGAN git add -A, push, DB, printer. JANGAN jalankan npm install (lead yang install xlsx).
