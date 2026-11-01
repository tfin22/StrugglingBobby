// Entities: pickups, projectiles, traps, enemies. All deterministic.
import { World, Ent, Pursuit } from './types';
import { EntDef } from '../content/zones/types';
import { T } from './tuning';
import { TS, PW, PH, COLS } from './consts';
import { TRAP_TYPES } from '../content/traps';
import { ENEMY_TYPES } from '../content/enemies';
import { PICKUPS, POINTS_PICKUPS } from '../content/pickups';
import { SCORE } from '../content/scoring';
import { tileId } from '../content/tiles';
import { solidPx, supportAt, overlap, boxSolid } from './collide';
import { newEnt, sfx, fx, say, kill, march, pBox, addScore, blastTiles, updateCrumble } from './world';
import { rngNext, rngInt } from '../engine/rng';
import { spawnBoss, updateBoss, bossBall, bossPie, bossScarf, updHubcap } from './bosses';
import { screenDef } from '../content/zones';

export function spawnFromDef(w: World, d: EntDef, key: string): Ent | null {
  const px = d.x * TS, py = d.y * TS;
  if (PICKUPS[d.t]) {
    const pt = PICKUPS[d.t];
    return newEnt(w, 'pickup', px + (TS - pt.w) / 2, py + TS - pt.h, pt.w, pt.h, { type: d.t, name: key, data: { trap: !!d.trap } });
  }
  if (ENEMY_TYPES[d.t]) {
    const et = ENEMY_TYPES[d.t];
    const flying = et.ai === 'gull' || et.ai === 'flier';
    return newEnt(w, 'enemy', px + 8 - et.w / 2, flying ? py + 3 : py + TS - et.h, et.w, et.h, {
      type: d.t, x0: (d.x0 ?? d.x) * TS, x1: (d.x1 ?? d.x) * TS + TS, y0: flying ? py + 3 : py + TS - et.h,
      dir: d.dir ?? -1, t: rngInt(w, 60), name: d.name,
    });
  }
  switch (d.t) {
    case 'sign': return newEnt(w, 'sign', px, py + 2, (d.text ?? '').length * 6 + 6, 11, { text: d.text });
    case 'npc': return newEnt(w, 'npc', px + 2, py + TS - 24, 12, 24, { type: d.type, text: d.text, dir: d.dir ?? -1 });
    case 'exit': return newEnt(w, 'exit', px, py - TS, TS, TS * 2, { text: d.text });
    case 'switch': return newEnt(w, 'switch', px + 4, py + 2, 8, 12, { link: d.link, name: d.name, on: false });
    case 'gate': {
      const e = newEnt(w, 'gate', px, py, TS, (d.len ?? 2) * TS, { name: d.name, on: d.closed ?? true });
      setGate(w, e, e.on!);
      return e;
    }
    case 'boss': return spawnBoss(w, d);
    case 'trap': return spawnTrap(w, d);
  }
  return null;
}

function spawnTrap(w: World, d: EntDef): Ent | null {
  const tt = TRAP_TYPES[d.type!];
  if (!tt) throw new Error('Unknown trap ' + d.type);
  const px = d.x * TS, py = d.y * TS;
  const base = { type: d.type, name: d.name, link: d.link, dir: d.dir ?? 1, on: true };
  switch (tt.kind) {
    case 'gball': {
      const trig = d.trig ?? null;
      return newEnt(w, 'gball', px + 8 - 15, py + TS - 30, 30, 30, { ...base, data: trig ? { tx0: trig[0], ty0: trig[1], tx1: trig[2], ty1: trig[3] } : { delay: d.delay ?? 30 } });
    }
    case 'drop': {
      const trig = d.trig ?? [d.x - 1, d.y, d.x + 1, 10];
      return newEnt(w, 'drop', px + (TS - tt.w!) / 2, py, tt.w!, tt.h!, { ...base, data: { tx0: trig[0], ty0: trig[1], tx1: trig[2], ty1: trig[3] } });
    }
    case 'studs':
      return newEnt(w, 'studs', px, py + TS - 9, (d.len ?? 1) * TS, 9, { ...base, data: { period: d.period ?? tt.period ?? 0, on: d.on ?? tt.on ?? 50, phase: d.phase ?? 0 } });
    case 'dart': {
      const trig = d.trig;
      return newEnt(w, 'dart', px, py, TS, TS, { ...base, data: trig ? { tx0: trig[0], ty0: trig[1], tx1: trig[2], ty1: trig[3], period: 0 } : { period: d.period ?? 100, phase: d.phase ?? 0 } });
    }
    case 'crusher': {
      const horiz = d.type === 'turnstile' || d.type === 'revolver';
      const len = (d.len ?? 3) * TS;
      return newEnt(w, 'crusher', px, py, horiz ? TS : TS, horiz ? TS : TS, {
        ...base, data: { horiz, len, period: d.period ?? tt.period!, hold: d.on ?? tt.on!, phase: d.phase ?? 0, trig: !!d.trig, ...(d.trig ? { tx0: d.trig[0], ty0: d.trig[1], tx1: d.trig[2], ty1: d.trig[3] } : {}) },
      });
    }
    case 'jet': {
      const len = (d.len ?? 3) * TS;
      return newEnt(w, 'jet', px + 4, py + TS - len, 8, len, { ...base, data: { period: d.period ?? tt.period!, hold: d.on ?? tt.on!, phase: d.phase ?? 0 } });
    }
    case 'patrol': {
      const fly = d.type === 'tvcam';
      return newEnt(w, 'patrol', px + 8 - tt.w! / 2, fly ? py + 2 : py + TS - tt.h!, tt.w!, tt.h!, { ...base, x0: (d.x0 ?? d.x) * TS, x1: (d.x1 ?? d.x) * TS + TS, dir: d.dir ?? 1 });
    }
    case 'camera': {
      const trig = d.trig ?? (d.dir === -1 ? [d.x - 6, d.y, d.x - 1, d.y + 3] : [d.x + 1, d.y, d.x + 6, d.y + 3]);
      return newEnt(w, 'cam', px + 1, py + 2, 14, 10, { ...base, dir: d.dir ?? 1, data: { tx0: trig[0], ty0: trig[1], tx1: trig[2], ty1: trig[3], doorX: d.x0 ?? -1, doorY: d.y0 ?? 9 } });
    }
    case 'tripwire':
      return newEnt(w, 'trip', px, py + TS - 5, TS, 5, { ...base });
    case 'crumble':
      return null; // tile traps live in the map ('X' and 'Z')
  }
  return null;
}

