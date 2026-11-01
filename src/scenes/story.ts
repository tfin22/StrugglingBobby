import { FB } from '../engine/framebuffer';
import { text, textC, wrap } from '../engine/text';
import { App, Scene, Campaign, blitScaled } from '../app';
import { audio } from '../audio/audio';
import { box, anyKey, hint, toast, Menu } from './ui';
import { drawScene, bigText } from '../render/illus';
import { CUTSCENES, GAME_OVER, CREDITS } from '../content/text/story';
import { SPONSORS } from '../content/text/misc';
import { REPORTER_SIGNOFF } from '../content/text/interview';
import { interview, ZoneReport } from '../game/interview';
import { BOBBY_SPR, PEOPLE } from '../content/sprites';
import { store, insertScore, scoreRank } from '../game/save';
import { T } from '../game/tuning';
import { drawScores } from './title';
import type { PlayScene } from './play';

// ---------------------------------------------------------------- Cutscenes
export class CutsceneScene implements Scene {
  zone: number; sky = false; music: string | null = 'zone1'; touchControls = true;
  i = 0; chars = 0; t = 0;
  panels;
  constructor(public app: App, public id: string, public next: () => Scene | null) {
    this.panels = CUTSCENES[id];
    this.zone = id === 'after2' ? 1 : id === 'after3' ? 3 : 0;
    this.music = id === 'ending' ? 'victory' : id === 'after3' ? 'zone4' : 'title';
  }
  update(app: App) {
    this.t++;
    const all = this.panels[this.i].lines.join('\n');
    if (this.chars < all.length) { this.chars += 1; if (this.t % 2 === 0 && all[this.chars] !== ' ') audio.sfx('typing'); }
    if (app.input.pressed('back') && this.t > 30) return this.done();
    if (anyKey(app)) {
      if (this.chars < all.length) this.chars = all.length;
      else if (++this.i >= this.panels.length) this.done();
      else { this.chars = 0; this.t = 0; }
    }
  }
  done() { const n = this.next(); if (n) this.app.go(n); }
  draw(app: App, fb: FB) {
    const p = this.panels[Math.min(this.i, this.panels.length - 1)];
    drawScene(fb, p.scene, app.tick);
    fb.rect(32, 16, 256, 1, 8); fb.rect(32, 139, 256, 1, 8);
    let left = this.chars;
    p.lines.forEach((l, j) => {
      const s = l.slice(0, Math.max(0, left));
      left -= l.length + 1;
      textC(fb, s, 160, 146 + j * 10, 4, 1);
    });
    if (this.chars >= p.lines.join('\n').length && app.tick % 40 < 26) text(fb, '>', 296, 188, 7, 1);
    textC(fb, 'SKIP: ' + (app.input.usingTouch ? 'KICK' : 'ESC'), 160, 4, 2, -1);
  }
}

