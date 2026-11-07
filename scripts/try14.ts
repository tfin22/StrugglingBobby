import { newWorld, step } from '../src/game/world';
import { IN_R, IN_L, IN_P, IN_D } from '../src/game/consts';
const w = newWorld({ zone: 0, seed: 1938, screen: 'z1s06', x: 8, y: 160, pies: 1 });
w.p.crouched = true;
const st = (b: number, n: number) => { for (let i = 0; i < n; i++) step(w, b); };
st(IN_R | IN_D, 90); st(IN_R, 60); st(IN_P, 1); st(0, 12); st(IN_L, 46); st(0, 60);
console.log('walls left', w.tiles.filter((t) => t === 2).length, w.state);
