import { parseGrid, Bitmap } from '../../engine/framebuffer';
import { SPR } from './palette-chars';
import { BOBBY } from './bobby';
import { THINGS } from './things';
import { PERSON, SCHEMES, CREATURES } from './people';

function compile(src: Record<string, string[]>, extra: Record<string, number> = {}): Record<string, Bitmap> {
  const map = { ...SPR, ...extra };
  const out: Record<string, Bitmap> = {};
  for (const [k, rows] of Object.entries(src)) out[k] = parseGrid(rows, map);
  return out;
}
export const BOBBY_SPR = compile(BOBBY);
export const THING_SPR = compile(THINGS);
export const CREATURE_SPR = compile(CREATURES);

// PEOPLE.steward.walk1 etc.
export const PEOPLE: Record<string, Record<string, Bitmap>> = {};
for (const [name, scheme] of Object.entries(SCHEMES)) {
  const extra: Record<string, number> = {};
  for (const [ch, to] of Object.entries(scheme)) extra[ch] = SPR[to];
  PEOPLE[name] = compile(PERSON, extra);
}
// Flat lists for the dev sheet / debug viewer.
export const ALL_SPRITES: Record<string, Bitmap> = {
  ...BOBBY_SPR, ...THING_SPR, ...CREATURE_SPR,
  ...Object.fromEntries(Object.entries(PEOPLE).map(([n, s]) => [n, s.walk1])),
};
