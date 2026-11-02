import { FB, Bitmap } from '../engine/framebuffer';
import { text, textC, textW, wrap } from '../engine/text';
import { World, Ent } from '../game/types';
import { PLAY_X, PLAY_Y, PW, PH, TS, COLS, ROWS } from '../game/consts';
import { T } from '../game/tuning';
import { tileArt, tileArtAlt, ZONE_FLAGS, F_CRUMBLE, tileId, TILE_CHARS } from '../content/tiles';
// Tiles with see-through pixels get the screen's back wall behind them.
const TRANSP = [...TILE_CHARS].map((c) => '-^hXZGabf'.includes(c));
import { BOBBY_SPR, THING_SPR, CREATURE_SPR, PEOPLE } from '../content/sprites';
import { TRAP_TYPES } from '../content/traps';
import { screenDef } from '../content/zones';
import { scarfRect, pBox } from '../game/world';
import { crusherRect } from '../game/ents';
import { HOARDING_TEXT } from '../content/text/misc';

const K = 1, DG = 2, GR = 3, WH = 4, GOLD = 7, GOLDD = 8, GOLDL = 9, RED = 10, REDD = 11, BRN = 12, BRND = 13, VIS = 14, BLUE = 15;

export interface DrawOpts { debug?: boolean; tick: number; hideHud?: boolean; bobX?: number; bobY?: number }

let ox = 0, oy = 0; // current draw offset (screen shake / scroll)
function blit(fb: FB, b: Bitmap | undefined, x: number, y: number, flip = false, remap = -1, flipV = false) {
  if (b) fb.blit(b, PLAY_X + ox + x, PLAY_Y + oy + y, flip, remap, flipV);
}
function rect(fb: FB, x: number, y: number, w: number, h: number, c: number) { fb.rect(PLAY_X + ox + x, PLAY_Y + oy + y, w, h, c); }
function px(fb: FB, x: number, y: number, c: number) { fb.pset(PLAY_X + ox + x, PLAY_Y + oy + y, c); }

// Darken a back-wall pixel (zone back wall colours) to the deep shadow colour.
const F_SOLIDISH = 1;
function shade(fb: FB, x: number, y: number) {
  if (x < fb.cx0 || x >= fb.cx1 || y < fb.cy0 || y >= fb.cy1) return;
  const i = y * 320 + x, c = fb.pix[i];
  if (c === 29 || c === 30) fb.pix[i] = c === 30 ? 29 : 16;
}

export function drawTiles(fb: FB, zone: number, tiles: Uint8Array, dx: number, dy: number, crumble?: Record<number, number>, tick = 0, back = ' ') {
  const art = tileArt(zone), alt = tileArtAlt(zone);
  const bk = back !== ' ' ? art[tileId(back)] : null;
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const i = ty * COLS + tx, id = tiles[i];
    if (bk && (!id || TRANSP[id])) fb.blitOpaque(bk, PLAY_X + dx + tx * TS, PLAY_Y + dy + ty * TS);
    if (!id) continue;
    let sx = 0;
    if (crumble && crumble[i] !== undefined && ZONE_FLAGS[zone][id] & F_CRUMBLE) sx = tick % 4 < 2 ? 1 : -1;
    const a = (tx & 1 ? alt[id] : null) ?? art[id];
    if (a) { if (bk) fb.blit(a, PLAY_X + dx + tx * TS + sx, PLAY_Y + dy + ty * TS); else fb.blitOpaque(a, PLAY_X + dx + tx * TS + sx, PLAY_Y + dy + ty * TS); }
  }
  // Cast shadows: solid blocks darken the back wall below and to the right of
  // them, so the foreground lifts off the background.
  if (bk) {
    const flags = ZONE_FLAGS[zone];
    const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < COLS && y < ROWS && (flags[tiles[y * COLS + x]] & F_SOLIDISH) !== 0;
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
      if (solid(tx, ty)) continue;
      const up = solid(tx, ty - 1), left = solid(tx - 1, ty), diag = solid(tx - 1, ty - 1);
      if (!up && !left && !diag) continue;
      const x0 = PLAY_X + dx + tx * TS, y0 = PLAY_Y + dy + ty * TS;
      for (let j = 0; j < 4; j++) for (let i = 0; i < TS; i++) {
        const inTop = up && j < 4 && i >= j - 1, inLeft = left && i < 4 - Math.max(0, 0) && j < TS;
        void inLeft;
        if (!inTop && !(diag && i < 4 - j)) continue;
        shade(fb, x0 + i, y0 + j);
      }
      if (left) for (let j = 0; j < TS; j++) for (let i = 0; i < 3; i++) if (i < 3 - (up || diag ? 0 : Math.max(0, 2 - j))) shade(fb, x0 + i, y0 + j);
    }
  }
}

