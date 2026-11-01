import { Bitmap, parseGrid } from '../../engine/framebuffer';
import { GENERIC } from './generic';
import { ZONE_TILES } from './zones';

export const TILE = 16;
export const F_SOLID = 1, F_PLAT = 2, F_LADDER = 4, F_SPIKE = 8, F_WEAK = 16, F_CRUMBLE = 32, F_TRAPDOOR = 64;

// Every tile char used in screen maps, in id order (id 0 = empty sky).
export const TILE_CHARS = ' #W=%-Hh^:|odgabcefXZG';

const FLAGS: Record<string, number> = {
  ' ': 0, '#': F_SOLID, W: F_SOLID | F_WEAK, '=': F_SOLID, '%': F_SOLID, '-': F_PLAT,
  H: F_LADDER, h: F_LADDER, '^': F_SPIKE, ':': 0, '|': 0, o: 0, d: 0,
  g: F_SOLID, a: 0, b: 0, c: F_SOLID, e: 0, f: F_PLAT,
  X: F_SOLID | F_CRUMBLE, Z: F_SOLID | F_CRUMBLE | F_TRAPDOOR, G: F_SOLID,
};
// Zone 1's terrace step is solid; elsewhere 'f' is a jump-through shelf.
const ZONE_FLAG_OVERRIDES: Record<string, number>[] = [{ f: F_SOLID }, {}, {}, {}];

export const TILE_NAMES: Record<string, string> = {
  ' ': 'sky', '#': 'stone', W: 'weak wall', '=': 'slab', '%': 'timber', '-': 'plank', H: 'ladder', h: 'ladder (sky)',
  '^': 'boot studs', ':': 'back wall', '|': 'pillar', o: 'window', d: 'door', g: 'ground', a: 'deco a', b: 'deco b',
  c: 'solid deco', e: 'deco e', f: 'ledge', X: 'crumbling floor', Z: 'trapdoor', G: 'gate',
};

const PIX: Record<string, number> = { '.': 0, K: 1, D: 2, G: 3, W: 4, Y: 7, O: 8, R: 10 };
for (let i = 0; i < 16; i++) PIX[i.toString(16)] = 16 + i;

function norm(rows: string[]): string[] {
  const r = rows.slice(0, 16).map((s) => (s + '................').slice(0, 16));
  while (r.length < 16) r.push('................');
  return r;
}

export function tileFlags(zone: number): Uint8Array {
  const f = new Uint8Array(TILE_CHARS.length);
  [...TILE_CHARS].forEach((ch, i) => (f[i] = ZONE_FLAG_OVERRIDES[zone][ch] ?? FLAGS[ch]));
  return f;
}
export const ZONE_FLAGS = [0, 1, 2, 3].map(tileFlags);

export function tileArtSource(zone: number, ch: string): string[] | null {
  if (ch === ' ') return null;
  return ZONE_TILES[zone][ch] ?? GENERIC[ch] ?? null;
}

const cache: (Bitmap | null)[][] = [];
export function tileArt(zone: number): (Bitmap | null)[] {
  if (!cache[zone]) cache[zone] = [...TILE_CHARS].map((ch) => { const s = tileArtSource(zone, ch); return s ? parseGrid(norm(s), PIX) : null; });
  return cache[zone];
}
export function tileId(ch: string): number { const i = TILE_CHARS.indexOf(ch); return i < 0 ? 0 : i; }
// For the dev sheet / debug viewer.
export function tileArtMap(zone: number): Record<string, Bitmap> {
  return Object.fromEntries([...TILE_CHARS].slice(1).map((ch, i) => [ch, tileArt(zone)[i + 1]!]));
}
