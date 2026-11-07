// Tile queries for the current screen. Off-screen lookups read the
// neighbouring screen's map, so movement across an edge is seamless.
import { World } from './types';
import { COLS, ROWS, TS, PW, PH } from './consts';
import { ZONE_FLAGS, F_SOLID, F_PLAT, F_LADDER, F_SPIKE, tileId } from '../content/tiles';
import { neighbour } from '../content/zones';

export function tileIdAt(w: World, tx: number, ty: number): number {
  if (tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS) return w.tiles[ty * COLS + tx];
  const dx = tx < 0 ? -1 : tx >= COLS ? 1 : 0;
  const dy = ty < 0 ? -1 : ty >= ROWS ? 1 : 0;
  const n = neighbour(w.zone, w.screen, dx, dy);
  if (!n) {
    if (dy > 0 && dx === 0) return 0; // a pit
    return tileId('#');
  }
  const nx = ((tx % COLS) + COLS) % COLS, ny = ((ty % ROWS) + ROWS) % ROWS;
  return tileId(n.map[ny]?.[nx] ?? ' ');
}

export function flagsAt(w: World, tx: number, ty: number): number {
  return ZONE_FLAGS[w.zone][tileIdAt(w, tx, ty)];
}
export function flagsPx(w: World, px: number, py: number): number {
  return flagsAt(w, Math.floor(px / TS), Math.floor(py / TS));
}

export function solidPx(w: World, px: number, py: number): boolean {
  return (flagsPx(w, px, py) & F_SOLID) !== 0;
}

// Any solid tile overlapping the rect [x0,x1) x [y0,y1)?
export function boxSolid(w: World, x0: number, y0: number, x1: number, y1: number): boolean {
  const tx0 = Math.floor(x0 / TS), tx1 = Math.floor((x1 - 0.001) / TS);
  const ty0 = Math.floor(y0 / TS), ty1 = Math.floor((y1 - 0.001) / TS);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (flagsAt(w, tx, ty) & F_SOLID) return true;
  return false;
}

export function boxFlags(w: World, x0: number, y0: number, x1: number, y1: number): number {
  const tx0 = Math.floor(x0 / TS), tx1 = Math.floor((x1 - 0.001) / TS);
  const ty0 = Math.floor(y0 / TS), ty1 = Math.floor((y1 - 0.001) / TS);
  let f = 0;
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) f |= flagsAt(w, tx, ty);
  return f;
}

export function isLadderPx(w: World, px: number, py: number): boolean {
  return (flagsPx(w, px, py) & F_LADDER) !== 0;
}

// Can something stand at feet-y = y (must be a tile top) across [x0,x1)?
// Solid tops, one-way planks, and the top rung of a ladder all count.
export function supportAt(w: World, x0: number, x1: number, y: number, ignoreLadderTop = false): boolean {
  if (y % TS !== 0) return false;
  const ty = y / TS;
  const tx0 = Math.floor(x0 / TS), tx1 = Math.floor((x1 - 0.001) / TS);
  for (let tx = tx0; tx <= tx1; tx++) {
    const f = flagsAt(w, tx, ty);
    if (f & (F_SOLID | F_PLAT)) {
      // A solid tile only supports if the tile above it is open (not inside a wall)
      return true;
    }
    if (!ignoreLadderTop && f & F_LADDER && !(flagsAt(w, tx, ty - 1) & F_LADDER)) return true;
  }
  return false;
}

export function spikeOverlap(w: World, x0: number, y0: number, x1: number, y1: number): boolean {
  // Studs occupy the lower part of their tile; only count overlap with the bottom 10px.
  const tx0 = Math.floor(x0 / TS), tx1 = Math.floor((x1 - 0.001) / TS);
  const ty0 = Math.floor(y0 / TS), ty1 = Math.floor((y1 - 0.001) / TS);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++)
    if (flagsAt(w, tx, ty) & F_SPIKE) {
      const top = ty * TS + 10;
      if (y1 > top && y0 < ty * TS + TS && x1 > tx * TS + 1 && x0 < tx * TS + TS - 1) return true;
    }
  return false;
}

export function inPlay(x: number, y: number) { return x >= 0 && x < PW && y >= 0 && y < PH; }

export function overlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
