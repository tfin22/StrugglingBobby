// Headless checks: node scripts/shoot.mjs <name> <js-to-run-in-page> [waitMs] [w] [h]
// Screenshots the built game at phone size with touch enabled.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
import { resolve } from 'node:path';
const [name, js = '', wait = '600', W = '844', H = '390'] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('file://' + resolve('dist/index.html'));
await page.waitForTimeout(300);
if (js) await page.evaluate(js);
await page.waitForTimeout(+wait);
await page.screenshot({ path: `shots/${name}.png` });
if (errors.length) console.log('ERRORS:', errors.join('\n'));
await browser.close();
