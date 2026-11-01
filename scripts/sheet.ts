// Render sprite grids to a zoomed PNG sheet: npx vite-node scripts/sheet.ts <module> <export> <out.png> [zone]
import { writePNG } from './png';
import { SHARED, ZONE_PALETTES } from '../src/content/palette';
const [mod, exp, out, zoneS] = process.argv.slice(2);
const zone = Number(zoneS ?? 0);
const m = await import(/* @vite-ignore */ '/' + mod);
const set: Record<string, { w: number; h: number; d: Uint8Array }> = m[exp];
const pal = [...SHARED, ...ZONE_PALETTES[zone]];
const Z = 6, PAD = 4;
const items = Object.entries(set);
const cols = Math.min(items.length, 8);
const cw = Math.max(...items.map(([, b]) => b.w)), ch = Math.max(...items.map(([, b]) => b.h));
const W = cols * (cw * Z + PAD), H = Math.ceil(items.length / cols) * (ch * Z + PAD);
const px = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { px[i * 4] = 40; px[i * 4 + 1] = 90; px[i * 4 + 2] = 120; px[i * 4 + 3] = 255; }
items.forEach(([, b], n) => {
  const ox = (n % cols) * (cw * Z + PAD), oy = Math.floor(n / cols) * (ch * Z + PAD);
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    const c = b.d[y * b.w + x]; if (!c && exp !== 'TILE_ART') continue;
    const v = pal[c]; const r = ((v >> 8) & 15) * 17, g = ((v >> 4) & 15) * 17, bl = (v & 15) * 17;
    for (let j = 0; j < Z; j++) for (let i = 0; i < Z; i++) { const p = ((oy + y * Z + j) * W + ox + x * Z + i) * 4; px[p] = r; px[p + 1] = g; px[p + 2] = bl; }
  }
});
writePNG(out, W, H, px);
console.log(items.map(([k]) => k).join(' '));
