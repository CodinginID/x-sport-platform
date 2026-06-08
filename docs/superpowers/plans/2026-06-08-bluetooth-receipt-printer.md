# Bluetooth Receipt Printer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cetak struk penjualan & pembayaran langsung ke printer thermal Bluetooth (ESC/POS via Web Bluetooth), dengan auto-print saat transaksi tersimpan dan fallback PDF.

**Architecture:** Tiga lapisan terisolasi — `escpos.ts` (encoder murni data→byte, mudah diuji), `btPrinter.ts` (transport Web Bluetooth + chunking), `stores/printer.ts` (preferensi Zustand persist) — diorkestrasi oleh hook `usePrintReceipt`. UI di Pengaturan untuk pairing/test, integrasi di halaman penjualan & pembayaran.

**Tech Stack:** React 19, TypeScript, Zustand (+persist), Web Bluetooth API, Vitest, Vite. Mengikuti spec `docs/superpowers/specs/2026-06-08-bluetooth-receipt-printer-design.md` & issue #38.

---

## File Structure

**Baru:**
- `src/services/escpos.ts` — encoder ESC/POS murni + builder struk (data → `Uint8Array`)
- `src/services/btPrinter.ts` — koneksi Web Bluetooth, chunking, reconnect
- `src/stores/printer.ts` — Zustand persist: device, paperSize, autoPrint, status
- `src/hooks/usePrintReceipt.ts` — orkestrasi: coba Bluetooth → fallback PDF
- `src/modules/settings/PrinterSection.tsx` — UI pairing / paper size / autoPrint / test print
- `src/test/escpos.test.ts` — unit test encoder + builder
- `src/test/printer-store.test.ts` — unit test store

**Diubah:**
- `src/modules/settings/SettingsPage.tsx` — sisipkan `<PrinterSection />`
- `src/modules/payments/ProductSalesPage.tsx` — auto-print + tombol cetak via hook
- `src/modules/payments/MemberPaymentPage.tsx` — auto-print + tombol cetak via hook

---

## Task 1: ESC/POS encoder primitives

**Files:**
- Create: `src/services/escpos.ts`
- Test: `src/test/escpos.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/test/escpos.test.ts
import { describe, it, expect } from 'vitest';
import { Escpos, COLUMNS, type PaperSize } from '@/services/escpos';

describe('Escpos primitives', () => {
  it('init emits ESC @', () => {
    expect(Array.from(new Escpos().init().build())).toEqual([0x1b, 0x40]);
  });

  it('align center emits ESC a 1', () => {
    expect(Array.from(new Escpos().align('center').build())).toEqual([0x1b, 0x61, 0x01]);
  });

  it('bold toggles ESC E', () => {
    expect(Array.from(new Escpos().bold(true).build())).toEqual([0x1b, 0x45, 0x01]);
    expect(Array.from(new Escpos().bold(false).build())).toEqual([0x1b, 0x45, 0x00]);
  });

  it('cut emits GS V 1', () => {
    expect(Array.from(new Escpos().cut().build())).toEqual([0x1d, 0x56, 0x01]);
  });

  it('text encodes ascii and falls back non-ascii to "?"', () => {
    expect(Array.from(new Escpos().text('A€').build())).toEqual([0x41, 0x3f]);
  });

  it('divider fills the column width then newline', () => {
    const out = new Escpos().divider('58').build();
    expect(out.length).toBe(COLUMNS['58'] + 1); // 32 dashes + \n
    expect(out[out.length - 1]).toBe(0x0a);
  });

  it('row justifies left and right within the column width', () => {
    const text = new TextDecoder().decode(new Escpos().row('A', 'B', '58').build());
    expect(text).toBe('A' + ' '.repeat(COLUMNS['58'] - 2) + 'B\n');
  });

  it('row wraps when left+right exceed width', () => {
    const cols = COLUMNS['58'];
    const long = 'X'.repeat(cols);
    const text = new TextDecoder().decode(new Escpos().row(long, 'B', '58').build());
    expect(text).toBe(long + '\n' + 'B'.padStart(cols) + '\n');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/escpos.test.ts`
