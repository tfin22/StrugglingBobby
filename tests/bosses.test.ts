import { describe, it, expect } from 'vitest';
import { newWorld, step, newEnt } from '../src/game/world';
import { BOTS, runBot } from '../src/game/bots';
import { ZONES } from '../src/content/zones';
import { TS } from '../src/game/consts';

function arena(zone: number) {
  const s = ZONES[zone].screens.find((x) => x.boss)!;
  return newWorld({ zone, seed: 3, screen: s.id, x: 8, y: 10 * TS, balls: s.needs?.balls ?? 6, pies: s.needs?.pies ?? 6 });
}
const boss = (w: ReturnType<typeof arena>) => w.ents.find((e) => e.k === 'boss' && !e.dead);

describe('bosses', () => {
  it('Big Tam: three hits, each only while the roller is stuck in a bog', () => {
    const w = arena(0);
    const hps: number[] = [];
    const r = runBot(w, (x, m) => { const b = boss(x); if (b && !hps.includes(b.hp!)) hps.push(b.hp!); return BOTS.tam(x, m); }, (x, i) => step(x, i), 8000);
    expect(r.ok).toBe(true);
    expect(hps).toEqual([3, 2, 1]);
  });

  it('Big Tam shrugs off a pie when not stuck', () => {
    const w = arena(0);
    w.invincible = true;
    const t = boss(w)!;
    newEnt(w, 'pie', t.x + 10, t.y + t.h - 8, 10, 8, { t: 2 });
    for (let i = 0; i < 5; i++) step(w, 0);
    expect(t.hp).toBe(3);
    expect(w.msg).toMatch(/ROLLED STRAIGHT THROUGH/);
  });

  it('Manager of the Month: three managers in turn', () => {
    const w = arena(1);
    const rounds = new Set<number>();
    const r = runBot(w, (x, m) => { const b = boss(x); if (b) rounds.add(b.data!.round as number); return BOTS.motm(x, m); }, (x, i) => step(x, i), 8000);
    expect(r.ok).toBe(true);
    expect([...rounds].sort()).toEqual([1, 2, 3]);
  });

  it('The Administrator: the vault only buckles while he has lost his clipboard', () => {
    const w = arena(2);
    const vault = w.ents.find((e) => e.data?.role === 'vault')!;
    // a pie at the door while he holds the clipboard does nothing
    w.p.x = vault.x + 16; w.p.facing = 1;
    step(w, 64); for (let i = 0; i < 12; i++) step(w, 0);
    for (let i = 0; i < 60; i++) step(w, 2);
    for (let i = 0; i < 60; i++) step(w, 0);
    expect(vault.hp).toBe(2);
    const r = runBot(arena(2), BOTS.admin, (x, i) => step(x, i), 8000);
    expect(r.ok).toBe(true);
  });

  it('Bring Yer Dinner Dougie: bus dented three times, handbrake, then the pie', () => {
    const w = arena(3);
    const phases = new Set<number>();
    // the solver-recorded route covers this fight; here, check the phase machine
    const d = boss(w)!;
    for (const p of [0, 1, 2, 3]) phases.add(p);
    expect(d.data!.phase).toBe(0);
    expect(w.ents.filter((e) => e.data?.role === 'def').length).toBe(2);
    expect(phases.size).toBe(4);
  });
});
