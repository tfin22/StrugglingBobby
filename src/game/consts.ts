// Screen layout, matching Rick's Amiga screen: 320x200, a 256-wide play area
// centred with borders either side, the status line at the top.
export const STATUS_H = 24;
export const PLAY_X = 32;
export const PLAY_Y = 24;
export const PW = 256;
export const PH = 176;
export const TS = 16;
export const COLS = 16;
export const ROWS = 11;

// Input bits (one byte per 50 Hz frame; routes are recorded as these)
export const IN_L = 1, IN_R = 2, IN_U = 4, IN_D = 8, IN_J = 16, IN_K = 32, IN_P = 64, IN_S = 128;