function setGate(w: World, e: Ent, closed: boolean) {
  const tx = Math.floor(e.x / TS), ty0 = Math.floor(e.y / TS), n = e.h / TS;
  for (let i = 0; i < n; i++) w.tiles[(ty0 + i) * COLS + tx] = closed ? tileId('G') : 0;
}

export function spawnPursuit(w: World, pur: Pursuit) {
  // The ball rolls in from the edge Bobby came through, on his floor.
  const x = pur.dir > 0 ? -30 : PW;
  const col = pur.dir > 0 ? 4 : PW - 4;
  let fy = Math.ceil(w.p.y / TS) * TS;
  for (let y = fy; y <= PH; y += TS) if (supportAt(w, col - 2, col + 2, y)) { fy = y; break; }
  newEnt(w, 'gball', x, fy - 30, 30, 30, { type: pur.type, dir: pur.dir, st: 4, t: pur.delay, data: {} });
}

// Dynamic platforms (inflatables, boss platforms). If prevY is given this is a
// landing test for a falling Bobby and snaps him onto the top.
export function entSupport(w: World, x0: number, x1: number, y: number, prevY?: number): boolean {
  for (const e of w.ents) {
    if (e.dead || !(e.k === 'inflatable' || e.data?.plat)) continue;
    if (x1 <= e.x + 1 || x0 >= e.x + e.w - 1) continue;
    if (prevY === undefined) { if (Math.abs(y - e.y) < 0.6) return true; }
    else if (prevY <= e.y + 0.5 && y >= e.y) { w.p.y = e.y; return true; }
  }
  return false;
}

function inTrig(w: World, e: Ent): boolean {
  const d = e.data!;
  const p = w.p;
  return p.x >= (d.tx0 as number) * TS && p.x < ((d.tx1 as number) + 1) * TS && p.y > (d.ty0 as number) * TS && p.y <= ((d.ty1 as number) + 1) * TS;
}

// Fire everything a tripwire or switch is linked to.
export function fireLinks(w: World, names: string[] | undefined, toggle = false) {
  if (!names) return;
  for (const e of w.ents) {
    if (e.dead || !e.name || !names.includes(e.name)) continue;
    triggerEnt(w, e, toggle);
  }
}

function triggerEnt(w: World, e: Ent, toggle: boolean) {
  switch (e.k) {
    case 'drop': if (e.st === 0) { e.st = 1; e.t = 0; sfx(w, 'creak'); } break;
    case 'gball': if (e.st === 0) { e.st = 1; e.t = 0; sfx(w, 'rumble'); fx(w, 'hap', 'rumble'); } break;
    case 'dart': if (e.st === 0) { e.st = 1; e.t = 0; } break;
    case 'studs': if (e.st === 0) { e.st = 1; e.t = 0; } break;
    case 'gate': e.on = !e.on; setGate(w, e, e.on); sfx(w, 'gate'); break;
    case 'crusher': case 'jet': case 'patrol': case 'cam':
      if (toggle) { e.on = !e.on; sfx(w, 'click'); } else if (e.data?.trig) { e.data.armed = true; }
      break;
  }
}

export function hitEnemy(w: World, e: Ent, by: 'ball' | 'pie' | 'drop') {
  const et = ENEMY_TYPES[e.type!];
  if (e.st === 99) return;
  if (by === 'drop' || et.killBy.includes(by as 'ball')) {
    e.st = 99; e.vy = -3; e.vx = e.dir * -0.5; e.stun = 0;
    addScore(w, et.points);
    sfx(w, e.type === 'gull' ? 'squawk' : 'oof');
  } else {
    e.stun = 60; sfx(w, e.type === 'cat' ? 'hiss' : 'stun');
  }
}

