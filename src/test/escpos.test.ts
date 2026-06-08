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
