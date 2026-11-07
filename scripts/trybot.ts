import { newWorld, step } from '../src/game/world';
import { BOTS } from '../src/game/bots';
const tamBot = BOTS[process.env.BOT ?? 'tam'];
const w = newWorld({ zone: Number(process.env.Z ?? 0), seed: 1938, screen: process.env.SCR ?? 'z1s22', x: 4, y: 160 });
const mem: Record<string, number> = {};
for (let f = 0; f < 6000; f++) {
  const i = tamBot(w, mem);
  step(w, i); w.events.length = 0;
  const t = w.ents.find((e) => e.k === 'boss');
  if (f % 60 === 0 || w.state !== 'play') console.log(f, i, w.p.st, w.p.x.toFixed(0), w.p.y.toFixed(0), t ? `tam x${t.x.toFixed(0)} d${t.dir} st${t.st} hp${t.hp}` : 'no tam', w.ents.filter(e=>e.data?.role==='valve').map(v=>v.n).join(','), JSON.stringify(mem), w.state, w.deathCause ?? '');
  if (w.state !== 'play') break;
}
