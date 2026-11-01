import { FB } from '../engine/framebuffer';
import { text, textC, textW, wrap } from '../engine/text';
import { App } from '../app';
import { audio } from '../audio/audio';

export interface MenuItem { label: () => string; act: () => void; left?: () => void; right?: () => void; hidden?: () => boolean }

// A vertical menu driven by the pad, keys or taps.
export class Menu {
  sel = 0;
  constructor(public items: MenuItem[], public y = 80, public gap = 13) {}
  visible() { return this.items.filter((i) => !i.hidden?.()); }
  update(app: App): boolean {
    const vis = this.visible();
    const inp = app.input;
    if (this.sel >= vis.length) this.sel = 0;
    if (inp.pressed('up')) { this.sel = (this.sel + vis.length - 1) % vis.length; audio.sfx('move'); }
    if (inp.pressed('down')) { this.sel = (this.sel + 1) % vis.length; audio.sfx('move'); }
    const it = vis[this.sel];
    if (inp.pressed('left') && it.left) { it.left(); audio.sfx('move'); }
    if (inp.pressed('right') && it.right) { it.right(); audio.sfx('move'); }
    if (inp.pressed('ok')) { audio.sfx('select'); app.haptic('select'); it.act(); return true; }
    for (const t of inp.taps) {
      const i = Math.floor((t.y - this.y + 3) / this.gap);
      if (i >= 0 && i < vis.length && t.x > 40 && t.x < 280) {
        if (i === this.sel || true) { this.sel = i; audio.sfx('select'); app.haptic('select'); vis[i].act(); return true; }
      }
    }
    return false;
  }
  draw(fb: FB, tick: number, cx = 160) {
    this.visible().forEach((it, i) => {
      const s = it.label();
      const y = this.y + i * this.gap;
      const on = i === this.sel;
      if (on) {
        fb.rect(cx - textW(s) / 2 - 6, y - 2, textW(s) + 12, 11, 8);
        fb.rect(cx - textW(s) / 2 - 5, y - 1, textW(s) + 10, 9, 1);
        if (tick % 30 < 20) { text(fb, ']', cx - textW(s) / 2 - 14, y, 7); text(fb, '[', cx + textW(s) / 2 + 8, y, 7); }
      }
      textC(fb, s, cx, y, on ? 9 : 3, 1);
    });
  }
}

export function box(fb: FB, x: number, y: number, w: number, h: number, edge = 7) {
  fb.rect(x, y, w, h, 1);
  fb.frame(x + 1, y + 1, w - 2, h - 2, edge);
  fb.frame(x + 3, y + 3, w - 6, h - 6, 8);
}

export function para(fb: FB, s: string, x: number, y: number, n: number, c = 4, lh = 9): number {
  const lines = wrap(s, n);
  lines.forEach((l, i) => text(fb, l, x, y + i * lh, c, 1));
  return y + lines.length * lh;
}

export function toast(app: App, fb: FB) {
  if (app.toastT <= 0) return;
  const s = app.toast;
  const w = textW(s) + 16;
  fb.rect(160 - w / 2, 2, w, 13, 1);
  fb.frame(160 - w / 2, 2, w, 13, 7);
  textC(fb, s, 160, 5, 9, 1);
}

// "Press fire / tap" hint that matches the device.
export function hint(app: App, s = 'TO CONTINUE') {
  return (app.input.usingTouch ? 'TAP ' : 'PRESS FIRE ') + s;
}

export function anyKey(app: App): boolean {
  const i = app.input;
  return i.pressed('ok') || i.taps.length > 0 || i.pressed('back');
}
