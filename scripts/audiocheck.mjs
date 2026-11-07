import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await b.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto('file://' + resolve('dist/index.html')); await page.waitForTimeout(1500);
const r = await page.evaluate(() => {
  const t0 = performance.now();
  window.bs.app.input.onTouchUp();
  const ms = performance.now() - t0;
  const a = window.bs.audio ?? null;
  return { ms };
});
await page.evaluate(() => window.bs.title());
await page.waitForTimeout(3000);
const stats = await page.evaluate(() => {
  const out = {};
  const A = window.__audio;
  for (const [k, buf] of Object.entries(A.buffers)) {
    const d = buf.getChannelData(0); let peak = 0, nan = false;
    for (let i = 0; i < d.length; i++) { if (Number.isNaN(d[i])) nan = true; peak = Math.max(peak, Math.abs(d[i])); }
    out[k] = { peak: +peak.toFixed(2), nan, secs: +(d.length / buf.sampleRate).toFixed(2) };
  }
  return { out, song: A.songName, state: A.ctx.state };
});
const bad = Object.entries(stats.out).filter(([, v]) => v.nan || v.peak < 0.05);
console.log('init ms', r.ms.toFixed(0), 'song', stats.song, stats.state, 'buffers', Object.keys(stats.out).length, 'bad', JSON.stringify(bad));
console.log('peaks', Object.entries(stats.out).map(([k, v]) => k + ':' + v.peak).join(' '));
console.log('errors', errors);
await b.close();