function scarfHitImpl(w: World, e: Ent) {
  switch (e.k) {
    case 'enemy': {
      const et = ENEMY_TYPES[e.type!];
      if (e.st === 99) return;
      if (e.type === 'gull') { e.st = 2; e.vy = -1.6; e.vx = e.dir * 1.2; sfx(w, 'squawk'); return; }
      if (et.stun && !e.stun) { e.stun = T.stunFrames; sfx(w, 'stun'); }
      return;
    }
    case 'pie': e.dead = true; w.pies = Math.min(T.maxPies, w.pies + 1); sfx(w, 'snuff'); say(w, 'PIE SAVED FOR LATER.', 60); return;
    case 'drop': if (e.st === 0) { e.st = 1; e.t = 0; sfx(w, 'creak'); } return;
    case 'switch': e.on = !e.on; sfx(w, 'lever'); fireLinks(w, e.link, true); return;
    case 'trip': if (e.st === 0) { e.st = 1; sfx(w, 'twang'); fireLinks(w, e.link); } return;
    case 'cam': if (e.on) { e.on = false; sfx(w, 'smash'); addScore(w, 100); } return;
    case 'inflatable': e.dead = true; sfx(w, 'pop'); return;
    case 'boss': case 'bosspart': bossScarf(w, e); return;
  }
}
// The scarf's hit is a fixed rectangle on its crack frames. Each thing is hit once per flick.
export function scarfSweep(w: World, r: { x: number; y: number; w: number; h: number }, first: boolean) {
  for (const e of w.ents.slice()) {
    if (e.dead || !overlap(r.x, r.y, r.w, r.h, e.x, e.y, e.w, e.h)) continue;
    if (e.data?.scarfed === w.p.anim - (w.p.t - T.scarfHitFrom)) continue;
    e.data = { ...(e.data ?? {}), scarfed: w.p.anim - (w.p.t - T.scarfHitFrom) };
    scarfHitImpl(w, e);
  }
  void first;
}

function explode(w: World, cx: number, cy: number) {
  const r = T.pieRadius;
  newEnt(w, 'fx', cx - r, cy - r, r * 2, r * 2, { type: 'blast', t: T.blastFrames });
  sfx(w, 'boom'); fx(w, 'hap', 'boom'); w.shake = 10;
  blastTiles(w, cx, cy, r);
  for (const e of w.ents) {
    if (e.dead) continue;
    const ex = Math.max(e.x, Math.min(cx, e.x + e.w)), ey = Math.max(e.y, Math.min(cy, e.y + e.h));
    const dd = (ex - cx) ** 2 + (ey - cy) ** 2;
    if (e.k === 'enemy' && dd < r * r) hitEnemy(w, e, 'pie');
    else if (e.k === 'drop' && e.st === 0 && dd < (r * 1.6) ** 2) { e.st = 1; e.t = T.dropShake; }
    else if (e.k === 'pie' && e !== undefined && dd < r * r && e.t > 4) e.t = 4; // chain reaction
    else if (e.k === 'inflatable' && dd < r * r) e.dead = true;
    else if (e.k === 'cam' && dd < r * r) e.on = false;
  }
  bossPie(w, cx, cy, r);
  // Too close?
  const b = pBox(w);
  const bx = Math.max(b.x, Math.min(cx, b.x + b.w)), by = Math.max(b.y, Math.min(cy, b.y + b.h));
  if ((bx - cx) ** 2 + (by - cy) ** 2 < (r - 4) ** 2) kill(w, 'pie');
}

export function updateEnts(w: World, frozen: boolean) {
  const pb = pBox(w);
  const play = w.state === 'play' && !frozen;
  const list = w.ents.slice();
  for (const e of list) {
    if (e.dead) continue;
    switch (e.k) {
      case 'pickup': if (play && overlap(pb.x, pb.y, pb.w, pb.h, e.x, e.y, e.w, e.h)) collect(w, e); break;
      case 'npc':
        if (play && Math.abs(w.p.x - (e.x + 6)) < 30 && Math.abs(w.p.y - (e.y + 24)) < 20 && e.st === 0) { e.st = 1; say(w, e.text ?? '', 150); }
        break;
      case 'exit':
        if (play && overlap(pb.x, pb.y, pb.w, pb.h, e.x + 4, e.y, e.w - 8, e.h) && !w.ents.some((b) => b.k === 'boss' && !b.dead)) {
          w.state = 'zoneDone'; w.stateT = 0; addScore(w, SCORE.zoneBonus); sfx(w, 'roar');
        }
        break;
      case 'ball': updBall(w, e); break;
      case 'pie': updPie(w, e); break;
      case 'fx': e.t--; e.x += e.vx; e.y += e.vy; if (e.type === 'rubble' || e.type === 'debris') e.vy += 0.2; if (e.t <= 0) e.dead = true; break;
      case 'gball': updGBall(w, e, play, pb); break;
      case 'drop': updDrop(w, e, play, pb); break;
      case 'studs': updStuds(w, e, play, pb); break;
      case 'dart': updDart(w, e, play); break;
      case 'dartp': updDartP(w, e, play, pb); break;
      case 'crusher': updCrusher(w, e, play, pb); break;
      case 'jet': updJet(w, e, play, pb); break;
      case 'patrol': updPatrol(w, e, play, pb); break;
      case 'cam': updCam(w, e, play); break;
      case 'trip':
        if (play && e.st === 0 && w.p.st !== 'jump' && w.p.st !== 'fall' && overlap(pb.x, pb.y, pb.w, pb.h, e.x + 3, e.y, e.w - 6, e.h)) {
          e.st = 1; sfx(w, 'twang'); fireLinks(w, e.link);
        }
        break;
      case 'enemy': updEnemy(w, e, play, pb); break;
      case 'paper': case 'board': updMissile(w, e, play, pb); break;
      case 'clear': case 'hubcap': updHubcap(w, e, play, pb); break;
      case 'inflatable': updInflatable(w, e); break;
      case 'boss': case 'bosspart': updateBoss(w, e, play, pb); break;
    }
  }
  w.ents = w.ents.filter((e) => !e.dead);
  updateCrumble(w);
}