export function drawWorld(fb: FB, w: World, o: DrawOpts) {
  fb.noClip();
  fb.rect(0, 0, 320, 200, K);
  fb.rect(PLAY_X, PLAY_Y, PW, PH, 0);
  fb.clip(PLAY_X, PLAY_Y, PLAY_X + PW, PLAY_Y + PH);
  const sh = w.shake > 0 ? (w.frame % 2 ? 1 : -1) * Math.min(2, Math.ceil(w.shake / 4)) : 0;
  ox = sh; oy = 0;
  if (w.state === 'scroll' && w.prevTiles) {
    const t = w.scrollT / T.scrollFrames;
    const [dx, dy] = w.scrollDir;
    drawTiles(fb, w.zone, w.prevTiles, Math.round(-dx * t * PW), Math.round(-dy * t * PH), undefined, 0, w.prevBack ?? ' ');
    ox = Math.round(dx * (1 - t) * PW); oy = Math.round(dy * (1 - t) * PH);
    drawTiles(fb, w.zone, w.tiles, ox, oy, undefined, 0, screenDef(w.screen).back ?? ' ');
  } else drawTiles(fb, w.zone, w.tiles, ox, oy, w.crumble, o.tick, screenDef(w.screen).back ?? ' ');

  // Back layer
  for (const e of w.ents) if (isBack(e)) drawEnt(fb, w, e, o.tick);
  if (w.state !== 'dying') drawBobby(fb, w, o.tick, o.bobX, o.bobY);
  for (const e of w.ents) if (!isBack(e)) drawEnt(fb, w, e, o.tick);
  if (w.state === 'dying') drawBobby(fb, w, o.tick);
  if (o.debug) drawDebug(fb, w);
  ox = 0; oy = 0;
  fb.noClip();
  if (!o.hideHud) drawHud(fb, w, o.tick);
}

function isBack(e: Ent) {
  return ['sign', 'exit', 'studs', 'dart', 'cam', 'switch', 'trip', 'pickup', 'npc', 'jet', 'bosspart', 'crusher'].includes(e.k) && e.data?.role !== 'def' && e.data?.role !== 'grab';
}

function drawBobby(fb: FB, w: World, tick: number, bobX?: number, bobY?: number) {
  const p = w.p;
  const flip = p.facing < 0;
  const x = Math.round((bobX ?? p.x) - 8), y = Math.round((bobY ?? p.y) - 24);
  let spr: Bitmap = BOBBY_SPR.stand;
  switch (p.st) {
    case 'walk': spr = [BOBBY_SPR.walk1, BOBBY_SPR.walk2, BOBBY_SPR.walk3, BOBBY_SPR.walk2][Math.floor(p.anim / 6) % 4]; break;
    case 'jump': case 'fall': spr = BOBBY_SPR.jump; break;
    case 'crouch': case 'pie': spr = BOBBY_SPR.crouch; break;
    case 'crawl': spr = Math.floor(p.anim / 8) % 2 ? BOBBY_SPR.crawl1 : BOBBY_SPR.crawl2; break;
    case 'climb': spr = Math.floor(p.y / 6) % 2 ? BOBBY_SPR.climb1 : BOBBY_SPR.climb2; break;
    case 'kick': spr = p.t >= T.kickLaunchFrame - 2 && p.t < T.kickLaunchFrame + 5 ? BOBBY_SPR.kick : BOBBY_SPR.stand; break;
    case 'scarf': spr = p.crouched ? BOBBY_SPR.crouch : BOBBY_SPR.scarf; break;
    case 'march': if (Math.floor(w.stateT / 4) % 2) return; spr = BOBBY_SPR.walk2; break;
    case 'dead': {
      const cause = w.deathCause;
      if (cause === 'crushed' || cause === 'ball') { blitSquash(fb, BOBBY_SPR.stand, x, p.y, flip); return; }
      const flipV = cause === 'pie' && Math.floor(w.stateT / 4) % 2 === 1;
      blit(fb, BOBBY_SPR.dead1, x, y, flip, -1, flipV);
      return;
    }
  }
  if (w.state === 'play' && w.invincible && tick % 8 < 2) return;
  blit(fb, spr, x, y, flip);
  if (p.st === 'scarf') drawScarf(fb, w);
}

function blitSquash(fb: FB, b: Bitmap, x: number, feet: number, flip: boolean) {
  // Flattened: sample every 4th row, widened slightly.
  const h = 6;
  for (let j = 0; j < h; j++) {
    const sj = Math.floor((j * b.h) / h);
    for (let i = 0; i < b.w; i++) {
      const c = b.d[sj * b.w + (flip ? b.w - 1 - i : i)];
      if (c) { px(fb, x + i - 2 + Math.floor(i / 4), feet - h + j, c); px(fb, x + i - 1 + Math.floor(i / 4), feet - h + j, c); }
    }
  }
}

