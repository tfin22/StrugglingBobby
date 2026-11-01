import { newWorld } from '../src/game/world';
import { solveScreen } from '../src/game/solver';
const w = newWorld({ zone: 0, seed: 1938 });
const w2 = solveScreen(w, 5000).world;
process.env.SOLVE_DEBUG = '1';
solveScreen(w2, 40);
