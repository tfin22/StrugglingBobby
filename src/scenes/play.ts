import { FB } from '../engine/framebuffer';
import { text, textC } from '../engine/text';
import { App, Scene, Campaign } from '../app';
import { World } from '../game/types';
import { newWorld, step, loadScreen } from '../game/world';
import { drawWorld, drawDeathLine } from '../render/world';
import { audio } from '../audio/audio';
import { Menu, box, toast } from './ui';
import { ZONES, screenDef } from '../content/zones';
import { ZONE_CARDS } from '../content/text/story';
import { store } from '../game/save';
import { report } from '../game/interview';
import { T } from '../game/tuning';
import { TS } from '../game/consts';
import { DEATH_LINES } from '../content/text/deathlines';
import { routeFor, decodeRoute } from '../content/routes';
import { InterviewScene } from './interview';
import { GameOverScene } from './gameover';
import { CutsceneScene } from './cutscene';
import { ViewerScene } from './viewer';

export class PlayScene implements Scene {
  zone: number; sky = true; music: string | null;
  w: World;
  card = 130;
  paused = false;
  menu: Menu;
  dbg: Menu;
  dbgOpen = false;
  lastMusic = '';
  victoryT = 0;
  replay: number[] | null = null; replayI = 0;
  touchControls = true;

  constructor(public app: App, public c: Campaign, w?: World) {
    this.zone = c.zone;
    this.music = ZONES[c.zone].music;
    this.w = w ?? newWorld({ zone: c.zone, mode: c.mode, seed: c.seed + c.zone, classic: app.settings.classic, lives: c.lives, score: c.score, balls: c.balls, pies: c.pies });
    if (c.mode === 'select') this.w.score = 0;
    this.menu = new Menu([
      { label: () => 'RESUME', act: () => { this.paused = false; } },
      { label: () => 'MUSIC: ' + (app.settings.music ? 'ON' : 'EFFECTS ONLY'), act: () => { app.settings.music = !app.settings.music; app.applySettings(); this.lastMusic = ''; } },
      { label: () => 'CONTROLS: ' + (app.settings.classic ? '1989' : 'MODERN'), act: () => { app.settings.classic = !app.settings.classic; this.w.classic = app.settings.classic; app.applySettings(); } },
      { label: () => 'DEBUG MENU', act: () => { this.dbgOpen = true; }, hidden: () => !app.debug },
      { label: () => 'QUIT TO TITLE', act: () => { this.quit(); } },
    ], 76);
    const zs = () => ZONES[this.w.zone].screens;
    const jump = (d: number) => {
      const list = zs();
      let i = list.findIndex((s) => s.id === this.w.screen) + d;
      if (i < 0) i = list.length - 1;
      if (i >= list.length) i = 0;
      this.jumpTo(list[i].id);
    };
    this.dbg = new Menu([
      { label: () => 'INVINCIBLE: ' + (this.w.invincible ? 'ON' : 'OFF'), act: () => { this.w.invincible = !this.w.invincible; } },
      { label: () => 'INFINITE TOOLS: ' + (this.w.infinite ? 'ON' : 'OFF'), act: () => { this.w.infinite = !this.w.infinite; } },
      { label: () => 'SCREEN: ' + this.w.screen + ' <>', act: () => jump(1), left: () => jump(-1), right: () => jump(1) },
      { label: () => 'ZONE: ' + (this.w.zone + 1) + ' <>', act: () => this.switchZone(1), left: () => this.switchZone(-1), right: () => this.switchZone(1) },
      { label: () => 'FIGHT THE BOSS', act: () => { const b = zs().find((s) => s.boss); if (b) this.jumpTo(b.id); } },
      { label: () => 'DEATH LINE ' + (this.dlIdx + 1) + '/' + DEATH_LINES.length, act: () => { this.showLine = 120; }, left: () => { this.dlIdx = (this.dlIdx + DEATH_LINES.length - 1) % DEATH_LINES.length; this.showLine = 120; }, right: () => { this.dlIdx = (this.dlIdx + 1) % DEATH_LINES.length; this.showLine = 120; } },
      { label: () => 'TILE AND SPRITE VIEWER', act: () => app.go(new ViewerScene(app, this)) },
      { label: () => 'PLAY RECORDED ROUTE', act: () => this.playRoute() },
      { label: () => 'BACK', act: () => { this.dbgOpen = false; } },
    ], 52, 12);
  }
  dlIdx = 0; showLine = 0;

  enter(app: App) { app.keepAwake(true); this.lastMusic = ''; }

