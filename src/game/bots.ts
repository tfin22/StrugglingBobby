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

export const BOTS: Record<string, Bot> = { tam: tamBot };
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
