// Checks the touch layout at phone sizes: no button over the play area,
// no button off-screen, one button per action. node scripts/check-layout.mjs
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const sizes = [[844, 390], [915, 412], [740, 360], [667, 375], [1024, 600]];
const browser = await chromium.launch();
let bad = 0;
for (const [W, H] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto('file://' + resolve('dist/index.html'));
  await page.waitForTimeout(200);
  await page.evaluate('bs.play(0)');
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const d = window.bs.app.display.rect;
    const s = d.w / 320;
    const play = { x: d.x + 32 * s, y: d.y + 24 * s, w: 256 * s, h: 176 * s };
    const btns = window.bs.app.input.btns.filter((b) => !b.el.classList.contains('hide')).map((b) => ({ id: b.id, x: b.x, y: b.y, w: b.w, h: b.h }));
    return { play, btns };
  });
  const problems = [];
  for (const b of r.btns) {
    const hit = b.x < r.play.x + r.play.w && b.x + b.w > r.play.x && b.y < r.play.y + r.play.h && b.y + b.h > r.play.y;
    if (hit) problems.push(`${b.id} overlaps the play area`);
    if (b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.h > H) problems.push(`${b.id} off-screen`);
  }
  const ids = r.btns.map((b) => b.id);
  if (new Set(ids).size !== ids.length) problems.push('duplicate buttons');
  console.log(`${W}x${H}: play ${r.play.w.toFixed(0)}x${r.play.h.toFixed(0)} at ${r.play.x.toFixed(0)},${r.play.y.toFixed(0)}  ${problems.length ? problems.join('; ') : 'OK'}`);
  bad += problems.length;
  await ctx.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
