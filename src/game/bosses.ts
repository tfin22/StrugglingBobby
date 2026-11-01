// The bosses: patterns and the three tools, never damage sponges.
//  Big Tam            - scarf a sprinkler valve to bog the roller, then pie it while it's stuck.
//  Manager of the Month - three managers in turn, two balls each, each with a trick.
//  The Administrator  - scarf his clipboard away, then pie the strongroom door.
//  "Bring Yer Dinner" Dougie - balls through the gaps, scarf the handbrake, pie the bus.
//  The Baron's Lada   - the finale chase.
import { World, Ent } from './types';
import { EntDef } from '../content/zones/types';
import { TS, PW, PH } from './consts';
import { T } from './tuning';
import { BOSSES } from '../content/bosses';
import { SCORE } from '../content/scoring';
import { newEnt, sfx, fx, say, kill, addScore } from './world';
import { overlap, supportAt, solidPx } from './collide';
import { fireLinks } from './ents';
import { rngInt } from '../engine/rng';

type Box = { x: number; y: number; w: number; h: number };

function boss(w: World): Ent | undefined { return w.ents.find((e) => e.k === 'boss' && !e.dead); }
function parts(w: World, role: string): Ent[] { return w.ents.filter((e) => e.k === 'bosspart' && !e.dead && e.data?.role === role); }

export function spawnBoss(w: World, d: EntDef): Ent | null {
  const px = d.x * TS, floor = (d.y + 1) * TS;
  const x0 = (d.x0 ?? 1) * TS, x1 = ((d.x1 ?? 14) + 1) * TS;
  if (!w.bossBeaten && d.type !== 'valve' && d.type !== 'vault') w.stats.bossAttempts++;
  switch (d.type) {
    case 'tam':
      if (w.bossBeaten) return null;
      return newEnt(w, 'boss', px, floor - 26, 30, 26, { type: 'tam', hp: 3, dir: -1, x0, x1, link: d.link });
    case 'valve':
      return newEnt(w, 'bosspart', px + 4, d.y * TS + 2, 8, 12, { data: { role: 'valve' }, t: 0 });
    case 'motm':
      if (w.bossBeaten) return null;
      say(w, BOSSES.motm.names[0], 140);
      return newEnt(w, 'boss', px, floor - 22, 12, 22, { type: 'motm', hp: 2, dir: -1, x0, x1, link: d.link, data: { shield: false, floor, round: 1 } });
    case 'admin':
      if (w.bossBeaten) return null;
      return newEnt(w, 'boss', px, floor - 22, 12, 22, { type: 'admin', hp: 1, dir: -1, x0, x1, link: d.link, data: { clip: true, pattern: 0, floor } });
    case 'vault':
      return newEnt(w, 'bosspart', px, d.y * TS, 32, 48, { hp: 2, data: { role: 'vault' } });
    case 'dougie': {
      if (w.bossBeaten) return null;
      const b = newEnt(w, 'boss', px, floor - 22, 12, 22, { type: 'dougie', hp: 3, dir: -1, link: d.link, x0, x1, data: { phase: 0, floor } });
      newEnt(w, 'bosspart', 10 * TS, floor - 40, 96, 40, { data: { role: 'bus', floor } });
      newEnt(w, 'bosspart', 6 * TS, floor - 22, 10, 22, { x0: 5 * TS, x1: 10 * TS - 4, dir: 1, data: { role: 'def', speed: 0.7, air: 0 } });
      newEnt(w, 'bosspart', 8 * TS, floor - 22, 10, 22, { x0: 5 * TS, x1: 10 * TS - 4, dir: -1, data: { role: 'def', speed: 0.95, air: 0 } });
      newEnt(w, 'bosspart', 14 * TS, floor - 20, 14, 20, { data: { role: 'cup' } });
      return b;
    }
    case 'lada':
      return newEnt(w, 'boss', px, floor - 18, 36, 18, { type: 'lada', dir: 1, x0, x1, data: { final: !!d.trap, floor } });
  }
  return null;
}

