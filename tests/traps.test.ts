import { describe, it, expect } from 'vitest';
import { testWorld, run, runUntil, ROOM, room } from './helpers';
import { IN_R, IN_D, IN_S } from '../src/game/consts';
import { TRAP_TYPES } from '../src/content/traps';
import { T } from '../src/game/tuning';

describe('traps', () => {
  it('every trap type has a tell (fairness)', () => {
    for (const [k, t] of Object.entries(TRAP_TYPES)) {
      expect(t.tell.length, k).toBeGreaterThan(10);
      expect(t.tellArt.length, k).toBeGreaterThan(0);
    }
  });

  it('the giant ball waits for its trigger, rumbles, then rolls and flattens', () => {
    const w = testWorld(ROOM, [10, 9], { ents: [{ t: 'trap', type: 'giantBall', x: 2, y: 9, dir: 1, trig: [6, 7, 8, 9] }] });
    const b = w.ents.find((e) => e.k === 'gball')!;
    run(w, 0, 30);
    expect(b.st).toBe(0);
    w.p.x = 7 * 16 + 8; run(w, 0, 1);
    expect(b.st).toBe(1); // the tell
    runUntil(w, 0, () => w.state !== 'play', 400);
    expect(w.deathCause).toBe('ball');
  });

  it('the giant ball smashes on a wall', () => {
    const w = testWorld(room((r) => { r[9][12] = '#'; r[8][12] = '#'; }), [3, 4], { ents: [{ t: 'trap', type: 'giantBall', x: 6, y: 9, dir: 1, delay: 1 }] });
    run(w, 0, 200);
    expect(w.ents.some((e) => e.k === 'gball')).toBe(false);
  });

  it('a falling object shakes first, then drops and crushes', () => {
    const w = testWorld(ROOM, [3, 9], { ents: [{ t: 'trap', type: 'lamp', x: 8, y: 1 }] });
    const d = w.ents.find((e) => e.k === 'drop')!;
    runUntil(w, IN_R, () => d.st !== 0, 100);
    expect(d.st).toBe(1);
    run(w, IN_R, 10); run(w, 0, 200);
    expect(w.deathCause).toBe('crushed');
  });

  it('the scarf knocks a low object down from a safe step away', () => {
    const w = testWorld(ROOM, [5, 9], { ents: [{ t: 'trap', type: 'cabinet', x: 7, y: 8, trig: [-9, -9, -9, -9] }] });
    run(w, IN_S, 1); run(w, 0, 80);
    expect(w.ents.find((e) => e.k === 'drop')!.st).toBe(3);
    expect(w.state).toBe('play');
  });

  it('studs pop up when stood on, after a warning', () => {
    const w = testWorld(ROOM, [4, 9], { ents: [{ t: 'trap', type: 'studs', x: 6, y: 9, len: 1 }] });
    const s = w.ents.find((e) => e.k === 'studs')!;
    runUntil(w, IN_R, () => s.st !== 0, 60);
    expect(s.st).toBe(1);
    run(w, 0, 40);
    expect(w.deathCause).toBe('spike');
  });

  it('darts fly at head height; crouching dodges them', () => {
    const mk = () => testWorld(room((r) => { r[9][14] = '#'; }), [6, 9], { ents: [{ t: 'trap', type: 'dartHole', x: 14, y: 9, dir: -1, trig: [5, 7, 8, 9] }] });
    const standing = mk();
    run(standing, 0, 120);
    expect(standing.deathCause).toBe('dart');
    const crouching = mk();
    run(crouching, IN_D, 120);
    expect(crouching.state).toBe('play');
  });

  it('rotten floors crumble under you; trapdoors almost at once', () => {
    const w = testWorld(room((r) => { r[10][8] = 'X'; r[10][9] = 'X'; }), [8, 9]);
    run(w, 0, T.crumbleDelay + 2);
    expect(w.tiles[10 * 16 + 8]).toBe(0);
    const t = testWorld(room((r) => { r[10][8] = 'Z'; }), [8, 9]);
    run(t, 0, T.trapdoorDelay + 2);
    expect(t.tiles[10 * 16 + 8]).toBe(0);
  });

  it('crushers cycle: warn, close, hold, open', () => {
    const w = testWorld(ROOM, [3, 9], { ents: [{ t: 'trap', type: 'shredder', x: 8, y: 6, len: 4, period: 140 }] });
    const c = w.ents.find((e) => e.k === 'crusher')!;
    const seen = new Set<number>();
    for (let i = 0; i < 140; i++) { run(w, 0, 1); seen.add(c.st); }
    expect([...seen].sort()).toEqual([0, 1, 2]);
  });

  it('jets (sprinklers, pyro) hurt only while on', () => {
    const w = testWorld(ROOM, [8, 9], { ents: [{ t: 'trap', type: 'sprinkler', x: 8, y: 9, len: 3, period: 100 }] });
    const j = w.ents.find((e) => e.k === 'jet')!;
    runUntil(w, 0, () => j.st === 2, 200);
    run(w, 0, 1);
    expect(w.state).toBe('dying');
  });

  it('patrolling hazards turn at their bounds', () => {
    const w = testWorld(ROOM, [2, 4], { ents: [{ t: 'trap', type: 'mower', x: 8, y: 9, x0: 6, x1: 11 }] });
    const m = w.ents.find((e) => e.k === 'patrol')!;
    const xs: number[] = [];
    for (let i = 0; i < 300; i++) { run(w, 0, 1); xs.push(m.x); }
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(6 * 16);
    expect(Math.max(...xs) + m.w).toBeLessThanOrEqual(12 * 16);
  });

  it('CCTV sends for a steward, far from Bobby; the scarf breaks it', () => {
    const w = testWorld(ROOM, [6, 9], { ents: [{ t: 'trap', type: 'cctv', x: 4, y: 3, dir: 1, trig: [5, 7, 9, 9] }] });
    run(w, 0, 40);
    const st = w.ents.find((e) => e.k === 'enemy' && e.type === 'steward');
    expect(st).toBeTruthy();
    expect(Math.abs(st!.x + 5 - w.p.x)).toBeGreaterThanOrEqual(T.enemyMinSpawnDist);
    const w2 = testWorld(ROOM, [4, 9], { ents: [{ t: 'trap', type: 'cctv', x: 6, y: 9, dir: 1, trig: [-9, -9, -9, -9] }] });
    run(w2, IN_S, 1); run(w2, 0, 20);
    expect(w2.ents.find((e) => e.k === 'cam')!.on).toBe(false);
  });

  it('a tripwire sets off what it is linked to; the scarf trips it safely', () => {
    const w = testWorld(ROOM, [5, 9], { ents: [
      { t: 'trap', type: 'tripwire', x: 7, y: 9, link: ['a'] },
      { t: 'trap', type: 'padlock', x: 7, y: 6, name: 'a', trig: [-9, -9, -9, -9] },
    ] });
    run(w, IN_S, 1); run(w, 0, 60);
    expect(w.ents.find((e) => e.k === 'drop')!.st).toBe(3);
    expect(w.state).toBe('play');
  });
});