function collect(w: World, e: Ent) {
  const pt = PICKUPS[e.type!];
  e.dead = true;
  if (e.data?.trap) {
    // Today's special: the stall's pie is already lit.
    newEnt(w, 'pie', w.p.x - 5, w.p.y - 8, 10, 8, { t: 60 });
    sfx(w, 'fizz'); say(w, "TODAY'S SPECIAL! IT'S LIT! RUN!", 80);
    return;
  }
  if (pt.balls) w.balls = Math.min(T.maxBalls, w.balls + pt.balls);
  if (pt.pies) w.pies = Math.min(T.maxPies, w.pies + pt.pies);
  if (pt.lives) { w.lives = Math.min(T.maxLives, w.lives + pt.lives); sfx(w, 'life'); }
  else sfx(w, 'pickup');
  addScore(w, pt.points);
  if (POINTS_PICKUPS.includes(e.type!)) w.collected.push(e.name!);
  if (e.type === 'programme') w.stats.programmes++;
  say(w, pt.msg, 80);
  newEnt(w, 'fx', e.x, e.y - 8, 20, 8, { type: 'score', t: 40, vy: -0.5, text: String(pt.points) });
}

function updBall(w: World, e: Ent) {
  e.t++;
  let rem = Math.abs(e.vx);
  const s = Math.sign(e.vx);
  while (rem > 0 && !e.dead) {
    const st = Math.min(1, rem);
    const nx = e.x + s * st;
    const fx0 = s > 0 ? nx + e.w : nx;
    if (solidPx(w, fx0, e.y + e.h / 2)) {
      if (e.n < T.ballBounces) { e.vx = -e.vx; e.n++; sfx(w, 'bounce'); break; }
      e.dead = true; newEnt(w, 'fx', e.x, e.y, 8, 8, { type: 'puff', t: 12 }); sfx(w, 'thud'); break;
    }
    e.x = nx; rem -= st;
  }
  e.n2 = (e.n2 ?? 0);
  if (e.t > T.ballLife || e.x < -10 || e.x > PW + 10) e.dead = true;
  if (e.dead) return;
  for (const o of w.ents) {
    if (o.dead || o === e) continue;
    if (!overlap(e.x, e.y, e.w, e.h, o.x, o.y, o.w, o.h)) continue;
    if (o.k === 'enemy' && o.st !== 99 && !(o.type === 'gull' && o.st === 0 && o.y + o.h < e.y)) { hitEnemy(w, o, 'ball'); e.dead = true; return; }
    if (o.k === 'drop' && o.st === 0) { o.st = 1; o.t = 0; sfx(w, 'creak'); e.dead = true; return; }
    if (o.k === 'inflatable') { o.dead = true; sfx(w, 'pop'); e.dead = true; return; }
    if ((o.k === 'boss' || o.k === 'bosspart') && bossBall(w, o, e)) { e.dead = true; return; }
  }
}

declare module './types' { interface Ent { n2?: number } }

function updPie(w: World, e: Ent) {
  // Pies drop off ledges
  if (!supportAt(w, e.x + 2, e.x + e.w - 2, Math.round(e.y + e.h)) || (e.y + e.h) % TS !== 0) {
    e.vy = Math.min(e.vy + T.gravity, 5);
    const ny = e.y + e.vy;
    const top = Math.floor((ny + e.h) / TS) * TS;
    if (e.y + e.h <= top && ny + e.h >= top && supportAt(w, e.x + 2, e.x + e.w - 2, top)) { e.y = top - e.h; e.vy = 0; }
    else e.y = ny;
    if (e.y > PH + 20) { e.dead = true; return; }
  }
  e.t--;
  if (e.t % 25 === 0) sfx(w, 'fizz');
  if (e.t <= 0) { e.dead = true; explode(w, e.x + e.w / 2, e.y + e.h / 2); }
}

function rectHitsP(play: boolean, pb: { x: number; y: number; w: number; h: number }, x: number, y: number, wd: number, h: number) {
  return play && overlap(pb.x, pb.y, pb.w, pb.h, x, y, wd, h);
}

