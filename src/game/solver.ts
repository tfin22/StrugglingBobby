// A route finder over the deterministic simulation. Breadth-first search of
export let G_WEIGHT = 0.4;
export function setGWeight(v: number) { G_WEIGHT = v; }
const DEBUG = typeof process !== "undefined" && !!process.env?.SOLVE_DEBUG;
// Bobby's "macro moves" (walk a bit, jump, climb, crawl, wait, use a tool),
// screen by screen. Used to record routes and to prove screens are beatable.
import { World } from './types';
import { step } from './world';
import { IN_L, IN_R, IN_U, IN_D, IN_J, IN_K, IN_P, IN_S, TS, PW, PH } from './consts';
import { ZONES } from '../content/zones';
import { ZONE_FLAGS, F_SOLID, F_WEAK, F_LADDER, F_PLAT } from '../content/tiles';

export interface Macro { name: string; frames: number[] }

function hold(bits: number, n: number) { return Array(n).fill(bits); }
const MACROS: Macro[] = [
  { name: 'R', frames: hold(IN_R, 8) },
  { name: 'L', frames: hold(IN_L, 8) },
  { name: 'R2', frames: hold(IN_R, 3) },
  { name: 'L2', frames: hold(IN_L, 3) },
  { name: 'JR', frames: [IN_J | IN_R, ...hold(IN_R, 3)] },
  { name: 'JL', frames: [IN_J | IN_L, ...hold(IN_L, 3)] },
  { name: 'JU', frames: [IN_J, 0, 0] },
  { name: 'U', frames: hold(IN_U, 8) },
  { name: 'D', frames: hold(IN_D, 8) },
  { name: 'CR', frames: hold(IN_D | IN_R, 10) },
  { name: 'CL', frames: hold(IN_D | IN_L, 10) },
  { name: 'W', frames: hold(0, 10) },
  { name: 'W4', frames: hold(0, 30) },
  { name: 'K', frames: [IN_K, ...hold(0, 12)] },
  { name: 'PL', frames: [IN_P, ...hold(0, 10), ...hold(IN_L, 46), ...hold(0, 50)] },
  { name: 'PR', frames: [IN_P, ...hold(0, 10), ...hold(IN_R, 46), ...hold(0, 50)] },
  { name: 'PLs', frames: [IN_P, ...hold(0, 10), ...hold(IN_L, 30), ...hold(0, 66)] },
  { name: 'PRs', frames: [IN_P, ...hold(0, 10), ...hold(IN_R, 30), ...hold(0, 66)] },
  { name: 'S', frames: [IN_S, ...hold(0, 16)] },
  { name: 'FR', frames: [IN_R, ...hold(0, 1)] }, // turn to face right
  { name: 'FL', frames: [IN_L, ...hold(0, 1)] },
];

function clone(w: World): World { return structuredClone(w); }

// Run frames; then keep the last direction held while airborne so jumps land.
function run(w: World, frames: number[], out: number[]): boolean {
  for (const f of frames) { step(w, f); out.push(f); w.events.length = 0; if (w.state !== 'play' && w.state !== 'scroll') break; }
  let guard = 0;
  while ((w.p.st === 'jump' || w.p.st === 'fall' || w.state === 'scroll' || w.p.st === 'kick' || w.p.st === 'scarf' || w.p.st === 'pie') && guard++ < 90 && w.state !== 'dying') {
    const keep = (w.p.st === 'jump' || w.p.st === 'fall') ? (out[out.length - 1] & (IN_L | IN_R)) : 0;
    step(w, keep); out.push(keep); w.events.length = 0;
  }
  return w.state !== 'dying' && w.state !== 'march' && w.state !== 'gameOver';
}

function timer(e: World['ents'][number]): number {
  const d = e.data ?? {};
  const per = (d.period as number) || 0, ph = (d.phase as number) || 0;
  switch (e.k) {
    case 'pie': return Math.floor(e.t / 10);
    case 'gball': return e.st === 4 || e.st === 1 ? Math.floor(e.t / 10) : 0;
    case 'drop': return e.st === 1 ? Math.floor(e.t / 5) : 0;
    case 'crusher': case 'jet': return per ? Math.floor(((e.t + ph) % per) / 8) : 0;
    case 'studs': return per ? Math.floor(((e.t + ph) % per) / 8) : e.st * 100 + Math.floor(e.n / 8);
    case 'dart': return per ? Math.floor(((e.t + ph) % per) / 8) : e.st;
    case 'enemy': return (e.stun ? 1 : 0) + (e.st === 1 ? 2 : 0);
    case 'boss': {
      if (e.type === 'admin') return Math.floor((e.t % 150) / 15) + (e.stun ? 100 : 0) + (d.clip ? 0 : 1000 + Math.floor(e.n / 30));
      if (e.type === 'dougie') return Math.floor((e.t % 130) / 10) + 100 * ((d.phase as number) ?? 0);
      if (e.type === 'tam') return e.st === 1 || e.st === 2 ? Math.floor(e.n / 20) : 0;
      if (e.type === 'motm') return (e.stun ? 1 : 0) + Math.floor((e.t % 110) / 15) * 10 + ((d.round as number) ?? 0) * 1000;
      return 0;
    }
  }
  return 0;
}

