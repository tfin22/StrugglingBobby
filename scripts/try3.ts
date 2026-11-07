import { newWorld, step } from '../src/game/world';
import { solveScreen, solveUntil } from '../src/game/solver';
import { IN_R } from '../src/game/consts';
const w = newWorld({ zone: 0, seed: 1938 });
const r1 = solveScreen(w, 5000);
console.log('s01', r1.ok, r1.nodes, r1.world.screen, r1.world.state, r1.world.p.x, r1.world.p.st);
const w2 = r1.world;
const ball = w2.ents.find((e) => e.k === 'gball'); console.log('ball', ball?.st, ball?.t, w2.pursuit);
// greedy: just hold right and see
const t = structuredClone(w2);
for (let i = 0; i < 300 && t.state !== 'dying'; i++) { step(t, IN_R); }
console.log('hold right:', t.screen, t.state, t.p.x, t.deathCause);
const r2 = solveUntil(w2, (x) => x.screen === 'z1s03', 3000, (x) => 256 - x.p.x);
console.log('s02', r2.ok, r2.nodes);
// manual macro chain
import { IN_J } from '../src/game/consts';
for (const startJ of [70, 75, 80, 85, 88, 90]) {
  const t2 = structuredClone(w2);
  let jumped = false;
  for (let i = 0; i < 300 && t2.state !== 'dying' && t2.screen === 'z1s02'; i++) {
    let b = IN_R;
    if (!jumped && t2.p.x >= startJ && t2.p.st === 'walk') { b |= IN_J; jumped = true; }
    step(t2, b);
  }
  console.log('jump at', startJ, t2.screen, t2.state, t2.p.x.toFixed(1), t2.deathCause);
}
