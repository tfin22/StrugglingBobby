// The deterministic game simulation for one zone. No rendering, audio or
// DOM in here: step(world, inputByte) advances exactly one 50 Hz frame.
import { World, Ent, Mode, DeathCause, Checkpoint } from './types';
import { T } from './tuning';
import { COLS, ROWS, TS, PW, PH, IN_L, IN_R, IN_U, IN_D, IN_J, IN_K, IN_P, IN_S } from './consts';
import { ZONES, screenDef, neighbour } from '../content/zones';
import { tileId, ZONE_FLAGS, F_SOLID, F_PLAT, F_LADDER, F_CRUMBLE, F_TRAPDOOR, F_WEAK } from '../content/tiles';
import { boxSolid, flagsPx, flagsAt, isLadderPx, supportAt, spikeOverlap, overlap } from './collide';
import { spawnFromDef, updateEnts, entSupport, spawnPursuit, scarfSweep } from './ents';
import { pickDeathLine } from './deathlines';
import { SCORE } from '../content/scoring';
import { TRAP_TYPES } from '../content/traps';
import { hashSeed } from '../engine/rng';

export interface NewWorldOpts {
  zone: number; mode?: Mode; seed?: number; classic?: boolean;
  lives?: number; score?: number; balls?: number; pies?: number;
  screen?: string; x?: number; y?: number;
}

export function newWorld(o: NewWorldOpts): World {
  const z = ZONES[o.zone];
  const seed = o.seed ?? hashSeed('bobby');
  const screen = o.screen ?? z.start.screen;
  const x = o.x ?? z.start.x * TS + 8, y = o.y ?? (z.start.y + 1) * TS;
  const w: World = {
    seed, rng: seed, frame: 0, mode: o.mode ?? '2026', classic: !!o.classic, zone: o.zone,
    screen, tiles: new Uint8Array(COLS * ROWS), prevTiles: null, scrollDir: [0, 0], scrollT: 0,
    state: 'play', stateT: 0,
    p: { x, y, vx: 0, vy: 0, facing: z.start.facing ?? 1, st: 'stand', peak: y, anim: 0, t: 0, crouched: false, hairUp: 0 },
    ents: [], nextId: 1,
    score: o.score ?? 0, lives: o.lives ?? T.startLives, balls: o.balls ?? T.startBalls, pies: o.pies ?? T.startPies,
    nextLifeAt: 0,
    cp: null as unknown as Checkpoint, prevCp: null, zoneCp: null as unknown as World['zoneCp'],
    collected: [], crumble: {}, screenDeaths: 0, pursuit: null,
    input: 0, prevInput: 0, events: [], deathCause: null, deathLine: '',
    lineState: { last: -1, lastScreen: '', lastCause: '', streak: 0 },
    stats: { deaths: 0, frames: 0, piesUsed: 0, ballsUsed: 0, bossAttempts: 0, bossDeaths: 0, programmes: 0, programmesTotal: 0, score0: o.score ?? 0 },
    cpPending: false, bossBeaten: false, invincible: false, infinite: false, shake: 0, msg: '', msgT: 0,
  };
  w.nextLifeAt = (Math.floor(w.score / T.extraLifeEvery) + 1) * T.extraLifeEvery;
  w.stats.programmesTotal = z.screens.reduce((n, s) => n + (s.ents ?? []).filter((e) => e.t === 'programme').length, 0);
  enterScreen(w, screen, true);
  w.zoneCp = { ...w.cp, score: w.score, lives: w.lives };
  return w;
}

export function fx(w: World, e: string, a?: string | number, b?: number) { w.events.push({ e, a, b }); }
export function sfx(w: World, name: string) { fx(w, 'sfx', name); }
export function say(w: World, msg: string, t = 100) { w.msg = msg; w.msgT = t; }

export function addScore(w: World, n: number) {
  w.score += n;
  while (w.score >= w.nextLifeAt) {
    w.nextLifeAt += T.extraLifeEvery;
    if (w.lives < T.maxLives) { w.lives++; sfx(w, 'life'); say(w, 'EXTRA LIFE! THE BOARD IS DELIGHTED.'); }
  }
}

export function newEnt(w: World, k: string, x: number, y: number, wd: number, h: number, extra: Partial<Ent> = {}): Ent {
  const e: Ent = { id: w.nextId++, k, x, y, w: wd, h, vx: 0, vy: 0, dir: 1, st: 0, t: 0, n: 0, ...extra };
  w.ents.push(e);
  return e;
}

