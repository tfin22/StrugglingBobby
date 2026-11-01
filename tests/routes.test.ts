// The acceptance tests that need whole zones: every screen beatable,
// same seed + inputs = same game, fair restarts, and no soft-locks.
import { describe, it, expect } from 'vitest';
import { newWorld, step, pBox } from '../src/game/world';
import { World } from '../src/game/types';
import { routeFor, decodeRoute } from '../src/content/routes';
import { ZONES, screenDef } from '../src/content/zones';
import { solveScreen } from '../src/game/solver';
import { botFor, runBot } from '../src/game/bots';
import { T } from '../src/game/tuning';
import { overlap } from '../src/game/collide';

// Replay a zone's route, calling back on the first settled frame of each screen.
function replay(zone: number, onEntry?: (w: World) => void): World {
  const r = routeFor(zone)!;
  const w = newWorld({ zone, seed: r.seed });
  let seen = '';
  for (const f of decodeRoute(r.route)) {
    if (onEntry && w.state === 'play' && !w.cpPending && w.screen !== seen) { seen = w.screen; onEntry(structuredClone(w)); }
    step(w, f); w.events.length = 0;
  }
  return w;
}

function digest(w: World) {
  return JSON.stringify({ f: w.frame, rng: w.rng, s: w.score, x: w.p.x, y: w.p.y, b: w.balls, p: w.pies, l: w.lives, sc: w.screen, st: w.state });
}

describe.each([0, 1, 2, 3])('zone %i', (zone) => {
  it('has a recorded route that replays to the end of the zone without dying', () => {
    const w = replay(zone);
    expect(w.state).toBe('zoneDone');
    expect(w.stats.deaths).toBe(0);
  });

  it('replays identically from the same seed and inputs', () => {
    expect(digest(replay(zone))).toBe(digest(replay(zone)));
  });

  it('every screen entry is fair: no enemy close by, and a restart is safe', () => {
    const problems: string[] = [];
    replay(zone, (w) => {
      for (const e of w.ents) {
        if (e.k !== 'enemy' || e.type === 'gull') continue;
        const d = Math.abs(e.x + e.w / 2 - w.p.x);
        if (d < T.enemyMinSpawnDist && Math.abs(e.y + e.h - w.p.y) < 24) problems.push(`${w.screen}: ${e.type} ${d.toFixed(0)}px from the entry`);
      }
      // die here, restart, stand still briefly: still alive?
      const t = structuredClone(w);
      t.lives = 9;
      t.p.y = 999; step(t, 0);
      while (t.state === 'dying') step(t, 0);
      const b = pBox(t);
      for (const e of t.ents) if (['drop', 'patrol', 'jet', 'crusher'].includes(e.k) && e.st === 2 && overlap(b.x, b.y, b.w, b.h, e.x, e.y, e.w, e.h)) problems.push(`${t.screen}: restart inside a ${e.k}`);
      for (let i = 0; i < 10; i++) step(t, 0);
      if (t.state !== 'play') problems.push(`${t.screen}: restart not safe (${t.deathCause})`);
    });
    expect(problems).toEqual([]);
  });

  it('no soft-locks: each screen can be beaten with only what a restart guarantees', () => {
    const stuck: string[] = [];
    replay(zone, (w) => {
      const def = screenDef(w.screen);
      // a restart refunds to the checkpoint, which is never below the screen's needs
      w.balls = def.needs?.balls ?? 0;
      w.pies = def.needs?.pies ?? 0;
      w.lives = 9;
      const bot = botFor(def.boss);
      const ok = bot ? runBot(w, bot, (x, i) => step(x, i), 8000).ok : solveScreen(w, 20000).ok;
      if (!ok) stuck.push(`${w.screen} ${def.name}`);
    });
    expect(stuck).toEqual([]);
  });
});

describe('zone data', () => {
  it('every zone has 14 or more screens and exactly one boss', () => {
    for (const z of ZONES) {
      expect(z.screens.length).toBeGreaterThanOrEqual(14);
      expect(z.screens.filter((s) => s.boss).length).toBe(1);
    }
  });
});
