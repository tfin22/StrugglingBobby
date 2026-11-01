// Quick experiment: npx vite-node scripts/try.ts
import { newWorld, step } from '../src/game/world';
import { IN_R, IN_J } from '../src/game/consts';
const w = newWorld({ zone: 0, seed: 1938 });
let f = 0;
const log = () => { const b = w.ents.find((e) => e.k === 'gball'); console.log(f, w.screen, w.state, w.p.st, w.p.x.toFixed(1), w.p.y.toFixed(1), b ? `ball ${b.st} ${b.x.toFixed(0)},${b.y.toFixed(0)} t${b.t}` : '', w.deathCause ?? ''); };
for (; f < 900; f++) {
  let bits = IN_R;
  if (w.screen === 'z1s02' && w.p.x > 83 && w.p.x < 87 && w.p.st === 'walk') bits |= IN_J;
  if (w.screen === 'z1s03' && w.p.x > 120 && w.p.x < 125 && w.p.st === 'walk') bits |= IN_J;
  step(w, bits); w.events.length = 0;
  if (f % 30 === 0 || w.state !== 'play') log();
  if (w.state === 'dying') { log(); break; }
}
