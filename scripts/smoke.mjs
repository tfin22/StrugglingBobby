// End-to-end smoke run of the built game: node scripts/smoke.mjs
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('file://' + resolve('dist/index.html'));
await page.waitForTimeout(500);
const log = async (label) => console.log(label, await page.evaluate(() => window.bs.scene()));
await page.touchscreen.tap(420, 200); await page.waitForTimeout(400); await log('after tap:');
await page.evaluate(() => { window.bs.app.input.onTouchUp(); }); // audio init
await page.evaluate(() => { const s = window.bs.app.scene; s.phase = 2; s.t = 0; });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'shots/smoke_demo.png' });
console.log('demo running:', await page.evaluate(() => !!window.bs.app.scene.demo), 'frame', await page.evaluate(() => window.bs.app.scene.demo?.frame));
await page.touchscreen.tap(420, 200); await page.waitForTimeout(300); await log('menu:');
await page.keyboard.press('Enter'); await page.waitForTimeout(300); await log('after kick off:');
for (let i = 0; i < 12; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(80); }
await page.waitForTimeout(300); await log('after skipping:');
await page.waitForTimeout(2800);
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1500); await page.keyboard.press('Space'); await page.waitForTimeout(1000); await page.keyboard.up('ArrowRight');
await page.keyboard.press('KeyZ'); await page.waitForTimeout(300); await page.keyboard.press('KeyC'); await page.waitForTimeout(500);
await page.screenshot({ path: 'shots/smoke_play.png' });
console.log('world:', await page.evaluate(() => { const w = window.bs.app.scene.w; return w && `${w.screen} ${w.state} x=${w.p.x.toFixed(0)} balls=${w.balls} fps=${window.bs.app.fps.toFixed(0)} audio=${!!window.bs.app && true}`; }));
await page.keyboard.press('KeyP'); await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/smoke_pause.png' });
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
