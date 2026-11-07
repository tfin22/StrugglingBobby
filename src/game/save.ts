// localStorage: versioned, prefixed bs.*, and safe if storage is unavailable.
export interface Settings { music: boolean; sfx: boolean; crt: boolean; classic: boolean; haptics: boolean }
export interface ScoreEntry { name: string; score: number; zone: number; mode: string }
export interface Autosave { mode: string; zone: number; score: number; lives: number; balls: number; pies: number; seed: number }

const V = 1;
function get<T>(k: string, def: T): T {
  try {
    const s = localStorage.getItem(`bs.${k}`);
    if (!s) return def;
    const o = JSON.parse(s);
    if (o?.v !== V) return def;
    return o.d as T;
  } catch { return def; }
}
function set(k: string, d: unknown) { try { localStorage.setItem(`bs.${k}`, JSON.stringify({ v: V, d })); } catch { /* storage full or blocked */ } }

export const DEFAULT_SCORES: ScoreEntry[] = [
  { name: 'BOB', score: 50000, zone: 4, mode: '2026' },
  { name: 'SEN', score: 40000, zone: 3, mode: '2026' },
  { name: 'ECK', score: 30000, zone: 3, mode: '2026' },
  { name: 'TAM', score: 25000, zone: 2, mode: '2026' },
  { name: 'CHR', score: 20000, zone: 2, mode: '2026' },
  { name: 'DUG', score: 15000, zone: 2, mode: '2026' },
  { name: 'ADM', score: 10000, zone: 1, mode: '2026' },
  { name: 'BRN', score: 7500, zone: 1, mode: '2026' },
  { name: 'GUL', score: 5000, zone: 1, mode: '2026' },
  { name: 'CAT', score: 2500, zone: 1, mode: '2026' },
];

// Returns the index the score would take in the top 10, or -1.
export function scoreRank(table: ScoreEntry[], score: number): number {
  if (score <= 0) return -1;
  for (let i = 0; i < 10; i++) if (i >= table.length || score > table[i].score) return i;
  return -1;
}
export function insertScore(table: ScoreEntry[], e: ScoreEntry): { table: ScoreEntry[]; rank: number } {
  const rank = scoreRank(table, e.score);
  if (rank < 0) return { table, rank };
  const t = table.slice();
  t.splice(rank, 0, e);
  return { table: t.slice(0, 10), rank };
}

export const store = {
  settings: (): Settings => ({ music: true, sfx: true, crt: false, classic: false, haptics: true, ...get<Partial<Settings>>('settings', {}) }),
  saveSettings: (s: Settings) => set('settings', s),
  scores: (): ScoreEntry[] => get('scores', DEFAULT_SCORES),
  saveScores: (t: ScoreEntry[]) => set('scores', t),
  trophies: (): string[] => get('trophies', []),
  saveTrophies: (t: string[]) => set('trophies', t),
  unlocked: (): number => get('unlocked', 1),
  saveUnlocked: (n: number) => set('unlocked', n),
  autosave: (): Autosave | null => get('autosave', null),
  saveAutosave: (a: Autosave | null) => set('autosave', a),
  furthest: (): number => get('furthest', 1),
  saveFurthest: (n: number) => set('furthest', n),
  totalDeaths: (): number => get('deaths', 0),
  saveTotalDeaths: (n: number) => set('deaths', n),
  reset: () => { try { Object.keys(localStorage).filter((k) => k.startsWith('bs.')).forEach((k) => localStorage.removeItem(k)); } catch { /* */ } },
};
