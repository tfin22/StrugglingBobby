// The master palette, in 12-bit Amiga RGB (0xRGB, one nibble per gun).
// Indices 0-15 are shared by every zone (sprites, text, the status strip).
// Indices 16-31 are the zone's own 16 colours. 32 active colours per zone.

export const SHARED: number[] = [
  0x000, // 0  sky / transparent (the copper gradient shows through)
  0x000, // 1  outline black
  0x445, // 2  dark grey
  0x889, // 3  mid grey
  0xfff, // 4  white
  0xfb9, // 5  skin
  0xc76, // 6  skin shadow
  0xfc0, // 7  Levenmouth gold
  0xb70, // 8  gold shadow
  0xff9, // 9  gold highlight
  0xd22, // 10 red
  0x711, // 11 dark red
  0xa63, // 12 pie crust / leather
  0x531, // 13 dark brown / Bovril
  0xdf2, // 14 hi-vis
  0x46c, // 15 blue
];

// Zone slots (tile chars 0-9a-f):
// 0 deep shadow, 1-4 main material dark..highlight, 5-7 second material,
// 8-a accent, b-c metal, d-e back wall, f glow.
export const ZONE_PALETTES: number[][] = [
  // Zone 1: Harbour Park. Rusted terracing, painted wood, grey Fife stone, pitch green.
  [0x112, 0x434, 0x656, 0x878, 0xaab, 0x521, 0x843, 0xb75, 0x241, 0x372, 0x5a4, 0x833, 0xc65, 0x223, 0x334, 0xfe8],
  // Zone 2: The Baron's boardroom. Marble, dark wood, gilt, velvet.
  [0x101, 0x655, 0x988, 0xbba, 0xeed, 0x310, 0x532, 0x854, 0x502, 0x815, 0xb38, 0x863, 0xdb5, 0x211, 0x322, 0xffc],
  // Zone 3: The liquidation vaults. Sickly green concrete, rust, paper.
  [0x010, 0x233, 0x354, 0x576, 0x8a8, 0x420, 0x641, 0x963, 0xbb8, 0xdda, 0xffe, 0x544, 0x987, 0x122, 0x233, 0xcf6],
  // Zone 4: The national stadium. Night concrete, steel, floodlit turf, banners.
  [0x002, 0x334, 0x557, 0x88a, 0xccd, 0x113, 0x226, 0x44a, 0x150, 0x283, 0x4c5, 0x568, 0x9ac, 0x112, 0x224, 0xffd],
];

// Copper skies: per-scanline gradient stops [y (0..1 of play area), colour].
export const COPPER: [number, number][][] = [
  [[0, 0x667], [0.4, 0x889], [0.75, 0x99a], [1, 0x778]], // grey Fife drizzle
  [[0, 0x200], [0.5, 0x310], [1, 0x421]], // dark boardroom wood
  [[0, 0x020], [0.5, 0x041], [1, 0x132]], // sickly green vault
  [[0, 0x002], [0.55, 0x114], [0.85, 0x236], [1, 0x447]], // floodlit night
];

export function rgb12to32(c: number): number {
  const r = ((c >> 8) & 15) * 17, g = ((c >> 4) & 15) * 17, b = (c & 15) * 17;
  return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0; // ABGR for little-endian ImageData
}

export function copperRows(zone: number, rows: number): number[] {
  const stops = COPPER[zone];
  const out: number[] = [];
  for (let y = 0; y < rows; y++) {
    const f = y / (rows - 1);
    let i = 0;
    while (i < stops.length - 2 && f > stops[i + 1][0]) i++;
    const [f0, c0] = stops[i], [f1, c1] = stops[i + 1];
    const t = Math.max(0, Math.min(1, (f - f0) / (f1 - f0 || 1)));
    // Quantise per-channel to 12-bit, like the copper would.
    const ch = (s: number) => Math.round(((c0 >> s) & 15) * (1 - t) + ((c1 >> s) & 15) * t);
    out.push((ch(8) << 8) | (ch(4) << 4) | ch(0));
  }
  return out;
}
