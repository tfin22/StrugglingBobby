import { describe, it, expect } from 'vitest';
import { testWorld, run, runUntil, ROOM } from './helpers';
import { IN_K, IN_S, IN_R } from '../src/game/consts';
import { T } from '../src/game/tuning';
import { ENEMY_TYPES } from '../src/content/enemies';

describe('enemies', () => {
  it('walkers patrol between their bounds', () => {
    const w = testWorld(ROOM, [2, 2], { ents: [{ t: 'steward', x: 8, y: 9, x0: 6, x1: 10 }] });
    w.invincible = true;
    const e = w.ents.find((x) => x.k === 'enemy')!;
    const xs: number[] = [];
    for (let i = 0; i < 400; i++) { run(w, 0, 1); xs.push(e.x); }
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(6 * 16);
    expect(Math.max(...xs) + e.w).toBeLessThanOrEqual(11 * 16);
  });

  it('a ball knocks a steward down; the scarf stuns', () => {
    const w = testWorld(ROOM, [3, 9], { ents: [{ t: 'steward', x: 10, y: 9, x0: 10, x1: 10 }] });
    run(w, IN_K, 1); run(w, 0, 40);
    expect(w.ents.find((x) => x.k === 'enemy')?.st ?? 99).toBe(99);
    const w2 = testWorld(ROOM, [6, 9], { ents: [{ t: 'creditor', x: 8, y: 9, x0: 8, x1: 8 }] });
    run(w2, IN_S, 1); run(w2, 0, 10);
    const c = w2.ents.find((x) => x.k === 'enemy')!;
    expect(c.stun).toBeGreaterThan(0);
    expect(c.stun).toBeLessThanOrEqual(T.stunFrames);
  });

  it('stunned enemies are harmless while stunned', () => {
    const w = testWorld(ROOM, [6, 9], { ents: [{ t: 'creditor', x: 8, y: 9, x0: 8, x1: 8 }] });
    run(w, IN_S, 1); run(w, 0, 16);
    run(w, IN_R, 20);
    expect(w.state).toBe('play');
  });

  it('a steward marches Bobby back; no life lost', () => {
    const w = testWorld(ROOM, [6, 9], { ents: [{ t: 'steward', x: 8, y: 9, x0: 7, x1: 9 }] });
    const lives = w.lives;
    runUntil(w, IN_R, (x) => x.state !== 'play', 100);
    expect(w.state).toBe('march');
    run(w, 0, T.marchFrames + 1);
    expect(w.lives).toBe(lives);
    expect(w.state).toBe('play');
  });

  it('a seagull steals one pie, never a life', () => {
    const w = testWorld(ROOM, [7, 9], { ents: [{ t: 'gull', x: 7, y: 5, x0: 5, x1: 10 }] });
    const pies = w.pies, lives = w.lives;
    run(w, 0, 300);
    expect(w.pies).toBe(pies - 1);
    expect(w.lives).toBe(lives);
    expect(w.state).toBe('play');
  });

  it('enemy data: every type can be beaten by something', () => {
    for (const [k, e] of Object.entries(ENEMY_TYPES)) expect(e.killBy.length + (e.stun ? 1 : 0), k).toBeGreaterThan(0);
  });
});