Expected: FAIL — `Cannot find module '@/services/escpos'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/services/escpos.ts
export type PaperSize = '58' | '80';

/** Karakter per baris untuk font default ESC/POS. */
export const COLUMNS: Record<PaperSize, number> = { '58': 32, '80': 48 };

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/** Builder ESC/POS murni: tidak menyentuh Web Bluetooth, output Uint8Array. */
export class Escpos {
  private bytes: number[] = [];

  raw(...b: number[]): this { this.bytes.push(...b); return this; }

  init(): this { return this.raw(ESC, 0x40); }

  align(a: 'left' | 'center' | 'right'): this {
    return this.raw(ESC, 0x61, a === 'center' ? 1 : a === 'right' ? 2 : 0);
  }

  bold(on: boolean): this { return this.raw(ESC, 0x45, on ? 1 : 0); }

  /** Ukuran teks: normal atau double width+height (GS ! n). */
  size(s: 'normal' | 'double'): this { return this.raw(GS, 0x21, s === 'double' ? 0x11 : 0x00); }

  feed(n = 1): this { return this.raw(ESC, 0x64, n); }

  cut(): this { return this.raw(GS, 0x56, 0x01); }

  /** Encode teks: ASCII apa adanya, non-ASCII → '?'. Tidak menambah newline. */
  text(s: string): this {
    for (const ch of s) {
      const code = ch.charCodeAt(0);
      this.raw(code > 0xff ? 0x3f : code);
    }
    return this;
  }

  /** Satu baris teks + newline. */
  line(s = ''): this { return this.text(s).raw(LF); }

  /** Garis pemisah selebar kertas. */
  divider(paper: PaperSize): this { return this.line('-'.repeat(COLUMNS[paper])); }

  /** Baris kiri-kanan ter-justify; wrap bila tak muat. */
  row(left: string, right: string, paper: PaperSize): this {
    const cols = COLUMNS[paper];
    const space = cols - left.length - right.length;
    if (space < 1) return this.line(left).line(right.padStart(cols));
    return this.line(left + ' '.repeat(space) + right);
  }

  build(): Uint8Array { return new Uint8Array(this.bytes); }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/escpos.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/escpos.ts src/test/escpos.test.ts
git commit -m "feat: ESC/POS encoder primitives

Refs #38"
```

---

## Task 2: Receipt builders (sale & payment & test)

**Files:**
- Modify: `src/services/escpos.ts`
- Test: `src/test/escpos.test.ts`

- [ ] **Step 1: Write the failing test (append to existing describe block)**

```ts
// append to src/test/escpos.test.ts
import { buildSaleReceipt, buildPaymentReceipt, buildTestReceipt } from '@/services/escpos';

const SALE = {
  studioName: 'X-Sport Studio',
  studioAddress: 'Jl. Olahraga No. 1',
  transactionId: 'abc123def456',
  date: '08 Jun 2026',
  customerName: 'Budi',
  items: [{ name: 'Air Mineral', qty: 2, unitPrice: 5000, subtotal: 10000 }],
  total: 10000,
};

describe('Escpos receipt builders', () => {
  it('sale receipt opens with init and ends with cut', () => {
    const bytes = Array.from(buildSaleReceipt(SALE, '58'));
    expect(bytes.slice(0, 2)).toEqual([0x1b, 0x40]);           // init
    expect(bytes.slice(-3)).toEqual([0x1d, 0x56, 0x01]);       // cut
  });

  it('sale receipt contains studio name, item and total text', () => {
    const text = new TextDecoder().decode(buildSaleReceipt(SALE, '58'));
    expect(text).toContain('X-Sport Studio');
    expect(text).toContain('STRUK PENJUALAN');
    expect(text).toContain('Air Mineral');
    expect(text).toContain('ABC123DE'); // transaction id, 8 chars uppercased
    expect(text).toContain('TOTAL');
  });

  it('payment receipt contains member and STRUK PEMBAYARAN', () => {
    const text = new TextDecoder().decode(
      buildPaymentReceipt(
        { studioName: 'S', studioAddress: 'A', paymentId: 'p1234567', date: '08 Jun 2026',
          memberName: 'Andi', packageName: 'Bulanan', method: 'cash', amount: 150000 },
        '80',
      ),
    );
    expect(text).toContain('STRUK PEMBAYARAN');
    expect(text).toContain('Andi');
    expect(text).toContain('Bulanan');
  });

  it('test receipt is non-empty and ends with cut', () => {
    const bytes = Array.from(buildTestReceipt('58'));
    expect(bytes.length).toBeGreaterThan(10);
    expect(bytes.slice(-3)).toEqual([0x1d, 0x56, 0x01]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/escpos.test.ts`
