import { newWorld, step } from '../src/game/world';
import { IN_R, IN_J } from '../src/game/consts';
const w = newWorld({ zone: 0, seed: 1938 });
for (let f = 0; f < 900; f++) {
  let bits = IN_R;
  if (w.screen === 'z1s02' && w.p.x > 87 && w.p.x < 90 && w.p.st === 'walk') bits |= IN_J;
  if (w.screen === 'z1s03' && w.p.x > 128 && w.p.x < 132 && w.p.st === 'walk') bits |= IN_J;
  step(w, bits); w.events.length = 0;
  if (w.state === 'dying' || f % 50 === 0) { const b = w.ents.find((e) => e.k === 'gball'); console.log(f, w.screen, w.state, w.p.st, w.p.x.toFixed(1), w.p.y.toFixed(1), b ? `ball ${b.st} ${b.x.toFixed(0)},${b.y.toFixed(0)}` : '', w.deathCause ?? '', w.cpPending); }
  if (w.state === 'dying') break;
}
