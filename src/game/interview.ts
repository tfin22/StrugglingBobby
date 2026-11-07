// The interview reacts to how the zone went.
import { INTERVIEWS } from '../content/text/interview';
import { ZoneStats } from './types';

export interface ZoneReport { deaths: number; seconds: number; piesUsed: number; bossFirstTime: boolean; screens: number }

export function report(s: ZoneStats, screens: number): ZoneReport {
  return { deaths: s.deaths, seconds: Math.round(s.frames / 50), piesUsed: s.piesUsed, bossFirstTime: s.bossDeaths === 0, screens };
}

export function tierKey(by: string, r: ZoneReport): string {
  switch (by) {
    case 'deaths': return r.deaths <= 2 ? 'great' : r.deaths <= 8 ? 'ok' : 'awful';
    case 'boss': return r.bossFirstTime ? 'first' : 'not';
    case 'pies': return r.piesUsed === 0 ? 'none' : r.piesUsed <= 5 ? 'few' : 'many';
    case 'time': return r.seconds <= r.screens * 30 ? 'fast' : 'slow';
  }
  return '';
}

export function interview(zone: number, r: ZoneReport): { q: string; a: string }[] {
  const fill = (s: string) => s.replace(/\{D\}/g, String(r.deaths)).replace(/\{P\}/g, String(r.piesUsed));
  return INTERVIEWS[zone].map((qa) => ({ q: fill(qa.q), a: fill(qa.a[tierKey(qa.by, r)]) }));
}