Expected: FAIL — `buildSaleReceipt is not exported` / not a function

- [ ] **Step 3: Write minimal implementation (append to `src/services/escpos.ts`)**

```ts
// append to src/services/escpos.ts
import { formatCurrency } from '@/utils';

export interface SaleReceiptData {
  studioName: string;
  studioAddress: string;
  transactionId: string;
  date: string; // sudah diformat oleh pemanggil
  customerName: string;
  items: { name: string; qty: number; unitPrice: number; subtotal: number }[];
  total: number;
}

export interface PaymentReceiptData {
  studioName: string;
  studioAddress: string;
  paymentId: string;
  date: string;
  memberName: string;
  packageName: string;
  method: string;
  amount: number;
  notes?: string;
}

function head(e: Escpos, paper: PaperSize, studioName: string, studioAddress: string, title: string): void {
  e.init().align('center').bold(true).line(studioName)
    .bold(false).line(studioAddress).divider(paper).bold(true).line(title).bold(false)
    .align('left').divider(paper);
}

function foot(e: Escpos, paper: PaperSize): Uint8Array {
  e.divider(paper).align('center').line('Terima kasih!').align('left').feed(3).cut();
  return e.build();
}

export function buildSaleReceipt(d: SaleReceiptData, paper: PaperSize): Uint8Array {
  const e = new Escpos();
  head(e, paper, d.studioName, d.studioAddress, 'STRUK PENJUALAN');
  e.line(`No  : ${d.transactionId.slice(0, 8).toUpperCase()}`);
  e.line(`Tgl : ${d.date}`);
  e.line(`Plg : ${d.customerName || '-'}`);
  e.divider(paper);
  for (const it of d.items) {
    e.line(it.name);
    e.row(`  ${it.qty} x ${formatCurrency(it.unitPrice)}`, formatCurrency(it.subtotal), paper);
  }
  e.divider(paper).bold(true).row('TOTAL', formatCurrency(d.total), paper).bold(false);
  return foot(e, paper);
}

export function buildPaymentReceipt(d: PaymentReceiptData, paper: PaperSize): Uint8Array {
  const e = new Escpos();
  head(e, paper, d.studioName, d.studioAddress, 'STRUK PEMBAYARAN');
  e.row('No', d.paymentId.slice(0, 8).toUpperCase(), paper);
  e.row('Tanggal', d.date, paper);
  e.row('Member', d.memberName, paper);
  e.row('Paket', d.packageName, paper);
  e.row('Metode', d.method.toUpperCase(), paper);
  e.divider(paper).bold(true).row('TOTAL', formatCurrency(d.amount), paper).bold(false);
  if (d.notes) e.line(`Catatan: ${d.notes}`);
  return foot(e, paper);
}

export function buildTestReceipt(paper: PaperSize): Uint8Array {
  const e = new Escpos();
  head(e, paper, 'TEST PRINT', 'X-Sport Platform', 'TEST PRINTER');
  e.line('Printer terhubung dengan baik.');
  e.line(`Ukuran kertas: ${paper}mm (${COLUMNS[paper]} kolom)`);
  return foot(e, paper);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/escpos.test.ts`
Expected: PASS (all escpos tests, 12 total)

- [ ] **Step 5: Commit**

```bash
git add src/services/escpos.ts src/test/escpos.test.ts
git commit -m "feat: ESC/POS receipt builders for sale, payment, test

Refs #38"
```

---

## Task 3: Printer preferences store

