// Original tunes, in a tiny tracker format. Each song: rows per second, four
// channels (lead, bass, chords, drums), patterns of 16 rows, and an order
// that can transpose a pattern ([pattern, semitones]). Notes like 'C4',
// 'F#5'; '.' holds, '-' stops. Drums: K kick, S snare, H hat, O open hat,
// T tom, C crash. Terrace-flavoured, but every note is ours: no real chants
// or songs, transcribed or paraphrased.
export interface Song { rps: number; ins: [string, string, string, string]; order: (number | [number, number])[]; pats: string[][]; loop?: boolean }

export const SONGS: Record<string, Song> = {
  title: {
    rps: 4.4, ins: ['lead', 'bass', 'stab', 'drums'], loop: true,
    order: [5, 0, 1, 0, 2, 3, 3, [3, 2], 4, 0, 1, 0, 2],
    pats: [
      ['G4 . B4 D5 G5 . F#5 E5 D5 . B4 . A4 . . .', 'G2 . D3 . G2 . D3 . G2 . D3 . D2 . F#2 .', '. B3 . B3 . C4 . C4 . B3 . B3 . A3 . A3', 'K H S H K H S H K H S H K K S H'],
      ['C5 . E5 . D5 C5 B4 A4 B4 . G4 . D4 . . .', 'C3 . G2 . C3 . G2 . G2 . D3 . G2 . . .', '. E4 . E4 . D4 . D4 . B3 . B3 . B3 . B3', 'K H S H K H S H K H S H K H S S'],
      ['C5 . A4 . F#4 . A4 . G4 . . . G4 . - .', 'D2 . A2 . D3 . A2 . G2 . D3 . G2 . . .', '. C4 . C4 . A3 . A3 . B3 . B3 . B3 . .', 'K H S H K H S H K H S H K S K S'],
      ['E5 . E5 F#5 G5 . E5 . D5 . B4 G4 A4 . B4 .', 'C3 . G2 . E2 . G2 . G2 . D3 . D2 . D3 .', '. E4 . E4 . C4 . C4 . B3 . B3 . C4 . C4', 'K H S H K H S O K H S H K H S H'],
      ['B4 . . . A4 . . . G4 . A4 . B4 . D5 .', 'E2 . . . D2 . . . C2 . . . D2 . . .', 'G3 . . . F#3 . . . E3 . . . F#3 . . .', 'K . . . T . . . K . . . T T S S'],
      ['- . . . . . . . . . . . . . . .', 'G1 . . . . . . . D2 . . . . . . .', 'G3 . . . . . . . F#3 . . . . . . .', 'C . . . . . . . K . K . S S S S'],
    ],
  },
  zone1: {
    rps: 4.8, ins: ['lead', 'bass', 'stab', 'drums'], loop: true,
    order: [0, 1, 0, 2, 3, 4, [0, 2], [1, 2], 5, 3, 4, 0, 1],
    pats: [
      ['D5 . A4 . F#4 A4 D5 . E5 . C#5 . A4 . . .', 'D2 . A2 . D2 . A2 . A1 . E2 . A1 . E2 .', '. F#3 . F#3 . F#3 . F#3 . E3 . E3 . E3 . E3', 'K H S H K H S H K H S H K H S H'],
      ['D5 . A4 . F#4 A4 D5 E5 F#5 . E5 D5 E5 . . .', 'D2 . A2 . D2 . A2 . A1 . E2 . A1 . C#2 .', '. F#3 . F#3 . F#3 . F#3 . E3 . E3 . G3 . G3', 'K H S H K H S H K H S H K K S O'],
      ['B4 . G4 . D4 G4 B4 . A4 . F#4 . D4 . . .', 'G2 . D3 . G2 . D3 . D2 . A2 . D2 . A2 .', '. B3 . B3 . B3 . B3 . A3 . A3 . F#3 . F#3', 'K H S H K H S H K H S H K K S H'],
      ['G4 . A4 . B4 . C#5 . D5 . . . D4 . - .', 'G2 . G2 . A2 . A2 . D2 . A2 . D2 . . .', '. B3 . B3 . C#4 . C#4 . D4 . D4 . . . .', 'K H S H K H S H K H S S K . . .'],
      ['A5 . . . F#5 . . . E5 . . . D5 . . .', 'D2 . . D2 . . D2 . A1 . . A1 . . A1 .', 'F#3 . . . . . . . E3 . . . . . . .', 'K . . . S . . . K . K . S . . .'],
      ['F#5 E5 D5 C#5 B4 . A4 . G4 F#4 E4 D4 E4 . A4 .', 'B1 . B2 . A1 . A2 . G1 . G2 . A1 . A2 .', '. D4 . D4 . C#4 . C#4 . B3 . B3 . C#4 . C#4', 'K H S H K H S H T H T H S S S C'],
    ],
  },
  zone2: {
    rps: 4.2, ins: ['lead', 'bass', 'stab', 'drums'], loop: true,
    order: [0, 0, 1, 2, 3, [0, 3], [1, 3], 4, 2, 0],
    pats: [
      ['A4 - C5 - E5 - D5 C5 B4 - G#4 - A4 . . -', 'A2 . E2 . A2 . E2 . E2 . B1 . E2 . E2 .', '. C4 . C4 . C4 . C4 . B3 . B3 . C4 . C4', 'K . H . S . H . K . H . S . H H'],
      ['F4 - A4 - C5 - B4 A4 G#4 - E4 - A4 . . -', 'F2 . C3 . F2 . C3 . E2 . B1 . A1 . E2 .', '. A3 . A3 . A3 . A3 . G#3 . G#3 . A3 . A3', 'K . H . S . H . K . H . S . H S'],
      ['E5 . D5 . C5 . B4 . A4 . G#4 . A4 . . .', 'A1 . A2 . E2 . E1 . A1 . E2 . A1 . . .', '. C4 . E4 . A3 . E4 . C4 . B3 . A3 . .', 'K H S H K H S H K H S H K S K S'],
      ['C5 - - E5 - - A5 . G#5 . E5 . B4 . . .', 'D2 . . D2 . . D2 . E2 . . E2 . . E2 .', 'F3 . . . A3 . . . G#3 . . . B3 . . .', 'K . . K S . . . K . . K S . T T'],
      ['A4 . B4 . C5 . D5 . E5 . F5 . E5 . . .', 'A1 . . . G1 . . . F1 . . . E1 . . .', 'C4 . . . B3 . . . A3 . . . G#3 . . .', 'K . . . O . . . K . . . O . C .'],
    ],
  },
  zone3: {
    rps: 3.6, ins: ['flute', 'bass', 'pad', 'drums'], loop: true,
    order: [0, 1, 0, 2, 3, [1, -2], 4, 0, 2],
    pats: [
      ['E4 . . . G4 . . F#4 E4 . . . B3 . . .', 'E2 . E2 . E2 . E2 . E2 . E2 . E2 . E2 .', 'G3 . . . . . . . F#3 . . . . . . .', 'K . . H . . S . K . . H . . S .'],
      ['C5 . . . B4 . A4 . G4 . . . F#4 . . .', 'C2 . C2 . C2 . C2 . B1 . B1 . B1 . B1 .', 'E3 . . . . . . . D#3 . . . . . . .', 'K . . H . . S . K . . H . S S .'],
      ['E4 . G4 . B4 . E5 . D#5 . . . B4 . . .', 'E2 . . . G2 . . . B1 . . . B1 . . .', 'G3 . . . B3 . . . F#3 . . . D#3 . . .', 'K . H . S . H . K . H . S . H .'],
      ['- . . . . . . . E5 . D5 . B4 . . .', 'A1 . . . . . . . E2 . . . . . . .', 'C4 . . . . . . . B3 . . . . . . .', 'T . . . . . . . T . . T . . . .'],
      ['G4 . F#4 . E4 . D4 . E4 . F#4 . G4 . A4 .', 'C2 . . . D2 . . . E2 . . . D2 . . .', 'E3 . . . F#3 . . . G3 . . . F#3 . . .', 'K . H . S . H . K . H . S . O .'],
    ],
  },
  zone4: {
    rps: 5, ins: ['brass', 'bass', 'stab', 'drums'], loop: true,
    order: [5, 0, 1, 0, 2, 3, 4, [0, 2], [1, 2], 3, 2, 0],
    pats: [
      ['C5 . . G4 C5 . E5 . D5 . . B4 G4 . . .', 'C2 . C3 . C2 . C3 . G1 . G2 . G1 . G2 .', '. E4 . E4 . E4 . E4 . D4 . D4 . D4 . D4', 'K H S H K H S H K H S H K K S H'],
      ['A4 . . F4 A4 . C5 . B4 . . G4 E4 . . .', 'F2 . F3 . F2 . F3 . E2 . E3 . E2 . E3 .', '. C4 . C4 . C4 . C4 . B3 . B3 . B3 . B3', 'K H S H K H S H K H S H K H S S'],
      ['F4 . A4 . C5 . F5 . E5 . D5 . C5 . . .', 'F2 . F2 . G2 . G2 . C2 . G2 . C2 . . .', '. A3 . C4 . B3 . D4 . C4 . . E4 . . .', 'K H S H K H S H K S K S K S K S'],
      ['E5 . E5 . E5 . D5 C5 D5 . . . G4 . . .', 'A1 . A2 . A1 . A2 . G1 . G2 . G1 . G2 .', '. C4 . C4 . C4 . C4 . B3 . B3 . B3 . B3', 'K H S O K H S O K H S O K K S C'],
      ['C5 . D5 . E5 . G5 . A5 . . . G5 . . .', 'F2 . . . G2 . . . A2 . . . G2 . . .', 'A3 . . . B3 . . . C4 . . . B3 . . .', 'T . . T . . T . T T T T S S S S'],
      ['- . . . . . . . . . . . . . . .', 'C2 . . . . . . . G1 . . . . . . .', 'E3 . . . . . . . D3 . . . . . . .', 'C . . . K . . . C . . . K K S S'],
    ],
  },
  boss: {
    rps: 6, ins: ['lead', 'bass', 'stab', 'drums'], loop: true,
    order: [0, 0, 1, 1, 2, [0, 1], [1, 1], 2],
    pats: [
      ['E5 . E5 . D5 . E5 . G5 . E5 . D5 . B4 .', 'E2 E2 . E2 E2 . E2 E2 E2 E2 . E2 E2 . E2 E2', '. B3 . B3 . B3 . B3 . B3 . B3 . B3 . B3', 'K H S H K K S H K H S H K K S S'],
      ['C5 . C5 . B4 . C5 . E5 . C5 . B4 . A4 .', 'C2 C2 . C2 C2 . C2 C2 D2 D2 . D2 D2 . D2 D2', '. G3 . G3 . G3 . G3 . A3 . A3 . A3 . A3', 'K H S H K K S H K H S H K S S S'],
      ['B4 . . . B4 . . . C5 . . . D5 . D#5 .', 'B1 . B1 . B1 . B1 . B1 . B1 . B1 . B1 .', 'D#4 . . . D#4 . . . E4 . . . F#4 . . .', 'T . T . T . T . T T T T S S C .'],
    ],
  },
  victory: {
    rps: 5, ins: ['brass', 'bass', 'stab', 'drums'], loop: false, order: [0, 1],
    pats: [
      ['G4 . C5 . E5 . G5 . . . E5 . G5 . . .', 'C2 . . . C3 . . . C2 . . . C3 . . .', 'E4 . . . G4 . . . E4 . . . G4 . . .', 'C . . . S . . . K . . . S . S S'],
      ['A5 . G5 . F5 . E5 . D5 . . . C5 . . -', 'F2 . . . G2 . . . G2 . . . C2 . . -', 'C4 . . . B3 . . . B3 . . . C4 . . -', 'K . S . K . S . K S K S C . . .'],
    ],
  },
  gameover: {
    rps: 3, ins: ['flute', 'bass', 'pad', 'drums'], loop: false, order: [0],
    pats: [['E4 . D4 . C4 . B3 . A3 . . . . . - .', 'A2 . . . F2 . . . E2 . . . A1 . - .', 'C4 . . . A3 . . . G#3 . . . A3 . - .', 'K . . . . . . . K . . . . . . .']],
  },
};