function drawScarf(fb: FB, w: World) {
  const p = w.p;
  const r = scarfRect(w);
  const t = p.t;
  const reach = t < T.scarfHitFrom ? (r.w * t) / T.scarfHitFrom : t <= T.scarfHitTo ? r.w : r.w * Math.max(0, 1 - (t - T.scarfHitTo) / 6);
  const hy = p.crouched ? p.y - 8 : p.y - 14;
  for (let i = 0; i < reach; i++) {
    const xx = p.facing > 0 ? p.x + 5 + i : p.x - 5 - i;
    const wave = Math.round(Math.sin(i * 0.45 - t * 1.3) * Math.min(3, i / 6));
    const c = Math.floor(i / 4) % 2 ? GOLD : K;
    px(fb, xx, hy + wave, c); px(fb, xx, hy + wave + 1, c); px(fb, xx, hy + wave + 2, c === GOLD ? GOLDD : DG);
  }
  // Fringe at the tip
  const tip = p.facing > 0 ? p.x + 5 + reach : p.x - 5 - reach;
  if (reach > 4) for (let j = 0; j < 4; j++) px(fb, tip + p.facing * (j % 2), hy + j - 1, GOLD);
}

function frame2(e: Ent, n = 8) { return Math.floor(e.t / n) % 2 === 0; }

