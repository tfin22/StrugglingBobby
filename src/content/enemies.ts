// The cast of small enemies. Contact: kill (a death), steal (takes a pie,
// never a life), march (a steward walks you back a screen).
export interface EnemyType {
  name: string;
  ai: 'walker' | 'gull' | 'flier' | 'hopper' | 'chaser' | 'thrower' | 'cat';
  w: number; h: number;
  speed: number;
  contact: 'kill' | 'steal' | 'march';
  killBy: ('ball' | 'pie')[];
  stun: boolean;          // the scarf stuns it
  points: number;
  throws?: string;        // projectile kind
  throwEvery?: number;
  line: string;           // a one-liner for the debug overlay and the WHO'S WHO card
}

export const ENEMY_TYPES: Record<string, EnemyType> = {
  gull: { name: 'SEAGULL', ai: 'gull', w: 14, h: 10, speed: 1.1, contact: 'steal', killBy: ['ball', 'pie'], stun: true, points: 100, line: 'Wants your pie. Only your pie.' },
  steward: { name: 'STEWARD', ai: 'walker', w: 10, h: 22, speed: 0.6, contact: 'march', killBy: ['ball', 'pie'], stun: true, points: 200, line: 'Hi-vis. Low tolerance.' },
  wasp: { name: 'PITCH-INVADING WASP', ai: 'flier', w: 8, h: 8, speed: 0.8, contact: 'kill', killBy: ['ball', 'pie'], stun: true, points: 150, line: 'Gets in for free every week.' },
  cat: { name: 'THE CLUB CAT', ai: 'cat', w: 14, h: 10, speed: 1.3, contact: 'kill', killBy: ['pie'], stun: true, points: 0, line: 'Has nine lives. You have fewer.' },
  sroll: { name: 'ESCAPED SAUSAGE ROLL', ai: 'hopper', w: 12, h: 7, speed: 0.9, contact: 'kill', killBy: ['ball', 'pie'], stun: true, points: 150, line: 'Made a break for it from the tea hut.' },
  admin: { name: 'ADMINISTRATOR', ai: 'thrower', w: 10, h: 22, speed: 0.4, contact: 'kill', killBy: ['ball', 'pie'], stun: true, points: 300, throws: 'paper', throwEvery: 110, line: 'Has a clipboard. Uses it.' },
  creditor: { name: 'CREDITOR', ai: 'chaser', w: 10, h: 22, speed: 0.6, contact: 'kill', killBy: ['ball', 'pie'], stun: true, points: 300, line: 'Waving an invoice. Several, actually.' },
  fan: { name: 'RIVAL FAN', ai: 'thrower', w: 10, h: 22, speed: 0, contact: 'kill', killBy: ['ball', 'pie'], stun: true, points: 250, throws: 'inflatable', throwEvery: 130, line: 'Silly hat. Inflatable banana. Means well.' },
};