**Files:**
- Create: `src/stores/printer.ts`
- Test: `src/test/printer-store.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/test/printer-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { usePrinterStore } from '@/stores/printer';

describe('usePrinterStore', () => {
  beforeEach(() => {
    usePrinterStore.setState({
      deviceId: undefined, deviceName: undefined,
      paperSize: '58', autoPrint: true, status: 'disconnected',
    });
  });

  it('has sane defaults', () => {
    const s = usePrinterStore.getState();
    expect(s.paperSize).toBe('58');
    expect(s.autoPrint).toBe(true);
    expect(s.status).toBe('disconnected');
  });

  it('setPaperSize updates paper size', () => {
    usePrinterStore.getState().setPaperSize('80');
    expect(usePrinterStore.getState().paperSize).toBe('80');
  });

  it('setAutoPrint toggles auto print', () => {
    usePrinterStore.getState().setAutoPrint(false);
    expect(usePrinterStore.getState().autoPrint).toBe(false);
  });

  it('setDevice and forgetDevice manage saved device', () => {
    usePrinterStore.getState().setDevice('id-1', 'Panda-58');
    expect(usePrinterStore.getState().deviceId).toBe('id-1');
    expect(usePrinterStore.getState().deviceName).toBe('Panda-58');
    usePrinterStore.getState().forgetDevice();
    expect(usePrinterStore.getState().deviceId).toBeUndefined();
    expect(usePrinterStore.getState().status).toBe('disconnected');
  });

  it('setStatus updates connection status', () => {
    usePrinterStore.getState().setStatus('connected');
    expect(usePrinterStore.getState().status).toBe('connected');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/printer-store.test.ts`
Expected: FAIL — `Cannot find module '@/stores/printer'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/stores/printer.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PaperSize } from '@/services/escpos';

export type PrinterStatus = 'disconnected' | 'connecting' | 'connected';

interface PrinterState {
  deviceId?: string;
  deviceName?: string;
  paperSize: PaperSize;
  autoPrint: boolean;
  status: PrinterStatus; // runtime saja, tidak dipersist
  setPaperSize: (p: PaperSize) => void;
  setAutoPrint: (v: boolean) => void;
  setDevice: (id: string, name?: string) => void;
  forgetDevice: () => void;
  setStatus: (s: PrinterStatus) => void;
}

export const usePrinterStore = create<PrinterState>()(
  persist(
    (set) => ({
      paperSize: '58',
      autoPrint: true,
      status: 'disconnected',
      setPaperSize: (paperSize) => set({ paperSize }),
      setAutoPrint: (autoPrint) => set({ autoPrint }),
      setDevice: (deviceId, deviceName) => set({ deviceId, deviceName }),
      forgetDevice: () => set({ deviceId: undefined, deviceName: undefined, status: 'disconnected' }),
      setStatus: (status) => set({ status }),
    }),
    {
      name: 'xsport-printer',
      partialize: (s) => ({ deviceId: s.deviceId, deviceName: s.deviceName, paperSize: s.paperSize, autoPrint: s.autoPrint }),
    },
  ),
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/printer-store.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/stores/printer.ts src/test/printer-store.test.ts
git commit -m "feat: printer preferences store (zustand persist)

Refs #38"
```

---

## Task 4: Web Bluetooth transport service

**Files:**
- Create: `src/services/btPrinter.ts`

> No unit test — Web Bluetooth needs real hardware. Verified manually in Task 6 (Test Print) and Task 9. Keep this module thin and dependency-free so it is obviously correct by reading.

- [ ] **Step 1: Write the implementation**

