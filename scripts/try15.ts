import { newWorld, step } from '../src/game/world';
import { solveScreen, runMacros } from '../src/game/solver';
import { routeFor, decodeRoute } from '../src/content/routes';
const r = routeFor(0)!;
const w = newWorld({ zone: 0, seed: r.seed });
for (const f of decodeRoute(r.route)) { if (w.screen === 'z1s06' && w.state === 'play' && !w.cpPending) break; step(w, f); }
console.log(w.screen, w.p.x, w.p.y, w.p.st, w.p.crouched);
w.pies = 1; w.balls = 0;
const t = structuredClone(w);
console.log(runMacros(t, ['CR','CR','CR','CR','CR','CR','CR','CR','RW','RW', 'PL']), t.p.x, t.tiles.filter((x) => x === 2).length, t.state, t.deathCause);
const s = solveScreen(w, 20000); console.log(s.ok, s.nodes);
import { solveUntil } from '../src/game/solver';
const g = solveUntil(w, (x) => x.screen === 'z1s06' && !x.tiles.includes(2), 20000, (x) => Math.abs(x.p.x - 130));
console.log('wall', g.ok, g.nodes, g.world.p.x);
if (g.ok) { const s2 = solveScreen(g.world, 20000); console.log('then', s2.ok, s2.nodes); const t2 = structuredClone(g.world); console.log(runMacros(t2, ['RW','RW','RW','U','U','U','U','U','U','U','U','U','U','U','U','U','U','U','U']), t2.screen, t2.p.x, t2.p.y, t2.p.st); }