// Load a screen fresh (tiles and entities) from its definition.
export function loadScreen(w: World, id: string) {
  const def = screenDef(id);
  w.screen = id;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) w.tiles[y * COLS + x] = tileId(def.map[y]?.[x] ?? ' ');
  w.ents = [];
  w.crumble = {};
  (def.ents ?? []).forEach((d, i) => {
    const key = `${id}#${i}`;
    if (w.collected.includes(key)) return;
    spawnFromDef(w, d, key);
  });
  if (w.pursuit) spawnPursuit(w, w.pursuit);
}

function enterScreen(w: World, id: string, first = false) {
  const def = screenDef(id);
  loadScreen(w, id);
  // Wee Eck and Senga never leave Bobby short of what a screen needs.
  const nb = def.needs?.balls ?? 0, np = def.needs?.pies ?? 0;
  if (w.balls < nb || w.pies < np) {
    w.balls = Math.max(w.balls, nb); w.pies = Math.max(w.pies, np);
    if (!first) { sfx(w, 'pickup'); say(w, w.pies <= np && np ? "SENGA'S SENT A PIE DOWN." : 'WEE ECK LEFT A KIT BAG.'); }
  }
  w.prevCp = w.cp ?? null;
  w.cp = makeCp(w);
  w.screenDeaths = 0;
  // Checkpoints wait until Bobby is on his feet (so a restart is never mid-air).
  w.cpPending = !grounded(w) && w.p.st !== 'climb';
}

function makeCp(w: World): Checkpoint {
  return { screen: w.screen, x: w.p.x, y: w.p.y, facing: w.p.facing, balls: w.balls, pies: w.pies, pursuit: w.pursuit ? { ...w.pursuit } : null, crouched: w.p.crouched };
}

function grounded(w: World): boolean {
  const p = w.p;
  return supportAt(w, p.x - T.hitW / 2, p.x + T.hitW / 2, p.y) || entSupport(w, p.x - T.hitW / 2, p.x + T.hitW / 2, p.y);
}

export function hitH(w: World) { return w.p.crouched ? T.crouchH : T.hitH; }
export function pBox(w: World) {
  const p = w.p, h = hitH(w);
  return { x: p.x - T.hitW / 2, y: p.y - h, w: T.hitW, h };
}

export function kill(w: World, cause: DeathCause) {
  if (w.state !== 'play' || w.invincible) return;
  const p = w.p;
  w.state = 'dying'; w.stateT = 0; w.deathCause = cause;
  p.st = 'dead'; p.t = 0; p.vx = 0;
  p.vy = cause === 'crushed' ? 0 : cause === 'pie' ? -6 : -4.5;
  if (cause === 'pie') p.vx = -p.facing * 1.5;
  w.stats.deaths++; w.screenDeaths++;
  if (w.ents.some((e) => e.k === 'boss')) w.stats.bossDeaths++;
  w.lives--;
  w.deathLine = pickDeathLine(w, cause);
  sfx(w, 'whistle'); sfx(w, 'groan'); fx(w, 'hap', 'death');
  w.shake = 8;
}

// Steward contact: escorted back a screen. No life lost.
export function march(w: World) {
  if (w.state !== 'play' || w.invincible) return;
  w.state = 'march'; w.stateT = 0; w.p.st = 'march';
  sfx(w, 'whistle');
  say(w, 'ESCORTED OUT BY A STEWARD.', 80);
}

function restart(w: World, cp: Checkpoint) {
  if (T.refundOnRestart) { w.balls = cp.balls; w.pies = cp.pies; }
  w.pursuit = cp.pursuit ? { ...cp.pursuit } : null;
  const p = w.p;
  p.x = cp.x; p.y = cp.y; p.facing = cp.facing; p.vx = 0; p.vy = 0; p.st = cp.crouched ? 'crouch' : 'stand';
  p.crouched = cp.crouched; p.peak = cp.y; p.t = 0; p.hairUp = 0;
  loadScreen(w, cp.screen);
  w.cp = { ...cp, pursuit: cp.pursuit ? { ...cp.pursuit } : null };
  w.cpPending = false;
  w.state = 'play'; w.stateT = 0;
  w.input = 0; w.prevInput = 0xff; // a held button must be released before it acts again
}