function defeat(w: World, b: Ent, msg: string) {
  b.dead = true;
  w.bossBeaten = true;
  addScore(w, SCORE.bossBonus + (w.stats.bossDeaths === 0 ? SCORE.bossFirstTime : 0));
  sfx(w, 'roar'); sfx(w, 'boom'); fx(w, 'hap', 'boom'); fx(w, 'crowd', 1);
  w.shake = 16;
  say(w, msg, 160);
  fireLinks(w, b.link, true);
  for (let i = 0; i < 10; i++) newEnt(w, 'fx', b.x + b.w / 2, b.y + b.h / 2, 6, 6, { type: 'confetti', t: 70, vx: (i - 4.5) * 0.6, vy: -2 - (i % 4) * 0.5 });
}

function touch(w: World, play: boolean, pb: Box, x: number, y: number, wd: number, h: number) {
  if (play && overlap(pb.x + 1, pb.y + 1, pb.w - 2, pb.h - 1, x, y, wd, h)) kill(w, 'boss');
}

export function updateBoss(w: World, e: Ent, play: boolean, pb: Box) {
  e.t++;
  if (e.k === 'bosspart') return updPart(w, e, play, pb);
  if (play && e.t === 1) fx(w, 'crowd', 1);
  switch (e.type) {
    case 'tam': return updTam(w, e, play, pb);
    case 'motm': return updMotm(w, e, play, pb);
    case 'admin': return updAdmin(w, e, play, pb);
    case 'dougie': return updDougie(w, e, play, pb);
    case 'lada': return updLada(w, e, play, pb);
  }
}

// ---------------------------------------------------------------- Big Tam
function updTam(w: World, e: Ent, play: boolean, pb: Box) {
  const spd = BOSSES.tam.speeds[3 - e.hp!];
  if (e.st === 0) {
    e.x += e.dir * spd;
    if (e.x < e.x0!) { e.x = e.x0!; e.dir = 1; }
    if (e.x + e.w > e.x1!) { e.x = e.x1! - e.w; e.dir = -1; }
    if (e.t % 14 === 0) sfx(w, 'engine');
    const bog = parts(w, 'bog').find((b) => e.x + e.w / 2 > b.x && e.x + e.w / 2 < b.x + b.w);
    if (bog) { e.st = 1; e.n = BOSSES.tam.stuck; bog.dead = true; sfx(w, 'splat'); say(w, "THE ROLLER'S STUCK IN THE BOG!", 80); }
  } else if (e.st === 1) {
    if (e.t % 6 === 0) newEnt(w, 'fx', e.x + (e.dir > 0 ? 0 : e.w - 4), e.y + e.h - 6, 4, 4, { type: 'mud', t: 20, vx: -e.dir * 1.2, vy: -1.5 });
    if (--e.n <= 0) { e.st = 0; say(w, "HE'S OUT. AND HE'S RAGING.", 60); }
  } else if (e.st === 2) {
    e.x -= e.dir * 0.6;
    if (e.x < e.x0!) e.x = e.x0!;
    if (e.x + e.w > e.x1!) e.x = e.x1! - e.w;
    if (--e.n <= 0) e.st = 0;
  }
  touch(w, play, pb, e.x + 2, e.y + 4, e.w - 4, e.h - 4);
}

// ---------------------------------------------------------------- Manager of the Month
function updMotm(w: World, e: Ent, play: boolean, pb: Box) {
  const B = BOSSES.motm;
  const floor = e.data!.floor as number;
  if (e.st === 9) {
    // The revolving door spins: a new manager is appointed.
    if (--e.n <= 0) {
      const r = e.data!.round as number;
      e.st = 0; e.hp = 2; e.x = e.x1! - 20; e.y = floor - 22; e.data!.shield = r === 2; e.n = 0;
      say(w, B.names[r - 1], 120);
    }
    return;
  }
  const round = (e.data!.round as number) ?? 1;
  e.data!.round = round;
  const spd = B.speeds[round - 1];
  const towards = w.p.x < e.x + e.w / 2 ? -1 : 1;
  if (e.stun) { e.stun--; return; }
  if (round === 1) {
    if (e.st === 0) {
      e.x += e.dir * spd;
      if (e.x < e.x0! || e.x + e.w > e.x1!) e.dir = -e.dir;
      if (e.t % B.throwEvery === 0 && play) { e.st = 1; e.n = 18; e.dir = towards; }
    } else if (e.st === 1 && --e.n <= 0) {
      e.st = 0;
      newEnt(w, 'board', e.x + 2, e.y + 2, 10, 8, { vx: e.dir * 2.3, vy: -2.6 });
      sfx(w, 'throw');
    }
  } else if (round === 2) {
    e.dir = towards;
    if (Math.abs(w.p.x - (e.x + e.w / 2)) > 20) e.x += e.dir * spd;
    e.x = Math.max(e.x0!, Math.min(e.x1! - e.w, e.x));
    if (!e.data!.shield && --e.n <= 0) { e.data!.shield = true; say(w, 'HE FINDS ANOTHER COPY OF THE DOSSIER.', 50); }
  } else {
    // Sulks, then storms across the room.
    if (e.st === 0) { if (e.t % B.sulkFor === 0) { e.st = 1; e.dir = e.x + e.w / 2 < (e.x0! + e.x1!) / 2 ? 1 : -1; sfx(w, 'stomp'); } }
    else {
      e.x += e.dir * spd * 2.2;
      if (e.t % 8 === 0) { w.shake = 2; sfx(w, 'stomp'); }
      if (e.x < e.x0!) { e.x = e.x0!; e.st = 0; }
      if (e.x + e.w > e.x1!) { e.x = e.x1! - e.w; e.st = 0; }
    }
  }
  touch(w, play, pb, e.x + 1, e.y + 2, e.w - 2, e.h - 2);
}