// ---------------------------------------------------------------- The post-match interview
export class InterviewScene implements Scene {
  zone = 0; sky = false; music = null; touchControls = true;
  qa: { q: string; a: string }[];
  i = 0; part = 0; chars = 0; t = 0;
  constructor(public app: App, public z: number, public rep: ZoneReport, public c: Campaign, public next: () => Scene | null) {
    this.qa = interview(z, rep);
    this.qa.push({ q: REPORTER_SIGNOFF[z % REPORTER_SIGNOFF.length], a: '' });
  }
  cur() { const x = this.qa[this.i]; return this.part === 0 ? x.q : x.a; }
  update(app: App) {
    this.t++;
    const s = this.cur();
    if (this.chars < s.length) { this.chars++; if (this.t % 2 === 0) audio.sfx('typing'); }
    if (app.input.pressed('back') && this.t > 50) return this.done();
    if (anyKey(app) && this.t > 10) {
      if (this.chars < s.length) { this.chars = s.length; return; }
      this.chars = 0; this.t = 0;
      if (this.part === 0 && this.qa[this.i].a) this.part = 1;
      else { this.part = 0; this.i++; if (this.i >= this.qa.length) this.done(); }
    }
  }
  done() { const n = this.next(); if (n) this.app.go(n); }
  draw(app: App, fb: FB) {
    // Sponsor board backdrop (invented sponsors)
    fb.rect(0, 0, 320, 200, 1);
    for (let row = 0; row < 6; row++) for (let col = 0; col < 4; col++) {
      const x = col * 84 - (row % 2) * 40, y = 20 + row * 22;
      const s = SPONSORS[(row + col) % SPONSORS.length];
      fb.rect(x, y, 82, 20, (row + col) % 2 ? 4 : 7);
      textC(fb, s.length > 13 ? s.slice(0, 13) : s, x + 41, y + 7, (row + col) % 2 ? 1 : 1, -1);
    }
    // Bobby, deadpan, and the reporter's microphone
    blitScaled(fb, BOBBY_SPR.stand, 60, 54, 4);
    blitScaled(fb, PEOPLE.reporter.walk2, 214, 70, 3, true);
    fb.rect(150, 104, 40, 3, 1); fb.rect(146, 100, 8, 10, 2); fb.rect(147, 101, 6, 8, 3);
    fb.rect(190, 104, 26, 3, 1);
    // Courier banner
    fb.rect(0, 0, 320, 16, 1);
    textC(fb, 'LEVENMOUTH COURIER - POST-MATCH', 160, 4, 7, 1);
    const x = this.qa[Math.min(this.i, this.qa.length - 1)];
    // question at the top, answer at the bottom
    const q = this.part === 0 ? x.q.slice(0, this.chars) : x.q;
    const lines = wrap(q, 44);
    box(fb, 8, 18, 304, lines.length * 9 + 10, 15);
    lines.forEach((l, j) => text(fb, l, 16, 23 + j * 9, 4, 1));
    if (this.part === 1) {
      const al = wrap(x.a.slice(0, this.chars), 44);
      const h = wrap(x.a, 44).length * 9 + 14;
      box(fb, 8, 196 - h, 304, h);
      text(fb, 'BOBBY:', 16, 196 - h + 5, 8, 1);
      al.forEach((l, j) => text(fb, l, 16, 196 - h + 14 + j * 9, 9, 1));
    }
    textC(fb, 'SKIP: ' + (app.input.usingTouch ? 'KICK' : 'ESC'), 288, 4, 2, -1);
  }
}