export function step(w: World, input: number) {
  w.prevInput = w.input;
  w.input = input;
  w.frame++;
  if (w.msgT > 0) w.msgT--;
  if (w.shake > 0) w.shake--;
  switch (w.state) {
    case 'play': stepPlay(w); break;
    case 'dying': stepDying(w); break;
    case 'march': stepMarch(w); break;
    case 'scroll': stepScroll(w); break;
    default: break;
  }
}

function stepDying(w: World) {
  const p = w.p;
  w.stateT++;
  if (w.deathCause !== 'crushed') {
    if (w.stateT > 8) { p.vy = Math.min(p.vy + T.gravity, 5); p.y += p.vy; p.x += p.vx; }
  }
  updateEnts(w, true);
  const pressed = w.input & ~w.prevInput;
  if (w.stateT >= T.deathFrames || (w.stateT > T.deathSkipAfter && pressed & (IN_J | IN_K | IN_P | IN_S))) {
    if (w.lives <= 0) { w.state = 'gameOver'; w.stateT = 0; return; }
    const cp = w.mode === '1989' ? w.zoneCp : w.cpPending && w.prevCp ? w.prevCp : w.cp;
    restart(w, cp);
  }
}

function stepMarch(w: World) {
  w.stateT++;
  if (w.stateT >= T.marchFrames) restart(w, w.prevCp && w.prevCp.screen !== w.screen ? w.prevCp : w.cp);
}

function stepScroll(w: World) {
  w.scrollT++;
  if (w.scrollT >= T.scrollFrames) { w.state = 'play'; w.prevTiles = null; }
}

function startScroll(w: World, dx: number, dy: number) {
  const n = neighbour(w.zone, w.screen, dx, dy);
  if (!n) return false;
  // A giant ball rolling the same way follows Bobby onto the next screen.
  const ball = w.ents.find((e) => e.k === 'gball' && e.st === 2 && !e.dead);
  if (ball && dx !== 0 && ball.dir === dx) {
    const dist = dx > 0 ? PW - (ball.x + ball.w) : ball.x;
    w.pursuit = { type: ball.type!, dir: dx, delay: Math.max(6, Math.round(dist / (TRAP_TYPES[ball.type!].speed ?? T.giantBallSpeed))), y: 0 };
  } else w.pursuit = null;
  if (w.screenDeaths === 0) addScore(w, SCORE.cleanScreen);
  w.prevTiles = w.tiles.slice();
  w.prevBack = screenDef(w.screen).back;
  w.scrollDir = [dx, dy]; w.scrollT = 0; w.state = 'scroll';
  const p = w.p;
  p.x -= dx * PW; p.y -= dy * PH; p.peak -= dy * PH;
  enterScreen(w, n.id);
  return true;
}

function stepPlay(w: World) {
  w.stats.frames++;
  w.stateT++;
  stepPlayer(w);
  if (w.state !== 'play') return;
  updateEnts(w, false);
  if (w.state !== 'play') return;
  if (w.cpPending && (grounded(w) || w.p.st === 'climb')) { w.cp = makeCp(w); w.cpPending = false; }
  // Edges
  const p = w.p;
  if (p.x >= PW) startScroll(w, 1, 0) || (p.x = PW - 1);
  else if (p.x < 0) startScroll(w, -1, 0) || (p.x = 0);
  else if (p.y < 0 && (p.st === 'climb' || p.vy < 0)) startScroll(w, 0, -1);
  else if (p.y - 8 > PH) { if (!startScroll(w, 0, 1) && p.y > PH + 24) { w.invincible = false; kill(w, 'fall'); } }
}

// ---------------------------------------------------------------- Bobby

function headroom(w: World, h: number) {
  const p = w.p;
  return !boxSolid(w, p.x - T.hitW / 2, p.y - h, p.x + T.hitW / 2, p.y);
}

// Move horizontally one pixel at a time; returns false if blocked.
function moveX(w: World, dx: number): boolean {
  const p = w.p, h = hitH(w);
  let rem = dx;
  while (Math.abs(rem) > 0.0001) {
    const s = Math.sign(rem) * Math.min(1, Math.abs(rem));
    const nx = p.x + s;
    if (boxSolid(w, nx - T.hitW / 2, p.y - h, nx + T.hitW / 2, p.y)) return false;
    p.x = nx; rem -= s;
  }
  return true;
}

