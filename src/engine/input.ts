// Keyboard, touch (fixed d-pad + buttons) and gamepad, OR'd into one byte
// per frame. Menus also get edge-triggered presses and screen taps.
import { IN_L, IN_R, IN_U, IN_D, IN_J, IN_K, IN_P, IN_S } from '../game/consts';

export interface Btn { id: string; el: HTMLDivElement; x: number; y: number; w: number; h: number; round: boolean }

const KEYS: Record<string, number> = {
  ArrowLeft: IN_L, KeyA: IN_L, ArrowRight: IN_R, KeyD: IN_R, ArrowUp: IN_U, KeyW: IN_U, ArrowDown: IN_D, KeyS: IN_D,
  Space: IN_J, KeyZ: IN_K, KeyX: IN_P, KeyC: IN_S,
};
// The spec asks for both WASD and 'D' for debug; D moves right, Shift+D or ` opens the debug overlay.

export class Input {
  bits = 0;            // held this frame
  prev = 0;
  keyBits = 0;
  latch = 0;           // presses shorter than a frame still count once
  touchBits = 0;
  padBits = 0;
  menuPressed = new Set<string>(); // 'up','down','left','right','ok','back','pause','debug'
  taps: { x: number; y: number }[] = []; // framebuffer coords
  usingTouch = false;
  showControls = false;
  btns: Btn[] = [];
  layer: HTMLElement;
  onTouchUp: () => void = () => {};
  onLayout: () => void = () => {};
  toFb: (cx: number, cy: number) => { x: number; y: number } = (x, y) => ({ x, y });
  padWasPressed: boolean[] = [];
  threeFinger = false;
  classicLabels = false;
  counts: { balls: number; pies: number } | null = null;
  private touches = new Map<number, { x: number; y: number }>();

