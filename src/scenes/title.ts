import { FB } from '../engine/framebuffer';
import { text, textC, textW } from '../engine/text';
import { App, Scene, newCampaign, blitScaled } from '../app';
import { audio } from '../audio/audio';
import { Menu, box, para, anyKey, hint, toast } from './ui';
import { drawLoadingArt, drawTitleBack, bigText, crest } from '../render/illus';
import { store } from '../game/save';
import { World } from '../game/types';
import { newWorld, step } from '../game/world';
import { drawWorld } from '../render/world';
import { routeFor, decodeRoute } from '../content/routes';
import { CAST, HOW_TO_PLAY } from '../content/text/story';
import { TROPHIES } from '../content/text/trophies';
import { ZONE_CARDS } from '../content/text/story';
import { BOBBY_SPR, CREATURE_SPR, PEOPLE } from '../content/sprites';
import { PlayScene } from './play';
import { CutsceneScene } from './cutscene';
import { PLAY_Y, PH } from '../game/consts';

// ---------------------------------------------------------------- Loading
export class LoadingScene implements Scene {
  zone = 0; sky = false; music = null; touchControls = false;
  art = new FB();
  row = 0;
  t = 0;
  constructor() { drawLoadingArt(this.art); }
  update(app: App) {
    this.t++;
    // An Amiga picture loads a line at a time, top to bottom.
    if (this.row < 200) this.row = Math.min(200, this.row + (this.t % 3 === 0 ? 3 : 1));
    if (this.t % 7 === 0 && this.row < 200) audio.sfx('click');
    if (anyKey(app) || this.t > 520) { app.fullscreen(); audio.init(); app.go(new TitleScene(app)); }
  }
  draw(app: App, fb: FB) {
    fb.rect(0, 0, 320, 200, 1);
    fb.pix.set(this.art.pix.subarray(0, this.row * 320));
    // Loading stripes in the border, like the disk was working hard
    if (this.row < 200) for (let y = this.row; y < 200; y += 2) fb.rect(0, y, 320, 1, ((y + this.t * 3) >> 3) % 2 ? 2 : 1);
    if (this.row >= 200 && app.tick % 50 < 35) textC(fb, hint(app, 'TO START'), 160, 190, 4, 1);
    void app;
  }
}

// ---------------------------------------------------------------- Title + attract
export class TitleScene implements Scene {
  zone = 3; sky = false; music = 'title'; touchControls = true;
  phase = 0; t = 0;
  demo: World | null = null; demoIn: number[] = []; demoI = 0; demoZone = 0;
  enter(app: App) { app.display.setZone(3, false); this.phase = 0; this.t = 0; }
  constructor(public app: App) {}
  update(app: App) {
    this.t++;
    // floodlights cycle through the palette
    const cyc = [0xffd, 0xffa, 0xfe8, 0xdc6, 0xfe8, 0xffa];
    app.display.setColour(31, cyc[Math.floor(app.tick / 6) % cyc.length]);
    if (anyKey(app) || app.input.pressed('pause')) {
      app.fullscreen(); audio.init();
      if (this.demo) app.display.setZone(3, false);
      app.go(new MenuScene(app));
      return;
    }
    const lens = [400, 300, 1, 420];
    if (this.phase === 2) {
      if (!this.demo) this.startDemo(app);
      if (this.demo) {
        step(this.demo, this.demoIn[this.demoI++] ?? 0);
        this.demo.events.length = 0;
        if (this.demoI > 700 || this.demoI > this.demoIn.length || this.demo.state !== 'play' && this.demo.state !== 'scroll' && this.demo.state !== 'dying') this.nextPhase(app);
      } else this.nextPhase(app);
      return;
    }
    if (this.t > lens[this.phase]) this.nextPhase(app);
  }
  startDemo(app: App) {
    const unlocked = store.unlocked();
    for (let k = 0; k < 4; k++) {
      const z = (this.demoZone + k) % Math.max(1, unlocked);
      const r = routeFor(z);
      if (r) {
        this.demo = newWorld({ zone: z, seed: r.seed });
        this.demoIn = decodeRoute(r.route); this.demoI = 0;
        this.demoZone = z + 1;
        app.display.setZone(z, true);
        return;
      }
    }
  }
  nextPhase(app: App) {
    this.phase = (this.phase + 1) % 4; this.t = 0;
    if (this.demo) { this.demo = null; app.display.setZone(3, false); }
  }
  draw(app: App, fb: FB) {
    if (this.phase === 2 && this.demo) {
      drawWorld(fb, this.demo, { tick: app.tick });
      fb.rect(32, PLAY_Y + PH - 12, 256, 11, 1);
      textC(fb, 'DEMO  -  ' + hint(app, 'TO PLAY'), 160, PLAY_Y + PH - 10, app.tick % 40 < 25 ? 9 : 8, 1);
      return;
    }
    drawTitleBack(fb, app.tick);
    if (this.phase === 0) {
      crest(fb, 160, 22);
      bigText(fb, 'BOBBY', 160, 56, 4, app.tick);
      bigText(fb, "STRUGGLIN'", 160, 88, 3, app.tick + 40);
      textC(fb, 'THE LEVENMOUTH ATHLETIC STORY', 160, 118, 4, 1);
      if (app.tick % 50 < 34) textC(fb, hint(app, 'TO START'), 160, 136, 9, 1);
    } else if (this.phase === 1) {
      drawScores(fb, 30);
    } else if (this.phase === 3) {
      drawWhosWho(fb, app.tick);
    }
    toast(app, fb);
  }
}