// ---------------------------------------------------------------- The Administrator
function updAdmin(w: World, e: Ent, play: boolean, pb: Box) {
  const B = BOSSES.admin;
  const d = e.data!;
  if (e.stun) { e.stun--; }
  else if (d.clip) {
    if (e.st === 0) {
      e.x += e.dir * B.speed;
      if (e.x < e.x0! || e.x + e.w > e.x1!) e.dir = -e.dir;
      if (e.t % B.paperEvery === 0 && play) { e.st = 1; e.n = 34; paperPattern(w, d); sfx(w, 'rustle'); }
      if (e.t % B.creditorEvery === 0 && play) sendCreditor(w);
    } else if (e.st === 1 && --e.n <= 0) e.st = 0;
  } else {
    // Disarmed: he shuffles off after his clipboard.
    e.st = 2;
    const cx = d.clipX as number;
    if (Math.abs(e.x - cx) > 2) e.x += Math.sign(cx - e.x) * 0.3;
    if (--e.n <= 0) { d.clip = true; e.st = 0; say(w, "HE'S GOT HIS CLIPBOARD BACK.", 60); }
  }
  touch(w, play, pb, e.x + 1, e.y + 2, e.w - 2, e.h - 2);
}

function paperPattern(w: World, d: Record<string, number | string | boolean>) {
  const pat = (d.pattern as number) % 3;
  d.pattern = (d.pattern as number) + 1;
  const bobCol = Math.floor(w.p.x / TS);
  const cols: number[] = [];
  for (let c = 1; c < 12; c++) {
    if (pat === 0 && c % 2 === 1) cols.push(c);
    if (pat === 1 && c % 2 === 0) cols.push(c);
    if (pat === 2 && Math.abs(c - bobCol) <= 1) cols.push(c);
  }
  for (const c of cols) newEnt(w, 'drop', c * TS + 1, 16, 14, 14, { type: 'paperwork', st: 1, t: -10, data: { temp: true, tx0: 0, ty0: 0, tx1: 0, ty1: 0 } });
}

function sendCreditor(w: World) {
  if (w.ents.some((o) => o.k === 'enemy' && o.type === 'creditor' && !o.dead)) return;
  const floor = Math.ceil(w.p.y / TS) * TS;
  const x = w.p.x > PW / 2 ? 18 : PW - 30;
  if (Math.abs(x - w.p.x) < T.enemyMinSpawnDist) return;
  if (!supportAt(w, x, x + 10, floor)) return;
  newEnt(w, 'enemy', x, floor - 22, 10, 22, { type: 'creditor', x0: 0, x1: 12 * TS, y0: floor - 22, dir: x < w.p.x ? 1 : -1 });
  say(w, 'A CREDITOR WANTS A WORD.', 50);
}

