# Design: Cetak Struk via Printer Bluetooth (ESC/POS Web Bluetooth)

- **Tanggal:** 2026-06-08
- **Branch:** `feature/bluetooth-receipt-printer` (dari `release/prod`)
- **Issue:** [#38](https://github.com/CodinginID/x-sport-platform/issues/38)
- **Status:** Disetujui (siap masuk perencanaan implementasi)

## 1. Latar Belakang

Saat ini aplikasi membuat struk sebagai **PDF jsPDF** (format 80mm) lalu menampilkannya di modal `PrintPreview`, di mana tombol "Cetak" hanya memanggil `iframe.contentWindow.print()` — yaitu dialog print bawaan browser/OS. Tidak ada koneksi langsung ke printer thermal, tidak ada auto-print, dan tidak ada kontrol printer dari dalam aplikasi.

File terkait yang ada:
- `src/utils/pdf.ts` — `generateSaleReceipt()`, `generatePaymentReceipt()` (jsPDF 80mm), `previewPdf()`, `downloadPdf()`
- `src/components/PrintPreview.tsx` — modal preview + `window.print()`
- `src/modules/payments/ProductSalesPage.tsx` — tombol cetak struk penjualan (baris ~209)
- `src/modules/payments/MemberPaymentPage.tsx` — tombol cetak struk pembayaran

## 2. Tujuan

Menambahkan dukungan cetak struk **langsung ke printer thermal Bluetooth** menggunakan perintah **ESC/POS** lewat **Web Bluetooth API**, dengan auto-print saat transaksi selesai dan PDF tetap sebagai cadangan.

### Keputusan desain (hasil brainstorming)
- **Target perangkat:** Android (Chrome) + Desktop (Chrome/Edge). Web Bluetooth **tidak** didukung iOS/Safari.
- **Ukuran kertas:** dukung **58mm (32 kolom)** & **80mm (48 kolom)**, dipilih di pengaturan. Unit printer belum dibeli.
- **Alur cetak utama:** **auto-print saat transaksi tersimpan**, plus tombol cetak ulang manual; PDF tetap sebagai cadangan bila printer tak terhubung.
- **Pendekatan:** Opsi A — kirim byte ESC/POS langsung ke karakteristik GATT. (Bukan raster image; logo bitmap ditunda — YAGNI.)

### Non-tujuan (di luar lingkup sekarang)
- Logo/gambar bitmap pada struk (raster ESC/POS).
- Cetak via USB/serial atau WebUSB.
- Dukungan iOS native / bridge app.
- QR code / barcode pada struk.

## 3. Arsitektur

Tiga lapisan terisolasi + store preferensi:

```
ProductSalesPage / MemberPaymentPage (UI)
        │  printReceipt(data)
        ▼
src/services/btPrinter.ts   ← koneksi Web Bluetooth + kirim byte (chunking MTU)
        │  memakai
        ▼
src/services/escpos.ts      ← encoder ESC/POS murni (data → Uint8Array), tanpa Bluetooth
        ▲
src/stores/printer.ts       ← Zustand persist: device tersimpan, ukuran kertas, auto-print
```

**Alasan pemisahan:** `escpos.ts` adalah modul murni tanpa dependensi browser sehingga mudah di-unit-test secara deterministik (input data → output byte). `btPrinter.ts` hanya mengurus transport Bluetooth. `printer.ts` hanya menyimpan preferensi. Tiap unit punya satu tanggung jawab, antarmuka jelas, dan bisa diubah tanpa merusak konsumen.

## 4. Komponen & Antarmuka

### 4.1 `src/services/escpos.ts` (modul murni)

Builder kelas/fungsi yang menghasilkan `Uint8Array` berisi perintah ESC/POS. Tidak menyentuh Web Bluetooth.

Kemampuan minimum:
- `init()` — `ESC @` reset
- `align(left|center|right)`
- `bold(on|off)`, `size(normal|double)`
- `text(str)` / `line(str)` (otomatis newline)
- `divider()` — garis pemisah selebar kolom kertas
- `feed(n)`, `cut()` (partial cut; aman diabaikan printer tanpa cutter)
- Helper `row(left, right)` — teks kiri & kanan ter-justify sesuai lebar kolom (32 atau 48)
- Encoding teks ke byte (CP437/ASCII; karakter non-ASCII di-fallback aman)

Builder konten struk (memakai builder di atas, meniru isi `pdf.ts`):
- `buildSaleReceipt(sale, paperSize): Uint8Array`
- `buildPaymentReceipt(payment, paperSize): Uint8Array`
- `buildTestReceipt(paperSize): Uint8Array`

`paperSize` menentukan jumlah kolom (58mm → 32, 80mm → 48). Nama & alamat studio diambil dari `useStudioStore` oleh pemanggil dan diteruskan sebagai data (builder tetap murni).

### 4.2 `src/services/btPrinter.ts` (transport)

- `isSupported(): boolean` — cek `navigator.bluetooth`.
- `connect(): Promise<BluetoothDevice>` — `requestDevice` dengan filter service printer umum (mis. `000018f0-...` / serial port profile; pakai `acceptAllDevices` + `optionalServices` bila perlu), connect GATT, simpan referensi device & characteristic.
- `reconnect(): Promise<boolean>` — best-effort via `navigator.bluetooth.getDevices()` untuk device tersimpan (tanpa prompt) lalu connect GATT.
- `print(bytes: Uint8Array): Promise<void>` — tulis ke characteristic dengan **chunking** (~512 byte/tulis, `writeValueWithoutResponse` bila ada, jeda kecil antar-chunk agar buffer printer tak overflow).
- `disconnect()` / event `gattserverdisconnected` → update status.
- Status koneksi diekspos agar UI bisa menampilkan indikator.

### 4.3 `src/stores/printer.ts` (Zustand, persist)

State:
- `deviceId?: string`, `deviceName?: string` — printer tersimpan
- `paperSize: '58' | '80'` (default `'58'`)
- `autoPrint: boolean` (default `true`)
- `status: 'disconnected' | 'connecting' | 'connected'`
Aksi: `setPaperSize`, `setAutoPrint`, `setDevice`, `forgetDevice`, `setStatus`.

Hanya `paperSize`, `autoPrint`, `deviceName`/`deviceId` yang di-persist; `status` runtime saja.

### 4.4 UI Pengaturan Printer

Section baru di halaman Pengaturan:
- Tombol "Hubungkan Printer" (memicu `connect()` — memenuhi syarat user-gesture Web Bluetooth) / "Lupakan Printer".
- Pilihan ukuran kertas 58mm / 80mm.
- Toggle "Cetak otomatis saat transaksi selesai".
- Tombol "Test Print".
- Indikator status koneksi.

Bila `!isSupported()` (mis. iOS), tampilkan pesan bahwa cetak Bluetooth tidak didukung di perangkat ini; aplikasi tetap berfungsi dengan PDF.

### 4.5 Helper orkestrasi (mis. `src/hooks/usePrintReceipt.ts` atau util)

`printSale(sale)` / `printPayment(payment)`:
1. Jika Bluetooth didukung & terhubung (atau berhasil `reconnect`): build byte → `btPrinter.print`. Sukses → toast "Struk tercetak".
2. Jika gagal/tak terhubung/tak didukung: fallback ke `generateSaleReceipt` → `previewPdf` → modal `PrintPreview` (perilaku lama).
3. Error apa pun → toast jelas + fallback PDF.

## 5. Aliran Data

**Auto-print (alur utama):**
```
Simpan transaksi → autoPrint ON? → printer terhubung / reconnect? 
   → escpos.buildSaleReceipt(data, paperSize) → btPrinter.print(bytes) → toast sukses
   → (gagal) → fallback PDF preview + toast
```

**Cetak manual / cetak ulang:** tombol Printer di daftar transaksi memanggil helper yang sama.

**Test Print:** Pengaturan → `buildTestReceipt` → `btPrinter.print`.

## 6. Penanganan Error

| Kondisi | Perilaku |
|---|---|
| `navigator.bluetooth` tidak ada (iOS) | Fitur Bluetooth disembunyikan; hanya PDF. |
| Bluetooth mati / izin ditolak | Toast jelas; fallback PDF preview. |
| User batal di device chooser | Toast info; tidak ada perubahan state. |
| Printer terputus saat cetak | Update status; toast; fallback PDF. |
| Chunk write gagal | Retry sekali; bila tetap gagal → toast + fallback. |

## 7. Catatan Teknis

- Web Bluetooth butuh **secure context (HTTPS)** — terpenuhi (PWA). Localhost juga aman untuk dev.
- `connect()` pertama tiap sesi browser wajib dipicu **user gesture** (browser tampilkan device chooser). Auto-print penuh berlaku setelah terhubung; `reconnect()` best-effort mengurangi gesture berulang tapi tidak dijamin semua browser.
- Banyak printer thermal murah memakai service GATT khusus; implementasi memakai `optionalServices` + fallback `acceptAllDevices` agar kompatibel luas.

## 8. Testing

- **Unit test `escpos.ts`:** verifikasi byte output untuk `init`, `align`, `bold`, `row` (justify kolom 32 & 48), `divider`, `cut`, dan snapshot byte `buildTestReceipt`. Murni & deterministik.
- **Unit test `stores/printer.ts`:** default, set paper size, toggle autoPrint, set/forget device, persistensi.
- `btPrinter.ts` (Web Bluetooth) tidak diuji unit (butuh hardware); diverifikasi manual dengan printer asli.
- Gerbang hijau: `npm test` (54 test existing + test baru), `tsc --noEmit`, lint.

## 9. Berkas yang Dibuat / Diubah

**Baru:**
- `src/services/escpos.ts`
- `src/services/btPrinter.ts`
- `src/stores/printer.ts`
- `src/hooks/usePrintReceipt.ts` (atau util orkestrasi setara)
- UI section Pengaturan Printer
- `src/services/__tests__/escpos.test.ts`, test store printer

**Diubah:**
- `src/modules/payments/ProductSalesPage.tsx` — auto-print + tombol via helper
- `src/modules/payments/MemberPaymentPage.tsx` — sama untuk pembayaran
- Halaman Pengaturan — sisipkan section printer