export function drawScores(fb: FB, y: number, highlight = -1) {
  box(fb, 50, y - 8, 220, 146);
  textC(fb, 'THE LEAGUE TABLE', 160, y, 7, 1);
  textC(fb, 'POS NAME   SCORE  ZONE', 160, y + 14, 8, 1);
  store.scores().forEach((s, i) => {
    const c = i === highlight ? 9 : i < 3 ? 4 : 3;
    textC(fb, `${String(i + 1).padStart(2)}. ${s.name.padEnd(4)} ${String(s.score).padStart(7)}   ${s.zone}${s.mode === '1989' ? '*' : ' '}`, 160, y + 26 + i * 10, c, 1);
  });
  textC(fb, '* 1989 MODE', 160, y + 130, 8, 1);
}

function drawWhosWho(fb: FB, tick: number) {
  box(fb, 20, 8, 280, 184);
  textC(fb, "WHO'S WHO AT LEVENMOUTH", 160, 14, 7, 1);
  CAST.forEach((c, i) => {
    const y = 28 + i * 18;
    const spr = c.sprite === 'bobby' ? BOBBY_SPR.stand : c.sprite === 'tam' ? CREATURE_SPR.tam1 : PEOPLE[c.sprite]?.walk2;
    if (spr) {
      if (c.sprite === 'tam') { fb.clip(0, y - 2, 320, y + 16); fb.blit(spr, 24, y - 2); fb.noClip(); }
      else { fb.clip(0, y - 2, 320, y + 16); fb.blit(spr, 30 + (tick >> 5) % 2, y - 2); fb.noClip(); }
    }
    text(fb, c.who, 58, y, 9, 1);
    text(fb, c.line, 58, y + 8, 3, 1);
  });
}

