// Debug: the tile and sprite viewer.
import { FB, Bitmap } from '../engine/framebuffer';
import { text, textC } from '../engine/text';
import { App, Scene } from '../app';
import { anyKey } from './ui';
import { tileArtMap, TILE_NAMES } from '../content/tiles';
import { ALL_SPRITES } from '../content/sprites';

export class ViewerScene implements Scene {
  zone: number; sky = false; music = null; touchControls = true;
  page = 0;
  constructor(public app: App, public back: Scene) { this.zone = back.zone; }
  pages(): [string, Record<string, Bitmap>][] {
    const sp = Object.entries(ALL_SPRITES);
    const out: [string, Record<string, Bitmap>][] = [['TILES ZONE ' + (this.zone + 1), tileArtMap(this.zone)]];
    for (let i = 0; i < sp.length; i += 24) out.push(['SPRITES ' + (i / 24 + 1), Object.fromEntries(sp.slice(i, i + 24))]);
    return out;
  }
  update(app: App) {
    const n = this.pages().length;
    if (app.input.pressed('right') || app.input.taps.some((t) => t.x > 200)) this.page = (this.page + 1) % n;
    else if (app.input.pressed('left') || app.input.taps.some((t) => t.x < 120)) this.page = (this.page + n - 1) % n;
    else if (anyKey(app) || app.input.pressed('pause')) app.go(this.back);
  }
  draw(app: App, fb: FB) {
    fb.rect(0, 0, 320, 200, 2);
    const [title, set] = this.pages()[this.page];
    textC(fb, title + '   < >   TAP MIDDLE TO RETURN', 160, 2, 7, 1);
    let x = 4, y = 14, rowH = 0;
    for (const [k, b] of Object.entries(set)) {
      if (x + b.w > 316) { x = 4; y += rowH + 10; rowH = 0; }
      fb.rect(x - 1, y - 1, b.w + 2, b.h + 2, 0);
      fb.blitOpaque(b, x, y);
      text(fb, (TILE_NAMES[k] ?? k).slice(0, 8), x, y + b.h + 1, 4, -1);
      x += Math.max(b.w, 50) + 4; rowH = Math.max(rowH, b.h);
    }
    void app;
  }
}