function updGBall(w: World, e: Ent, play: boolean, pb: { x: number; y: number; w: number; h: number }) {
  const tt = TRAP_TYPES[e.type!];
  if (e.st === 0) {
    const d = e.data!;
    if (d.delay !== undefined) { e.t++; if (e.t >= (d.delay as number)) { e.st = 1; e.t = 0; sfx(w, 'rumble'); fx(w, 'hap', 'rumble'); } }
    else if (play && inTrig(w, e)) { e.st = 1; e.t = 0; sfx(w, 'rumble'); fx(w, 'hap', 'rumble'); }
    return;
  }
  if (e.st === 4) { if (--e.t <= 0) { e.st = 2; sfx(w, 'rumble'); } return; }
  if (e.st === 1) {
    e.t++;
    if (e.t % 6 === 0) newEnt(w, 'fx', e.x + rngInt(w, 30), e.y - 30 + rngInt(w, 10), 2, 2, { type: 'dust', t: 30, vy: 1 });
    if (e.t >= tt.warn!) { e.st = 2; e.t = 0; w.shake = 4; }
    return;
  }
  if (e.st === 2) {
    const spd = tt.speed!;
    const front = e.dir > 0 ? e.x + e.w + spd : e.x - spd;
    if (solidPx(w, front, e.y + e.h * 0.5) || solidPx(w, front, e.y + 4)) {
      e.dead = true; w.shake = 12; sfx(w, 'smash'); fx(w, 'hap', 'boom');
      for (let i = 0; i < 6; i++) newEnt(w, 'fx', e.x + 10, e.y + 10, 6, 6, { type: 'leather', t: 50, vx: (i - 2.5) * 0.8, vy: -2 - (i % 3) });
      return;
    }
    e.x += e.dir * spd;
    e.n += spd; // rotation
    if (e.t++ % 20 === 0) sfx(w, 'rumble');
    // gravity
    const bottom = e.y + e.h;
    if (!supportAt(w, e.x + 10, e.x + e.w - 10, Math.round(bottom)) || bottom % TS !== 0) {
      e.vy = Math.min(e.vy + 0.3, 6);
      const ny = e.y + e.vy, top = Math.floor((ny + e.h) / TS) * TS;
      if (bottom <= top && ny + e.h >= top && supportAt(w, e.x + 10, e.x + e.w - 10, top)) { e.y = top - e.h; if (e.vy > 2) { w.shake = 4; sfx(w, 'thud'); } e.vy = 0; }
      else e.y = ny;
    }
    if (e.x > PW + 4 || e.x + e.w < -4 || e.y > PH + 10) e.dead = true;
    // crush
    const cx = e.x + 15, cy = e.y + 15;
    const bx = Math.max(pb.x, Math.min(cx, pb.x + pb.w)), by = Math.max(pb.y, Math.min(cy, pb.y + pb.h));
    if (play && (bx - cx) ** 2 + (by - cy) ** 2 < 13 * 13) kill(w, 'ball');
    for (const o of w.ents) if (o.k === 'enemy' && !o.dead && o.st !== 99 && overlap(e.x, e.y, e.w, e.h, o.x, o.y, o.w, o.h)) hitEnemy(w, o, 'drop');
  }
}

function updDrop(w: World, e: Ent, play: boolean, pb: { x: number; y: number; w: number; h: number }) {
  const tt = TRAP_TYPES[e.type!];
  if (e.st === 0) { if (play && inTrig(w, e)) { e.st = 1; e.t = 0; sfx(w, 'creak'); } return; }
  if (e.st === 1) { if (++e.t >= tt.warn!) { e.st = 2; sfx(w, 'whoosh'); } return; }
  if (e.st === 3) { if (e.data?.temp && ++e.t > 50) e.dead = true; return; }
  if (e.st === 2) {
    e.vy = Math.min(e.vy + 0.35, 7);
    const ny = e.y + e.vy;
    if (boxSolid(w, e.x + 1, ny + e.h - 1, e.x + e.w - 1, ny + e.h) && e.y + e.h <= Math.floor((ny + e.h) / TS) * TS + 0.01) {
      e.y = Math.floor((ny + e.h) / TS) * TS - e.h; e.st = 3; e.t = 0; sfx(w, 'thud'); w.shake = 4; return;
    }
    e.y = ny;
    if (e.y > PH) { e.dead = true; return; }
    if (rectHitsP(play, pb, e.x + 1, e.y, e.w - 2, e.h)) kill(w, 'crushed');
    for (const o of w.ents) if (o.k === 'enemy' && !o.dead && o.st !== 99 && overlap(e.x, e.y, e.w, e.h, o.x, o.y, o.w, o.h)) hitEnemy(w, o, 'drop');
  }
}

function cyc(e: Ent): number { return (e.t + ((e.data!.phase as number) ?? 0)) % (e.data!.period as number); }