// ---------------------------------------------------------------- Main menu
export class MenuScene implements Scene {
  zone = 3; sky = false; music = 'title'; touchControls = true;
  menu: Menu;
  constructor(public app: App) {
    const start = (mode: '2026' | '1989') => {
      const c = newCampaign(mode);
      app.go(new CutsceneScene(app, 'intro', () => new PlayScene(app, c)));
    };
    this.menu = new Menu([
      { label: () => 'CONTINUE: ZONE ' + ((store.autosave()?.zone ?? 0) + 1), hidden: () => !store.autosave(), act: () => {
        const a = store.autosave()!;
        const c = newCampaign('2026', a.zone);
        Object.assign(c, { score: 0, lives: a.lives, balls: a.balls, pies: a.pies, seed: a.seed });
        app.go(new PlayScene(app, c));
      } },
      { label: () => 'KICK OFF (2026 MODE)', act: () => start('2026') },
      { label: () => '1989 MODE', act: () => start('1989') },
      { label: () => 'ZONE SELECT', act: () => app.go(new ZoneSelectScene(app)) },
      { label: () => 'TROPHY CABINET', act: () => app.go(new TrophyScene(app)) },
      { label: () => "HOW TO PLAY", act: () => app.go(new HowToScene(app)) },
      { label: () => 'LEAGUE TABLE', act: () => app.go(new ScoresScene(app)) },
      { label: () => 'OPTIONS', act: () => app.go(new OptionsScene(app)) },
    ], 70, 13);
  }
  update(app: App) {
    app.display.setColour(31, [0xffd, 0xffa, 0xfe8, 0xdc6][Math.floor(app.tick / 6) % 4]);
    if (app.input.pressed('back') && !app.input.usingTouch) { app.go(new TitleScene(app)); return; }
    this.menu.update(app);
  }
  draw(app: App, fb: FB) {
    drawTitleBack(fb, app.tick);
    bigText(fb, "BOBBY STRUGGLIN'", 160, 22, 2, app.tick);
    box(fb, 60, 58, 200, this.menu.visible().length * 13 + 16);
    this.menu.draw(fb, app.tick);
    toast(app, fb);
  }
}

class ScoresScene implements Scene {
  zone = 3; sky = false; music = 'title'; touchControls = true;
  constructor(public app: App) {}
  update(app: App) { if (anyKey(app)) app.go(new MenuScene(app)); }
  draw(app: App, fb: FB) { drawTitleBack(fb, app.tick); drawScores(fb, 30); }
}

// ---------------------------------------------------------------- Options
export class OptionsScene implements Scene {
  zone = 3; sky = false; music = 'title'; touchControls = true;
  menu: Menu; confirm = false;
  constructor(public app: App) {
    const s = app.settings;
    const flip = (k: keyof typeof s) => () => { (s[k] as boolean) = !s[k]; app.applySettings(); };
    this.menu = new Menu([
      { label: () => 'MUSIC: ' + (s.music ? 'ON' : 'OFF (EFFECTS ONLY)'), act: flip('music'), left: flip('music'), right: flip('music') },
      { label: () => 'SOUND EFFECTS: ' + (s.sfx ? 'ON' : 'OFF'), act: flip('sfx'), left: flip('sfx'), right: flip('sfx') },
      { label: () => 'CRT MODE: ' + (s.crt ? 'ON' : 'OFF'), act: flip('crt'), left: flip('crt'), right: flip('crt') },
      { label: () => 'CONTROLS: ' + (s.classic ? '1989 (FIRE + DIRECTION)' : 'MODERN'), act: flip('classic'), left: flip('classic'), right: flip('classic') },
      { label: () => 'HAPTICS: ' + (s.haptics ? 'ON' : 'OFF'), act: flip('haptics'), left: flip('haptics'), right: flip('haptics') },
      { label: () => (this.confirm ? 'REALLY RESET EVERYTHING?' : 'RESET SAVES AND SCORES'), act: () => {
        if (!this.confirm) { this.confirm = true; return; }
        store.reset(); this.confirm = false; app.toast = 'ALL RESET. A FRESH START.'; app.toastT = 120;
      } },
      { label: () => 'BACK', act: () => app.go(new MenuScene(app)) },
    ], 60, 14);
  }
  update(app: App) { if (app.input.pressed('back') && !app.input.usingTouch) { app.go(new MenuScene(app)); return; } this.menu.update(app); }
  draw(app: App, fb: FB) {
    drawTitleBack(fb, app.tick);
    box(fb, 24, 30, 272, 134);
    textC(fb, 'OPTIONS', 160, 40, 7, 1);
    this.menu.draw(fb, app.tick);
    if (app.settings.classic) textC(fb, 'FIRE+UP KICK, FIRE+DOWN PIE, FIRE+SIDE SCARF', 160, 172, 3, 1);
    toast(app, fb);
  }
}

