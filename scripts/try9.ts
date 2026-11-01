import { newWorld } from '../src/game/world';
import { runMacros } from '../src/game/solver';
const w = newWorld({ zone: 0, seed: 1938, screen: 'z1s06', x: 130, y: 160 });
const ok = runMacros(w, ['P', 'L', 'L', 'L', 'L', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W']);
console.log(ok, w.p.x, w.state, w.deathCause, w.tiles.filter((t) => t === 2).length, w.ents.map((e) => e.k));