  jumpTo(id: string) {
    const w = this.w;
    w.pursuit = null;
    loadScreen(w, id);
    // Find a safe spot: the zone start if this is the first screen, else the first floor from the left.
    const def = screenDef(id);
    let placed = false;
    for (let tx = 1; tx < 15 && !placed; tx++) for (let ty = 10; ty >= 1 && !placed; ty--) {
      const here = def.map[ty - 1]?.[tx] ?? ' ', below = def.map[ty]?.[tx] ?? ' ';
      if (' :|odabe'.includes(here) && '#=%-gcfXZ'.includes(below)) { w.p.x = tx * TS + 8; w.p.y = ty * TS; placed = true; }
    }
    w.p.st = 'stand'; w.p.vx = 0; w.p.vy = 0; w.p.crouched = false; w.state = 'play';
    w.cp = { screen: id, x: w.p.x, y: w.p.y, facing: 1, balls: w.balls, pies: w.pies, pursuit: null, crouched: false };
    w.zoneCp = { ...w.cp, score: w.score, lives: w.lives };
    this.paused = false; this.dbgOpen = false;
  }

  switchZone(d: number) {
    const z = (this.w.zone + d + 4) % 4;
    const inv = this.w.invincible, inf = this.w.infinite;
    this.c.zone = z; this.zone = z; this.music = ZONES[z].music;
    this.w = newWorld({ zone: z, mode: this.c.mode, seed: this.c.seed, classic: this.app.settings.classic, lives: this.w.lives, score: this.w.score });
    this.w.invincible = inv; this.w.infinite = inf;
    this.app.display.setZone(z, true);
    this.lastMusic = '';
    this.dbgOpen = false; this.paused = false;
  }

  playRoute() {
    const r = routeFor(this.w.zone);
    if (!r) { this.app.toast = 'NO ROUTE RECORDED'; this.app.toastT = 100; return; }
    this.w = newWorld({ zone: this.w.zone, seed: r.seed, mode: '2026' });
    this.replay = decodeRoute(r.route); this.replayI = 0;
    this.paused = false; this.dbgOpen = false; this.card = 0;
  }

  quit() {
    this.app.keepAwake(false);
    void import('./title').then((m) => this.app.go(new m.TitleScene(this.app)));
  }

  update(app: App) {
    const w = this.w;
    const inp = app.input;
    inp.counts = { balls: w.balls, pies: w.pies };
    if (app.tick % 10 === 0) inp.relabel();
    if (this.card > 0) {
      this.card--;
      if (this.card < 100 && (inp.taps.length || inp.pressed('ok'))) this.card = 0;
      return;
    }
    if (this.showLine > 0) this.showLine--;
    if (inp.pressed('pause') || (inp.pressed('back') && !inp.usingTouch && !this.paused)) { this.paused = !this.paused; this.dbgOpen = false; audio.sfx('select'); }
    if (this.paused) {
      if (this.dbgOpen) { if (inp.pressed('back')) this.dbgOpen = false; else this.dbg.update(app); }
      else { if (inp.pressed('back') && inp.usingTouch) this.paused = false; else this.menu.update(app); }
      return;
    }
    // Music follows the boss
    const def = screenDef(w.screen);
    const want = def.boss && !w.bossBeaten ? 'boss' : ZONES[w.zone].music;
    if (want !== this.lastMusic && w.state !== 'zoneDone') { this.lastMusic = want; if (app.settings.music) audio.music(want); }
    audio.setCrowd(w.zone === 3 ? (def.boss && !w.bossBeaten ? 1 : 0.45) : def.boss && !w.bossBeaten ? 0.6 : w.zone === 0 ? 0.08 : 0);

    let bits = inp.bits;
    if (this.replay) {
      bits = this.replay[this.replayI++] ?? 0;
      if (this.replayI > this.replay.length + 100 || inp.taps.length || inp.pressed('ok')) { this.replay = null; }
    }
    if (w.state === 'zoneDone') return this.zoneDone(app);
    if (w.state === 'gameOver') {
      app.keepAwake(false);
      const total = store.totalDeaths() + w.stats.deaths; store.saveTotalDeaths(total);
      if (total >= 50) app.award('sacked');
      app.award('mutual');
      app.go(new GameOverScene(app, this));
      return;
    }
    step(w, bits);
    for (const ev of w.events) {
      if (ev.e === 'sfx') audio.sfx(ev.a as string);
      else if (ev.e === 'hap') app.haptic(ev.a as string);
    }
    w.events.length = 0;
  }

