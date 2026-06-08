import { formatCurrency } from '@/utils';

export type PaperSize = '58' | '80';

/** Karakter per baris untuk font default ESC/POS. */
export const COLUMNS: Record<PaperSize, number> = { '58': 32, '80': 48 };

/**
 * Bungkus teks ke lebar kolom secara word-aware agar nama produk panjang tidak
 * dibungkus sembarangan oleh printer (menggeser layout). Kata yang lebih panjang
 * dari lebar dipotong keras. Selalu mengembalikan minimal satu baris.
 */
export function wrapText(s: string, width: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const word of s.split(/\s+/).filter(Boolean)) {
    let w = word;
    while (w.length > width) {            // hard-break kata yang sangat panjang
      if (cur) { lines.push(cur); cur = ''; }
      lines.push(w.slice(0, width));
      w = w.slice(width);
    }
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= width) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

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

export interface SaleReceiptData {
  studioName: string;
  studioAddress: string;
  transactionId: string;
  date: string; // tanggal + jam, sudah diformat oleh pemanggil
  cashier: string;
  customerName: string;
  items: { name: string; qty: number; unitPrice: number; subtotal: number }[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  cashReceived: number;
  change: number;
  notes?: string;
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
  e.line(`No    : ${d.transactionId.slice(0, 8).toUpperCase()}`);
  e.line(`Waktu : ${d.date}`);
  e.line(`Kasir : ${d.cashier || '-'}`);
  e.line(`Plg   : ${d.customerName || '-'}`);
  e.divider(paper);
  for (const it of d.items) {
    for (const ln of wrapText(it.name, COLUMNS[paper])) e.line(ln);
    e.row(`  ${it.qty} x ${formatCurrency(it.unitPrice)}`, formatCurrency(it.subtotal), paper);
  }
  e.divider(paper);
  e.row('Subtotal', formatCurrency(d.subtotal), paper);
  if (d.discount > 0) e.row('Diskon', `-${formatCurrency(d.discount)}`, paper);
  e.bold(true).row('TOTAL', formatCurrency(d.total), paper).bold(false);
  e.divider(paper);
  e.row('Metode', d.paymentMethod.toUpperCase(), paper);
  if (d.paymentMethod === 'cash') {
    e.row('Tunai', formatCurrency(d.cashReceived), paper);
    e.row('Kembali', formatCurrency(d.change), paper);
  }
  if (d.notes) e.line(`Catatan: ${d.notes}`);
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