function drawEnt(fb: FB, w: World, e: Ent, tick: number) {
  const x = Math.round(e.x), y = Math.round(e.y);
  switch (e.k) {
    case 'sign': {
      rect(fb, x, y, e.w, e.h, K);
      fb.frame(PLAY_X + ox + x, PLAY_Y + oy + y, e.w, e.h, GOLDD);
      text(fb, e.text!, PLAY_X + ox + x + 3, PLAY_Y + oy + y + 2, GOLDL, -1);
      return;
    }
    case 'exit': {
      const open = !w.ents.some((b) => b.k === 'boss' && !b.dead);
      rect(fb, x + 1, y + 2, e.w - 2, e.h - 2, open ? K : DG);
      if (!open) for (let j = y + 4; j < y + e.h; j += 4) rect(fb, x + 1, j, e.w - 2, 1, GR);
      else for (let j = 0; j < 3; j++) px(fb, x + 8, y + 10 + j * 6 + (tick >> 3) % 6, GOLD);
      { const lbl = e.text ?? 'OUT'; const lx = Math.max(textW(lbl) / 2 + 2, Math.min(PW - textW(lbl) / 2 - 2, x + 8)); textC(fb, lbl, PLAY_X + ox + lx, PLAY_Y + oy + y - 9, open ? GOLD : GR, K); }
      return;
    }
    case 'pickup': {
      blit(fb, THING_SPR[e.type!], x, y + (e.type === 'piestall' ? 0 : Math.round(Math.sin(tick * 0.1 + e.id) * 1)));
      if (e.type === 'piestall') {
        for (let i = 0; i < 2; i++) px(fb, x + 5 + i * 5, y - 2 - ((tick >> 2) + i * 3) % 5, e.data?.trap ? RED : WH);
        if (e.data?.trap) textC(fb, "TODAY'S SPECIAL", PLAY_X + ox + x + 8, PLAY_Y + oy + y - 10, RED, K);
      }
      return;
    }
    case 'npc': {
      const s = PEOPLE[e.type!]?.walk2;
      blit(fb, s, x, y, e.dir < 0);
      return;
    }
    case 'ball': case 'clear': blit(fb, frame2(e, 3) ? THING_SPR.ball1 : THING_SPR.ball2, x, y); return;
    case 'hubcap': blit(fb, THING_SPR.hubcap, x, y, Math.floor(e.n / 4) % 2 === 0); return;
    case 'pie': {
      const fast = e.t < 30 ? 3 : 8;
      blit(fb, THING_SPR.pie, x, y, false, Math.floor(e.t / fast) % 2 ? -1 : (e.t < 30 ? RED : -1));
      for (let i = 0; i < 3; i++) px(fb, x + 2 + i * 3, y - 1 - ((tick >> 2) + i * 2) % 4, i % 2 ? WH : GR);
      return;
    }
    case 'dartp': if (e.type === 'teaUrn') blit(fb, THING_SPR.tea, x, y); else blit(fb, THING_SPR.dart, x, y, e.vx > 0); return;
    case 'paper': blit(fb, THING_SPR.paper, x, y, frame2(e, 6)); return;
    case 'board': blit(fb, THING_SPR.board, x, y, frame2(e, 4), -1, !frame2(e, 8)); return;
    case 'inflatable': blit(fb, THING_SPR.inflatable, x, y, e.vx < 0); return;
    case 'fx': drawFx(fb, w, e, x, y, tick); return;
    case 'gball': drawGBall(fb, e, x, y, tick); return;
    case 'drop': {
      const tt = TRAP_TYPES[e.type!];
      let dx = 0;
      if (e.st === 0) dx = tt.tellArt === 'sway' ? (Math.floor(tick / 20) % 2) : 0;
      if (e.st === 1) dx = (tick % 4 < 2 ? 1 : -1) * 2;
      if (e.st <= 1 && tt.tellArt === 'sway') {
        // cable/chain up to the ceiling
        let top = y - 1;
        while (top > 0 && fb.pix[(PLAY_Y + top) * 320 + PLAY_X + x + e.w / 2] === 0) top--;
        for (let j = top + 1; j < y; j++) px(fb, x + e.w / 2 + (e.st === 1 ? dx / 2 : 0), j, j % 2 ? DG : GR);
      }
      if (tt.tellArt === 'flutter' && e.st <= 1) for (let i = 0; i < 2; i++) { const fy = ((tick + i * 37 + e.id * 13) % 60); px(fb, x + 3 + i * 8 + (fy % 6 < 3 ? 1 : 0), y + e.h + fy, WH); }
      blit(fb, THING_SPR[tt.sprite!], x + dx, y);
      if (e.type === 'hoarding') textC(fb, HOARDING_TEXT[w.zone], PLAY_X + ox + x + dx + 16, PLAY_Y + oy + y + 2, RED, -1);
      return;
    }
    case 'studs': {
      const n = e.w / TS;
      const fy = y + e.h; // floor
      for (let i = 0; i < n * 4; i++) {
        const sx = x + 2 + i * 4;
        if (e.st === 0) { px(fb, sx, fy - 1, K); px(fb, sx + 1, fy - 1, K); }
        else if (e.st === 1) { px(fb, sx, fy - 2, GR); px(fb, sx + 1, fy - 2, WH); px(fb, sx, fy - 1, K); px(fb, sx + 1, fy - 1, K); }
        else {
          const glass = e.type === 'bottles';
          for (let j = 0; j < 8; j++) { const ww = Math.max(1, Math.floor(j / 3)); rect(fb, sx + 1 - Math.floor(ww / 2), fy - 8 + j, ww, 1, glass ? (j < 3 ? WH : 26) : j < 2 ? WH : GR); }
        }
      }
      return;
    }
    case 'dart': {
      const tt = TRAP_TYPES[e.type!];
      const fx0 = e.dir > 0 ? x + 12 : x;
      if (tt.tellArt === 'hole') { rect(fb, fx0, y + 2, 4, 5, K); if (e.st === 1) px(fb, fx0 + 1, y + 4, WH); }
      else if (e.type === 'dartboard') blit(fb, THING_SPR.dartboard, x + 2, y + 2);
      else if (e.type === 'teaUrn') { blit(fb, THING_SPR.urn, x + 2, y + 2, e.dir < 0); if (e.st === 1 || tick % 30 < 6) for (let i = 0; i < 3; i++) px(fb, x + 7 + i, y - (tick + i * 3) % 6, WH); }
      else { rect(fb, fx0, y + 2, 4, 5, DG); if (e.st === 1) { px(fb, fx0 + 1, y + 3, GOLD); px(fb, fx0 + 2, y + 5, RED); } }
      return;
    }
    case 'crusher': {
      const r = crusherRect(e);
      const horiz = e.data!.horiz;
      const light = e.st === 1 && tick % 10 < 5;
      if (horiz) {
        // A post with a turning arm
        const postX = e.dir > 0 ? x : x + TS - 4;
        rect(fb, postX, y - 6, 4, 22, DG); rect(fb, postX + 1, y - 6, 1, 22, GR);
        px(fb, postX + 1, y - 8, light ? RED : REDD);
        if (e.n > 0) { rect(fb, r.x, r.y + 4, r.w, 4, GR); rect(fb, r.x, r.y + 4, r.w, 1, WH); rect(fb, r.x, r.y + 7, r.w, 1, K); }
      } else {
        rect(fb, x, y - 4, TS, 4, DG); rect(fb, x, y - 4, TS, 1, GR);
        rect(fb, x + 6, y - 6, 4, 2, light ? RED : REDD);
        if (e.n > 0) {
          const shred = e.type === 'shredder';
          rect(fb, r.x, r.y, r.w, r.h, shred ? GR : DG);
          rect(fb, r.x, r.y, 1, r.h, WH);
          for (let j = 4; j < r.h; j += 6) rect(fb, r.x + 1, r.y + j, r.w - 2, 1, K);
          if (shred) for (let i = 0; i < r.w; i += 3) px(fb, r.x + i, r.y + r.h, WH);
          else rect(fb, r.x, r.y + r.h - 2, r.w, 2, GOLD);
        }
      }
      return;
    }
    case 'jet': {
      const fy = y + e.h;
      rect(fb, x, fy - 3, 8, 3, DG); rect(fb, x + 2, fy - 4, 4, 1, GR);
      const pyro = e.type === 'pyro';
      if (e.st === 1) for (let i = 0; i < 3; i++) px(fb, x + 2 + i * 2, fy - 6 - ((tick + i * 2) % 5), pyro ? GOLDL : WH);
      if (e.st === 2) for (let j = 0; j < e.h - 3; j++) {
        const wv = Math.round(Math.sin((j + tick) * 0.6));
        const c = pyro ? (j < e.h / 3 ? GOLDL : j < (2 * e.h) / 3 ? GOLD : RED) : (j + tick) % 3 ? WH : BLUE;
        rect(fb, x + 2 + wv, y + j, 4, 1, c);
      }
      return;
    }
    case 'patrol': {
      if (e.type === 'tvcam') {
        // the wire across the screen
        for (let i = 0; i < PW; i += 2) px(fb, i, y - 1, DG);
        blit(fb, THING_SPR.tvcam, x, y, e.dir < 0);
      } else if (e.type === 'mower') blit(fb, THING_SPR.mower1, x, y + (tick % 6 < 3 ? 0 : 1), e.dir < 0);
      else blit(fb, THING_SPR.roller, x, y, e.dir < 0);
      return;
    }
    case 'cam': {
      blit(fb, THING_SPR.cctv, x, y, e.dir < 0, -1, !e.on);
      if (e.on) {
        const fast = e.st === 1;
        if (tick % (fast ? 6 : 30) < (fast ? 3 : 8)) px(fb, e.dir > 0 ? x + 12 : x + 1, y + 4, RED);
      }
      return;
    }
    case 'trip': {
      if (e.st === 0) {
        for (let i = 0; i < TS; i++) px(fb, x + i, y + 2, i % 2 ? GR : WH);
        rect(fb, x + 5, y - 3, 6, 4, WH); px(fb, x + 7, y - 2, RED); px(fb, x + 8, y - 2, RED);
      } else { px(fb, x, y + 3, GR); px(fb, x + 1, y + 4, GR); px(fb, x + 15, y + 3, GR); }
      return;
    }
    case 'switch': blit(fb, e.on ? THING_SPR.lever1 : THING_SPR.lever0, x, y + 3); return;
    case 'enemy': drawEnemy(fb, w, e, x, y, tick); return;
    case 'boss': drawBoss(fb, w, e, x, y, tick); return;
    case 'bosspart': drawPart(fb, w, e, x, y, tick); return;
  }
}