function ladderNear(w: World, px: number, py: number): number | null {
  // Returns the ladder's centre x if Bobby can grab a ladder at this point.
  const tx = Math.floor(px / TS);
  for (const cx of [tx, tx - 1, tx + 1]) {
    const centre = cx * TS + 8;
    if (Math.abs(centre - px) <= T.ladderGrab && flagsPx(w, centre, py) & F_LADDER) return centre;
  }
  return null;
}

function stepPlayer(w: World) {
  const p = w.p;
  const inp = w.input, pressed = inp & ~w.prevInput;
  p.anim++;
  if (p.hairUp > 0) p.hairUp--;

  // Actions in progress
  if (p.st === 'kick' || p.st === 'scarf' || p.st === 'pie') { stepAction(w); return; }

  if (p.st === 'climb') { stepClimb(w, inp, pressed); return; }
  if (p.st === 'jump' || p.st === 'fall') { stepAir(w, inp); return; }

  // ---- On the ground
  if (!grounded(w)) {
    p.st = 'fall'; p.vy = 0; p.peak = p.y;
    p.vx = inp & IN_L ? -T.walkSpeed * 0.75 : inp & IN_R ? T.walkSpeed * 0.75 : 0;
    if (p.crouched && headroom(w, T.hitH)) p.crouched = false;
    return;
  }
  const L = !!(inp & IN_L), R = !!(inp & IN_R), U = !!(inp & IN_U), D = !!(inp & IN_D);

  // Ladders: up into one, or down from the top of one
  if (U && !p.crouched) {
    const lx = ladderNear(w, p.x, p.y - 4);
    if (lx !== null) { p.x = lx; p.st = 'climb'; p.vx = 0; return; }
  }
  if (D) {
    const lx = ladderNear(w, p.x, p.y + 2);
    if (lx !== null && !(flagsPx(w, lx, p.y + 2) & F_SOLID)) { p.x = lx; p.crouched = false; p.st = 'climb'; p.y += 2; return; }
  }

  // 1989 controls: fire + direction picks the tool; up is jump.
  let jump = !!(pressed & IN_J), kick = !!(pressed & IN_K), pie = !!(pressed & IN_P), scarf = !!(pressed & IN_S);
  if (w.classic) {
    const fireHeld = !!(inp & IN_J), firePressed = !!(pressed & IN_J);
    jump = !!(pressed & IN_U) && !fireHeld;
    kick = pie = scarf = false;
    if (firePressed || (fireHeld && pressed & (IN_U | IN_D | IN_L | IN_R))) {
      if (U) kick = true; else if (D) pie = true; else scarf = true;
    }
  }

  if (kick && !p.crouched) {
    if (w.balls > 0 || w.infinite) { p.st = 'kick'; p.t = 0; return; }
    sfx(w, 'empty');
  }
  if (pie) {
    if (w.pies > 0 || w.infinite) { p.st = 'pie'; p.t = 0; return; }
    sfx(w, 'empty');
  }
  if (scarf) { p.st = 'scarf'; p.t = 0; sfx(w, 'scarf'); return; }
  if (w.classic && inp & IN_J && (U || D)) return; // holding fire: the stick picks a tool, it doesn't walk

  if (jump && (!p.crouched || headroom(w, T.hitH))) {
    p.crouched = false;
    p.st = 'jump'; p.vy = -T.jumpVy; p.peak = p.y; p.hairUp = 30;
    p.vx = L ? -T.jumpVx : R ? T.jumpVx : 0;
    if (L) p.facing = -1; else if (R) p.facing = 1;
    sfx(w, 'jump');
    return;
  }

  // Crouch / stand
  if (D && !w.classic) p.crouched = true;
  else if (D && w.classic && !(inp & IN_J)) p.crouched = true;
  else if (p.crouched && headroom(w, T.hitH)) p.crouched = false;

  if (L || R) {
    const dir = L ? -1 : 1;
    p.facing = dir;
    const spd = p.crouched ? T.crawlSpeed : T.walkSpeed;
    moveX(w, dir * spd);
    p.st = p.crouched ? 'crawl' : 'walk';
    if (!p.crouched && p.anim % 12 === 0) sfx(w, 'step');
  } else p.st = p.crouched ? 'crouch' : 'stand';

  hazardsTouch(w);
}

