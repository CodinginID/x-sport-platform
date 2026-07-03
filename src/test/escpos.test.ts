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

import { buildSaleReceipt, buildPaymentReceipt, buildPayoutSlip, buildTestReceipt, wrapText } from '@/services/escpos';

const SALE = {
  studioName: 'X-Sport Studio',
  studioAddress: 'Jl. Olahraga No. 1',
  transactionId: 'abc123def456',
  date: '08 Jun 2026 14:30',
  cashier: 'Andi',
  customerName: 'Budi',
  items: [{ name: 'Air Mineral', qty: 2, unitPrice: 5000, subtotal: 10000 }],
  subtotal: 10000,
  discount: 0,
  total: 10000,
  paymentMethod: 'cash',
  cashReceived: 20000,
  change: 10000,
  notes: '',
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
    expect(text).toContain('Andi');     // cashier
    expect(text).toContain('Tunai');    // cash received
    expect(text).toContain('Kembali');  // change
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

  it('payout slip contains coach, class breakdown, and totals', () => {
    const bytes = buildPayoutSlip(
      {
        studioName: 'X-Sport Studio', studioAddress: 'Jl. Olahraga No. 1',
        payoutId: 'pay12345abcd', coachName: 'Citra',
        periodStart: '01 Jun 2026', periodEnd: '30 Jun 2026', paidAt: '03 Jul 2026',
        items: [
          { label: 'Yoga Reguler', count: 12, amount: 600000 },
          { label: 'Privat', count: 5, amount: 500000 },
        ],
        sessionCount: 17, total: 1100000, notes: 'Gajian Juni',
      },
      '58',
    );
    const text = new TextDecoder().decode(bytes);
    expect(Array.from(bytes).slice(-3)).toEqual([0x1d, 0x56, 0x01]); // cut
    expect(text).toContain('SLIP KOMISI COACH');
    expect(text).toContain('PAY12345'); // payout id, 8 chars uppercased
    expect(text).toContain('Citra');
    expect(text).toContain('01 Jun 2026 - 30 Jun 2026');
    expect(text).toContain('Yoga Reguler');
    expect(text).toContain('12 sesi');
    expect(text).toContain('Total sesi');
    expect(text).toContain('17');
    expect(text).toContain('TOTAL');
    expect(text).toContain('Gajian Juni');
  });

  it('test receipt is non-empty and ends with cut', () => {
    const bytes = Array.from(buildTestReceipt('58'));
    expect(bytes.length).toBeGreaterThan(10);
    expect(bytes.slice(-3)).toEqual([0x1d, 0x56, 0x01]);
  });

  it('wraps long item names across lines instead of one overflowing line', () => {
    const name = 'Minuman Isotonik Botol Besar Rasa Jeruk Segar'; // 45 chars > 32 cols (58mm)
    const longSale = { ...SALE, items: [{ name, qty: 1, unitPrice: 12000, subtotal: 12000 }] };
    const text = new TextDecoder().decode(buildSaleReceipt(longSale, '58'));
    expect(text).not.toContain(name);                       // not printed as one long run
    expect(text).toContain('Minuman Isotonik Botol Besar'); // wrapped chunk 1
    expect(text).toContain('Rasa Jeruk Segar');             // wrapped chunk 2
  });
});

describe('wrapText', () => {
  it('keeps lines within width and preserves all words', () => {
    const lines = wrapText('Air Mineral Botol Sedang 600ml', 16);
    expect(lines.every(l => l.length <= 16)).toBe(true);
    expect(lines.join(' ')).toBe('Air Mineral Botol Sedang 600ml');
  });

  it('hard-breaks a word longer than the width', () => {
    const lines = wrapText('SUPERCALIFRAGILISTIC', 8);
    expect(lines.every(l => l.length <= 8)).toBe(true);
    expect(lines.join('')).toBe('SUPERCALIFRAGILISTIC');
  });

  it('returns a single empty line for empty input', () => {
    expect(wrapText('', 32)).toEqual(['']);
  });
});
