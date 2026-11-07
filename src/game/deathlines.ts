import { World, DeathCause } from './types';
import { DEATH_LINES, DeathLine } from '../content/text/deathlines';
import { rngNext } from '../engine/rng';

export function candidates(cause: DeathCause, zone: number, any: boolean): DeathLine[] {
  return DEATH_LINES.filter((l) => (any ? l.c.includes('any') : l.c.includes(cause)) && (!l.z || l.z.includes(zone)));
}

// Picks a line that fits the death. Never the same line twice running.
export function pickDeathLine(w: World, cause: DeathCause): string {
  const s = w.lineState;
  const last = DEATH_LINES[s.last];
  if (last?.next && s.lastScreen === w.screen) {
    s.last = -1; s.lastScreen = w.screen;
    return last.next;
  }
  const specific = cause === 'any' ? [] : candidates(cause, w.zone, false);
  const pool = specific.length && rngNext(w) < 0.7 ? specific : candidates(cause, w.zone, true);
  let pick = pool[Math.floor(rngNext(w) * pool.length)];
  if (DEATH_LINES.indexOf(pick) === s.last) pick = pool[(pool.indexOf(pick) + 1) % pool.length];
  s.last = DEATH_LINES.indexOf(pick);
  s.lastScreen = w.screen;
  s.lastCause = cause;
  return pick.t;
}
