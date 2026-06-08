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
