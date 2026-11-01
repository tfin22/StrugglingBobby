// Scripted players for the boss fights: they play each boss the intended way
// so the recorded route (and the route tests) can prove every boss beatable.
import { World, Ent } from './types';
import { IN_L, IN_R, IN_U, IN_D, IN_J, IN_K, IN_P, IN_S } from './consts';

export type Bot = (w: World, mem: Record<string, number>) => number;

const boss = (w: World) => w.ents.find((e) => e.k === 'boss' && !e.dead);
const parts = (w: World, role: string) => w.ents.filter((e) => e.k === 'bosspart' && !e.dead && e.data?.role === role);

function goTo(w: World, x: number, tol = 1.5): number {
  const p = w.p;
  if (p.st === 'climb') {
    return 0;
  }
  if (p.x < x - tol) return IN_R;
  if (p.x > x + tol) return IN_L;
  return 0;
}
// Climb a ladder at column centre lx to reach feet-y ty (up or down).
function climbTo(w: World, lx: number, ty: number): number {
  const p = w.p;
  if (p.st !== 'climb' && Math.abs(p.x - lx) > 2) return goTo(w, lx, 1);
  if (p.y > ty + 0.5) return IN_U;
  if (p.y < ty - 0.5) return IN_D;
  return 0;
}
function face(w: World, dir: number) { return w.p.facing === dir ? 0 : dir > 0 ? IN_R : IN_L; }
function tap(w: World, mem: Record<string, number>, bit: number, k: string) {
  // press a button once (needs a release between presses)
  if (mem[k] === w.frame - 1) return 0;
  mem[k] = w.frame;
  return bit;
}

// Big Tam: from the left dugout roof, wait for the roller to head away,
// drop down, flick the valve, get back up; when he's stuck, pie him.
export const tamBot: Bot = (w, mem) => {
  const p = w.p, t = boss(w);
  const PLAT = 96, LAD = 40;
  if (!t) {
    // Out through the tunnel on the right dugout roof
    if (p.y > PLAT + 1 || p.st === 'climb') return climbTo(w, 216, PLAT);
    return IN_R;
  }
  if (p.st === 'kick' || p.st === 'scarf' || p.st === 'pie') return 0;
  const stuck = t.st === 1;
  const pieLive = w.ents.some((e) => e.k === 'pie');
  if (stuck && !pieLive && t.n > 160 && !mem.pied) {
    // Down and over to the roller's near side
    if (p.st === 'climb' || p.y < 160) return climbTo(w, LAD, 160);
    const target = t.x - 7;
    if (p.x < target - 1.5) return IN_R;
    if (p.x > target + 1.5) return IN_L;
    if (p.facing !== 1) return IN_R;
    mem.pied = 1;
    return tap(w, mem, IN_P, 'p');
  }
  if (!pieLive && mem.pied && t.st !== 1) mem.pied = 0;
  // Flick a valve when the roller is far away heading right
  const valve = parts(w, 'valve')[0];
  const bog = parts(w, 'bog').length > 0;
  const danger = t.st === 0 && Math.sign(p.x - (t.x + 15)) === t.dir && Math.abs(p.x - (t.x + 15)) < 70;
  if (!stuck && !bog && !pieLive && valve && valve.n === 0 && t.dir > 0 && t.x > 90 && t.x < 170 && !mem.scarfed && !danger) mem.go = 1;
  if (mem.go && (danger || bog || stuck)) mem.go = 0;
  if (mem.go && !mem.scarfed) {
    if (p.st === 'climb' || p.y < 160) return climbTo(w, LAD, 160);
    const target = valve.x - 22;
    if (p.x < target - 1.5) return IN_R;
    if (p.x > target + 1.5) return IN_L;
    mem.scarfed = 1; mem.go = 0;
    return tap(w, mem, IN_S, 's');
  }
  if (bog || t.dir < 0 || t.st !== 0) mem.scarfed = 0;
  // Otherwise, safety: up on the left roof
  if (p.y > PLAT + 0.5 || p.st === 'climb') return climbTo(w, LAD, PLAT);
  return goTo(w, 24);
};

// The Manager of the Month: hold the safe corner by the door, kick each
// manager twice; flick the dossier away first; kick the sulker as he storms.
export const motmBot: Bot = (w, mem) => {
  const p = w.p, m = boss(w);
  if (!m) return IN_R;
  if (p.st === 'kick' || p.st === 'scarf' || p.st === 'pie') return 0;
  const round = (m.data!.round as number) ?? 1;
  const bag = w.ents.find((e) => e.k === 'pickup' && e.type === 'kitbag');
  if (m.st === 9) { if (bag && m.n > 30) return goTo(w, bag.x + 7, 2); return goTo(w, 30, 1.5); }
  if (Math.abs(p.x - 30) > 4) return goTo(w, 30, 1.5);
  if (p.facing !== 1) return IN_R;
  // Dodge a tactics board on its way down at us
  const board = w.ents.find((e) => e.k === 'board' && e.vx < 0 && e.x - p.x < 40 && e.x > p.x - 10);
  if (board && board.y > p.y - 40) return IN_D;
  const ballOut = w.ents.some((e) => e.k === 'ball');
  if (round === 2 && m.data!.shield) {
    if (m.x - p.x < 30 && !m.stun) return tap(w, mem, IN_S, 's');
    return 0;
  }
  if (round === 3 && m.st !== 1) return 0;
  if (!ballOut && w.balls > 0) return tap(w, mem, IN_K, 'k');
  return 0;
};

