import { describe, it, expect } from 'vitest';
import { testWorld, run, runUntil, ROOM } from './helpers';
import { newWorld, step, addScore } from '../src/game/world';
import { IN_R, IN_K, IN_P } from '../src/game/consts';
import { T } from '../src/game/tuning';
import { DEATH_LINES } from '../src/content/text/deathlines';
import { pickDeathLine, candidates } from '../src/game/deathlines';
import { insertScore, scoreRank, DEFAULT_SCORES } from '../src/game/save';
import { interview, tierKey } from '../src/game/interview';
import { INTERVIEWS } from '../src/content/text/interview';
import { DeathCause } from '../src/game/types';

describe('death and restart', () => {
  it('one hit kills, then Bobby is back at the screen entry within two seconds, tools refunded', () => {
    const w = testWorld(ROOM, [4, 9], { ents: [{ t: 'trap', type: 'lamp', x: 9, y: 2 }] });
    const b0 = w.balls, p0 = w.pies, lives = w.lives;
    const x0 = w.cp.x;
    run(w, IN_K, 1); run(w, 0, 14); run(w, IN_P, 1); run(w, 0, 12);
    expect(w.balls).toBe(b0 - 1); expect(w.pies).toBe(p0 - 1);
    runUntil(w, IN_R, (x) => x.p.x >= 9 * 16 + 4, 300);
    runUntil(w, 0, (x) => x.state === 'dying', 300);
    expect(w.lives).toBe(lives - 1);
    expect(w.deathLine.length).toBeGreaterThan(0);
    let frames = 0;
    while ((w.state as string) === 'dying') { step(w, 0); frames++; }
    expect(frames).toBeLessThanOrEqual(100);
    expect(w.state).toBe('play');
    expect(w.balls).toBe(b0); expect(w.pies).toBe(p0);
    expect(w.p.x).toBe(x0);
  });

  it('losing the last life is game over', () => {
    const w = testWorld(ROOM, [4, 9], { ents: [{ t: 'trap', type: 'studs', x: 6, y: 9 }] });
    w.lives = 1;
    runUntil(w, IN_R, (x) => x.state === 'dying', 200);
    run(w, 0, T.deathFrames + 1);
    expect(w.state).toBe('gameOver');
  });

  it('1989 mode restarts at the zone start', () => {
    const w = newWorld({ zone: 0, seed: 1, mode: '1989' });
    const start = w.zoneCp.screen;
    w.screen = 'z1s03';
    w.cp = { ...w.cp, screen: 'z1s03' };
    w.state = 'play';
    // die
    w.p.y = 400; step(w, 0);
    while ((w.state as string) === 'dying') step(w, 0);
    expect(w.screen).toBe(start);
  });
});

describe('scoring', () => {
  it('pickups score and an extra life arrives every so often', () => {
    const w = testWorld(ROOM, [3, 9], { ents: [{ t: 'programme', x: 5, y: 9 }] });
    run(w, IN_R, 30);
    expect(w.score).toBe(250);
    const lives = w.lives;
    addScore(w, T.extraLifeEvery);
    expect(w.lives).toBe(lives + 1);
  });
  it('points pickups stay collected after a restart', () => {
    const w = newWorld({ zone: 0, seed: 1, screen: 'z1s05', x: 200, y: 160 });
    const n = w.ents.filter((e) => e.k === 'pickup').length;
    w.collected.push('z1s05#3');
    w.p.y = 400; step(w, 0);
    while ((w.state as string) === 'dying') step(w, 0);
    expect(w.ents.filter((e) => e.k === 'pickup').length).toBe(n - 1);
  });
});

describe('high scores', () => {
  it('inserts in order and keeps ten', () => {
    expect(scoreRank(DEFAULT_SCORES, 1)).toBe(-1);
    expect(scoreRank(DEFAULT_SCORES, 60000)).toBe(0);
    const { table, rank } = insertScore(DEFAULT_SCORES, { name: 'TOM', score: 26000, zone: 3, mode: '2026' });
    expect(rank).toBe(3);
    expect(table.length).toBe(10);
    expect(table[3].name).toBe('TOM');
    expect(table.map((t) => t.score)).toEqual([...table.map((t) => t.score)].sort((a, b) => b - a));
  });
});

describe('death lines', () => {
  const causes: DeathCause[] = ['ball', 'crushed', 'fall', 'dart', 'spike', 'pie', 'enemy', 'boss', 'any'];
  it('about eighty of them, at least five per cause', () => {
    expect(DEATH_LINES.length).toBeGreaterThanOrEqual(75);
    for (const c of causes) expect(DEATH_LINES.filter((l) => l.c.includes(c)).length, c).toBeGreaterThanOrEqual(5);
  });
  it('lines fit their cause and zone, and never repeat twice running', () => {
    for (let z = 0; z < 4; z++) for (const c of causes) {
      const w = newWorld({ zone: z, seed: 99 + z });
      let last = '';
      for (let i = 0; i < 40; i++) {
        w.screen = 'x' + i; // different screens, so no chained follow-up
        const line = pickDeathLine(w, c);
        const def = DEATH_LINES.find((l) => l.t === line)!;
        expect(def.c.includes(c) || def.c.includes('any')).toBe(true);
        expect(!def.z || def.z.includes(z)).toBe(true);
        expect(line).not.toBe(last);
        last = line;
      }
    }
    expect(candidates('boss', 3, false).length).toBeGreaterThan(0);
  });
  it('"they think it\'s all over" gets its follow-up on the same screen', () => {
    const w = newWorld({ zone: 0, seed: 1 });
    const i = DEATH_LINES.findIndex((l) => l.next);
    w.lineState.last = i; w.lineState.lastScreen = w.screen;
    expect(pickDeathLine(w, 'any')).toBe(DEATH_LINES[i].next);
  });
});

describe('the post-match interview', () => {
  it('reacts to how the zone went', () => {
    const good = { deaths: 0, seconds: 100, piesUsed: 0, bossFirstTime: true, screens: 20 };
    const bad = { deaths: 20, seconds: 2000, piesUsed: 12, bossFirstTime: false, screens: 20 };
    expect(tierKey('deaths', good)).toBe('great');
    expect(tierKey('deaths', bad)).toBe('awful');
    expect(tierKey('pies', good)).toBe('none');
    expect(tierKey('pies', bad)).toBe('many');
    expect(tierKey('time', good)).toBe('fast');
    expect(tierKey('time', bad)).toBe('slow');
    for (let z = 0; z < 4; z++) {
      const a = interview(z, good), b = interview(z, bad);
      expect(a.length).toBeGreaterThanOrEqual(3);
      expect(a.map((x) => x.a)).not.toEqual(b.map((x) => x.a));
      for (const x of [...a, ...b]) { expect(x.a.length).toBeGreaterThan(5); expect(x.a).not.toMatch(/\{[DP]\}/); }
    }
  });
  it('every answer is filled in', () => {
    for (const z of INTERVIEWS) for (const qa of z) for (const a of Object.values(qa.a)) expect(a.trim().length).toBeGreaterThan(5);
  });
});