function drawGBall(fb: FB, e: Ent, x: number, y: number, tick: number) {
  const cup = e.type === 'cupBall';
  const cx = x + 15, cy = y + 15, r = 15;
  const body = cup ? WH : BRN, dark = cup ? GR : BRND;
  fb.circle(PLAY_X + ox + cx, PLAY_Y + oy + cy, r, K);
  fb.circle(PLAY_X + ox + cx, PLAY_Y + oy + cy, r - 1, dark);
  fb.circle(PLAY_X + ox + cx - 1, PLAY_Y + oy + cy - 1, r - 2, body);
  // Panel seams rotate as it rolls
  const a = (e.n / r) * e.dir;
  for (let k = 0; k < 3; k++) {
    const ang = a + (k * Math.PI) / 3;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let t = -r + 3; t <= r - 3; t++) {
      const sx = cx + Math.round(ca * t), sy = cy + Math.round(sa * t * 0.85);
      if (k === 0 || Math.abs(t) > 4) px(fb, sx, sy, cup ? GOLD : dark);
    }
  }
  // Laces
  if (!cup) for (let i = -3; i <= 3; i += 2) { px(fb, cx + Math.round(Math.cos(a) * i), cy - 9 + Math.round(Math.sin(a) * 2), WH); }
  // Highlight
  for (let i = 0; i < 4; i++) px(fb, cx - 8 + i, cy - 10 + Math.floor(i / 2), cup ? WH : GOLDL);
  if (e.st === 4 || e.st === 0) return;
  // Dust kicked up while rolling
  if (e.st === 2) for (let i = 0; i < 3; i++) px(fb, cx - e.dir * (r + 2 + i * 2), y + 28 - ((tick + i) % 4), GR);
}

function drawEnemy(fb: FB, w: World, e: Ent, x: number, y: number, tick: number) {
  const dying = e.st === 99;
  const flip = e.dir < 0;
  const f2 = Math.floor(e.t / 8) % 2 === 0;
  let spr: Bitmap | undefined;
  switch (e.type) {
    case 'gull': spr = f2 ? CREATURE_SPR.gull1 : CREATURE_SPR.gull2; break;
    case 'wasp': spr = Math.floor(e.t / 3) % 2 ? CREATURE_SPR.wasp1 : CREATURE_SPR.wasp2; break;
    case 'cat': spr = e.st === 1 ? CREATURE_SPR.cat1 : f2 ? CREATURE_SPR.cat1 : CREATURE_SPR.cat2; break;
    case 'sroll': spr = f2 ? CREATURE_SPR.sroll1 : CREATURE_SPR.sroll2; break;
    default: {
      const s = PEOPLE[e.type!];
      spr = e.type === 'fan' || (e.type === 'admin' && e.st === 1) ? (e.st === 1 ? s.throw : s.walk2) : f2 ? s.walk1 : s.walk2;
      if (e.stun) spr = s.walk2;
    }
  }
  const ex = x + Math.floor(e.w / 2) - Math.floor((spr?.w ?? 0) / 2), ey = y + e.h - (spr?.h ?? 0);
  blit(fb, spr, ex, ey, flip, -1, dying);
  if (e.type === 'fan') {
    // Silly hat: a tall striped tammy
    for (let j = 0; j < 5; j++) rect(fb, ex + 3 + (j === 0 ? 2 : 0), ey - 4 + j, j === 0 ? 2 : 6, 1, j % 2 ? WH : BLUE);
    px(fb, ex + 5, ey - 5, RED);
  }
  if (e.type === 'admin' || e.type === 'creditor') blit(fb, THING_SPR.paper, flip ? ex - 4 : ex + 8, ey + 11);
  if (e.data?.pie) blit(fb, THING_SPR.iconPie, x + 3, y + 8);
  if (e.stun && !dying) drawStars(fb, x + e.w / 2, y - 3, tick);
}

