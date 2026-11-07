// Converts the indexed framebuffer through the palette once per frame and
// scales it, nearest-neighbour, integer where it fits.
import { FB, FB_W, FB_H } from './framebuffer';
import { SHARED, ZONE_PALETTES, rgb12to32, copperRows } from '../content/palette';
import { PLAY_Y, PH } from '../game/consts';

export class Display {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  img: ImageData;
  u32: Uint32Array;
  lut = new Uint32Array(256);
  rows = new Uint32Array(FB_H); // colour 0 per scanline (copper)
  bloom: HTMLCanvasElement | null;
  bctx: CanvasRenderingContext2D | null = null;
  crt = false;
  rect = { x: 0, y: 0, w: FB_W, h: FB_H, scale: 1 };

  constructor(canvas: HTMLCanvasElement, bloom: HTMLCanvasElement | null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.img = this.ctx.createImageData(FB_W, FB_H);
    this.u32 = new Uint32Array(this.img.data.buffer);
    this.bloom = bloom;
    if (bloom) this.bctx = bloom.getContext('2d');
    this.setZone(0);
  }

  // Shared colours + the zone's 16 + the zone's copper sky.
  setZone(zone: number, sky = true) {
    SHARED.forEach((c, i) => (this.lut[i] = rgb12to32(c)));
    ZONE_PALETTES[zone].forEach((c, i) => (this.lut[16 + i] = rgb12to32(c)));
    const cop = copperRows(zone, PH);
    const black = rgb12to32(0);
    for (let y = 0; y < FB_H; y++) this.rows[y] = sky && y >= PLAY_Y && y < PLAY_Y + PH ? rgb12to32(cop[y - PLAY_Y]) : black;
  }
  setColour(i: number, c12: number) { this.lut[i] = rgb12to32(c12); }
  setRow(y: number, c12: number) { this.rows[y] = rgb12to32(c12); }

  present(fb: FB) {
    const src = fb.pix, dst = this.u32, lut = this.lut;
    for (let y = 0, i = 0; y < FB_H; y++) {
      const c0 = this.rows[y];
      for (let x = 0; x < FB_W; x++, i++) {
        const c = src[i];
        dst[i] = c === 0 ? c0 : lut[c];
      }
    }
    this.ctx.putImageData(this.img, 0, 0);
    if (this.crt && this.bctx && this.bloom) this.bctx.drawImage(this.canvas, 0, 0, this.bloom.width, this.bloom.height);
  }

  // Fit the game into a box (CSS pixels). Integer scale in device pixels where it fits.
  layout(bx: number, by: number, bw: number, bh: number) {
    const dpr = window.devicePixelRatio || 1;
    // Only the 256-wide play area must fit the box: the black side borders
    // of Rick's screen may sit under the touch controls.
    const fit = Math.min((bw * dpr) / 260, (bh * dpr) / FB_H);
    let s = Math.floor(fit);
    if (s < 2 || s / fit < 0.84) s = fit; // integer only when it doesn't waste too much
    const w = (FB_W * s) / dpr, h = (FB_H * s) / dpr;
    const x = bx + (bw - w) / 2, y = by + (bh - h) / 2;
    this.rect = { x, y, w, h, scale: s / dpr };
    for (const el of [this.canvas, this.bloom, document.getElementById('crt')]) {
      if (!el) continue;
      Object.assign((el as HTMLElement).style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    }
    const crt = document.getElementById('crt');
    if (crt) crt.style.backgroundSize = `100% ${Math.max(2, (h / FB_H) * 1)}px, 100% 100%`;
  }

  setCrt(on: boolean) {
    this.crt = on;
    if (this.bloom) this.bloom.style.display = on ? 'block' : 'none';
    const crt = document.getElementById('crt');
    if (crt) crt.style.display = on ? 'block' : 'none';
  }
}
