// Indexed-colour framebuffer at Amiga low resolution.
export const FB_W = 320;
export const FB_H = 200;

export interface Bitmap { w: number; h: number; d: Uint8Array } // 0 = transparent

export class FB {
  pix = new Uint8Array(FB_W * FB_H);
  cx0 = 0; cy0 = 0; cx1 = FB_W; cy1 = FB_H; // clip rect

  clip(x0: number, y0: number, x1: number, y1: number) { this.cx0 = x0; this.cy0 = y0; this.cx1 = x1; this.cy1 = y1; }
  noClip() { this.cx0 = 0; this.cy0 = 0; this.cx1 = FB_W; this.cy1 = FB_H; }

  clear(c = 0) { this.pix.fill(c); }

  rect(x: number, y: number, w: number, h: number, c: number) {
    x = Math.round(x); y = Math.round(y);
    const x0 = Math.max(x, this.cx0), y0 = Math.max(y, this.cy0);
    const x1 = Math.min(x + w, this.cx1), y1 = Math.min(y + h, this.cy1);
    for (let yy = y0; yy < y1; yy++) this.pix.fill(c, yy * FB_W + x0, yy * FB_W + Math.max(x0, x1));
  }

  frame(x: number, y: number, w: number, h: number, c: number) {
    this.rect(x, y, w, 1, c); this.rect(x, y + h - 1, w, 1, c);
    this.rect(x, y, 1, h, c); this.rect(x + w - 1, y, 1, h, c);
  }

  pset(x: number, y: number, c: number) {
    x = Math.round(x); y = Math.round(y);
    if (x >= this.cx0 && x < this.cx1 && y >= this.cy0 && y < this.cy1) this.pix[y * FB_W + x] = c;
  }

  // Blit with transparency (0). flip mirrors horizontally. remap replaces every
  // non-zero pixel with one colour (for flashes and silhouettes).
  blit(b: Bitmap, x: number, y: number, flip = false, remap = -1, flipV = false) {
    x = Math.round(x); y = Math.round(y);
    const { w, h, d } = b;
    for (let j = 0; j < h; j++) {
      const yy = y + j;
      if (yy < this.cy0 || yy >= this.cy1) continue;
      const sj = flipV ? h - 1 - j : j;
      const row = yy * FB_W;
      for (let i = 0; i < w; i++) {
        const xx = x + i;
        if (xx < this.cx0 || xx >= this.cx1) continue;
        const c = d[sj * w + (flip ? w - 1 - i : i)];
        if (c) this.pix[row + xx] = remap >= 0 ? remap : c;
      }
    }
  }

  // Opaque blit (tiles): 0 stays 0 so the copper sky shows through.
  blitOpaque(b: Bitmap, x: number, y: number) {
    const { w, h, d } = b;
    for (let j = 0; j < h; j++) {
      const yy = y + j;
      if (yy < this.cy0 || yy >= this.cy1) continue;
      for (let i = 0; i < w; i++) {
        const xx = x + i;
        if (xx < this.cx0 || xx >= this.cx1) continue;
        this.pix[yy * FB_W + xx] = d[j * w + i];
      }
    }
  }

  circle(cx: number, cy: number, r: number, c: number) {
    for (let y = -r; y <= r; y++) {
      const dx = Math.floor(Math.sqrt(r * r - y * y));
      this.rect(cx - dx, cy + y, dx * 2 + 1, 1, c);
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: number) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.pset(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
  }
}

// Parse an ASCII pixel grid using a char->index map. Unknown chars = 0.
export function parseGrid(rows: string[], map: Record<string, number>): Bitmap {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const d = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) d[y * w + x] = map[rows[y][x]] ?? 0;
  return { w, h, d };
}

export function flipBitmap(b: Bitmap): Bitmap {
  const d = new Uint8Array(b.d.length);
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) d[y * b.w + x] = b.d[y * b.w + b.w - 1 - x];
  return { w: b.w, h: b.h, d };
}
