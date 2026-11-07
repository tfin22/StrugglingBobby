import { newWorld, step } from '../src/game/world';
import { World } from '../src/game/types';
import { tileId } from '../src/content/tiles';
import { COLS, ROWS, TS } from '../src/game/consts';
import { spawnFromDef } from '../src/game/ents';
import { EntDef } from '../src/content/zones/types';

// A world on a made-up screen. Off-screen lookups still use z1s01's
// neighbours, so keep tests away from the edges.
export function testWorld(map: string[], at: [number, number], opts: { zone?: number; ents?: EntDef[] } = {}): World {
  const w = newWorld({ zone: opts.zone ?? 0, seed: 7, screen: opts.zone === undefined || opts.zone === 0 ? 'z1s01' : `z${opts.zone + 1}s01` });
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) w.tiles[y * COLS + x] = tileId(map[y]?.[x] ?? ' ');
  w.ents = [];
  w.p.x = at[0] * TS + 8; w.p.y = (at[1] + 1) * TS; w.p.st = 'stand'; w.p.vx = 0; w.p.vy = 0; w.p.crouched = false; w.p.facing = 1;
  w.cp = { screen: w.screen, x: w.p.x, y: w.p.y, facing: 1, balls: w.balls, pies: w.pies, pursuit: null, crouched: false };
  (opts.ents ?? []).forEach((d, i) => spawnFromDef(w, d, 'test#' + i));
  return w;
}
export function run(w: World, input: number, frames: number) {
  for (let i = 0; i < frames; i++) { step(w, input); w.events.length = 0; }
}
export function runUntil(w: World, input: number, cond: (w: World) => boolean, max = 600) {
  for (let i = 0; i < max && !cond(w); i++) { step(w, input); w.events.length = 0; }
}
// A plain room: floor at row 10, walls at the sides.
export const ROOM = [
  '################',
  '#              #',
  '#              #',
  '#              #',
  '#              #',
  '#              #',
  '#              #',
  '#              #',
  '#              #',
  '#              #',
  '################',
];
export function room(edit: (rows: string[][]) => void): string[] {
  const r = ROOM.map((s) => s.split(''));
  edit(r);
  return r.map((a) => a.join(''));
}