// ---------------------------------------------------------------- Bring Yer Dinner Dougie
function updDougie(w: World, e: Ent, play: boolean, pb: Box) {
  const B = BOSSES.dougie;
  const d = e.data!;
  const phase = d.phase as number;
  if (phase === 0) {
    const c = e.t % B.waveEvery;
    if (c === B.waveEvery - B.waveTell) { say(w, 'DOUGIE: "PUSH UP!"', B.waveTell); sfx(w, 'whistle2'); }
    if (c === 0) for (const p of parts(w, 'def')) { p.data!.air = 1; p.vy = -B.jumpV; sfx(w, 'jump'); }
    if (e.t % 400 === 120) say(w, 'DOUGIE: "BRING YER DINNER!"', 80);
  } else if (phase === 1) {
    if (--e.n <= 0) {
      d.phase = 2;
      const bus = parts(w, 'bus')[0];
      newEnt(w, 'bosspart', bus.x - 6, bus.y + 18, 8, 16, { data: { role: 'brake' } });
      say(w, 'THE HANDBRAKE! GIVE IT A FLICK!', 100);
    }
  } else if (phase === 3) {
    const bus = parts(w, 'bus')[0];
    if (bus.x > B.busStopX) {
      bus.x -= B.busSpeed;
      if (e.t % 10 === 0) { sfx(w, 'engine'); w.shake = 2; }
      touch(w, play, pb, bus.x + 2, bus.y + 6, bus.w - 4, bus.h - 6);
    } else if (!d.stopped) { d.stopped = 1; say(w, "IT'S IN THE OPEN! PIE IT!", 120); }
  }
  // Dougie himself paces the touchline above the dugout; harmless.
}

// ---------------------------------------------------------------- The Baron's Lada
function updLada(w: World, e: Ent, play: boolean, pb: Box) {
  const B = BOSSES.lada;
  const floor = e.data!.floor as number;
  if (e.data!.final) {
    if (e.st === 0) {
      e.x += B.speed * 1.2;
      if (e.t % 8 === 0) sfx(w, 'engine');
      if (e.x + e.w >= e.x1!) { e.x = e.x1! - e.w; e.st = 1; sfx(w, 'smash'); w.shake = 10; say(w, 'THE LADA HAS STALLED!', 120); }
    } else {
      if (e.t % 10 === 0) newEnt(w, 'fx', e.x + 30, e.y - 4, 6, 6, { type: 'smoke', t: 40, vy: -0.6 });
      if (play && overlap(pb.x, pb.y, pb.w, pb.h, e.x, e.y, e.w, e.h)) {
        e.dead = true; w.bossBeaten = true;
        addScore(w, SCORE.bossBonus);
        sfx(w, 'roar'); fx(w, 'crowd', 1);
        say(w, 'THE AULD CUP! IT\'S COMING BACK TO HARBOUR PARK!', 200);
        w.state = 'zoneDone'; w.stateT = 0;
        addScore(w, SCORE.zoneBonus);
      }
    }
    return;
  }
  const gap = e.x - w.p.x;
  const spd = gap < B.near ? B.speed * 1.4 : gap > B.far ? 0 : B.speed;
  e.x += spd;
  if (e.t % 8 === 0 && spd) sfx(w, 'engine');
  if (e.t % B.hubcapEvery === 0 && e.x < PW - 20 && play) {
    newEnt(w, 'hubcap', e.x - 4, floor - 9, 9, 9, { vx: -B.hubcapSpeed });
    sfx(w, 'clang');
  }
  if (e.x > PW + 10) e.dead = true;
  void pb; void floor;
}

export function updHubcap(w: World, e: Ent, play: boolean, pb: Box) {
  e.x += e.vx; e.n += 1;
  if (e.x < -12 || solidPx(w, e.x, e.y + 4)) { e.dead = true; return; }
  if (play && overlap(pb.x + 1, pb.y, pb.w - 2, pb.h, e.x + 1, e.y + 1, e.w - 2, e.h - 1)) kill(w, 'boss');
}

// ---------------------------------------------------------------- Parts
function updPart(w: World, e: Ent, play: boolean, pb: Box) {
  const role = e.data!.role;
  if (role === 'valve') { if (e.t > 0 && e.n > 0) e.n--; return; }
  if (role === 'bog') { if (--e.n <= 0) e.dead = true; return; }
  if (role === 'grab') { updGrab(w, e); return; }
  if (role === 'def') {
    const B = BOSSES.dougie;
    if (e.data!.air) {
      e.vy += T.gravity; e.y += e.vy;
      const floor = (boss(w)?.data!.floor as number) ?? PH;
      if (e.y + e.h >= floor) { e.y = floor - e.h; e.vy = 0; e.data!.air = 0; }
    } else {
      e.x += e.dir * (e.data!.speed as number);
      if (e.x < e.x0!) { e.x = e.x0!; e.dir = 1; }
      if (e.x + e.w > e.x1!) { e.x = e.x1! - e.w; e.dir = -1; }
    }
    touch(w, play, pb, e.x + 1, e.y + 2, e.w - 2, e.h - 2);
    void B;
    return;
  }
}