function drawStars(fb: FB, cx: number, cy: number, tick: number) {
  for (let i = 0; i < 3; i++) {
    const a = tick * 0.2 + (i * Math.PI * 2) / 3;
    px(fb, cx + Math.round(Math.cos(a) * 6), cy + Math.round(Math.sin(a) * 2), i === 1 ? WH : GOLDL);
  }
}

function drawBoss(fb: FB, w: World, e: Ent, x: number, y: number, tick: number) {
  switch (e.type) {
    case 'tam': {
      const hit = e.st === 2 && tick % 4 < 2;
      blit(fb, Math.floor(tick / (e.st === 1 ? 2 : 6)) % 2 ? CREATURE_SPR.tam1 : CREATURE_SPR.tam2, x + (e.st === 1 ? (tick % 4 < 2 ? 1 : -1) : 0), y, e.dir > 0, hit ? WH : -1);
      return;
    }
    case 'motm': {
      const round = (e.data!.round as number) ?? 1;
      if (e.st === 9) return;
      const s = PEOPLE['motm' + round];
      const spr = round === 3 && e.st === 0 ? s.sulk : e.st === 1 && round === 1 ? s.throw : Math.floor(e.t / 8) % 2 ? s.walk1 : s.walk2;
      blit(fb, spr, x, y + e.h - 24, e.dir < 0, e.stun && tick % 4 < 2 ? WH : -1);
      if (round === 2 && e.data!.shield) {
        const sx = e.dir > 0 ? x + e.w : x - 6;
        rect(fb, sx, y + 6, 6, 12, K); rect(fb, sx + 1, y + 7, 4, 10, WH);
        for (let j = 9; j < 16; j += 2) rect(fb, sx + 2, y + j, 2, 1, GR);
        px(fb, sx + 2, y + 8, RED);
      }
      return;
    }
    case 'admin': {
      const s = PEOPLE.administrator;
      blit(fb, e.st === 1 ? s.throw : Math.floor(e.t / 10) % 2 ? s.walk1 : s.walk2, x, y + e.h - 24, e.dir < 0, e.stun && tick % 4 < 2 ? WH : -1);
      if (e.data!.clip) blit(fb, THING_SPR.clipboard, e.st === 1 ? x + 2 : e.dir > 0 ? x + 9 : x - 5, e.st === 1 ? y - 10 : y + 9);
      else { blit(fb, THING_SPR.clipboard, Math.round(e.data!.clipX as number), (e.data!.floor as number) - 10); if (tick % 20 < 10) textC(fb, '?', PLAY_X + ox + x + 6, PLAY_Y + oy + y - 9, WH, K); }
      return;
    }
    case 'dougie': {
      const s = PEOPLE.dougie;
      blit(fb, Math.floor(tick / 30) % 2 ? s.throw : s.walk2, x, y + e.h - 24, false);
      return;
    }
    case 'lada': {
      blit(fb, CREATURE_SPR.lada, x, y + (e.st === 0 && tick % 6 < 3 ? 1 : 0));
      if (e.st === 0 && tick % 4 < 2) px(fb, x - 1, y + 10, GR);
      return;
    }
  }
}

