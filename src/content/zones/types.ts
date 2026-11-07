export interface EntDef {
  t: string;              // entity type: pickup, trap, enemy, sign, exit, boss...
  x: number; y: number;   // tile coords
  type?: string;
  name?: string;
  link?: string[];
  x0?: number; x1?: number; // patrol bounds in tiles
  y0?: number;
  dir?: number;
  len?: number;           // tiles long (studs, gates)
  trig?: [number, number, number, number]; // trigger rect in tiles: x0,y0,x1,y1 inclusive
  period?: number; phase?: number; on?: number; delay?: number;
  text?: string;
  trap?: boolean;
  closed?: boolean;
}
export interface ScreenDef {
  id: string;
  at: [number, number];    // column, row in the zone grid
  name: string;            // room name, shown in the status strip
  map: string[];           // 11 rows of 16 tile chars
  ents?: EntDef[];
  needs?: { balls?: number; pies?: number };
  boss?: string;
  back?: string;           // tile drawn behind see-through tiles (indoors)
}
export interface ZoneDef {
  n: number;
  name: string;            // "HARBOUR PARK"
  sub: string;             // subtitle on the zone card
  start: { screen: string; x: number; y: number; facing?: number };
  screens: ScreenDef[];
  music: string;
}