function updStuds(w: World, e: Ent, play: boolean, pb: { x: number; y: number; w: number; h: number }) {
  const tt = TRAP_TYPES[e.type!];
  const per = e.data!.period as number, on = e.data!.on as number;
  let up = false;
  e.t++;
  if (per > 0) {
    const c = cyc(e);
    up = c >= per - on;
    e.st = up ? 2 : c >= per - on - tt.warn! ? 1 : 0;
    if (c === per - on) sfx(w, 'studs');
  } else {
    const floor = e.y + e.h;
    const onIt = play && w.p.y === floor && w.p.x + 4 > e.x && w.p.x - 4 < e.x + e.w;
    if (e.st === 0 && onIt) { e.st = 1; e.n = 0; sfx(w, 'click'); }
    else if (e.st === 1) { if (++e.n >= tt.warn!) { e.st = 2; e.n = 0; sfx(w, 'studs'); } }
    else if (e.st === 2) { if (++e.n >= on) { e.st = 0; } }
    up = e.st === 2;
  }
  if (up && rectHitsP(play, pb, e.x + 1, e.y + 1, e.w - 2, e.h - 1)) kill(w, 'spike');
}

function updDart(w: World, e: Ent, play: boolean) {
  const tt = TRAP_TYPES[e.type!];
  if (!e.on) return;
  const d = e.data!;
  if ((d.period as number) > 0) {
    e.t++;
    const c = cyc(e);
    e.st = c >= (d.period as number) - tt.warn! ? 1 : 0;
    if (c === 0 && e.t > 1) fireDart(w, e);
  } else {
    if (e.st === 0 && play && inTrig(w, e) && !d.armedOut) { e.st = 1; e.n = 0; sfx(w, 'click'); }
    else if (e.st === 1) { if (++e.n >= tt.warn!) { fireDart(w, e); e.st = 2; } }
    else if (e.st === 2) { if (!inTrig(w, e)) e.st = 0; }
  }
}

function fireDart(w: World, e: Ent) {
  const tt = TRAP_TYPES[e.type!];
  const tea = e.type === 'teaUrn';
  newEnt(w, 'dartp', e.dir > 0 ? e.x + 14 : e.x - 6, e.y + 3, tea ? 6 : 8, 3, { vx: e.dir * tt.speed!, type: e.type });
  sfx(w, tea ? 'spit' : 'dart');
}

function updDartP(w: World, e: Ent, play: boolean, pb: { x: number; y: number; w: number; h: number }) {
  e.x += e.vx;
  const front = e.vx > 0 ? e.x + e.w : e.x;
  if (e.x < -10 || e.x > PW + 10) { e.dead = true; return; }
  if (solidPx(w, front, e.y + 1)) { e.dead = true; sfx(w, 'thunk'); newEnt(w, 'fx', front - 2, e.y - 2, 4, 4, { type: 'puff', t: 8 }); return; }
  if (rectHitsP(play, pb, e.x, e.y, e.w, e.h)) kill(w, 'dart');
}

// Crusher cycle: open -> warn -> closing (8f) -> closed (hold) -> opening (16f) -> open
function crusherExt(e: Ent): { ext: number; warn: boolean } {
  const d = e.data!;
  const per = d.period as number, hold = d.hold as number, len = d.len as number;
  const tt = TRAP_TYPES[e.type!];
  const c = cyc(e);
  const closeAt = per - hold - 24; // closing starts
  if (c < closeAt - tt.warn!) return { ext: 0, warn: false };
  if (c < closeAt) return { ext: 0, warn: true };
  if (c < closeAt + 8) return { ext: (len * (c - closeAt + 1)) / 8, warn: false };
  if (c < closeAt + 8 + hold) return { ext: len, warn: false };
  const o = c - (closeAt + 8 + hold);
  return { ext: Math.max(0, len * (1 - (o + 1) / 16)), warn: false };
}

function updCrusher(w: World, e: Ent, play: boolean, pb: { x: number; y: number; w: number; h: number }) {
  const d = e.data!;
  if (!e.on) { e.n = 0; e.st = 0; return; }
  if (d.trig && !d.armed) { if (play && inTrig(w, e)) { d.armed = true; e.t = 0; } else { e.n = 0; return; } }
  e.t++;
  const { ext, warn } = crusherExt(e);
  if (ext > 0 && e.n === 0) sfx(w, d.horiz ? 'swish' : 'crunch');
  if (warn && e.t % 10 === 0) sfx(w, 'click');
  e.n = ext; e.st = warn ? 1 : ext > 0 ? 2 : 0;
  if (ext > 2) {
    const r = crusherRect(e);
    if (rectHitsP(play, pb, r.x, r.y, r.w, r.h)) kill(w, 'crushed');
  }
}

export function crusherRect(e: Ent) {
  if (e.data!.horiz) return e.dir > 0 ? { x: e.x, y: e.y + 2, w: e.n, h: 12 } : { x: e.x + TS - e.n, y: e.y + 2, w: e.n, h: 12 };
  return { x: e.x + 1, y: e.y, w: TS - 2, h: e.n };
}

function updJet(w: World, e: Ent, play: boolean, pb: { x: number; y: number; w: number; h: number }) {
  if (!e.on) { e.st = 0; return; }
  const tt = TRAP_TYPES[e.type!];
  e.t++;
  const d = e.data!;
  const c = cyc(e);
  const per = d.period as number, hold = d.hold as number;
  e.st = c >= per - hold ? 2 : c >= per - hold - tt.warn! ? 1 : 0;
  if (c === per - hold) sfx(w, e.type === 'pyro' ? 'pyro' : 'hiss');
  if (e.st === 2 && rectHitsP(play, pb, e.x, e.y, e.w, e.h)) kill(w, 'any');
}

