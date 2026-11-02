import { App } from './app';
import { LoadingScene } from './scenes/title';
import { audio } from './audio/audio';

const app = new App();
app.go(new LoadingScene());
(window as unknown as { __bs: App }).__bs = app; // debug hook for headless checks
(window as unknown as { __audio: typeof audio }).__audio = audio;

// Fixed 50 Hz simulation (PAL), decoupled from rendering.
const STEP = 1000 / 50;
let acc = 0, last = performance.now(), frames = 0, fpsT = last;
function frame(now: number) {
  acc += Math.min(250, now - last);
  last = now;
  let n = 0;
  while (acc >= STEP && n < 5) { app.step(); acc -= STEP; n++; }
  if (n === 5) acc = 0;
  audio.tick();
  app.alpha = acc / STEP; // how far we are towards the next simulation step
  app.render();
  frames++;
  if (now - fpsT > 1000) { app.fps = (frames * 1000) / (now - fpsT); frames = 0; fpsT = now; }
  requestAnimationFrame(frame);
// Synthesise the sounds while the loading picture draws.
setTimeout(() => { try { audio.prepare(); } catch { /* no audio */ } }, 120);
}
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* single-file mode: no service worker */ });
}

// Debug hook used by the headless screenshot checks (scripts/shoot.mjs).
import { TitleScene, MenuScene, OptionsScene } from './scenes/title';
import { PlayScene } from './scenes/play';
import { CutsceneScene, InterviewScene, GameOverScene, CreditsScene } from './scenes/story';
import { newCampaign } from './app';
import { step as simStep } from './game/world';
import { report } from './game/interview';
(window as unknown as { bs: unknown }).bs = {
  app,
  title: () => app.go(new TitleScene(app)),
  menu: () => app.go(new MenuScene(app)),
  options: () => app.go(new OptionsScene(app)),
  play: (zone = 0, screen?: string) => {
    const p = new PlayScene(app, newCampaign('2026', zone));
    p.card = 0;
    app.go(p);
    if (screen) p.jumpTo(screen);
    return p;
  },
  card: (zone = 0) => app.go(new PlayScene(app, newCampaign('2026', zone))),
  // Advance the world with an input byte for n frames, synchronously.
  sim: (bits: number, n: number) => { const s = app.scene as PlayScene; for (let i = 0; i < n; i++) simStep(s.w, bits); },
  cutscene: (id: string) => app.go(new CutsceneScene(app, id, () => null)),
  interview: (zone = 0) => { const p = new PlayScene(app, newCampaign('2026', zone)); app.go(new InterviewScene(app, zone, report(p.w.stats, 20), p.c, () => null)); },
  gameover: () => { const p = new PlayScene(app, newCampaign('2026', 0)); app.go(new GameOverScene(app, p)); },
  credits: () => app.go(new CreditsScene(app, newCampaign('2026', 0))),
  scene: () => app.scene.constructor.name,
};