```ts
// src/services/btPrinter.ts
// Transport ESC/POS via Web Bluetooth. Banyak printer thermal mengekspos
// service serial dengan UUID di bawah; kita daftarkan sebagai optionalServices
// dan biarkan user memilih perangkat (acceptAllDevices) agar kompatibel luas.

const PRINTER_SERVICES = [
  0x18f0,                                   // umum (banyak printer 58/80mm)
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',   // ISSC / sejumlah modul BT
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];
const CHUNK = 256; // byte per tulis; cukup kecil untuk buffer printer murah

let device: BluetoothDevice | null = null;
let characteristic: BluetoothRemoteGATTCharacteristic | null = null;

export function isSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

async function findWritableCharacteristic(server: BluetoothRemoteGATTServer): Promise<BluetoothRemoteGATTCharacteristic> {
  const services = await server.getPrimaryServices();
  for (const svc of services) {
    const chars = await svc.getCharacteristics();
    const writable = chars.find((c) => c.properties.write || c.properties.writeWithoutResponse);
    if (writable) return writable;
  }
  throw new Error('Printer tidak memiliki karakteristik yang bisa ditulis');
}

async function attach(dev: BluetoothDevice): Promise<void> {
  const server = await dev.gatt!.connect();
  characteristic = await findWritableCharacteristic(server);
  device = dev;
  dev.addEventListener('gattserverdisconnected', () => { characteristic = null; });
}

/** Tampilkan device chooser (butuh user gesture). Mengembalikan perangkat terpilih. */
export async function connect(): Promise<BluetoothDevice> {
  if (!isSupported()) throw new Error('Web Bluetooth tidak didukung di perangkat ini');
  const dev = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICES,
  });
  await attach(dev);
  return dev;
}

/** Sambung ulang tanpa prompt ke device tersimpan (best-effort). */
export async function reconnect(deviceId?: string): Promise<boolean> {
  if (!isSupported() || !deviceId || !navigator.bluetooth.getDevices) return false;
  try {
    const known = await navigator.bluetooth.getDevices();
    const dev = known.find((d) => d.id === deviceId);
    if (!dev) return false;
    await attach(dev);
    return true;
  } catch {
    return false;
  }
}

export function isConnected(): boolean {
  return !!characteristic && !!device?.gatt?.connected;
}

export function disconnect(): void {
  device?.gatt?.disconnect();
  characteristic = null;
  device = null;
}

/** Kirim byte ESC/POS dengan chunking agar buffer printer tidak overflow. */
export async function print(bytes: Uint8Array): Promise<void> {
  if (!characteristic) throw new Error('Printer belum terhubung');
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.slice(i, i + CHUNK);
    if (characteristic.properties.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(slice);
    } else {
      await characteristic.writeValue(slice);
    }
    await new Promise((r) => setTimeout(r, 20)); // jeda antar-chunk
  }
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: PASS (no errors). If `BluetoothDevice`/`navigator.bluetooth` types are missing, they are provided by `lib.dom.d.ts` (already in `tsconfig`); no extra deps needed.

- [ ] **Step 3: Commit**

```bash
git add src/services/btPrinter.ts
git commit -m "feat: Web Bluetooth ESC/POS transport (connect, reconnect, chunked print)

Refs #38"
```

---

## Task 5: Print orchestration hook

**Files:**
- Create: `src/hooks/usePrintReceipt.ts`

> Glue layer: build bytes from store + studio, try Bluetooth, fall back to existing PDF preview. The hook returns callbacks the pages call. Verified via integration in Tasks 7–8 and manual run in Task 9.

- [ ] **Step 1: Write the implementation**

```ts
// src/hooks/usePrintReceipt.ts
import { useCallback } from 'react';
import { useStudioStore } from '@/stores/studio';
import { usePrinterStore } from '@/stores/printer';
import { useToastStore } from '@/stores/toast';
import { formatDate } from '@/utils';
import { buildSaleReceipt, buildPaymentReceipt, type SaleReceiptData, type PaymentReceiptData } from '@/services/escpos';
import * as bt from '@/services/btPrinter';
import { generateSaleReceipt, generatePaymentReceipt, previewPdf } from '@/utils/pdf';
import type { ProductSale, MemberPayment } from '@/types';

/** Pastikan printer tersambung; coba reconnect bila ada device tersimpan. */
async function ensureConnected(): Promise<boolean> {
  if (bt.isConnected()) return true;
  const { deviceId, setStatus } = usePrinterStore.getState();
  if (!deviceId) return false;
  setStatus('connecting');
  const ok = await bt.reconnect(deviceId);
  setStatus(ok ? 'connected' : 'disconnected');
  return ok;
}