  zoneDone(app: App) {
    const w = this.w;
    if (this.victoryT === 0) { audio.music(app.settings.music ? 'victory' : null); audio.setCrowd(1); audio.sfx('roar'); }
    this.victoryT++;
    if (this.victoryT < 150 && !(this.victoryT > 40 && (app.input.taps.length || app.input.pressed('ok')))) return;
    audio.setCrowd(0);
    const z = w.zone;
    const c = this.c;
    const rep = report(w.stats, ZONES[z].screens.length);
    // Trophies
    if (w.stats.bossDeaths === 0) app.award('firstTime');
    if (w.stats.deaths === 0) app.award('cleanSheet');
    if (w.stats.piesUsed === 0) app.award('naePies');
    if (w.stats.programmesTotal > 0 && w.stats.programmes >= w.stats.programmesTotal) app.award('programmes');
    if (w.stats.ballsUsed === 0) app.award('scarfStun');
    app.award(['zone1', 'zone2', 'zone3', 'cup'][z]);
    if (c.mode === '1989') app.award('rick');
    const total = store.totalDeaths() + w.stats.deaths; store.saveTotalDeaths(total);
    if (total >= 50) app.award('sacked');
    if (c.mode !== 'select') {
      store.saveUnlocked(Math.max(store.unlocked(), Math.min(4, z + 2)));
      store.saveFurthest(Math.max(store.furthest(), Math.min(4, z + 2)));
    }
    c.score = w.score; c.lives = w.lives; c.balls = w.balls; c.pies = w.pies; c.deaths += w.stats.deaths;
    c.zone = z + 1;
    app.keepAwake(false);
    if (c.mode === '2026' && c.zone < 4) store.saveAutosave({ mode: c.mode, zone: c.zone, score: c.score, lives: c.lives, balls: c.balls, pies: c.pies, seed: c.seed });
    if (c.zone >= 4) store.saveAutosave(null);
    const next = () => {
      if (c.zone >= 4) return new CutsceneScene(app, 'ending', () => new InterviewScene(app, 3, rep, c, () => this.afterGame()));
      const cut = ['after1', 'after2', 'after3'][z];
      return new CutsceneScene(app, cut, () => new PlayScene(app, c));
    };
    if (c.mode === 'select') { app.go(new InterviewScene(app, Math.min(z, 3), rep, c, () => { this.quit(); return null; })); return; }
    if (z < 3) app.go(new InterviewScene(app, z, rep, c, next));
    else app.go(next());
  }

  afterGame(): Scene | null {
    const app = this.app;
    void import('./credits').then((m) => app.go(new m.CreditsScene(app, this.c)));
    return null;
  }

  draw(app: App, fb: FB) {
    const w = this.w;
    if (this.card > 0) { drawCard(fb, w.zone, app.tick, this.c.mode); return; }
    drawWorld(fb, w, { debug: app.debug, tick: app.tick });
    if (w.state === 'zoneDone') {
      box(fb, 60, 70, 200, 40);
      textC(fb, w.zone === 3 ? 'THE AULD CUP IS HOME!' : 'ZONE COMPLETE!', 160, 80, 9, 1);
      textC(fb, 'SCORE ' + w.score, 160, 94, 4, 1);
    }
    if (this.replay) { textC(fb, 'RECORDED ROUTE', 160, 190, app.tick % 40 < 20 ? 9 : 8, 1); }
    if (this.showLine > 0) drawDeathLine(fb, DEATH_LINES[this.dlIdx].t + '  [' + DEATH_LINES[this.dlIdx].c.join(',') + ']');
    if (app.debug) {
      text(fb, `FPS ${app.fps.toFixed(0)} SEED ${w.seed} F ${w.frame}`, 34, 190, 14, 1);
      text(fb, `${w.screen} ${w.p.st} ${w.p.x.toFixed(1)},${w.p.y.toFixed(1)} E${w.ents.length}`, 34, 181, 14, 1);
    }
    if (this.paused) {
      box(fb, 50, this.dbgOpen ? 40 : 60, 220, this.dbgOpen ? 130 : 86);
      if (this.dbgOpen) { textC(fb, 'DEBUG', 160, 44, 14, 1); this.dbg.draw(fb, app.tick); }
      else { textC(fb, 'PAUSED', 160, 64, 7, 1); this.menu.draw(fb, app.tick); }
    }
    toast(app, fb);
  }
}

export function drawCard(fb: FB, zone: number, tick: number, mode: string) {
  fb.rect(0, 0, 320, 200, 1);
  const c = ZONE_CARDS[zone];
  for (let i = 0; i < 20; i++) fb.rect(0, 40 + i * 6, 320, 3, i % 2 ? 1 : 2);
  box(fb, 30, 60, 260, 80);
  textC(fb, c.title, 160, 72, 8, 1);
  textC(fb, c.name, 160, 88, 7, 1, 2);
  textC(fb, c.sub, 160, 112, 4, 1);
  if (mode === '1989') textC(fb, '1989 MODE: AS GOD INTENDED', 160, 126, 10, 1);
  void tick;
}

export { T };
