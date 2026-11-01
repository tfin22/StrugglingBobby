import { newWorld, step } from '../src/game/world';
import { IN_R, IN_J, IN_K } from '../src/game/consts';
const w = newWorld({ zone: 2, seed: 1938, screen: 'z3s08', x: 4, y: 160 });
let f = 0;
const go = (b: number, n: number) => { for (let i = 0; i < n; i++, f++) { step(w, b); if (f % 6 === 0 || w.state !== 'play') console.log(f, b, w.p.st, w.p.x.toFixed(1), w.p.y.toFixed(1), w.state, w.deathCause ?? '', w.ents.filter(e => e.k === 'enemy' || e.k==='ball').map(e => e.k + e.st + ':' + e.x.toFixed(0)+','+e.y.toFixed(0)).join(' ')); if (w.state === 'dying') process.exit(); } };
go(IN_R, 25); go(IN_R|IN_J, 1); go(IN_R, 40);
while (w.p.x < 86) go(IN_R, 1);
go(IN_K, 1); go(0, 40);
