import { newWorld } from '../src/game/world';
import { solveScreen, solveUntil, setGWeight } from '../src/game/solver';
let w = newWorld({ zone: 0, seed: 1938 });
for (let i = 0; i < 5; i++) w = solveScreen(w, 20000).world;
console.log('arrive', w.screen, w.p.x, w.p.y, w.p.st, w.p.crouched, w.state, w.pies);
const r = solveUntil(w, (x) => x.screen === 'z1s06' && x.tiles.filter((t) => t === 2).length === 0, 20000, (x) => Math.abs(x.p.x - 130));
console.log('wall gone?', r.ok, r.nodes, r.world.p.x);
if (r.ok) { setGWeight(1); const r2 = solveScreen(r.world, 20000); console.log('then exit?', r2.ok, r2.nodes); }