function updPatrol(w: World, e: Ent, play: boolean, pb: { x: number; y: number; w: number; h: number }) {
  const tt = TRAP_TYPES[e.type!];
  if (!e.on) return;
  e.x += e.dir * tt.speed!;
  e.t++;
  if (e.x < e.x0!) { e.x = e.x0!; e.dir = 1; }
  if (e.x + e.w > e.x1!) { e.x = e.x1! - e.w; e.dir = -1; }
  if (e.t % 16 === 0 && e.type !== 'tvcam') sfx(w, 'engine');
  if (rectHitsP(play, pb, e.x + 2, e.y + 2, e.w - 4, e.h - 2)) kill(w, tt.cause);
}

function updCam(w: World, e: Ent, play: boolean) {
  if (!e.on) return;
  e.n++;
  if (e.t > 0 && e.st === 2) { if (--e.t <= 0) e.st = 0; return; }
  if (play && inTrig(w, e)) {
    e.st = 1; e.t++;
    if (e.t % 8 === 0) sfx(w, 'beep');
    if (e.t >= TRAP_TYPES.cctv.warn!) {
      // Send for a steward, from a door well away from Bobby.
      const d = e.data!;
      const dx = (d.doorX as number) >= 0 ? (d.doorX as number) * TS + 3 : w.p.x < PW / 2 ? PW - 14 : 4;
      const fy = (d.doorY as number) >= 0 ? Math.min(((d.doorY as number) + 1) * TS, PH) : w.p.y;
      if (Math.abs(dx + 5 - w.p.x) >= T.enemyMinSpawnDist && !w.ents.some((o) => o.k === 'enemy' && o.type === 'steward' && o.data?.fromCam)) {
        const st = newEnt(w, 'enemy', dx, fy - 22, 10, 22, { type: 'steward', x0: 0, x1: PW, y0: fy - 22, dir: dx < w.p.x ? 1 : -1, data: { fromCam: true } });
        st.data!.chase = true;
        sfx(w, 'whistle2'); say(w, 'CCTV HAS SENT FOR A STEWARD.', 60);
      }
      e.st = 2; e.t = 250;
    }
  } else if (e.st === 1) { e.st = 0; e.t = 0; }
}

function onFloor(w: World, e: Ent) { return supportAt(w, e.x + 1, e.x + e.w - 1, e.y + e.h); }

function updEnemy(w: World, e: Ent, play: boolean, pb: { x: number; y: number; w: number; h: number }) {
  const et = ENEMY_TYPES[e.type!];
  e.t++;
  if (e.st === 99) {
    e.vy += 0.25; e.y += e.vy; e.x += e.vx;
    if (e.y > PH + 30) e.dead = true;
    return;
  }
  if (e.stun) { e.stun--; return; }
  const p = w.p;
  const towards = p.x < e.x + e.w / 2 ? -1 : 1;
  switch (et.ai) {
    case 'walker': case 'cat': case 'chaser': {
      let spd = et.speed;
      if (et.ai === 'cat') {
        if (e.st === 1) { if (--e.n <= 0) e.st = 0; break; }
        if (rngNext(w) < 0.005) { e.st = 1; e.n = 60; break; }
      }
      if (et.ai === 'chaser' || e.data?.chase) {
        const same = Math.abs(p.y - (e.y + e.h)) < 8;
        if (same && Math.abs(p.x - e.x) < 140) { e.dir = towards; spd = et.speed * 1.7; }
      }
      walk(w, e, spd);
      break;
    }
    case 'thrower': {
      if (et.speed > 0 && e.st === 0) walk(w, e, et.speed);
      if (e.st === 0 && e.t % et.throwEvery! === 0 && Math.abs(p.x - e.x) < 150 && play) { e.st = 1; e.n = 20; e.dir = towards; }
      if (e.st === 1 && --e.n <= 0) {
        e.st = 0;
        if (et.throws === 'paper') newEnt(w, 'paper', e.x + e.w / 2 - 4, e.y + 4, 8, 6, { vx: e.dir * 1.8, vy: -2.2 });
        else newEnt(w, 'inflatable', e.x + e.w / 2 - 8, e.y, 16, 7, { vx: e.dir * 1.3, vy: -3, t: 420 });
        sfx(w, 'throw');
      }
      break;
    }
    case 'hopper': {
      if (onFloor(w, e) && e.vy >= 0) {
        e.vy = 0;
        if (e.t % 30 === 0) { e.vy = -2.6; }
      }
      if (e.vy !== 0 || !onFloor(w, e)) {
        e.vy = Math.min(e.vy + 0.2, 4);
        const ny = e.y + e.vy;
        const top = Math.floor((ny + e.h) / TS) * TS;
        if (e.vy > 0 && e.y + e.h <= top && ny + e.h >= top && supportAt(w, e.x + 1, e.x + e.w - 1, top)) { e.y = top - e.h; e.vy = 0; }
        else e.y = ny;
        e.x += e.dir * et.speed;
        if (e.x < e.x0! || e.x + e.w > e.x1! || solidPx(w, e.dir > 0 ? e.x + e.w : e.x, e.y + e.h / 2)) { e.dir = -e.dir; e.x += e.dir * et.speed * 2; }
      }
      if (e.y > PH) e.dead = true;
      break;
    }
    case 'flier': {
      e.x += e.dir * et.speed;
      if (e.x < e.x0!) { e.x = e.x0!; e.dir = 1; } else if (e.x + e.w > e.x1!) { e.x = e.x1! - e.w; e.dir = -1; }
      e.y = e.y0! + Math.round(Math.sin(e.t * 0.09) * 8);
      break;
    }
    case 'gull': {
      if (e.st === 0) {
        e.x += e.dir * et.speed;
        if (e.x < e.x0!) { e.x = e.x0!; e.dir = 1; } else if (e.x + e.w > e.x1!) { e.x = e.x1! - e.w; e.dir = -1; }
        e.y = e.y0! + Math.round(Math.sin(e.t * 0.1) * 3);
        if (e.n > 0) e.n--;
        if (play && w.pies > 0 && e.n === 0 && Math.abs(p.x - (e.x + 7)) < 40 && p.y > e.y) { e.st = 1; e.vx = 0; sfx(w, 'squawk'); }
      } else if (e.st === 1) {
        const tx = p.x - 7, ty = p.y - 26;
        const dx = tx - e.x, dy = ty - e.y, dd = Math.hypot(dx, dy) || 1;
        e.x += (dx / dd) * 1.7; e.y += (dy / dd) * 1.7; e.dir = dx < 0 ? -1 : 1;
        if (++e.vx > 90) { e.st = 3; }
        if (play && overlap(pb.x - 2, pb.y - 4, pb.w + 4, pb.h, e.x, e.y, e.w, e.h)) {
          if (w.pies > 0) { w.pies--; say(w, "A SEAGULL'S HAD YOUR PIE.", 70); sfx(w, 'squawk'); }
          e.st = 2; e.vy = -1.6; e.vx = e.dir * 1.2; e.data = { ...e.data, pie: true };
        }
      } else if (e.st === 2) {
        e.x += e.vx; e.y += e.vy;
        if (e.y < -20 || e.x < -20 || e.x > PW + 20) e.dead = true;
      } else if (e.st === 3) {
        e.y += (e.y0! - e.y) * 0.08;
        if (Math.abs(e.y - e.y0!) < 1) { e.st = 0; e.n = 150; }
      }
      return; // gulls never hurt
    }
  }
  if (!play) return;
  if (overlap(pb.x + 1, pb.y + 1, pb.w - 2, pb.h - 1, e.x + 2, e.y + 2, e.w - 4, e.h - 2)) {
    if (et.contact === 'kill') kill(w, 'enemy');
    else if (et.contact === 'march') march(w);
  }
}

