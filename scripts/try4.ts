import { newWorld, step } from '../src/game/world';
import { solveScreen } from '../src/game/solver';
import { IN_R, IN_J } from '../src/game/consts';
const w = newWorld({ zone: 0, seed: 1938 });
const w2 = solveScreen(w, 5000).world;
// replicate macros by hand: R x6 then JR
const t = structuredClone(w2);
const run = (frames: number[]) => { for (const f of frames) step(t, f); let g = 0; while ((t.p.st === 'jump' || t.p.st === 'fall' || t.state === 'scroll') && g++ < 90) step(t, IN_R); };
for (let i = 0; i < 6; i++) { run(Array(8).fill(IN_R)); console.log('R', t.p.x.toFixed(1), t.p.st, t.state); }
run([IN_J | IN_R, IN_R, IN_R, IN_R]); console.log('JR', t.screen, t.p.x.toFixed(1), t.p.st, t.state, t.deathCause);