// ---------------------------------------------------------------- Zone select
class ZoneSelectScene implements Scene {
  zone = 3; sky = false; music = 'title'; touchControls = true;
  menu: Menu;
  constructor(public app: App) {
    const un = store.unlocked();
    const items = ZONE_CARDS.map((z, i) => ({
      label: () => (i < un ? `${z.title}: ${z.name}` : `${z.title}: LOCKED`),
      act: () => { if (i < un) { const c = newCampaign('select', i); app.go(new PlayScene(app, c)); } else { audio.sfx('empty'); } },
    }));
    items.push({ label: () => 'BACK', act: () => app.go(new MenuScene(app)) });
    this.menu = new Menu(items, 70, 16);
  }
  update(app: App) { if (app.input.pressed('back') && !app.input.usingTouch) { app.go(new MenuScene(app)); return; } this.menu.update(app); }
  draw(app: App, fb: FB) {
    drawTitleBack(fb, app.tick);
    box(fb, 30, 40, 260, 110);
    textC(fb, 'ZONE SELECT', 160, 50, 7, 1);
    textC(fb, 'BEAT A ZONE TO UNLOCK THE NEXT. NO SCORE KEPT.', 160, 154, 3, 1);
    this.menu.draw(fb, app.tick);
  }
}

// ---------------------------------------------------------------- Trophy cabinet
class TrophyScene implements Scene {
  zone = 1; sky = false; music = 'title'; touchControls = true;
  constructor(public app: App) {}
  update(app: App) { if (anyKey(app)) app.go(new MenuScene(app)); }
  draw(app: App, fb: FB) {
    fb.rect(0, 0, 320, 200, 18);
    for (let x = 0; x < 320; x += 20) fb.rect(x, 0, 1, 200, 17);
    box(fb, 8, 4, 304, 192);
    textC(fb, 'THE TROPHY CABINET', 160, 10, 7, 1);
    const got = store.trophies();
    TROPHIES.forEach((t, i) => {
      const y = 24 + i * 14;
      const have = got.includes(t.id);
      // a tiny cup
      fb.rect(18, y + 1, 7, 4, have ? 7 : 2); fb.rect(20, y + 5, 3, 2, have ? 8 : 2); fb.rect(18, y + 7, 7, 1, have ? 8 : 2);
      text(fb, t.name, 30, y, have ? 9 : 3, 1);
      text(fb, have ? t.how : '????', 30 + textW(t.name) + 8, y, have ? 4 : 2, 1);
    });
    textC(fb, `${got.length} OF ${TROPHIES.length}`, 160, 186, 8, 1);
    void app;
  }
}

// ---------------------------------------------------------------- How to play
class HowToScene implements Scene {
  zone = 0; sky = false; music = 'title'; touchControls = true;
  constructor(public app: App) {}
  update(app: App) { if (anyKey(app)) app.go(new MenuScene(app)); }
  draw(app: App, fb: FB) {
    // A match-day programme page, of our own design.
    fb.rect(0, 0, 320, 200, 4);
    fb.rect(0, 0, 320, 22, 1);
    fb.rect(0, 20, 320, 3, 7);
    crest(fb, 18, -3);
    text(fb, 'LEVENMOUTH ATHLETIC', 36, 3, 7, -1);
    text(fb, 'OFFICIAL MATCHDAY PROGRAMME   20P', 36, 12, 4, -1);
    fb.rect(8, 28, 304, 14, 1);
    textC(fb, "MANAGER'S NOTES", 160, 32, 9, -1);
    fb.blit(BOBBY_SPR.stand, 284, 46);
    fb.frame(281, 44, 22, 28, 1);
    let y = 48;
    HOW_TO_PLAY.forEach((s) => { y = para(fb, s, 12, y, 44, 1, 9) + 3; });
    text(fb, "- BOBBY", 240, 186, 11, -1);
    void app;
  }
}

export { blitScaled };