// ---------------------------------------------------------------- Tool hits
export function bossBall(w: World, e: Ent, ball: Ent): boolean {
  if (e.k === 'bosspart') {
    const role = e.data!.role;
    if (role === 'def' && !e.data!.air) {
      // Blocked. And cleared, hard, straight back at Bobby.
      newEnt(w, 'clear', e.x + (ball.vx > 0 ? -8 : e.w), ball.y, 8, 8, { vx: -Math.sign(ball.vx) * 4, vy: 0 });
      sfx(w, 'kick'); say(w, 'BLOCKED! AND CLEARED!', 50);
      return true;
    }
    if (role === 'bus') {
      const b = boss(w);
      if (b && b.data!.phase === 0) {
        b.hp!--; sfx(w, 'clang'); w.shake = 4;
        if (b.hp! <= 0) {
          b.data!.phase = 1; b.n = 90;
          for (const d of parts(w, 'def')) d.dead = true;
          say(w, 'DOUGIE: "EVERYBODY ON THE BUS!"', 100);
        } else say(w, `THE BUS IS DENTED! ${b.hp} MORE!`, 60);
      } else sfx(w, 'clang');
      return true;
    }
    if (role === 'vault' || role === 'valve' || role === 'brake') { sfx(w, 'clang'); return true; }
    return false;
  }
  switch (e.type) {
    case 'tam': sfx(w, 'clang'); say(w, 'IT BOUNCES OFF THE ROLLER.', 40); return true;
    case 'motm': {
      if (e.st === 9) return false;
      const round = e.data!.round as number;
      if (round === 2 && e.data!.shield && Math.sign(ball.vx) === -e.dir) { sfx(w, 'thud'); say(w, 'BLOCKED BY THE DOSSIER.', 40); return true; }
      if (round === 3 && e.st === 0) { sfx(w, 'thud'); say(w, "HE'S SULKING. HE ISNAE LISTENING.", 50); return true; }
      e.hp!--; e.stun = 20; sfx(w, 'oof'); w.shake = 3;
      if (e.hp! <= 0) {
        if (round >= 3) defeat(w, e, 'THE MANAGER OF THE MONTH HAS LEFT BY MUTUAL CONSENT!');
        else {
          e.data!.round = round + 1; e.st = 9; e.n = 80; e.x = e.x1! + 40;
          sfx(w, 'swish'); say(w, 'SACKED! THE REVOLVING DOOR SPINS...', 80);
          newEnt(w, 'pickup', e.x0! + 4, (e.data!.floor as number) - 12, 14, 12, { type: 'kitbag', name: 'motm-bag' });
        }
      }
      return true;
    }
    case 'admin': e.stun = 50; sfx(w, 'thud'); say(w, 'HE MAKES A NOTE OF THAT.', 40); return true;
    case 'dougie': return false;
  }
  return false;
}