function key(w: World, coarseEnts: boolean): string {
  const p = w.p;
  let k = `${w.screen}|${Math.round(p.x / 2)}|${Math.round(p.y / 2)}|${p.st === 'climb' ? 'c' : p.crouched ? 'k' : 's'}|${p.facing}|${w.balls}|${w.pies}|${w.state}`;
  for (const e of w.ents) {
    if (e.k === 'fx' || e.k === 'dartp' || e.k === 'pickup' && false) continue;
    const q = coarseEnts ? 16 : 8;
    k += `;${e.k[0]}${e.st}${Math.round(e.x / q)},${Math.round(e.y / q)}${e.hp ?? ''}${e.on ? 1 : 0}${e.n && e.k === 'bosspart' ? Math.floor(e.n / 20) : ''}`;
    k += '@' + timer(e);
  }
  // Timed traps: include their phase in coarse steps
  k += '|' + Object.keys(w.crumble).join(',');
  return k;
}

export interface SolveResult { ok: boolean; inputs: number[]; world: World; nodes: number }

// Which tools are worth trying on this screen?
function toolsUseful(w: World) {
  const f = { K: false, P: false, S: false };
  for (const e of w.ents) {
    if (e.k === 'enemy' || e.k === 'boss' || e.k === 'bosspart') { f.K = true; f.S = true; }
    if (e.k === 'boss' || e.k === 'bosspart') f.P = true;
    if (['switch', 'drop', 'trip', 'cam', 'inflatable'].includes(e.k)) f.S = true;
  }
  for (const t of w.tiles) if (t === 2) f.P = true; // weak wall
  return f;
}

class Heap<T> {
  a: { k: number; v: T }[] = [];
  push(k: number, v: T) { const a = this.a; a.push({ k, v }); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].k <= a[i].k) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop(): T | undefined {
    const a = this.a; if (!a.length) return undefined;
    const top = a[0].v, last = a.pop()!;
    if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l].k < a[m].k) m = l; if (r < a.length && a[r].k < a[m].k) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
    return top;
  }
  get size() { return this.a.length; }
}

// Best-first search from the current state until goal(w). h(w) estimates distance left.
export function solveUntil(start: World, goal: (w: World) => boolean, maxNodes = 40000, h: (w: World) => number = () => 0, coarse = true): SolveResult {
  const seen = new Set<string>();
  type Node = { w: World; inputs: number[]; parent: Node | null; g: number };
  const root: Node = { w: clone(start), inputs: [], parent: null, g: 0 };
  const open = new Heap<Node>();
  open.push(h(start), root);
  seen.add(key(start, coarse));
  let nodes = 0;
  const lives = start.lives;
  const useful = toolsUseful(start);
  while (open.size && nodes < maxNodes) {
    const n = open.pop()!;
    nodes++;
    if (typeof process !== "undefined" && process.env?.SOLVE_DEBUG) console.log("pop", n.w.screen, n.w.p.x.toFixed(1), n.w.p.y.toFixed(1), n.w.p.st, n.g, n.w.ents.map((e) => e.k + e.st + ":" + e.x.toFixed(0)).join(" "));
    for (const m of MACROS) {
      if ((m.name === 'K' && (n.w.balls <= 0 || !useful.K)) || (m.name[0] === 'P' && (n.w.pies <= 0 || !useful.P)) || (m.name === 'S' && !useful.S)) continue;
      const w = clone(n.w);
      const out: number[] = [];
      if (!run(w, m.frames, out) || w.lives < lives) continue;
      const node: Node = { w, inputs: out, parent: n, g: n.g + out.length };
      if (goal(w)) {
        const inputs: number[] = [];
        for (let x: Node | null = node; x; x = x.parent) inputs.unshift(...x.inputs);
        return { ok: true, inputs, world: w, nodes };
      }
      const k = key(w, coarse);
      if (seen.has(k) || w.screen !== start.screen) continue;
      seen.add(k);
      open.push(node.g * G_WEIGHT + h(w), node);
    }
  }
  return { ok: false, inputs: [], world: start, nodes };
}

