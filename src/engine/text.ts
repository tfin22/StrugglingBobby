import { FB } from './framebuffer';
import { FONT, GLYPH_W, GLYPH_H, ADVANCE } from '../content/font';

// Draw text with a dark drop shadow for the chunky Amiga look.
export function text(fb: FB, s: string, x: number, y: number, c = 7, shadow = 1, scale = 1) {
  s = s.toUpperCase();
  let cx = Math.round(x);
  for (const ch of s) {
    const g = FONT[ch] ?? FONT['?'];
    for (let j = 0; j < GLYPH_H; j++)
      for (let i = 0; i < GLYPH_W; i++)
        if (g[j * GLYPH_W + i]) {
          if (shadow >= 0) fb.rect(cx + i * scale + 1, y + j * scale + 1, scale, scale, shadow);
        }
    for (let j = 0; j < GLYPH_H; j++)
      for (let i = 0; i < GLYPH_W; i++)
        if (g[j * GLYPH_W + i]) fb.rect(cx + i * scale, y + j * scale, scale, scale, c);
    cx += ADVANCE * scale;
  }
  return cx;
}
export function textW(s: string, scale = 1) { return s.length * ADVANCE * scale; }
export function textC(fb: FB, s: string, cx: number, y: number, c = 7, shadow = 1, scale = 1) {
  text(fb, s, Math.round(cx - textW(s, scale) / 2), y, c, shadow, scale);
}
// Word-wrap into lines of at most n chars.
export function wrap(s: string, n: number): string[] {
  const out: string[] = [];
  for (const para of s.split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      if (line && (line + ' ' + w).length > n) { out.push(line); line = w; }
      else line = line ? line + ' ' + w : w;
    }
    out.push(line);
  }
  return out;
}
