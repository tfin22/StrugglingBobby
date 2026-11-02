import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
await page.goto('file://' + resolve('dist/index.html')); await page.waitForTimeout(200);
await page.evaluate('bs.play(0)'); await page.waitForTimeout(200);
const r = await page.evaluate(() => { const d = window.bs.app.input.btns[0]; return { x: d.x, y: d.y, w: d.w }; });
// press up-right on the pad with a real touch event
const cdp = await ctx.newCDPSession(page);
const px = r.x + r.w / 2 + r.w * 0.3, py = r.y + r.w / 2 - r.w * 0.3;
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: px, y: py, id: 1 }] });
await page.waitForTimeout(150);
console.log('bits', await page.evaluate(() => window.bs.app.input.touchBits));
await page.screenshot({ path: 'shots/pad.png', clip: { x: 0, y: 150, width: 300, height: 240 } });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await b.close();
