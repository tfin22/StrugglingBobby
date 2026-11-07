// Every trap: what it does, how it kills, and its tell. A trap without a
// tell is unfair; a test checks that every entry here has one.
import { DeathCause } from '../game/types';

export type TrapKind = 'gball' | 'drop' | 'studs' | 'dart' | 'crumble' | 'crusher' | 'jet' | 'patrol' | 'camera' | 'tripwire';

export interface TrapType {
  kind: TrapKind;
  name: string;
  cause: DeathCause;
  tell: string;       // what the player can see/hear before it gets them
  tellArt: string;    // the sprite or effect the renderer draws as the tell
  sprite?: string;
  w?: number; h?: number;
  speed?: number;
  warn?: number;      // frames of warning before it acts
  period?: number; on?: number;
  tile?: string;      // for tile traps
  special?: string;   // special death animation
}

export const TRAP_TYPES: Record<string, TrapType> = {
  // The giant ball
  giantBall: { kind: 'gball', name: 'THE GIANT BALL', cause: 'ball', tell: 'A rumble, and dust trickling from the roof.', tellArt: 'dust', w: 30, h: 30, speed: 1.4, warn: 40, special: 'flat' },
  cupBall: { kind: 'gball', name: 'THE CUP FINAL BALL', cause: 'ball', tell: 'The crowd goes quiet. Then the rumble.', tellArt: 'dust', w: 30, h: 30, speed: 1.45, warn: 40, special: 'flat' },

  // Falling objects
  lamp: { kind: 'drop', name: 'FLOODLIGHT LAMP', cause: 'crushed', tell: 'It sways on a frayed cable.', tellArt: 'sway', sprite: 'lamp', w: 16, h: 12, warn: 18 },
  brick: { kind: 'drop', name: 'LOOSE BRICK', cause: 'crushed', tell: 'A brick already poking out of the roof.', tellArt: 'sway', sprite: 'brick', w: 14, h: 8, warn: 14 },
  hoarding: { kind: 'drop', name: 'ADVERTISING HOARDING', cause: 'crushed', tell: 'One bolt left, and it is rattling.', tellArt: 'sway', sprite: 'hoarding', w: 32, h: 12, warn: 20 },
  cabinet: { kind: 'drop', name: 'FILING CABINET', cause: 'crushed', tell: 'It leans out over the edge, drawers open.', tellArt: 'sway', sprite: 'cabinet', w: 14, h: 20, warn: 16 },
  trophyCabinet: { kind: 'drop', name: 'TROPHY CABINET', cause: 'crushed', tell: 'The glass rattles. Something inside is loose.', tellArt: 'sway', sprite: 'trophycab', w: 16, h: 24, warn: 20 },
  portrait: { kind: 'drop', name: 'OIL PORTRAIT', cause: 'crushed', tell: 'A former manager, hanging by one nail.', tellArt: 'sway', sprite: 'portrait', w: 16, h: 16, warn: 16 },
  paperwork: { kind: 'drop', name: 'PAPERWORK AVALANCHE', cause: 'crushed', tell: 'Loose sheets drifting down first.', tellArt: 'flutter', sprite: 'paperpile', w: 16, h: 14, warn: 22, special: 'buried' },
  padlock: { kind: 'drop', name: "BAILIFF'S PADLOCK", cause: 'crushed', tell: 'It swings on its chain, clinking.', tellArt: 'sway', sprite: 'padlock', w: 12, h: 12, warn: 14 },
  tvcamDrop: { kind: 'drop', name: 'TV CAMERA', cause: 'crushed', tell: 'The wire twangs.', tellArt: 'sway', sprite: 'tvcam', w: 16, h: 12, warn: 16 },

  // Studs
  studs: { kind: 'studs', name: 'BOOT STUDS', cause: 'spike', tell: 'Little holes in the floor.', tellArt: 'holes', warn: 14, period: 0, on: 50 },
  bottles: { kind: 'studs', name: 'BROKEN-BOTTLE BIN', cause: 'spike', tell: 'Glass glinting through the floor grate.', tellArt: 'glint', warn: 14, period: 0, on: 50 },

  // Darts
  dartHole: { kind: 'dart', name: 'DART HOLE', cause: 'dart', tell: 'A small dark hole in the wall.', tellArt: 'hole', speed: 4, warn: 10 },
  dartboard: { kind: 'dart', name: 'SUPPORTERS CLUB DARTBOARD', cause: 'dart', tell: 'A dartboard. Someone is clearly practising.', tellArt: 'dartboard', speed: 4, warn: 12 },
  teaUrn: { kind: 'dart', name: 'TEA URN', cause: 'dart', tell: 'The urn rattles and steams before it spits.', tellArt: 'steam', speed: 3, warn: 24 },
  pyroGun: { kind: 'dart', name: 'CONFETTI CANNON', cause: 'dart', tell: 'Sparks at the muzzle.', tellArt: 'sparks', speed: 4.5, warn: 16 },

  // Tile traps
  terrace: { kind: 'crumble', name: 'ROTTEN TERRACING', cause: 'fall', tell: 'Cracked and sagging. Condemned in 1987.', tellArt: 'cracks', tile: 'X' },
  trapdoor: { kind: 'crumble', name: 'BOARDROOM TRAPDOOR', cause: 'fall', tell: 'A brass hinge and a seam in the floor.', tellArt: 'hinge', tile: 'Z' },

  // Crushers
  turnstile: { kind: 'crusher', name: 'TURNSTILE', cause: 'crushed', tell: 'It clicks three times before it turns.', tellArt: 'clicklight', sprite: 'turnstile', warn: 30, period: 150, on: 40, special: 'flat' },
  shredder: { kind: 'crusher', name: 'SHREDDER', cause: 'crushed', tell: 'A whine as the blades spin up.', tellArt: 'clicklight', sprite: 'shredder', warn: 30, period: 140, on: 40, special: 'flat' },
  tunnelDoor: { kind: 'crusher', name: 'TUNNEL DOOR', cause: 'crushed', tell: 'A siren light turns orange.', tellArt: 'clicklight', sprite: 'door', warn: 36, period: 180, on: 50, special: 'flat' },
  revolver: { kind: 'crusher', name: 'REVOLVING DOOR', cause: 'crushed', tell: 'The glass panels creak round first.', tellArt: 'clicklight', sprite: 'revolver', warn: 30, period: 130, on: 34, special: 'flat' },

  // Jets
  sprinkler: { kind: 'jet', name: 'SPRINKLER', cause: 'any', tell: 'It hisses and drips first.', tellArt: 'drips', warn: 30, period: 150, on: 50 },
  pyro: { kind: 'jet', name: 'PYROTECHNICS', cause: 'any', tell: 'Sparks fizz from the nozzle.', tellArt: 'sparks', warn: 30, period: 140, on: 40 },
  urnSteam: { kind: 'jet', name: 'STEAM VENT', cause: 'any', tell: 'A whistle like a kettle.', tellArt: 'drips', warn: 30, period: 120, on: 40 },

  // Patrolling hazards
  mower: { kind: 'patrol', name: 'RIDE-ON MOWER', cause: 'crushed', tell: 'Mown stripes and the smell of two-stroke.', tellArt: 'stripes', sprite: 'mower', w: 28, h: 18, speed: 0.9, special: 'flat' },
  spikeRoller: { kind: 'patrol', name: "GROUNDSMAN'S SPIKED ROLLER", cause: 'spike', tell: 'Little holes punched in the turf.', tellArt: 'stripes', sprite: 'roller', w: 22, h: 16, speed: 0.7 },
  tvcam: { kind: 'patrol', name: 'TV CAMERA ON A WIRE', cause: 'crushed', tell: 'A wire across the stadium, humming.', tellArt: 'wire', sprite: 'tvcam', w: 16, h: 12, speed: 1.4 },

  // Cameras and wires
  cctv: { kind: 'camera', name: 'CCTV', cause: 'enemy', tell: 'A blinking red light. It sends for the stewards.', tellArt: 'redlight', sprite: 'cctv', w: 14, h: 10, warn: 30 },
  tripwire: { kind: 'tripwire', name: 'FIVE-WAY AGREEMENT TRIPWIRE', cause: 'any', tell: 'A wire across the floor with a label on it.', tellArt: 'wire', w: 16, h: 4 },
};
