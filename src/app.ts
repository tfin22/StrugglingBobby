import { FB, Bitmap } from './engine/framebuffer';
import { Display } from './engine/display';
import { Input } from './engine/input';
import { audio } from './audio/audio';
import { store, Settings } from './game/save';
import { Mode } from './game/types';
import { T } from './game/tuning';
import { TROPHIES } from './content/text/trophies';

export interface Scene {
  zone: number;          // palette
  sky: boolean;          // show the copper sky
  music: string | null;
  update(app: App): void;
  draw(app: App, fb: FB): void;
  enter?(app: App): void;
  touchControls?: boolean;
}

export interface Campaign {
  mode: Mode; zone: number; score: number; lives: number; balls: number; pies: number; seed: number;
  deaths: number;
}

export function newCampaign(mode: Mode, zone = 0): Campaign {
  return { mode, zone, score: 0, lives: T.startLives, balls: T.startBalls, pies: T.startPies, seed: (Date.now() & 0x7fffffff) | 1, deaths: 0 };
}

export class App {
  fb = new FB();
  display: Display;
  input: Input;
  settings: Settings;
  scene!: Scene;
  tick = 0;
  debug = false;
  fps = 50;
  wakeLock: { release(): Promise<void> } | null = null;
  toast = ''; toastT = 0;

  constructor() {
    this.display = new Display(document.getElementById('game') as HTMLCanvasElement, document.getElementById('bloom') as HTMLCanvasElement);
    this.input = new Input(document.getElementById('touch')!);
    this.settings = store.settings();
    this.display.setCrt(this.settings.crt);
    this.input.classicLabels = this.settings.classic;
    this.input.toFb = (cx, cy) => {
      const r = this.display.rect;
      return { x: (cx - r.x) / r.scale, y: (cy - r.y) / r.scale };
    };
    this.input.onTouchUp = () => { audio.init(); this.fullscreen(); };
    this.input.onLayout = () => this.layout();
    if (matchMedia('(pointer: coarse)').matches) { this.input.showControls = true; this.input.usingTouch = true; }
    addEventListener('resize', () => this.layout());
    addEventListener('orientationchange', () => setTimeout(() => this.layout(), 200));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && this.wakeLock === null) this.keepAwake(true); });
    addEventListener('keydown', () => audio.init(), { once: false });
    addEventListener('mousedown', () => audio.init());
  }

  layout() {
    const showTouch = this.input.usingTouch && (this.scene?.touchControls ?? true);
    this.input.showControls = showTouch;
    const box = this.input.layout(innerWidth, innerHeight);
    this.display.layout(box.x, box.y, box.w, box.h);
  }

  go(s: Scene) {
    this.scene = s;
    this.display.setZone(s.zone, s.sky);
    audio.music(this.settings.music ? s.music : null);
    s.enter?.(this);
    this.layout();
  }

  applySettings() {
    store.saveSettings(this.settings);
    this.display.setCrt(this.settings.crt);
    audio.setMusicOn(this.settings.music);
    audio.setSfxOn(this.settings.sfx);
    if (!this.settings.music) audio.music(null); else audio.music(this.scene.music);
    this.input.classicLabels = this.settings.classic;
    this.input.relabel();
  }

  step() {
    this.input.poll();
    if (this.input.pressed('debug')) this.debug = !this.debug;
    this.scene.update(this);
    this.input.endFrame();
    if (this.toastT > 0) this.toastT--;
    this.tick++;
  }

  render() {
    this.scene.draw(this, this.fb);
    this.display.present(this.fb);
  }

  fullscreen() {
    const d = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
    try {
      if (!document.fullscreenElement) {
        const p = d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions) : (d.webkitRequestFullscreen?.(), undefined);
        Promise.resolve(p).then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.('landscape')).catch(() => {});
      }
    } catch { /* not allowed here */ }
  }

  async keepAwake(on: boolean) {
    const nav = navigator as Navigator & { wakeLock?: { request(t: string): Promise<{ release(): Promise<void> }> } };
    try {
      if (on && nav.wakeLock && !this.wakeLock) { this.wakeLock = await nav.wakeLock.request('screen'); }
      if (!on && this.wakeLock) { await this.wakeLock.release(); this.wakeLock = null; }
    } catch { this.wakeLock = null; }
  }

  haptic(kind: string) {
    if (!this.settings.haptics || !navigator.vibrate) return;
    const pat: Record<string, number | number[]> = { kick: 12, pie: 30, death: [70, 50, 140], rumble: [120, 40, 120, 40, 200], boom: 50, select: 8 };
    try { navigator.vibrate(pat[kind] ?? 10); } catch { /* */ }
  }

  award(id: string) {
    const t = store.trophies();
    if (t.includes(id)) return;
    t.push(id);
    store.saveTrophies(t);
    const tr = TROPHIES.find((x) => x.id === id);
    if (tr) { this.toast = 'TROPHY: ' + tr.name; this.toastT = 200; audio.sfx('life'); }
  }
}

export function blitScaled(fb: FB, b: Bitmap, x: number, y: number, s: number, flip = false, remap = -1) {
  for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) {
    const c = b.d[j * b.w + (flip ? b.w - 1 - i : i)];
    if (c) fb.rect(x + i * s, y + j * s, s, s, remap >= 0 ? remap : c);
  }
}
