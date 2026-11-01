import { ZoneDef, ScreenDef } from './types';
import { ZONE1 } from './zone1';
import { ZONE2 } from './zone2';
import { ZONE3 } from './zone3';
import { ZONE4 } from './zone4';

export const ZONES: ZoneDef[] = [ZONE1, ZONE2, ZONE3, ZONE4];

const byId = new Map<string, ScreenDef>();
const byAt = new Map<string, ScreenDef>();
ZONES.forEach((z) => z.screens.forEach((s) => { byId.set(s.id, s); byAt.set(`${z.n}:${s.at[0]},${s.at[1]}`, s); }));

export function screenDef(id: string): ScreenDef {
  const s = byId.get(id);
  if (!s) throw new Error('No screen ' + id);
  return s;
}
export function zoneOfScreen(id: string): number { return Number(id[1]) - 1; }
export function neighbour(zone: number, id: string, dx: number, dy: number): ScreenDef | undefined {
  const s = screenDef(id);
  return byAt.get(`${zone}:${s.at[0] + dx},${s.at[1] + dy}`);
}
