import { describe, it, expect } from 'vitest';
import { testWorld, run, runUntil, ROOM, room } from './helpers';
import { IN_L, IN_R, IN_U, IN_D, IN_J } from '../src/game/consts';
import { T } from '../src/game/tuning';

describe('movement', () => {
  it('walks at a steady pace with no inertia', () => {
    const w = testWorld(ROOM, [3, 9]);
    const x0 = w.p.x;
    run(w, IN_R, 10);
    expect(w.p.x - x0).toBeCloseTo(T.walkSpeed * 10, 5);
    run(w, 0, 1);
    const x1 = w.p.x; run(w, 0, 5);
    expect(w.p.x).toBe(x1);
  });

  it('jumps in a fixed arc, direction committed at take-off', () => {
    const w = testWorld(ROOM, [3, 9]);
    const x0 = w.p.x, y0 = w.p.y;
    run(w, IN_R | IN_J, 1);
    let peak = y0;
    // Push left mid-air: no steering
    for (let i = 0; i < 60 && w.p.st !== 'stand'; i++) { run(w, IN_L, 1); peak = Math.min(peak, w.p.y); }
    expect(w.p.y).toBe(y0);
    expect(w.p.x - x0).toBeGreaterThan(40); // carried on rightwards
    expect(y0 - peak).toBeGreaterThan(24);
    expect(y0 - peak).toBeLessThan(32);
  });

  it('jumps straight up when standing still', () => {
    const w = testWorld(ROOM, [6, 9]);
    const x0 = w.p.x;
    run(w, IN_J, 1); runUntil(w, 0, (x) => x.p.st === 'stand');
    expect(w.p.x).toBe(x0);
  });

  it('crouches and crawls under a one-tile gap', () => {
    const map = room((r) => { for (let x = 6; x < 10; x++) r[8][x] = '#'; for (let x = 6; x < 10; x++) r[7][x] = '#'; });
    const w = testWorld(map, [3, 9]);
    run(w, IN_R, 40);
    expect(w.p.x).toBeLessThan(6 * 16); // blocked standing
    run(w, IN_R | IN_D, 120);
    expect(w.p.x).toBeGreaterThan(10 * 16);
    expect(w.p.crouched).toBe(true);
    run(w, IN_R, 20);
    expect(w.p.crouched).toBe(false);
  });

  it('climbs ladders up and down and steps off at the top', () => {
    const map = room((r) => { for (let y = 5; y <= 9; y++) r[y][8] = 'H'; for (let x = 1; x < 8; x++) r[5][x] = '='; });
    const w = testWorld(map, [8, 9]);
    run(w, IN_U, 1);
    expect(w.p.st).toBe('climb');
    runUntil(w, IN_U, (x) => x.p.st === 'stand');
    expect(w.p.y).toBe(5 * 16);
    run(w, IN_L, 20);
    expect(w.p.x).toBeLessThan(8 * 16);
    expect(w.p.y).toBe(80);
    run(w, IN_R, 20); run(w, 0, 2);
    // and back down
    runUntil(w, IN_D, (x) => x.p.st === 'stand' && x.p.y === 160, 400);
    expect(w.p.y).toBe(160);
  });

  it('drops off the bottom of a ladder', () => {
    const map = room((r) => { for (let y = 3; y <= 6; y++) r[y][8] = 'H'; for (let x = 1; x < 8; x++) r[3][x] = '='; });
    const w = testWorld(map, [4, 2]);
    runUntil(w, IN_R, (x) => Math.abs(x.p.x - 136) < 1, 100);
    run(w, IN_D, 1);
    runUntil(w, IN_D, (x) => x.p.st !== 'climb', 300);
    runUntil(w, 0, (x) => x.p.st === 'stand' || x.state !== 'play', 200);
    expect(w.state).toBe('play');
    expect(w.p.y).toBe(160);
  });

  it('a short drop is fine; a long one kills', () => {
    const short = testWorld(room((r) => { for (let x = 1; x < 6; x++) r[6][x] = '='; }), [3, 5]);
    runUntil(short, IN_R, (x) => x.p.st === 'fall', 100);
    runUntil(short, 0, (x) => x.p.st !== 'fall', 200);
    expect(short.state).toBe('play');
    const long = testWorld(room((r) => { for (let x = 1; x < 6; x++) r[3][x] = '='; }), [3, 2]);
    runUntil(long, IN_R, (x) => x.p.st === 'fall', 100);
    runUntil(long, 0, (x) => x.state !== 'play', 200);
    expect(long.state).toBe('dying');
    expect(long.deathCause).toBe('fall');
  });

  it('studs in the floor kill', () => {
    const w = testWorld(room((r) => { r[9][8] = '^'; }), [6, 9]);
    runUntil(w, IN_R, (x) => x.state !== 'play', 100);
    expect(w.deathCause).toBe('spike');
  });
});
