// The master palette, in 12-bit Amiga RGB (0xRGB, one nibble per gun).
// Indices 0-15 are shared by every zone (sprites, text, the status strip).
// Indices 16-31 are the zone's own 16 colours. 32 active colours per zone.

export const SHARED: number[] = [
  0x000, // 0  sky / transparent (the copper gradient shows through)
  0x000, // 1  outline black
  0x334, // 2  dark grey (Bobby's tracksuit)
  0x99a, // 3  mid grey
  0xfff, // 4  white
  0xfb8, // 5  skin
  0xc75, // 6  skin shadow
  0xfc1, // 7  Levenmouth gold
  0xb60, // 8  gold shadow
  0xffa, // 9  gold highlight
  0xe22, // 10 red
  0x811, // 11 dark red
  0xb63, // 12 pie crust / leather
  0x531, // 13 dark brown / Bovril
  0xdf2, // 14 hi-vis
  0x36e, // 15 blue
];

// Zone slots (tile chars 0-9a-f):
// 0 deep shadow, 1-4 main material dark..highlight, 5-7 second material,
// 8-a accent, b-c metal, d-e back wall, f glow.
// Bright, warm foregrounds against dark, cool back walls, so things pop.
export const ZONE_PALETTES: number[][] = [
  // Zone 1: Harbour Park. Warm Fife sandstone, slate, rust, vivid turf.
  [0x101, 0x532, 0x965, 0xca7, 0xfec, 0x620, 0xa52, 0xe94, 0x170, 0x3b2, 0x8e4, 0x933, 0xe75, 0x223, 0x345, 0xff8],
  // Zone 2: The Baron's boardroom. White marble, mahogany, crimson velvet, gilt.
  [0x100, 0x766, 0xbaa, 0xedd, 0xfff, 0x420, 0x831, 0xc62, 0x701, 0xc12, 0xf55, 0xa60, 0xfd3, 0x301, 0x512, 0xffd],
  // Zone 3: The liquidation vaults. Acid-green concrete, rust, paper, steel.
  [0x011, 0x143, 0x375, 0x6a8, 0xbfb, 0x520, 0x952, 0xd84, 0xcc9, 0xeeb, 0xfff, 0x467, 0x8bc, 0x021, 0x132, 0xcf4],
  // Zone 4: The national stadium. Floodlit concrete, steel, blue seats, turf.
  [0x002, 0x346, 0x579, 0x9bd, 0xdef, 0x226, 0x44a, 0x77e, 0x060, 0x2a2, 0x6e4, 0x468, 0x9ce, 0x113, 0x225, 0xffd],
];

// Copper skies: per-scanline gradient stops [y (0..1 of play area), colour].
export const COPPER: [number, number][][] = [
  [[0, 0x235], [0.45, 0x58a], [0.8, 0x9bc], [1, 0xbcc]], // Fife drizzle, moody blue to grey
  [[0, 0x200], [0.5, 0x412], [1, 0x623]], // dark boardroom wood
  [[0, 0x010], [0.5, 0x142], [1, 0x264]], // sickly green vault
  [[0, 0x001], [0.5, 0x115], [0.85, 0x239], [1, 0x36b]], // floodlit night
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
