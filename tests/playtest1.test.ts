// Playtest round 1: each bug gets a test, written before the fix.
import { describe, it, expect } from 'vitest';
import { newWorld, step } from '../src/game/world';
import { testWorld, run, runUntil, room } from './helpers';
import { IN_R, IN_J } from '../src/game/consts';

describe('playtest round 1', () => {
  it('jumps are higher: clear a two-tile step and a three-tile gap', () => {
    const step2 = testWorld(room((r) => { for (let x = 9; x < 15; x++) { r[9][x] = '#'; r[8][x] = '#'; } }), [7, 9]);
    run(step2, IN_R | IN_J, 1);
    runUntil(step2, IN_R, (x) => x.p.st === 'stand' || x.p.st === 'walk', 120);
    expect(step2.p.y).toBe(128); // landed on top of the two-tile step

    const gap = testWorld(room((r) => { for (let x = 6; x < 9; x++) r[10][x] = ' '; }), [5, 9]);
    gap.p.x = 5 * 16 + 10;
    run(gap, IN_R | IN_J, 1);
    runUntil(gap, IN_R, (x) => x.p.st === 'stand' || x.p.st === 'walk' || x.state !== 'play', 120);
    expect(gap.state).toBe('play');
    expect(gap.p.x).toBeGreaterThan(9 * 16);
  });

  it('a jump pressed just before landing still happens (jump buffer)', () => {
    const w = testWorld(room(() => {}), [5, 9]);
    run(w, IN_J, 1);
    runUntil(w, 0, (x) => x.p.vy > 2.5 && x.p.y > 150, 120);
    run(w, IN_J, 1); // pressed a few frames early
    runUntil(w, 0, (x) => x.p.st === 'stand', 30);
    run(w, 0, 3);
    expect(w.p.st).toBe('jump');
  });

  it('a jump pressed just after walking off a ledge still happens (coyote time)', () => {
    const w = testWorld(room((r) => { for (let x = 1; x < 7; x++) r[7][x] = '='; }), [5, 6]);
    runUntil(w, IN_R, (x) => x.p.st === 'fall', 60);
    run(w, IN_R, 2);
    run(w, IN_R | IN_J, 1);
    expect(w.p.st).toBe('jump');
  });

  it('the giant ball does not follow Bobby off the drain screen once he has jumped the drain', () => {
    // Bobby leaves the drain screen while the ball is still rolling towards the drain.
    const w = newWorld({ zone: 0, seed: 1, screen: 'z1s03', x: 200, y: 160 });
    w.pursuit = null;
    w.ents.push({ id: 999, k: 'gball', type: 'giantBall', x: 40, y: 130, w: 30, h: 30, vx: 0, vy: 0, dir: 1, st: 2, t: 0, n: 0, data: {} });
    runUntil(w, IN_R, (x) => x.screen !== 'z1s03', 200);
    expect(w.screen).toBe('z1s04');
    run(w, IN_R, 400);
    expect(w.ents.some((e) => e.k === 'gball')).toBe(false);
    expect(w.pursuit).toBe(null);
  });

  it('without a drain in the way, the ball still follows', () => {
    const w = newWorld({ zone: 0, seed: 1, screen: 'z1s02', x: 200, y: 160 });
    w.pursuit = null;
    w.ents.push({ id: 999, k: 'gball', type: 'giantBall', x: 20, y: 130, w: 30, h: 30, vx: 0, vy: 0, dir: 1, st: 2, t: 0, n: 0, data: {} });
    runUntil(w, IN_R, (x) => x.screen !== 'z1s02', 200);
    expect(w.pursuit).not.toBe(null);
  });
});
void step;