export function usePrintReceipt() {
  const addToast = useToastStore((s) => s.addToast);

  const printBytes = useCallback(async (bytes: Uint8Array): Promise<boolean> => {
    if (!bt.isSupported()) return false;
    try {
      if (!(await ensureConnected())) return false;
      await bt.print(bytes);
      usePrinterStore.getState().setStatus('connected');
      addToast('Struk tercetak', 'success');
      return true;
    } catch {
      usePrinterStore.getState().setStatus('disconnected');
      return false;
    }
  }, [addToast]);

  /** Cetak struk penjualan. Mengembalikan PDF blob-url bila perlu fallback (atau ''). */
  const printSale = useCallback(async (sale: ProductSale): Promise<string> => {
    const studio = useStudioStore.getState();
    const paperSize = usePrinterStore.getState().paperSize;
    const data: SaleReceiptData = {
      studioName: studio.name,
      studioAddress: studio.address,
      transactionId: sale.transaction_id,
      date: formatDate(sale.transaction_date),
      customerName: sale.customer_name ?? '',
      items: sale.items.map((i) => ({ name: i.product_name, qty: i.quantity, unitPrice: i.unit_price, subtotal: i.subtotal })),
      total: sale.total,
    };
    if (await printBytes(buildSaleReceipt(data, paperSize))) return '';
    // Fallback: PDF preview (perilaku lama)
    const doc = await generateSaleReceipt({
      transaction_id: sale.transaction_id,
      transaction_date: sale.transaction_date,
      customer_name: sale.customer_name ?? '',
      items: sale.items,
      total: sale.total,
    });
    return previewPdf(doc);
  }, [printBytes]);

  /**
   * Cetak struk pembayaran member. Nama/alamat studio diambil dari store di sini
   * (single source of truth) — pemanggil cukup memberi data pembayaran + `raw`
   * (objek untuk generator PDF fallback). Mengembalikan PDF blob-url bila fallback (atau '').
   */
  const printPayment = useCallback(async (
    p: Omit<PaymentReceiptData, 'studioName' | 'studioAddress'> & { raw: Parameters<typeof generatePaymentReceipt>[0] },
  ): Promise<string> => {
    const studio = useStudioStore.getState();
    const paperSize = usePrinterStore.getState().paperSize;
    const data: PaymentReceiptData = { ...p, studioName: studio.name, studioAddress: studio.address };
    if (await printBytes(buildPaymentReceipt(data, paperSize))) return '';
    const doc = await generatePaymentReceipt(p.raw);
    return previewPdf(doc);
  }, [printBytes]);

  return { printSale, printPayment };
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: PASS. If `MemberPayment` is not the exact exported type name, open `src/types/index.ts` and use the actual payment type; adjust the import accordingly (the only requirement is the fields used: payment id, date, member name, package name, method, amount, notes).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePrintReceipt.ts
git commit -m "feat: usePrintReceipt hook orchestrating Bluetooth + PDF fallback

Refs #38"
```

---

## Task 6: Printer settings UI section

**Files:**
- Create: `src/modules/settings/PrinterSection.tsx`
- Modify: `src/modules/settings/SettingsPage.tsx`

- [ ] **Step 1: Write the implementation**

```tsx
// src/modules/settings/PrinterSection.tsx
import { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { Printer, Bluetooth, BluetoothConnected, AlertTriangle } from 'lucide-react';
import { usePrinterStore } from '@/stores/printer';
import { useToastStore } from '@/stores/toast';
import * as bt from '@/services/btPrinter';
import { buildTestReceipt } from '@/services/escpos';
import type { PaperSize } from '@/services/escpos';

export function PrinterSection() {
  const { deviceName, paperSize, autoPrint, status, setPaperSize, setAutoPrint, setDevice, forgetDevice, setStatus } = usePrinterStore();
  const addToast = useToastStore((s) => s.addToast);
  const [busy, setBusy] = useState(false);
  const supported = bt.isSupported();

  if (!supported) {
    return (
      <Card title="Printer Bluetooth">
        <div className="flex items-start gap-3 text-sm text-zen-ink/60">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <p>Cetak Bluetooth tidak didukung di perangkat/browser ini (mis. iOS/Safari). Gunakan Chrome/Edge di Android atau desktop. Struk tetap bisa dicetak via PDF.</p>
        </div>
      </Card>
    );
  }

  const handleConnect = async () => {
    setBusy(true);
    try {
      setStatus('connecting');
      const dev = await bt.connect();
      setDevice(dev.id, dev.name ?? 'Printer');
      setStatus('connected');
      addToast('Printer terhubung', 'success');
    } catch {
      setStatus('disconnected');
      addToast('Gagal menghubungkan printer', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    setBusy(true);
    try {
      if (!bt.isConnected()) await bt.connect();
      await bt.print(buildTestReceipt(paperSize));
      setStatus('connected');
      addToast('Test print terkirim', 'success');
    } catch {
      addToast('Gagal test print', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleForget = () => { bt.disconnect(); forgetDevice(); addToast('Printer dilupakan', 'info'); };

  return (
    <Card title="Printer Bluetooth">
      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-3">
          {status === 'connected'
            ? <BluetoothConnected size={18} className="text-green-500 shrink-0" />
            : <Bluetooth size={18} className="text-zen-ink/40 shrink-0" />}
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Status</div>
            <div className="font-bold text-sm">
              {deviceName ? `${deviceName} • ${status === 'connected' ? 'Terhubung' : 'Tersimpan'}` : 'Belum ada printer'}
            </div>
          </div>
        </div>

        {/* Paper size */}
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-2">Ukuran Kertas</div>
          <div className="flex gap-2">
            {(['58', '80'] as PaperSize[]).map((p) => (
              <button key={p} onClick={() => setPaperSize(p)}
                className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all ${paperSize === p ? 'bg-zen-brand text-white' : 'bg-zen-bg text-zen-ink/50'}`}>
                {p}mm
              </button>
            ))}
          </div>
        </div>

        {/* Auto print */}
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-medium">Cetak otomatis saat transaksi selesai</span>
          <input type="checkbox" checked={autoPrint} onChange={(e) => setAutoPrint(e.target.checked)}
            className="w-5 h-5 accent-zen-brand" />
        </label>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={handleConnect} disabled={busy} className="flex-1">
            <Printer size={14} /> {deviceName ? 'Ganti Printer' : 'Hubungkan Printer'}
          </Button>
          <Button size="sm" variant="secondary" onClick={handleTest} disabled={busy}>Test Print</Button>
          {deviceName && <Button size="sm" variant="secondary" onClick={handleForget}>Lupakan</Button>}
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Wire into SettingsPage**

Modify `src/modules/settings/SettingsPage.tsx`: add import and render `<PrinterSection />` after `<StudioSection />`.

```tsx
// near the other section imports (line ~7)
import { PrinterSection } from './PrinterSection';
```

```tsx
// after <StudioSection /> (line ~33)
      {/* Studio */}
      <StudioSection />

      {/* Printer */}
      <PrinterSection />
```

- [ ] **Step 3: Verify type-check & lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS. If `Button` does not accept `size`/`variant` props as used, open `src/components/ui` and match the actual `Button` API (e.g. drop `size="sm"`); icons `Bluetooth`/`BluetoothConnected` exist in `lucide-react`.

- [ ] **Step 4: Manual verify (if a printer is available)**

Run: `npm run dev`, open Settings → Printer Bluetooth → Hubungkan Printer → pick device → Test Print. Expected: a test receipt prints. Without a printer, just confirm the section renders and the device chooser opens.

- [ ] **Step 5: Commit**

```bash
git add src/modules/settings/PrinterSection.tsx src/modules/settings/SettingsPage.tsx
git commit -m "feat: printer settings section (pair, paper size, auto-print, test)

Refs #38"
```

---

## Task 7: Auto-print + reprint in ProductSalesPage

**Files:**
- Modify: `src/modules/payments/ProductSalesPage.tsx`

- [ ] **Step 1: Import the hook**

Add to imports (top of file, near line 8):

```tsx
import { usePrintReceipt } from "@/hooks/usePrintReceipt";
```

- [ ] **Step 2: Use the hook inside the component**

After `const mutation = useProductSaleMutation();` (line ~39) add:

```tsx
  const { printSale } = usePrintReceipt();
```

- [ ] **Step 3: Auto-print on successful save**

In `handleSubmit`, replace the `onSuccess` callback (lines ~117-120) with one that auto-prints the saved sale when enabled:

```tsx
      onSuccess: async (saved) => {
        setModalOpen(false);
        resetForm();
        if (usePrinterStore.getState().autoPrint) {
          const fallbackUrl = await printSale(saved);
          if (fallbackUrl) setPdfUrl(fallbackUrl);
        }
      },
```

Add the store import near the other imports:

```tsx
import { usePrinterStore } from "@/stores/printer";
```

> `saved` is the `ProductSale` returned by `useProductSaleMutation` (it returns `newSale` with `transaction_id`). If `onSuccess`'s first arg is not typed as `ProductSale`, annotate it: `async (saved: ProductSale) => { ... }` and import the type from `@/types`.

- [ ] **Step 4: Route the existing reprint button through the hook**

Replace the list reprint button handler (line ~209) so it tries Bluetooth first, then PDF:

```tsx
                  <button onClick={async () => { const url = await printSale(row); if (url) setPdfUrl(url); }}
```

(Keep the rest of the button markup unchanged.)

- [ ] **Step 5: Verify type-check, lint, tests**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: PASS (all existing 54 + new tests).

- [ ] **Step 6: Commit**

```bash
git add src/modules/payments/ProductSalesPage.tsx
git commit -m "feat: auto-print + Bluetooth reprint on product sales

Refs #38"
```

---

## Task 8: Auto-print + reprint in MemberPaymentPage

**Files:**
- Modify: `src/modules/payments/MemberPaymentPage.tsx`

> First read `src/modules/payments/MemberPaymentPage.tsx` to confirm the exact payment row shape, the existing receipt button handler (around line 141), and the mutation's `onSuccess`. The pattern mirrors Task 7.

- [ ] **Step 1: Read the file and locate integration points**

Run: open `src/modules/payments/MemberPaymentPage.tsx`. Identify:
- the receipt button that calls `generatePaymentReceipt` / `previewPdf`,
- the payment mutation `onSuccess`,
- the variable holding a payment row (fields: payment_id, payment_date, member_name, package_name, amount, payment_method, notes).

- [ ] **Step 2: Import hook + store**

```tsx
import { usePrintReceipt } from "@/hooks/usePrintReceipt";
import { usePrinterStore } from "@/stores/printer";
```

- [ ] **Step 3: Build a payment-print helper inside the component**

Add near the other hooks:

```tsx
  const { printPayment } = usePrintReceipt();

  const printPaymentRow = async (row: {
    payment_id: string; payment_date: string; member_name: string;
    package_name: string; amount: number; payment_method: string; notes?: string;
  }) => {
    const url = await printPayment({
      // studioName/studioAddress diisi otomatis dari studio store di dalam hook
      paymentId: row.payment_id,
      date: row.payment_date,
      memberName: row.member_name,
      packageName: row.package_name,
      method: row.payment_method,
      amount: row.amount,
      notes: row.notes,
      raw: row,
    });
    if (url) setPdfUrl(url); // gunakan state pdfUrl yang sudah ada di halaman ini
  };
```

> Note: `printPayment` already reads studio name/address from `useStudioStore` internally (see Task 5), so the caller object above intentionally omits `studioName`/`studioAddress`.

- [ ] **Step 4: Auto-print on payment save**

In the payment mutation `onSuccess`, after closing the modal/reset, add:

```tsx
        if (usePrinterStore.getState().autoPrint) {
          await printPaymentRow(savedPayment); // savedPayment = the saved row with payment_id
        }
```

- [ ] **Step 5: Route the reprint button through the helper**

Replace the existing receipt button handler (around line 141) to call `printPaymentRow(row)` instead of directly generating the PDF.

- [ ] **Step 6: Verify type-check, lint, tests**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/payments/MemberPaymentPage.tsx src/hooks/usePrintReceipt.ts
git commit -m "feat: auto-print + Bluetooth reprint on member payments

Refs #38"
```

---

## Task 9: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full gate**

Run: `npx vitest run && npx tsc --noEmit && npm run lint && npm run build`
Expected: all tests pass, no type errors, lint clean, production build succeeds.

- [ ] **Step 2: Manual smoke (with printer if available)**

Run: `npm run dev`
- Settings → Printer Bluetooth: connect a printer, choose paper size, Test Print.
- Penjualan: create a sale with auto-print ON → struk prints automatically.
- Tap reprint button on a past sale → prints (or shows PDF if disconnected).
- Toggle auto-print OFF → no auto-print on next sale.
- Member payment: same checks.
- iOS/unsupported browser: section shows the "tidak didukung" notice; PDF flow still works.

- [ ] **Step 3: Update issue + push**

```bash
git push -u origin feature/bluetooth-receipt-printer
gh issue comment 38 --body "Implementasi selesai di branch feature/bluetooth-receipt-printer. Siap review."
```

---

## Self-Review Notes

- **Spec coverage:** escpos (T1–2), btPrinter incl. chunking/reconnect (T4), store w/ paperSize+autoPrint+status (T3), settings UI w/ test print + unsupported notice (T6), auto-print + fallback orchestration (T5,T7,T8), error→toast→PDF fallback (T5,T6), tests (T1–3) + green gate (T9). All spec sections mapped.
- **Type consistency:** `PaperSize='58'|'80'` defined in T1, reused everywhere. `SaleReceiptData`/`PaymentReceiptData` defined T2, consumed T5. Store API (`setDevice/forgetDevice/setStatus/...`) defined T3, used T5/T6/T7. btPrinter API (`isSupported/connect/reconnect/isConnected/print/disconnect`) defined T4, used T5/T6.
- **Known adjustment point:** studio name/address for ESC/POS payment receipt is sourced from `useStudioStore` inside the hook (T8 step 3 note) — single source of truth, callers don't pass it.
