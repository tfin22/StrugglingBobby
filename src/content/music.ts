// Original tunes, in a tiny tracker format. Each song: rows per second, and
// patterns of four channels (lead, bass, chords, drums). Notes like 'C4',
// 'F#5'; '.' holds, '-' stops. Drums: K kick, S snare, H hat.
// Terrace-flavoured, but every note is ours: no real chants or songs.
export interface Song { rps: number; ins: [string, string, string, string]; order: number[]; pats: string[][]; loop?: boolean }

const P = (s: string) => s.trim().split(/\s+/);

export const SONGS: Record<string, Song> = {
  title: {
    rps: 4.4, ins: ['lead', 'bass', 'stab', 'drums'], loop: true, order: [0, 1, 0, 2, 3, 3, 0, 2],
    pats: [
      ['G4 . B4 D5 G5 . F#5 E5 D5 . B4 . A4 . . .', 'G2 . D3 . G2 . D3 . G2 . D3 . D2 . F#2 .', '. B3 . B3 . C4 . C4 . B3 . B3 . A3 . A3', 'K H S H K H S H K H S H K K S H'],
      ['C5 . E5 . D5 C5 B4 A4 B4 . G4 . D4 . . .', 'C3 . G2 . C3 . G2 . G2 . D3 . G2 . . .', '. E4 . E4 . D4 . D4 . B3 . B3 . B3 . B3', 'K H S H K H S H K H S H K H S S'],
      ['C5 . A4 . F#4 . A4 . G4 . . . G4 . - .', 'D2 . A2 . D3 . A2 . G2 . D3 . G2 . . .', '. C4 . C4 . A3 . A3 . B3 . B3 . B3 . .', 'K H S H K H S H K H S H K S K S'],
      ['E5 . E5 F#5 G5 . E5 . D5 . B4 G4 A4 . B4 .', 'C3 . G2 . E2 . G2 . G2 . D3 . D2 . D3 .', '. E4 . E4 . C4 . C4 . B3 . B3 . C4 . C4', 'K H S H K H S H K H S H K H S H'],
    ],
  },
  zone1: {
    rps: 4.8, ins: ['lead', 'bass', 'stab', 'drums'], loop: true, order: [0, 1, 0, 2],
    pats: [
      ['D5 . A4 . F#4 A4 D5 . E5 . C#5 . A4 . . .', 'D2 . A2 . D2 . A2 . A1 . E2 . A1 . E2 .', '. F#3 . F#3 . F#3 . F#3 . E3 . E3 . E3 . E3', 'K H S H K H S H K H S H K H S H'],
      ['B4 . G4 . D4 G4 B4 . A4 . F#4 . D4 . . .', 'G2 . D3 . G2 . D3 . D2 . A2 . D2 . A2 .', '. B3 . B3 . B3 . B3 . A3 . A3 . F#3 . F#3', 'K H S H K H S H K H S H K K S H'],
      ['G4 . A4 . B4 . C#5 . D5 . . . D4 . - .', 'G2 . G2 . A2 . A2 . D2 . A2 . D2 . . .', '. B3 . B3 . C#4 . C#4 . D4 . D4 . . . .', 'K H S H K H S H K H S S K . . .'],
    ],
  },
  zone2: {
    rps: 4.2, ins: ['lead', 'bass', 'stab', 'drums'], loop: true, order: [0, 0, 1, 2],
    pats: [
      ['A4 - C5 - E5 - D5 C5 B4 - G#4 - A4 . . -', 'A2 . E2 . A2 . E2 . E2 . B1 . E2 . E2 .', '. C4 . C4 . C4 . C4 . B3 . B3 . C4 . C4', 'K . H . S . H . K . H . S . H H'],
      ['F4 - A4 - C5 - B4 A4 G#4 - E4 - A4 . . -', 'F2 . C3 . F2 . C3 . E2 . B1 . A1 . E2 .', '. A3 . A3 . A3 . A3 . G#3 . G#3 . A3 . A3', 'K . H . S . H . K . H . S . H S'],
      ['E5 . D5 . C5 . B4 . A4 . G#4 . A4 . . .', 'A1 . A2 . E2 . E1 . A1 . E2 . A1 . . .', '. C4 . E4 . A3 . E4 . C4 . B3 . A3 . . .', 'K H S H K H S H K H S H K S K S'],
    ],
  },
  zone3: {
    rps: 3.6, ins: ['lead', 'bass', 'pad', 'drums'], loop: true, order: [0, 1, 0, 2],
    pats: [
      ['E4 . . . G4 . . F#4 E4 . . . B3 . . .', 'E2 . E2 . E2 . E2 . E2 . E2 . E2 . E2 .', 'G3 . . . . . . . F#3 . . . . . . .', 'K . . H . . S . K . . H . . S .'],
      ['C5 . . . B4 . A4 . G4 . . . F#4 . . .', 'C2 . C2 . C2 . C2 . B1 . B1 . B1 . B1 .', 'E3 . . . . . . . D#3 . . . . . . .', 'K . . H . . S . K . . H . S S .'],
      ['E4 . G4 . B4 . E5 . D#5 . . . B4 . . .', 'E2 . . . G2 . . . B1 . . . B1 . . .', 'G3 . . . B3 . . . F#3 . . . D#3 . . .', 'K . H . S . H . K . H . S . H .'],
    ],
  },
  zone4: {
    rps: 5, ins: ['brass', 'bass', 'stab', 'drums'], loop: true, order: [0, 1, 0, 2],
    pats: [
      ['C5 . . G4 C5 . E5 . D5 . . B4 G4 . . .', 'C2 . C3 . C2 . C3 . G1 . G2 . G1 . G2 .', '. E4 . E4 . E4 . E4 . D4 . D4 . D4 . D4', 'K H S H K H S H K H S H K K S H'],
      ['A4 . . F4 A4 . C5 . B4 . . G4 E4 . . .', 'F2 . F3 . F2 . F3 . E2 . E3 . E2 . E3 .', '. C4 . C4 . C4 . C4 . B3 . B3 . B3 . B3', 'K H S H K H S H K H S H K H S S'],
      ['F4 . A4 . C5 . F5 . E5 . D5 . C5 . . .', 'F2 . F2 . G2 . G2 . C2 . G2 . C2 . . .', '. A3 . C4 . B3 . D4 . C4 . . . E4 . . .', 'K H S H K H S H K S K S K S K S'],
    ],
  },
  boss: {
    rps: 6, ins: ['lead', 'bass', 'stab', 'drums'], loop: true, order: [0, 0, 1, 1],
    pats: [
      ['E5 . E5 . D5 . E5 . G5 . E5 . D5 . B4 .', 'E2 E2 . E2 E2 . E2 E2 E2 E2 . E2 E2 . E2 E2', '. B3 . B3 . B3 . B3 . B3 . B3 . B3 . B3', 'K H S H K K S H K H S H K K S S'],
      ['C5 . C5 . B4 . C5 . E5 . C5 . B4 . A4 .', 'C2 C2 . C2 C2 . C2 C2 D2 D2 . D2 D2 . D2 D2', '. G3 . G3 . G3 . G3 . A3 . A3 . A3 . A3', 'K H S H K K S H K H S H K S S S'],
    ],
  },
  victory: {
    rps: 5, ins: ['brass', 'bass', 'stab', 'drums'], loop: false, order: [0, 1],
    pats: [
      ['G4 . C5 . E5 . G5 . . . E5 . G5 . . .', 'C2 . . . C3 . . . C2 . . . C3 . . .', 'E4 . . . G4 . . . E4 . . . G4 . . .', 'K . . . S . . . K . . . S . S S'],
      ['A5 . G5 . F5 . E5 . D5 . . . C5 . . -', 'F2 . . . G2 . . . G2 . . . C2 . . -', 'C4 . . . B3 . . . B3 . . . C4 . . -', 'K . S . K . S . K S K S K . . .'],
    ],
  },
  gameover: {
    rps: 3, ins: ['lead', 'bass', 'pad', 'drums'], loop: false, order: [0],
    pats: [['E4 . D4 . C4 . B3 . A3 . . . . . - .', 'A2 . . . F2 . . . E2 . . . A1 . - .', 'C4 . . . A3 . . . G#3 . . . A3 . - .', 'K . . . . . . . K . . . . . . .']],
  },
};
