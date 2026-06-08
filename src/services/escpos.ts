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
