import { describe, it, expect } from 'vitest';
import { testWorld, run, runUntil, ROOM, room } from './helpers';
import { IN_L, IN_R, IN_K, IN_P, IN_S } from '../src/game/consts';
import { T } from '../src/game/tuning';
import { tileId } from '../src/content/tiles';

describe('the three tools', () => {
  it('the ball: volleyed low and fast, costs one, bounces off a wall once, then gone', () => {
    const w = testWorld(ROOM, [3, 9]);
    const b0 = w.balls;
    run(w, IN_K, 1); run(w, 0, T.kickLaunchFrame);
    const ball = w.ents.find((e) => e.k === 'ball')!;
    expect(w.balls).toBe(b0 - 1);
    expect(ball.vx).toBe(T.ballSpeed);
    expect(ball.y).toBeGreaterThan(w.p.y - 16);
    runUntil(w, 0, () => !!w.ents.find((e) => e.k === 'ball' && e.vx < 0), 100);
    expect(w.ents.find((e) => e.k === 'ball')!.vx).toBe(-T.ballSpeed);
    runUntil(w, 0, () => !w.ents.some((e) => e.k === 'ball'), 200);
    expect(w.ents.some((e) => e.k === 'ball')).toBe(false);
  });

  it('no kick with no balls', () => {
    const w = testWorld(ROOM, [3, 9]);
    w.balls = 0;
    run(w, IN_K, 1); run(w, 0, 10);
    expect(w.ents.some((e) => e.k === 'ball')).toBe(false);
  });

  it('the pie: dropped lit, blows up a weak wall, and Bobby if he stays', () => {
    const map = room((r) => { for (let y = 7; y <= 9; y++) r[y][8] = 'W'; });
    const w = testWorld(map, [7, 9]);
    const p0 = w.pies;
    run(w, IN_P, 1); run(w, 0, 10);
    expect(w.pies).toBe(p0 - 1);
    expect(w.ents.some((e) => e.k === 'pie')).toBe(true);
    run(w, 0, T.pieFuse);
    expect(w.state).toBe('dying');
    expect(w.deathCause).toBe('pie');
    expect(w.tiles[9 * 16 + 8]).toBe(0);
  });

  it('the pie: walk away and the wall goes, Bobby stays', () => {
    const map = room((r) => { for (let y = 7; y <= 9; y++) r[y][8] = 'W'; });
    const w = testWorld(map, [7, 9]);
    run(w, IN_P, 1); run(w, 0, 10); run(w, IN_L, 40); run(w, 0, 80);
    expect(w.state).toBe('play');
    for (let y = 7; y <= 9; y++) expect(w.tiles[y * 16 + 8]).toBe(0);
  });

  it('the scarf: unlimited, snuffs out a pie you regret and gives it back', () => {
    const w = testWorld(ROOM, [6, 9]);
    const p0 = w.pies;
    run(w, IN_P, 1); run(w, 0, 10);
    run(w, IN_L, 14); run(w, IN_R, 1); run(w, 0, 2);
    expect(w.p.facing).toBe(1);
    run(w, IN_S, 1); run(w, 0, T.scarfFrames);
    expect(w.ents.some((e) => e.k === 'pie')).toBe(false);
    expect(w.pies).toBe(p0);
    run(w, 0, 120);
    expect(w.state).toBe('play');
  });

  it('the scarf hit is a fixed rectangle only on the crack frames', () => {
    const w = testWorld(ROOM, [6, 9], { ents: [{ t: 'switch', x: 8, y: 9, link: [] }] });
    const sw = w.ents.find((e) => e.k === 'switch')!;
    run(w, IN_S, 1);
    for (let f = 1; f < T.scarfHitFrom; f++) { run(w, 0, 1); expect(sw.on).toBe(false); }
    run(w, 0, T.scarfHitTo - T.scarfHitFrom + 1);
    expect(sw.on).toBe(true);
    run(w, 0, 20);
    expect(sw.on).toBe(true); // once per flick
  });

  it('pickups top up counts, capped', () => {
    const w = testWorld(ROOM, [3, 9], { ents: [{ t: 'kitbag', x: 5, y: 9 }, { t: 'piestall', x: 7, y: 9 }] });
    w.balls = 8; w.pies = 1;
    run(w, IN_R, 60);
    expect(w.balls).toBe(T.maxBalls);
    expect(w.pies).toBe(1 + T.stallPies);
  });

  it('a trap stall drops a lit pie', () => {
    const w = testWorld(ROOM, [3, 9], { ents: [{ t: 'piestall', x: 5, y: 9, trap: true }] });
    const p0 = w.pies;
    run(w, IN_R, 20);
    expect(w.pies).toBe(p0);
    expect(w.ents.some((e) => e.k === 'pie')).toBe(true);
  });

  it('gates open from a scarfed lever', () => {
    const w = testWorld(ROOM, [4, 9], { ents: [{ t: 'switch', x: 6, y: 9, link: ['g'] }, { t: 'gate', x: 10, y: 7, len: 3, name: 'g' }] });
    expect(w.tiles[8 * 16 + 10]).toBe(tileId('G'));
    run(w, IN_S, 1); run(w, 0, T.scarfFrames);
    expect(w.tiles[8 * 16 + 10]).toBe(0);
  });
});