function drawPart(fb: FB, w: World, e: Ent, x: number, y: number, tick: number) {
  switch (e.data!.role) {
    case 'valve': blit(fb, THING_SPR.valve, x, y + (e.n > 0 ? 1 : 0)); if (e.n === 0 && tick % 40 < 20) px(fb, x + 4, y - 2, BLUE); return;
    case 'bog':
      rect(fb, x, y, e.w, e.h + 1, BRND);
      for (let i = 0; i < e.w; i += 5) px(fb, x + i + (tick >> 3) % 3, y, i % 2 ? BLUE : BRN);
      return;
    case 'vault': {
      const hp = e.hp ?? 2;
      rect(fb, x, y, e.w, e.h, K); rect(fb, x + 1, y + 1, e.w - 2, e.h - 2, GR); rect(fb, x + 2, y + 2, e.w - 4, e.h - 4, DG);
      for (let j = 4; j < e.h; j += 8) { px(fb, x + 3, y + j, WH); px(fb, x + e.w - 4, y + j, WH); }
      fb.circle(PLAY_X + ox + x + 16, PLAY_Y + oy + y + 22, 7, GR); fb.circle(PLAY_X + ox + x + 16, PLAY_Y + oy + y + 22, 5, DG);
      rect(fb, x + 15, y + 15, 2, 14, GR); rect(fb, x + 9, y + 21, 14, 2, GR);
      if (hp < 2) { for (let i = 0; i < 10; i++) px(fb, x + 6 + i, y + 6 + ((i * 7) % 9), K); }
      textC(fb, 'VAULT', PLAY_X + ox + x + 16, PLAY_Y + oy + y + 36, GOLD, K);
      return;
    }
    case 'bus': drawBus(fb, w, e, x, y, tick); return;
    case 'def': {
      const s = PEOPLE.defender;
      blit(fb, e.data!.air ? s.throw : Math.floor(tick / 8) % 2 ? s.walk1 : s.walk2, x - 1, y + e.h - 24, e.dir < 0);
      return;
    }
    case 'cup': blit(fb, THING_SPR.cup, x, y); if (tick % 30 < 4) px(fb, x + 4, y + 2, WH); return;
    case 'brake': blit(fb, THING_SPR.brake, x, y); if (tick % 20 < 10) px(fb, x + 3, y - 3, GOLDL); return;
    case 'grab': {
      blit(fb, CREATURE_SPR.lada, x, y, e.vx > 0 && e.st === 0 ? false : e.st === 0);
      if (e.st === 1) blit(fb, THING_SPR.cup, x + 12, y - 18);
      return;
    }
  }
}

function drawBus(fb: FB, w: World, e: Ent, x: number, y: number, tick: number) {
  const b = w.ents.find((o) => o.k === 'boss' && o.type === 'dougie');
  const phase = (b?.data!.phase as number) ?? 0;
  // Body
  rect(fb, x, y, e.w, e.h - 6, K);
  rect(fb, x + 1, y + 1, e.w - 2, e.h - 8, BRN);
  rect(fb, x + 1, y + 1, e.w - 2, 2, GOLD);
  rect(fb, x + 1, y + e.h - 16, e.w - 2, 2, GOLD);
  // Windows
  for (let i = 0; i < 6; i++) {
    const wx = x + 4 + i * 15;
    rect(fb, wx, y + 5, 12, 10, K); rect(fb, wx + 1, y + 6, 10, 8, phase >= 1 ? 26 : BLUE);
    if (phase >= 1) blit(fb, PEOPLE.defender.walk2, wx, y + 3);
    else px(fb, wx + 2, y + 7, WH);
  }
  text(fb, "DOUGIE'S BUS", PLAY_X + ox + x + 12, PLAY_Y + oy + y + 18, WH, K);
  if (b && phase === 0) for (let i = 0; i < 3 - (b.hp ?? 0); i++) rect(fb, x + 10 + i * 26, y + 26, 5, 3, BRND);
  // Wheels
  for (const wx of [x + 14, x + e.w - 20]) {
    fb.circle(PLAY_X + ox + wx, PLAY_Y + oy + y + e.h - 5, 5, K);
    fb.circle(PLAY_X + ox + wx, PLAY_Y + oy + y + e.h - 5, 3, DG);
    px(fb, wx + (phase === 3 ? ((tick >> 2) % 2 ? 1 : -1) : 0), y + e.h - 5, GR);
  }
}

function drawFx(fb: FB, w: World, e: Ent, x: number, y: number, tick: number) {
  switch (e.type) {
    case 'puff': { const r = Math.max(1, Math.floor(e.t / 3)); fb.circle(PLAY_X + ox + x + 4, PLAY_Y + oy + y + 4, r, GR); return; }
    case 'blast': {
      const t = 1 - e.t / T.blastFrames, r = Math.round(e.w / 2);
      const cx = PLAY_X + ox + x + r, cy = PLAY_Y + oy + y + r;
      fb.circle(cx, cy, Math.round(r * (0.4 + t * 0.6)), t < 0.5 ? GOLDL : RED);
      fb.circle(cx, cy, Math.round(r * (0.2 + t * 0.5)), t < 0.5 ? WH : GOLD);
      if (t > 0.6) fb.circle(cx, cy, Math.round(r * (t - 0.4)), BRND);
      for (let i = 0; i < 8; i++) { const a = i * 0.785 + e.id; fb.pset(cx + Math.cos(a) * r * t * 1.2, cy + Math.sin(a) * r * t * 1.2, BRN); }
      return;
    }
    case 'debris': case 'rubble': rect(fb, x, y, e.type === 'debris' ? 4 : 3, 3, 18); px(fb, x, y, 19); return;
    case 'dust': px(fb, x, y, GR); return;
    case 'leather': rect(fb, x, y, 4, 3, BRN); px(fb, x, y, BRND); return;
    case 'mud': rect(fb, x, y, 2, 2, BRND); return;
    case 'water': px(fb, x, y, tick % 2 ? WH : BLUE); return;
    case 'smoke': fb.circle(PLAY_X + ox + x, PLAY_Y + oy + y, 2 + Math.floor((40 - e.t) / 12), GR); return;
    case 'paper': rect(fb, x, y, 3, 3, WH); return;
    case 'clipboard': blit(fb, THING_SPR.clipboard, x, y); return;
    case 'confetti': px(fb, x, y, [GOLD, RED, WH, BLUE, VIS][e.id % 5]); px(fb, x + 1, y, [GOLD, RED, WH, BLUE, VIS][e.id % 5]); return;
    case 'score': text(fb, e.text ?? '', PLAY_X + ox + x, PLAY_Y + oy + y, WH, K); return;
  }
}

