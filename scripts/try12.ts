import { newWorld } from '../src/game/world';
import { solveScreen } from '../src/game/solver';
const w = newWorld({ zone: 2, seed: 1938, screen: 'z3s08', x: 4, y: 160 });
const r = solveScreen(w, Number(process.env.N ?? 3000));
console.log(r.ok, r.nodes);
