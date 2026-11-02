import { describe, it, expect } from 'vitest';
import { SONGS } from '../src/content/music';

describe('music data', () => {
  it('every token in every song is a note, a hold, a stop or a drum', () => {
    for (const [name, song] of Object.entries(SONGS)) {
      song.pats.forEach((pat, pi) => {
        expect(pat.length, name).toBe(4);
        pat.forEach((ch, c) => {
          const toks = ch.trim().split(/\s+/);
          expect(toks.length, `${name} pattern ${pi} channel ${c}`).toBe(16);
          for (const t of toks) {
            const ok = c === 3 ? /^[.KSHOTC-]$/.test(t) : /^([.-]|[A-G][#b]?\d)$/.test(t);
            expect(ok, `${name} p${pi} c${c} '${t}'`).toBe(true);
          }
        });
      });
      for (const o of song.order) expect(song.pats[typeof o === 'number' ? o : o[0]], name).toBeTruthy();
    }
  });
  it('zone tunes are long enough not to grate: at least 8 sections before looping', () => {
    for (const n of ['title', 'zone1', 'zone2', 'zone3', 'zone4']) expect(SONGS[n].order.length, n).toBeGreaterThanOrEqual(8);
  });
});