function stepAction(w: World) {
  const p = w.p;
  p.t++;
  if (p.st === 'kick') {
    if (p.t === T.kickLaunchFrame) {
      if (!w.infinite) w.balls--;
      w.stats.ballsUsed++;
      newEnt(w, 'ball', p.x + p.facing * 8 - 4, p.y - 11, 8, 8, { vx: p.facing * T.ballSpeed, dir: p.facing });
      sfx(w, 'kick'); fx(w, 'hap', 'kick');
    }
    if (p.t >= T.kickFrames) p.st = 'stand';
  } else if (p.st === 'pie') {
    if (p.t === 4) {
      if (!w.infinite) w.pies--;
      w.stats.piesUsed++;
      newEnt(w, 'pie', p.x + p.facing * 6 - 5, p.y - 8, 10, 8, { t: T.pieFuse });
      sfx(w, 'fizz'); fx(w, 'hap', 'pie');
    }
    if (p.t >= T.pieDropFrames) p.st = p.crouched ? 'crouch' : 'stand';
  } else if (p.st === 'scarf') {
    if (p.t >= T.scarfHitFrom && p.t <= T.scarfHitTo) {
      const r = scarfRect(w);
      if (p.t === T.scarfHitFrom) sfx(w, 'crack');
      scarfSweep(w, r, p.t === T.scarfHitFrom);
    }
    if (p.t >= T.scarfFrames) p.st = p.crouched ? 'crouch' : 'stand';
  }
  hazardsTouch(w);
}

export function scarfRect(w: World) {
  const p = w.p;
  const y0 = p.crouched ? p.y - 10 : p.y - 18;
  return { x: p.facing > 0 ? p.x + 4 : p.x - 4 - T.scarfReach, y: y0, w: T.scarfReach, h: p.crouched ? 10 : 16 };
}


function stepAir(w: World, inp: number) {
  const p = w.p;
  // Grab a ladder mid-air by pushing up
  if (inp & IN_U && !w.classic) {
    const lx = ladderNear(w, p.x, p.y - 8);
    if (lx !== null) { p.x = lx; p.st = 'climb'; p.vx = 0; p.vy = 0; return; }
  }
  p.vy = Math.min(p.vy + T.gravity, T.maxFall);
  if (p.vy > 0) p.st = 'fall';
  if (p.vx) moveX(w, p.vx); // a committed jump keeps its direction, even after brushing a wall
  // vertical, pixel by pixel
  let rem = p.vy;
  const h = hitH(w);
  while (Math.abs(rem) > 0.0001) {
    const s = Math.sign(rem) * Math.min(1, Math.abs(rem));
    const ny = p.y + s;
    if (s < 0) {
      if (boxSolid(w, p.x - T.hitW / 2, ny - h, p.x + T.hitW / 2, ny)) { p.vy = 0; break; }
      p.y = ny;
    } else {
      // crossing a tile top?
      const top = Math.floor(ny / TS) * TS;
      if (p.y <= top && ny >= top && (supportAt(w, p.x - T.hitW / 2, p.x + T.hitW / 2, top) || entSupport(w, p.x - T.hitW / 2, p.x + T.hitW / 2, top))) {
        p.y = top; land(w); return;
      }
      if (entSupport(w, p.x - T.hitW / 2, p.x + T.hitW / 2, ny, p.y)) { land(w); return; }
      if (boxSolid(w, p.x - T.hitW / 2, ny - h, p.x + T.hitW / 2, ny)) { p.y = Math.floor(ny / TS) * TS; land(w); return; }
      p.y = ny;
    }
    rem -= s;
  }
  p.peak = Math.min(p.peak, p.y);
  hazardsTouch(w);
}

function land(w: World) {
  const p = w.p;
  const drop = p.y - p.peak;
  p.vy = 0; p.vx = 0;
  p.st = p.crouched ? 'crouch' : 'stand';
  if (drop > T.lethalFall) { kill(w, 'fall'); return; }
  sfx(w, 'land');
  hazardsTouch(w);
}