// ---------------------------------------------------------------- Game over, initials, continue
export class GameOverScene implements Scene {
  zone = 0; sky = false; music = 'gameover'; touchControls = true;
  t = 0; stage: 'msg' | 'initials' | 'table' | 'continue' = 'msg';
  name = ['A', 'A', 'A']; pos = 0; rank = -1;
  cont: Menu;
  constructor(public app: App, public play: PlayScene) {
    this.cont = new Menu([
      { label: () => 'CONTINUE (SCORE RESETS)', act: () => this.doContinue() },
      { label: () => 'QUIT TO TITLE', act: () => this.quit() },
    ], 130, 14);
  }
  score() { return this.play.w.score; }
  update(app: App) {
    this.t++;
    const inp = app.input;
    if (this.stage === 'msg') {
      if (this.t > 60 && anyKey(app) || this.t > 300) {
        this.rank = this.play.c.mode === 'select' ? -1 : scoreRank(store.scores(), this.score());
        this.stage = this.rank >= 0 ? 'initials' : this.nextAfterTable();
        this.t = 0;
      }
    } else if (this.stage === 'initials') {
      const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ .!0123456789';
      const cyc = (d: number) => { const i = L.indexOf(this.name[this.pos]); this.name[this.pos] = L[(i + d + L.length) % L.length]; audio.sfx('move'); };
      if (inp.pressed('up')) cyc(1);
      if (inp.pressed('down')) cyc(-1);
      if (inp.pressed('left')) this.pos = Math.max(0, this.pos - 1);
      if (inp.pressed('right')) this.pos = Math.min(2, this.pos + 1);
      for (const tp of inp.taps) {
        // tap above/below a letter to change it, on it to move there
        const i = Math.floor((tp.x - 124) / 24);
        if (i >= 0 && i < 3) { this.pos = i; if (tp.y < 88) cyc(1); else if (tp.y > 112) cyc(-1); }
        if (tp.y > 140) this.submit();
      }
      if (inp.pressed('ok')) { if (this.pos < 2) this.pos++; else this.submit(); audio.sfx('select'); }
    } else if (this.stage === 'table') {
      if (this.t > 30 && anyKey(app)) { this.stage = this.nextAfterTable(); this.t = 0; }
    } else if (this.stage === 'continue') {
      this.cont.update(app);
    }
  }
  nextAfterTable(): 'continue' | 'msg' {
    if (this.play.c.mode === '2026') return 'continue';
    this.quit();
    return 'msg';
  }
  submit() {
    const { table, rank } = insertScore(store.scores(), { name: this.name.join(''), score: this.score(), zone: this.play.w.zone + 1, mode: this.play.c.mode });
    store.saveScores(table);
    this.rank = rank;
    this.stage = 'table'; this.t = 0;
  }
  doContinue() {
    // Unlimited continues from the last screen checkpoint; the score resets,
    // so continues never reach the league table.
    const w = this.play.w;
    w.lives = T.startLives; w.score = 0; w.nextLifeAt = T.extraLifeEvery;
    w.state = 'dying'; w.stateT = T.deathFrames; // restart on the next step
    this.play.c.score = 0;
    this.app.go(this.play);
  }
  quit() { void import('./title').then((m) => this.app.go(new m.TitleScene(this.app))); }
  draw(app: App, fb: FB) {
    fb.rect(0, 0, 320, 200, 1);
    if (this.stage === 'msg') {
      // Bobby walks off with his box of things
      const x = 300 - Math.min(this.t * 1.2, 360);
      fb.rect(0, 140, 320, 2, 8);
      fb.blit(BOBBY_SPR[['walk1', 'walk2', 'walk3', 'walk2'][Math.floor(this.t / 8) % 4]], x, 116, true);
      fb.rect(x - 4, 124, 10, 8, 12); fb.frame(x - 4, 124, 10, 8, 1);
      wrap(GAME_OVER, 30).forEach((l, i) => textC(fb, l, 160, 60 + i * 12, 7, 1, 1));
      textC(fb, 'FINAL SCORE ' + this.score(), 160, 160, 4, 1);
    } else if (this.stage === 'initials') {
      textC(fb, "YOU'RE IN THE LEAGUE TABLE!", 160, 40, 9, 1);
      textC(fb, 'ENTER YOUR INITIALS', 160, 56, 4, 1);
      this.name.forEach((ch, i) => {
        const x = 124 + i * 24;
        text(fb, '^', x + 6, 80, i === this.pos ? 7 : 2, 1);
        fb.rect(x, 90, 20, 20, i === this.pos ? 8 : 2);
        text(fb, ch, x + 5, 97, 9, 1);
        text(fb, '~', x + 6, 114, i === this.pos ? 7 : 2, 1);
      });
      box(fb, 120, 146, 80, 16);
      textC(fb, 'DONE', 160, 151, 9, 1);
    } else if (this.stage === 'table') {
      drawScores(fb, 30, this.rank);
    } else {
      wrap(GAME_OVER, 30).forEach((l, i) => textC(fb, l, 160, 50 + i * 12, 7, 1));
      textC(fb, 'THE CHAIRMAN HAS OFFERED BOBBY', 160, 90, 4, 1);
      textC(fb, 'ONE MORE CHANCE.', 160, 100, 4, 1);
      this.cont.draw(fb, app.tick);
    }
    toast(app, fb);
  }
}

// ---------------------------------------------------------------- Credits, then the table
export class CreditsScene implements Scene {
  zone = 0; sky = false; music = 'title'; touchControls = true;
  y = 200; t = 0;
  constructor(public app: App, public c: Campaign) {}
  update(app: App) {
    this.t++;
    this.y -= 0.5;
    if ((anyKey(app) && this.t > 60) || this.y < -CREDITS.length * 12 - 20) {
      const rank = this.c.mode === 'select' ? -1 : scoreRank(store.scores(), this.c.score);
      if (rank >= 0) {
        // Reuse the game-over flow for initials, without the walk-off.
        const fake = { w: { score: this.c.score, zone: 3 }, c: this.c } as unknown as PlayScene;
        const g = new GameOverScene(app, fake);
        g.stage = 'initials'; g.rank = rank;
        g.nextAfterTable = () => { g.quit(); return 'msg'; };
        app.go(g);
      } else void import('./title').then((m) => app.go(new m.TitleScene(app)));
    }
  }
  draw(app: App, fb: FB) {
    fb.rect(0, 0, 320, 200, 1);
    CREDITS.forEach((l, i) => {
      const y = Math.round(this.y + i * 12);
      if (y > -10 && y < 200) textC(fb, l, 160, y, i === 0 ? 7 : 4, 1);
    });
    if (this.y > 120) bigText(fb, 'FULL TIME', 160, 40, 3, app.tick);
    void hint;
  }
}