export function bossScarf(w: World, e: Ent) {
  if (e.k === 'bosspart') {
    const role = e.data!.role;
    if (role === 'valve' && e.n === 0) {
      e.n = BOSSES.tam.valveCooldown;
      sfx(w, 'hiss');
      newEnt(w, 'bosspart', e.x - 20, (boss(w)?.y ?? 0) + 22, 48, 4, { n: BOSSES.tam.bogTime, data: { role: 'bog' } });
      for (let i = 0; i < 8; i++) newEnt(w, 'fx', e.x - 16 + i * 6, e.y + 12, 3, 3, { type: 'water', t: 30, vx: (i - 3.5) * 0.3, vy: -2.5 });
      say(w, 'THE SPRINKLERS ARE ON! THE PITCH IS A BOG!', 70);
    } else if (role === 'brake') {
      const b = boss(w);
      if (b && b.data!.phase === 2) { b.data!.phase = 3; e.dead = true; sfx(w, 'lever'); say(w, "OFF COMES THE HANDBRAKE! IT'S ROLLING!", 80); }
    }
    return;
  }
  if (e.type === 'motm' && e.data!.round === 2 && e.data!.shield) {
    e.data!.shield = false; e.n = 200; sfx(w, 'rustle');
    for (let i = 0; i < 5; i++) newEnt(w, 'fx', e.x, e.y + 6, 4, 4, { type: 'paper', t: 50, vx: (i - 2) * 0.7, vy: -2 });
    say(w, 'THE DOSSIER GOES FLYING!', 60);
  } else if (e.type === 'admin' && e.data!.clip) {
    e.data!.clip = false; e.n = BOSSES.admin.disarmed; e.st = 2;
    e.data!.clipX = Math.max(e.x0!, Math.min(e.x1! - 12, e.x + (w.p.facing * 60)));
    sfx(w, 'rustle');
    newEnt(w, 'fx', e.x, e.y, 8, 10, { type: 'clipboard', t: 40, vx: w.p.facing * 1.5, vy: -2.5 });
    say(w, "HE'S LOST HIS CLIPBOARD! HE CANNAE ACT!", 90);
  } else if (e.k === 'boss' && e.type !== 'lada') { e.stun = Math.max(e.stun ?? 0, 30); sfx(w, 'stun'); }
}

export function bossPie(w: World, cx: number, cy: number, r: number) {
  const hits = (e: Ent) => {
    const bx = Math.max(e.x, Math.min(cx, e.x + e.w)), by = Math.max(e.y, Math.min(cy, e.y + e.h));
    return (bx - cx) ** 2 + (by - cy) ** 2 < (r + 2) ** 2;
  };
  const b = boss(w);
  if (b?.type === 'tam' && hits(b)) {
    if (b.st === 1) {
      b.hp!--; b.st = 2; b.n = 50; w.shake = 8; sfx(w, 'oof');
      if (b.hp! <= 0) defeat(w, b, 'BIG TAM IS OFF THE PITCH! THE ROLLER IS SCRAP!');
      else say(w, `A DIRECT HIT! ${b.hp} TO GO!`, 70);
    } else say(w, "HE'S ROLLED STRAIGHT THROUGH IT.", 60);
  }
  if (b?.type === 'motm' && hits(b) && b.st !== 9) { b.stun = 40; say(w, 'PIE IN THE FACE. HE CARRIES ON REGARDLESS.', 60); }
  if (b?.type === 'admin') {
    for (const v of parts(w, 'vault')) if (hits(v)) {
      if (b.data!.clip) { say(w, "THE PAPERWORK'S IN ORDER. NO EFFECT.", 70); continue; }
      v.hp!--; w.shake = 10; sfx(w, 'clang');
      if (v.hp! <= 0) { v.dead = true; defeat(w, b, 'THE STRONGROOM IS OPEN! THE ADMINISTRATOR HAS ENTERED ADMINISTRATION!'); }
      else say(w, 'THE DOOR BUCKLES! ONCE MORE!', 70);
    }
  }
  if (b?.type === 'dougie' && b.data!.phase === 3 && b.data!.stopped) {
    const bus = parts(w, 'bus')[0];
    if (bus && hits(bus)) {
      bus.dead = true;
      for (let i = 0; i < 12; i++) newEnt(w, 'fx', bus.x + i * 8, bus.y + 10, 6, 6, { type: 'rubble', t: 60, vx: (i - 6) * 0.4, vy: -3 - (i % 3) });
      defeat(w, b, 'THE BUS IS GONE! THE CUP! ...WAIT. WHO IS THAT?');
      const cup = parts(w, 'cup')[0];
      // The Baron's Lada swoops in for the cup.
      newEnt(w, 'bosspart', PW + 10, (b.data!.floor as number) - 18, 36, 18, { vx: -2.5, data: { role: 'grab', cupX: cup?.x ?? 200 } });
    }
  }
}

// Called from ents for the Lada's swoop (render-only actor with a little logic).
export function updGrab(w: World, e: Ent) {
  const cupX = e.data!.cupX as number;
  if (e.st === 0) {
    e.x += e.vx;
    if (e.x <= cupX) { e.st = 1; for (const c of parts(w, 'cup')) c.dead = true; sfx(w, 'engine'); say(w, "THE BARON'S AWAY WITH THE CUP! AFTER HIM!", 160); }
  } else {
    e.x += 3;
    if (e.x > PW + 20) e.dead = true;
  }
}

export { rngInt };