function stepClimb(w: World, inp: number, pressed: number) {
  const p = w.p;
  p.crouched = false;
  const U = inp & IN_U, D = inp & IN_D, L = inp & IN_L, R = inp & IN_R;
  if (U) {
    const ny = p.y - T.climbSpeed;
    if (!boxSolid(w, p.x - T.hitW / 2, ny - T.hitH, p.x + T.hitW / 2, ny)) {
      p.y = ny;
      if (p.anim % 10 === 0) sfx(w, 'climb');
      if (!isLadderPx(w, p.x, p.y - 1)) {
        // Off the top: stand on the ladder top
        p.y = Math.ceil(p.y / TS) * TS;
        if (supportAt(w, p.x - 2, p.x + 2, p.y)) { p.st = 'stand'; return; }
      }
    }
  } else if (D) {
    const ny = p.y + T.climbSpeed;
    const boundary = Math.floor(ny / TS) * TS;
    if (boundary > p.y - 0.001 && boundary <= ny) {
      const f = flagsAt(w, Math.floor(p.x / TS), boundary / TS);
      if (f & (F_SOLID | F_PLAT) && !(f & F_LADDER)) { p.y = boundary; p.st = 'stand'; return; }
    }
    p.y = ny;
    if (p.anim % 10 === 0) sfx(w, 'climb');
    if (!isLadderPx(w, p.x, p.y - 1) && !isLadderPx(w, p.x, p.y - 12)) { p.st = 'fall'; p.vy = 0; p.peak = p.y; return; }
  }
  if ((L || R) && !U && !D) {
    // Step off sideways where the ladder meets a floor
    const fy = Math.round(p.y / TS) * TS;
    if (Math.abs(fy - p.y) <= 4 && supportAt(w, p.x - 4, p.x + 4, fy, true)) {
      p.y = fy; p.st = 'walk'; p.facing = L ? -1 : 1;
    } else if (Math.abs(fy - p.y) <= 4) {
      // Step off onto a floor beside the ladder
      const side = L ? -1 : 1;
      if (supportAt(w, p.x + side * 10, p.x + side * 12, fy, true)) { p.y = fy; p.st = 'walk'; p.facing = side; }
    }
  }
  if (pressed & IN_J && (L || R)) {
    p.st = 'jump'; p.vy = -T.jumpVy * 0.6; p.vx = L ? -T.jumpVx : T.jumpVx; p.facing = L ? -1 : 1; p.peak = p.y;
  }
  hazardsTouch(w);
}

// Tile hazards and crumbling floors under Bobby.
function hazardsTouch(w: World) {
  if (w.state !== 'play') return;
  const b = pBox(w);
  if (spikeOverlap(w, b.x + 1, b.y, b.x + b.w - 1, b.y + b.h)) { kill(w, 'spike'); return; }
  const p = w.p;
  if (p.st !== 'jump' && p.st !== 'fall' && p.st !== 'climb' && p.y % TS === 0) {
    const ty = p.y / TS;
    for (const tx of [Math.floor((p.x - T.hitW / 2) / TS), Math.floor((p.x + T.hitW / 2 - 0.01) / TS)]) {
      if (tx < 0 || tx >= COLS || ty >= ROWS) continue;
      const f = ZONE_FLAGS[w.zone][w.tiles[ty * COLS + tx]];
      if (f & F_CRUMBLE) {
        const i = ty * COLS + tx;
        if (w.crumble[i] === undefined) { w.crumble[i] = f & F_TRAPDOOR ? T.trapdoorDelay : T.crumbleDelay; sfx(w, f & F_TRAPDOOR ? 'click' : 'creak'); }
      }
    }
  }
}

// Called each frame from ents: crumbling tiles count down and fall away.
export function updateCrumble(w: World) {
  for (const k of Object.keys(w.crumble)) {
    const i = Number(k);
    if (--w.crumble[i] <= 0) {
      delete w.crumble[i];
      w.tiles[i] = 0;
      const x = (i % COLS) * TS, y = Math.floor(i / COLS) * TS;
      newEnt(w, 'fx', x, y, 16, 8, { type: 'debris', t: 40, vy: 0.5 });
      sfx(w, 'crumble');
    }
  }
}

// Pie blasts knock out weak walls.
export function blastTiles(w: World, cx: number, cy: number, r: number) {
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const i = ty * COLS + tx;
    const f = ZONE_FLAGS[w.zone][w.tiles[i]];
    if (!(f & (F_WEAK | F_CRUMBLE))) continue;
    const dx = Math.max(Math.abs(tx * TS + 8 - cx) - 8, 0), dy = Math.max(Math.abs(ty * TS + 8 - cy) - 8, 0);
    if (dx * dx + dy * dy <= (r + 4) * (r + 4)) {
      w.tiles[i] = 0;
      for (let n = 0; n < 3; n++) newEnt(w, 'fx', tx * TS + n * 4, ty * TS + n * 3, 6, 6, { type: 'rubble', t: 50, vx: (n - 1) * 0.8, vy: -2 - n * 0.5 });
    }
  }
}

export { grounded, F_SOLID };
