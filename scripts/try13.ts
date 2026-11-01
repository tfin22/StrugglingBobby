import { newWorld } from '../src/game/world';
import { runMacros } from '../src/game/solver';
const w = newWorld({ zone: 2, seed: 1938, screen: 'z3s08', x: 4, y: 160 });
for (const m of ['R', 'R', 'R', 'JR', 'R', 'K', 'JR', 'R', 'R', 'R', 'JR', 'R', 'R', 'R', 'R']) {
  const ok = runMacros(w, [m]);
  console.log(m, ok, w.p.x.toFixed(1), w.p.y, w.p.st, w.screen, w.deathCause ?? '', w.ents.filter(e => e.k === 'enemy').map(e => e.st + ':' + e.x.toFixed(0)).join(' '));
  if (!ok) break;
}
