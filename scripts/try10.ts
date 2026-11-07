import { newWorld, step } from '../src/game/world';
import { IN_R, IN_U } from '../src/game/consts';
const w = newWorld({ zone: 0, seed: 1938, screen: 'z1s16', x: 4, y: 160 });
for (let i = 0; i < 400; i++) {
  const b = w.p.x < 198 ? IN_R : IN_U;
  step(w, b);
  if (i % 20 === 0 || w.state !== 'play') console.log(i, w.screen, w.state, w.p.st, w.p.x.toFixed(1), w.p.y.toFixed(1), w.deathCause ?? '', w.ents.filter(e=>e.k==='enemy').map(e=>e.x.toFixed(0)+','+e.y.toFixed(0)).join(' '));
  if (w.state === 'dying' || w.screen !== 'z1s16') break;
}
