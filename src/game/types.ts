export type DeathCause = 'ball' | 'crushed' | 'fall' | 'dart' | 'spike' | 'pie' | 'enemy' | 'boss' | 'any';
export type Mode = '2026' | '1989' | 'select';

export interface Ent {
  id: number;
  k: string;            // kind: 'ball', 'pie', 'drop', 'gull', ...
  type?: string;        // content type key (trap type, enemy type, pickup type)
  name?: string;        // label for links
  x: number; y: number; // top-left in play-area pixels
  w: number; h: number;
  vx: number; vy: number;
  dir: number;
  st: number;           // state machine value
  t: number;            // timer
  n: number;            // counter
  x0?: number; x1?: number; y0?: number; y1?: number;
  hp?: number;
  stun?: number;
  dead?: boolean;
  link?: string[];
  text?: string;
  on?: boolean;
  carry?: boolean;
  data?: Record<string, number | string | boolean>;
}

export interface Player {
  x: number; y: number;        // centre-x, feet-y
  vx: number; vy: number;
  facing: number;
  st: 'stand' | 'walk' | 'jump' | 'fall' | 'crouch' | 'crawl' | 'climb' | 'kick' | 'scarf' | 'pie' | 'dead' | 'march';
  peak: number;                // highest point (smallest y) of the current fall
  anim: number;
  t: number;                   // action timer
  crouched: boolean;
  hairUp: number;
}

export interface Checkpoint {
  screen: string;
  x: number; y: number; facing: number;
  balls: number; pies: number;
  pursuit: Pursuit | null;
  crouched: boolean;
}

export interface Pursuit { type: string; dir: number; delay: number; y: number }

export interface ZoneStats {
  deaths: number; frames: number; piesUsed: number; ballsUsed: number;
  bossAttempts: number; bossDeaths: number; programmes: number; programmesTotal: number; score0: number;
}

export interface GameEvent { e: string; a?: string | number; b?: number }

export interface World {
  seed: number; rng: number; frame: number;
  mode: Mode; classic: boolean;  // classic = 1989 controls
  zone: number;
  screen: string;
  tiles: Uint8Array;           // current screen, mutable
  prevTiles: Uint8Array | null;
  prevBack?: string;
  scrollDir: [number, number];
  scrollT: number;
  state: 'play' | 'dying' | 'scroll' | 'march' | 'zoneDone' | 'gameOver';
  stateT: number;
  p: Player;
  ents: Ent[];
  nextId: number;
  score: number; lives: number; balls: number; pies: number;
  nextLifeAt: number;
  cp: Checkpoint;
  prevCp: Checkpoint | null;
  zoneCp: Checkpoint & { score: number; lives: number };
  collected: string[];         // points pickups taken (stay taken)
  crumble: Record<number, number>;
  screenDeaths: number;
  pursuit: Pursuit | null;
  input: number; prevInput: number;
  events: GameEvent[];
  deathCause: DeathCause | null;
  deathLine: string;
  lineState: { last: number; lastScreen: string; lastCause: string; streak: number };
  stats: ZoneStats;
  cpPending: boolean;
  bossBeaten: boolean;
  invincible: boolean; infinite: boolean;
  shake: number;
  msg: string; msgT: number;
}
