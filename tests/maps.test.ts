import { describe, it, expect } from 'vitest';
import { ZONES } from '../src/content/zones';
import { TILE_CHARS } from '../src/content/tiles';
import { TRAP_TYPES } from '../src/content/traps';
import { ENEMY_TYPES } from '../src/content/enemies';
import { PICKUPS } from '../src/content/pickups';

describe('screen data', () => {
  for (const z of ZONES) for (const s of z.screens) {
    it(`${s.id} ${s.name}`, () => {
      expect(s.map.length, 'rows').toBe(11);
      s.map.forEach((r, i) => {
        expect(r.length, `row ${i} length`).toBe(16);
        for (const ch of r) expect(TILE_CHARS.includes(ch), `char '${ch}' row ${i}`).toBe(true);
      });
      for (const e of s.ents ?? []) {
        const known = ['sign', 'npc', 'exit', 'switch', 'gate', 'boss', 'trap'].includes(e.t) || ENEMY_TYPES[e.t] || PICKUPS[e.t];
        expect(known, `entity ${e.t}`).toBeTruthy();
        if (e.t === 'trap') expect(TRAP_TYPES[e.type!], `trap ${e.type}`).toBeTruthy();
      }
      expect(s.name.length, 'room name fits the strip').toBeLessThanOrEqual(53);
    });
  }
  it('screen ids and grid positions are unique', () => {
    const ids = new Set<string>(), at = new Set<string>();
    for (const z of ZONES) for (const s of z.screens) {
      expect(ids.has(s.id)).toBe(false); ids.add(s.id);
      const k = z.n + ':' + s.at.join(','); expect(at.has(k), k).toBe(false); at.add(k);
    }
  });
});