// Order of screens through the zone: the order they are listed.
export function screenOrder(zone: number): string[] { return ZONES[zone].screens.map((s) => s.id); }

export function solveScreen(w: World, maxNodes = 40000): SolveResult {
  const order = screenOrder(w.zone);
  const idx = order.indexOf(w.screen);
  const here = ZONES[w.zone].screens[idx], next = ZONES[w.zone].screens[idx + 1];
  const dx = next ? next.at[0] - here.at[0] : 0, dy = next ? next.at[1] - here.at[1] : 0;
  // Distance map from the exit edge over non-solid tiles (weak walls cost extra).
  const COLS = 16, ROWS = 11;
  const dist = new Array(COLS * ROWS).fill(1e4);
  const flags = ZONE_FLAGS[w.zone];
  const fl = (tx: number, ty: number) => (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS ? 0 : flags[w.tiles[ty * COLS + tx]]);
  const open = (tx: number, ty: number) => tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS && (!(fl(tx, ty) & F_SOLID) || !!(fl(tx, ty) & F_WEAK));
  const ladder = (tx: number, ty: number) => !!(fl(tx, ty) & F_LADDER);
  const stand = (tx: number, ty: number) => ty >= ROWS - 1 || ladder(tx, ty) || !!(fl(tx, ty + 1) & (F_SOLID | F_PLAT | F_LADDER));
  const cost = (tx: number, ty: number) => (fl(tx, ty) & F_WEAK ? 6 : 1);
  const q: number[] = [];
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const edge = (dx > 0 && tx === COLS - 1) || (dx < 0 && tx === 0) || (dy > 0 && ty === ROWS - 1) || (dy < 0 && ty === 0 && ladder(tx, ty));
    const i = ty * COLS + tx;
    if (edge && open(tx, ty)) { dist[i] = 0; q.push(i); }
  }
  // Reverse search: which cells can reach v in one move?
  while (q.length) {
    const v = q.shift()!;
    const vx = v % COLS, vy = Math.floor(v / COLS);
    const preds: [number, number][] = [];
    if (stand(vx, vy) || ladder(vx, vy)) { preds.push([vx - 1, vy], [vx + 1, vy]); }
    if (ladder(vx, vy) || ladder(vx, vy + 1)) preds.push([vx, vy + 1]);     // climbed up into v
    preds.push([vx, vy - 1]);                                             // fell or climbed down into v
    if (stand(vx, vy)) preds.push([vx - 1, vy + 1], [vx + 1, vy + 1]);    // jumped up a step
    for (const [ux, uy] of preds) {
      if (!open(ux, uy)) continue;
      if (uy < vy && !(stand(ux, uy) || ladder(ux, uy))) { /* falling: fine */ }
      if (ux !== vx && uy === vy && !(stand(ux, uy) || ladder(ux, uy))) continue;
      if (uy > vy && ux !== vx && !stand(ux, uy)) continue;
      const u = uy * COLS + ux, c = cost(ux, uy);
      if (dist[v] + c >= dist[u]) continue;
      dist[u] = dist[v] + c; q.push(u);
    }
  }
  const h = (x: World) => {
    if (x.screen !== here.id) return 1e6;
    const p = x.p;
    const tx = Math.max(0, Math.min(COLS - 1, Math.floor(p.x / TS))), ty = Math.max(0, Math.min(ROWS - 1, Math.floor((p.y - 8) / TS)));
    let d = (dx || dy) ? Math.min(dist[ty * COLS + tx], 60) * 16 : 0;
    // A weak wall still standing is worth knocking down
    for (let i = 0; i < x.tiles.length; i++) if (flags[x.tiles[i]] & F_WEAK) { d += 40; }
    const b = x.ents.find((e) => e.k === 'boss');
    if (b) d += (b.hp ?? 0) * 300 + (x.bossBeaten ? 0 : 200);
    return d;
  };
  return solveUntil(w, (x) => x.state === 'zoneDone' || (order.indexOf(x.screen) > idx && x.state === 'play' && !x.cpPending), maxNodes, h, true);
}

export { TS };

// Debug helper: run named macros in order; returns false if Bobby dies.
export function runMacros(w: World, names: string[]): boolean {
  for (const n of names) { const m = MACROS.find((x) => x.name === n)!; if (!run(w, m.frames, [])) return false; }
  return true;
}