  constructor(layer: HTMLElement) {
    this.layer = layer;
    addEventListener('keydown', (e) => {
      if (e.repeat) { if (KEYS[e.code]) e.preventDefault(); return; }
      if (KEYS[e.code] !== undefined && !(e.code === 'KeyD' && e.shiftKey)) { this.keyBits |= KEYS[e.code]; this.latch |= KEYS[e.code]; e.preventDefault(); }
      if ((e.code === 'KeyD' && e.shiftKey) || e.code === 'Backquote') this.menuPressed.add('debug');
      const m: Record<string, string> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'ok', Space: 'ok', Escape: 'back', KeyP: 'pause', Backspace: 'back' };
      if (m[e.code]) this.menuPressed.add(m[e.code]);
    });
    addEventListener('keyup', (e) => { if (KEYS[e.code] !== undefined) this.keyBits &= ~KEYS[e.code]; });
    addEventListener('blur', () => { this.keyBits = 0; this.touches.clear(); this.touchBits = 0; });
    const opts = { passive: false } as AddEventListenerOptions;
    layer.addEventListener('touchstart', (e) => this.onTouch(e, 'start'), opts);
    layer.addEventListener('touchmove', (e) => this.onTouch(e, 'move'), opts);
    layer.addEventListener('touchend', (e) => this.onTouch(e, 'end'), opts);
    layer.addEventListener('touchcancel', (e) => this.onTouch(e, 'end'), opts);
    layer.addEventListener('mousedown', (e) => { if (!this.usingTouch) { const p = this.toFb(e.clientX, e.clientY); this.taps.push(p); } });
    layer.addEventListener('mouseup', () => this.onTouchUp());
    this.build();
  }

  private build() {
    const mk = (id: string, label: string, round: boolean, cls = '') => {
      const el = document.createElement('div');
      el.className = 'btn hide ' + cls;
      el.textContent = label;
      this.layer.appendChild(el);
      const b: Btn = { id, el, x: 0, y: 0, w: 0, h: 0, round };
      this.btns.push(b);
      return b;
    };
    mk('dpad', '', false, 'dpad');
    mk('jump', 'JUMP', true);
    mk('kick', 'KICK', true);
    mk('pie', 'PIE', true);
    mk('scarf', 'SCARF', true);
    mk('pause', 'II', true);
    // D-pad arrows
    const dp = this.btns[0].el;
    dp.innerHTML = '<div style="position:absolute;left:50%;top:6%;transform:translateX(-50%)">&#9650;</div><div style="position:absolute;left:50%;bottom:6%;transform:translateX(-50%)">&#9660;</div><div style="position:absolute;left:7%;top:50%;transform:translateY(-50%)">&#9664;</div><div style="position:absolute;right:7%;top:50%;transform:translateY(-50%)">&#9654;</div>';
    dp.style.fontSize = '18px';
  }

  // Lay the controls out around the game; returns the box the game may use.
  layout(W: number, H: number): { x: number; y: number; w: number; h: number } {
    const show = this.showControls;
    for (const b of this.btns) b.el.classList.toggle('hide', !show);
    if (!show) return { x: 0, y: 0, w: W, h: H };
    const portrait = H > W;
    const place = (b: Btn, x: number, y: number, w: number, h: number) => {
      Object.assign(b, { x, y, w, h });
      Object.assign(b.el.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    };
    const get = (id: string) => this.btns.find((b) => b.id === id)!;
    let game: { x: number; y: number; w: number; h: number };
    let side: number;
    if (!portrait) {
      side = Math.max(140, Math.min(200, W * 0.19));
      game = { x: side, y: 0, w: W - side * 2, h: H };
    } else {
      side = W / 2;
      game = { x: 0, y: 0, w: W, h: H * 0.5 };
    }
    const ctlTop = portrait ? H * 0.5 : 0;
    const dsz = Math.min(side - 14, 150, (H - ctlTop) * 0.75);
    place(get('dpad'), portrait ? 14 : (side - dsz) / 2, H - dsz - 14, dsz, dsz);
    const jsz = Math.min(side * 0.5, 84);
    const rx = W - side;
    const tsz = Math.min(jsz * 0.68, 56);
    const jx = W - jsz - 12, jy = H - jsz - 16;
    place(get('jump'), jx, jy, jsz, jsz);
    place(get('scarf'), jx + (jsz - tsz) / 2, jy - tsz - 12, tsz, tsz);
    place(get('pie'), jx - tsz - 8, jy - tsz * 0.55, tsz, tsz);
    place(get('kick'), jx - tsz - 14, jy + jsz - tsz + 6, tsz, tsz);
    place(get('pause'), portrait ? W - 46 : rx + side - 46, 8, 38, 38);
    this.relabel();
    return game;
  }

  relabel() {
    const lab = (id: string, s: string) => { const b = this.btns.find((x) => x.id === id); if (b && b.el.textContent !== s) b.el.textContent = s; };
    if (this.classicLabels) { lab('jump', 'FIRE'); lab('kick', '-'); lab('pie', '-'); lab('scarf', '-'); }
    else {
      lab('jump', 'JUMP');
      lab('kick', this.counts ? `KICK\n${this.counts.balls}` : 'KICK');
      lab('pie', this.counts ? `PIE\n${this.counts.pies}` : 'PIE');
      lab('scarf', 'SCARF');
    }
  }

  private onTouch(e: TouchEvent, kind: 'start' | 'move' | 'end') {
    e.preventDefault();
    if (!this.usingTouch) { this.usingTouch = true; this.showControls = true; this.onLayout(); }
    for (const t of Array.from(e.changedTouches)) {
      if (kind === 'end') this.touches.delete(t.identifier);
      else {
        if (kind === 'start') {
          const hit = this.hit(t.clientX, t.clientY);
          if (!hit || hit === 'pause') this.taps.push(this.toFb(t.clientX, t.clientY));
          if (hit === 'pause') this.menuPressed.add('pause');
        }
        this.touches.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
    }
    if (kind === 'start' && e.touches.length >= 3) this.menuPressed.add('debug');
    if (kind === 'end') this.onTouchUp();
    this.computeTouch();
  }

  private hit(x: number, y: number): string | null {
    for (const b of this.btns) {
      if (b.el.classList.contains('hide')) continue;
      const pad = b.id === 'dpad' ? 24 : 10;
      if (x >= b.x - pad && x < b.x + b.w + pad && y >= b.y - pad && y < b.y + b.h + pad) return b.id;
    }
    return null;
  }

  private computeTouch() {
    let bits = 0;
    const on = new Set<string>();
    for (const t of this.touches.values()) {
      const id = this.hit(t.x, t.y);
      if (!id) continue;
      on.add(id);
      if (id === 'dpad') {
        const b = this.btns[0];
        const dx = t.x - (b.x + b.w / 2), dy = t.y - (b.y + b.h / 2);
        const dead = b.w * 0.12;
        if (Math.abs(dx) > dead && Math.abs(dx) > Math.abs(dy) * 0.5) bits |= dx < 0 ? IN_L : IN_R;
        if (Math.abs(dy) > dead && Math.abs(dy) > Math.abs(dx) * 0.5) bits |= dy < 0 ? IN_U : IN_D;
      } else if (id === 'jump') bits |= IN_J;
      else if (id === 'kick') bits |= IN_K;
      else if (id === 'pie') bits |= IN_P;
      else if (id === 'scarf') bits |= IN_S;
    }
    const newly = bits & ~this.touchBits;
    this.latch |= newly;
    if (newly & IN_U) this.menuPressed.add('up');
    if (newly & IN_D) this.menuPressed.add('down');
    if (newly & IN_L) this.menuPressed.add('left');
    if (newly & IN_R) this.menuPressed.add('right');
    if (newly & IN_J) this.menuPressed.add('ok');
    if (newly & (IN_K | IN_S)) this.menuPressed.add('back');
    this.touchBits = bits;
    for (const b of this.btns) b.el.classList.toggle('on', on.has(b.id));
  }

  private pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let bits = 0;
    const pressedNow: boolean[] = [];
    for (const p of pads) {
      if (!p) continue;
      const ax = p.axes[0] ?? 0, ay = p.axes[1] ?? 0;
      const b = (i: number) => !!p.buttons[i]?.pressed;
      if (ax < -0.4 || b(14)) bits |= IN_L;
      if (ax > 0.4 || b(15)) bits |= IN_R;
      if (ay < -0.5 || b(12)) bits |= IN_U;
      if (ay > 0.5 || b(13)) bits |= IN_D;
      if (b(0)) bits |= IN_J;
      if (b(1)) bits |= IN_K;
      if (b(3)) bits |= IN_P;
      if (b(2)) bits |= IN_S;
      for (let i = 0; i < 17; i++) pressedNow[i] = pressedNow[i] || b(i);
    }
    const edge = (i: number) => pressedNow[i] && !this.padWasPressed[i];
    if (edge(0)) this.menuPressed.add('ok');
    if (edge(1)) this.menuPressed.add('back');
    if (edge(9)) this.menuPressed.add('pause');
    if (edge(12)) this.menuPressed.add('up');
    if (edge(13)) this.menuPressed.add('down');
    if (edge(14)) this.menuPressed.add('left');
    if (edge(15)) this.menuPressed.add('right');
    const ay = bits & (IN_U | IN_D), pay = this.padBits & (IN_U | IN_D);
    if (ay & IN_U && !(pay & IN_U) && !edge(12)) this.menuPressed.add('up');
    if (ay & IN_D && !(pay & IN_D) && !edge(13)) this.menuPressed.add('down');
    this.padWasPressed = pressedNow;
    this.padBits = bits;
  }

  // Called once per simulation frame.
  poll(): number {
    this.pollPad();
    this.prev = this.bits;
    this.bits = this.keyBits | this.touchBits | this.padBits | this.latch;
    this.latch = 0;
    return this.bits;
  }
  pressed(name: string) { return this.menuPressed.has(name); }
  endFrame() { this.menuPressed.clear(); this.taps = []; }
}