// The Administrator: dodge the paperwork, flick his clipboard away, then
// pie the vault door while he shuffles after it. Twice.
export const adminBot: Bot = (w, mem) => {
  const p = w.p, a = boss(w);
  if (!a) return goTo(w, 232, 1) || IN_R;
  if (p.st === 'kick' || p.st === 'scarf' || p.st === 'pie') return 0;
  const vault = parts(w, 'vault')[0];
  const ax = a.x + a.w / 2;
  // 1. Paper falling on us? Step out of its column.
  const paper = w.ents.find((e) => e.k === 'drop' && e.st <= 2 && Math.abs(e.x + 7 - p.x) < 16 && e.y < p.y);
  if (paper) { const away = p.x < paper.x + 7 ? -1 : 1; const nx = p.x + away * 20; if (Math.abs(nx - ax) > 20 && nx > 10 && nx < 220) return away < 0 ? IN_L : IN_R; return away < 0 ? IN_R : IN_L; }
  // 2. Creditor coming? Kick it.
  const cred = w.ents.find((e) => e.k === 'enemy' && e.st !== 99 && Math.abs(e.x - p.x) < 120 && Math.abs(e.y + e.h - p.y) < 6);
  if (cred && w.balls > 0 && !w.ents.some((e) => e.k === 'ball')) { const d = Math.sign(cred.x - p.x); if (p.facing !== d) return d > 0 ? IN_R : IN_L; return tap(w, mem, IN_K, 'k'); }
  const pieLive = w.ents.some((e) => e.k === 'pie');
  if (pieLive) {
    // run from the pie, away from the administrator
    const pie = w.ents.find((e) => e.k === 'pie')!;
    const away = ax > pie.x ? -1 : 1;
    if (Math.abs(p.x - (pie.x + 5)) < 50) return away < 0 ? IN_L : IN_R;
    return 0;
  }
  if (a.data!.clip) {
    // approach to scarf range, from whichever side we're on
    const side = p.x < ax ? -1 : 1;
    const want = ax + side * 26;
    if (Math.abs(p.x - want) > 3 && Math.abs(p.x - ax) > 24) return p.x < want ? IN_R : IN_L;
    const face = -side;
    if (p.facing !== face) return face > 0 ? IN_R : IN_L;
    if (Math.abs(p.x - ax) < 34 && Math.abs(p.x - ax) > 12) return tap(w, mem, IN_S, 's');
    return side < 0 ? IN_L : IN_R; // too close: back off
  }
  // 3. Disarmed: pie the vault door, keeping clear of him
  if (vault) {
    const vx = vault.x + 16;
    if (Math.abs(p.x - ax) < 22) return p.x < ax ? IN_L : IN_R;
    if (Math.abs(p.x - vx) > 6) return p.x < vx ? IN_R : IN_L;
    return tap(w, mem, IN_P, 'p');
  }
  return 0;
};

// Bring Yer Dinner Dougie: kick through the gap when the back line jumps
// together, hop the clearances, scarf the handbrake, pie the bus in the open.
export const dougieBot: Bot = (w, mem) => {
  const p = w.p, d = boss(w);
  if (p.st === 'kick' || p.st === 'scarf' || p.st === 'pie') return 0;
  const clear = w.ents.find((e) => e.k === 'clear' && e.vx < 0 && e.x - p.x < 46 && e.x > p.x - 8);
  if (clear && p.st !== 'jump' && p.st !== 'fall') return IN_J;
  if (p.st === 'jump' || p.st === 'fall') return 0;
  const pie = w.ents.find((e) => e.k === 'pie');
  if (!d) {
    if (pie || w.ents.some((e) => e.data?.role === 'grab')) return goTo(w, 24, 2);
    return IN_R; // through the opened gate, after the Lada
  }
  const phase = d.data!.phase as number;
  const bus = parts(w, 'bus')[0];
  if (phase === 0) {
    if (Math.abs(p.x - 40) > 3) return goTo(w, 40, 2);
    if (p.facing !== 1) return IN_R;
    const c = d.t % 130; // waveEvery
    if (c === 130 - 4 && w.balls > 0) return tap(w, mem, IN_K, 'k');
    return 0;
  }
  if (phase === 1) return goTo(w, 40, 2);
  if (phase === 2) {
    const brake = parts(w, 'brake')[0];
    if (!brake) return 0;
    const target = brake.x - 22;
    if (Math.abs(p.x - target) > 2) return goTo(w, target, 1.5);
    if (p.facing !== 1) return IN_R;
    return tap(w, mem, IN_S, 's');
  }
  // phase 3: get clear while it rolls, then pie it once it stops
  if (!d.data!.stopped) return goTo(w, 24, 2);
  if (pie) return goTo(w, 24, 2);
  const target = bus.x - 7;
  if (Math.abs(p.x - target) > 2) return goTo(w, target, 1.5);
  if (p.facing !== 1) return IN_R;
  return tap(w, mem, IN_P, 'p');
};

export const BOTS: Record<string, Bot> = { tam: tamBot, motm: motmBot, admin: adminBot, dougie: dougieBot };
export function botFor(bossType: string | undefined): Bot | null { return bossType ? BOTS[bossType] ?? null : null; }

// Run a bot until the screen is left or the zone is done.
export function runBot(start: World, bot: Bot, step: (w: World, i: number) => void, maxFrames = 6000): { ok: boolean; inputs: number[]; world: World } {
  const w = structuredClone(start);
  const mem: Record<string, number> = {};
  const inputs: number[] = [];
  const screen = w.screen;
  for (let f = 0; f < maxFrames; f++) {
    const i = bot(w, mem);
    step(w, i); inputs.push(i); w.events.length = 0;
    if (w.state === 'dying' || w.state === 'gameOver') return { ok: false, inputs, world: w };
    if (w.state === 'zoneDone' || (w.screen !== screen && w.state === 'play')) return { ok: true, inputs, world: w };
  }
  return { ok: false, inputs, world: w };
}
export type { Ent };
export { IN_J, IN_K };