function drawDebug(fb: FB, w: World) {
  const b = pBox(w);
  fb.frame(PLAY_X + b.x, PLAY_Y + b.y, b.w, b.h, VIS);
  for (const e of w.ents) {
    fb.frame(PLAY_X + e.x, PLAY_Y + e.y, Math.max(1, e.w), Math.max(1, e.h), RED);
    const d = e.data;
    if (d && d.tx0 !== undefined) fb.frame(PLAY_X + (d.tx0 as number) * TS, PLAY_Y + (d.ty0 as number) * TS, ((d.tx1 as number) - (d.tx0 as number) + 1) * TS, ((d.ty1 as number) - (d.ty0 as number) + 1) * TS, GOLD);
    if (e.k === 'crusher') { const r = crusherRect(e); fb.frame(PLAY_X + r.x, PLAY_Y + r.y, Math.max(1, r.w), Math.max(1, r.h), WH); }
  }
  if (w.p.st === 'scarf') { const r = scarfRect(w); fb.frame(PLAY_X + r.x, PLAY_Y + r.y, r.w, r.h, WH); }
}

// ---------------------------------------------------------------- Status strip
export function drawHud(fb: FB, w: World, tick: number) {
  fb.rect(0, 0, 320, 24, K);
  // Borders either side of the play area, as on Rick's Amiga screen
  fb.rect(0, PLAY_Y, PLAY_X, PH, K); fb.rect(PLAY_X + PW, PLAY_Y, 320 - PLAY_X - PW, PH, K);
  fb.rect(PLAY_X - 2, PLAY_Y - 1, 1, PH + 1, GOLDD); fb.rect(PLAY_X + PW + 1, PLAY_Y - 1, 1, PH + 1, GOLDD);
  fb.rect(PLAY_X - 2, PLAY_Y - 2, PW + 4, 1, GOLDD);
  fb.blit(THING_SPR.iconHead, 34, 3);
  text(fb, String(Math.max(0, w.lives)), 44, 4, WH);
  fb.blit(THING_SPR.iconBall, 64, 3);
  text(fb, w.infinite ? '*' : String(w.balls), 74, 4, w.balls ? WH : RED);
  fb.blit(THING_SPR.iconPie, 94, 3);
  text(fb, w.infinite ? '*' : String(w.pies), 104, 4, w.pies ? WH : RED);
  if (w.mode === '1989') text(fb, '1989', 128, 4, GOLDD);
  const sc = String(w.score).padStart(7, '0');
  text(fb, sc, 286 - textW(sc), 4, GOLDL);
  const def = screenDef(w.screen);
  textC(fb, def.name, 160, 14, GOLD, K);
  // Message box
  if (w.msgT > 0 && w.state !== 'dying') {
    const lines = wrap(w.msg, 40);
    const bh = lines.length * 9 + 4;
    const by = PLAY_Y + PH - bh - 2;
    fb.rect(PLAY_X + 4, by, PW - 8, bh, K);
    lines.forEach((l, i) => textC(fb, l, 160, by + 3 + i * 9, WH, DG));
  }
  if (w.state === 'dying' && w.stateT > 10) drawDeathLine(fb, w.deathLine);
}

export function drawDeathLine(fb: FB, line: string) {
  const lines = wrap(line, 34);
  const bw = Math.max(...lines.map((l) => textW(l))) + 16, bh = lines.length * 10 + 12;
  const bx = 160 - Math.floor(bw / 2), by = PLAY_Y + 60 - Math.floor(bh / 2);
  fb.rect(bx, by, bw, bh, K);
  fb.frame(bx + 1, by + 1, bw - 2, bh - 2, GOLD);
  fb.frame(bx + 3, by + 3, bw - 6, bh - 6, GOLDD);
  lines.forEach((l, i) => textC(fb, l, 160, by + 7 + i * 10, WH, DG));
}
