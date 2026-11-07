import { newWorld, step } from '../src/game/world';
import { IN_R, IN_L, IN_P } from '../src/game/consts';
const w = newWorld({ zone: 0, seed: 1938, screen: 'z1s06', x: 130, y: 160 });
const st = (b: number, n: number) => { for (let i = 0; i < n; i++) { step(w, b); if (i % 5 === 0) console.log(b, w.p.x.toFixed(1), w.p.st, w.state, w.deathCause ?? ''); } };
st(IN_P, 1); st(0, 10); st(IN_L, 30); st(0, 100); console.log(w.tiles.filter((t) => t === 2).length);