function walk(w: World, e: Ent, spd: number) {
  const nx = e.x + e.dir * spd;
  const front = e.dir > 0 ? nx + e.w : nx;
  const blocked = solidPx(w, front, e.y + e.h - 4) || solidPx(w, front, e.y + 2);
  const edge = !supportAt(w, front - 1, front + 1, e.y + e.h);
  if (nx < e.x0! || nx + e.w > e.x1! || blocked || edge) { e.dir = -e.dir; return; }
  e.x = nx;
}

function updMissile(w: World, e: Ent, play: boolean, pb: { x: number; y: number; w: number; h: number }) {
  e.vy = Math.min(e.vy + (e.k === 'paper' ? 0.1 : 0.15), 4);
  e.x += e.vx; e.y += e.vy;
  e.t++;
  if (e.x < -16 || e.x > PW + 16 || e.y > PH + 10) { e.dead = true; return; }
  if (e.k !== 'clear' && solidPx(w, e.x + e.w / 2, e.y + e.h / 2)) { e.dead = true; newEnt(w, 'fx', e.x, e.y, 6, 6, { type: 'puff', t: 10 }); return; }
  if (rectHitsP(play, pb, e.x + 1, e.y + 1, e.w - 2, e.h - 2)) kill(w, e.k === 'clear' ? 'boss' : e.k === 'paper' ? 'crushed' : 'enemy');
}

function updInflatable(w: World, e: Ent) {
  e.t--;
  if (e.t <= 0) { e.dead = true; newEnt(w, 'fx', e.x, e.y, 8, 8, { type: 'puff', t: 12 }); return; }
  if (e.vx === 0 && e.vy === 0 && onFloor(w, e)) return;
  e.vy = Math.min(e.vy + 0.15, 4);
  const nx = e.x + e.vx;
  if (solidPx(w, e.vx > 0 ? nx + e.w : nx, e.y + e.h / 2)) e.vx = -e.vx * 0.6; else e.x = nx;
  const ny = e.y + e.vy, top = Math.floor((ny + e.h) / TS) * TS;
  if (e.vy > 0 && e.y + e.h <= top && ny + e.h >= top && supportAt(w, e.x + 2, e.x + e.w - 2, top)) {
    e.y = top - e.h;
    if (e.vy > 1) { e.vy = -e.vy * 0.55; e.vx *= 0.8; sfx(w, 'boing'); } else { e.vy = 0; e.vx = 0; }
  } else e.y = ny;
  if (e.y > PH + 10) e.dead = true;
}

export { screenDef };
