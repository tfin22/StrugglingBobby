// Illustrations for the loading screen, title and cutscenes, drawn in code.
import { FB } from '../engine/framebuffer';
import { text, textC, textW } from '../engine/text';
import { blitScaled } from '../app';
import { BOBBY_SPR, THING_SPR, CREATURE_SPR, PEOPLE } from '../content/sprites';

const K = 1, DG = 2, GR = 3, WH = 4, SK = 5, GOLD = 7, GOLDD = 8, GOLDL = 9, RED = 10, REDD = 11, BRN = 12, BRND = 13, BLUE = 15;

export function bigText(fb: FB, s: string, cx: number, y: number, scale = 3, tick = 0) {
  const x = Math.round(cx - textW(s, scale) / 2);
  text(fb, s, x + scale, y + scale, K, -1, scale);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) text(fb, s, x + dx, y + dy, K, -1, scale);
  text(fb, s, x, y, GOLDD, -1, scale);
  fb.clip(0, 0, 320, y + Math.round(scale * 4.5));
  text(fb, s, x, y, GOLD, -1, scale);
  fb.clip(0, 0, 320, y + Math.round(scale * 2));
  text(fb, s, x, y, GOLDL, -1, scale);
  fb.noClip();
  // a glint sweeping across
  const gx = ((tick * 3) % 600) - 100;
  for (let j = 0; j < 7 * scale; j++) for (let i = 0; i < 3; i++) {
    const px = x + gx + i - j / 2;
    const idx = (y + j) * 320 + Math.round(px);
    if (px >= 0 && px < 320 && fb.pix[idx] === GOLD || fb.pix[idx] === GOLDL || fb.pix[idx] === GOLDD) if (px >= x && px < x + textW(s, scale)) fb.pix[idx] = WH;
  }
}

// The invented Levenmouth Athletic crest: black-and-gold shield, an anchor.
export function crest(fb: FB, cx: number, y: number) {
  for (let j = 0; j < 28; j++) {
    const half = j < 18 ? 12 : Math.max(0, 12 - (j - 18) * 1.3);
    fb.rect(cx - half - 1, y + j, half * 2 + 2, 1, K);
    if (j > 0 && j < 27) fb.rect(cx - half + 1, y + j, Math.max(0, half * 2 - 2), 1, j < 9 ? GOLD : K);
  }
  fb.rect(cx - 10, y + 2, 20, 1, GOLDL);
  // stripes
  for (let i = -9; i <= 9; i += 6) fb.rect(cx + i, y + 10, 3, 12, GOLD);
  // anchor
  fb.rect(cx - 1, y + 3, 2, 5, K); fb.rect(cx - 3, y + 4, 6, 1, K);
  textC(fb, 'LA', cx + 1, y + 1, K, -1);
}

function rain(fb: FB, tick: number, x0 = 0, y0 = 0, w = 320, h = 200, n = 70) {
  for (let i = 0; i < n; i++) {
    const x = x0 + ((i * 97 + tick * 2) % w);
    const y = y0 + ((i * 53 + tick * 7) % h);
    fb.pset(x, y, GR); fb.pset(x - 1, y + 2, DG);
  }
}

function cabinet(fb: FB, cx: number, y: number, withCup: boolean, tick: number, dust = false) {
  fb.rect(cx - 30, y, 60, 76, K);
  fb.rect(cx - 29, y + 1, 58, 74, BRN);
  fb.rect(cx - 25, y + 5, 50, 62, BRND);
  fb.rect(cx - 24, y + 6, 48, 60, 18);
  fb.rect(cx - 24, y + 50, 48, 3, BRN);
  for (let i = 0; i < 6; i++) fb.pset(cx - 20 + i, y + 10 + i, WH);
  if (withCup) {
    blitScaled(fb, THING_SPR.cup, cx - 14, y + 10, 2);
    if (tick % 40 < 6) { fb.pset(cx - 6, y + 14, WH); fb.pset(cx - 7, y + 15, WH); fb.pset(cx - 5, y + 15, WH); fb.pset(cx - 6, y + 16, WH); }
  } else if (dust) {
    // the clean outline where it stood
    for (let i = 0; i < 20; i++) { fb.pset(cx - 10 + i, y + 49, GR); }
    fb.rect(cx - 8, y + 47, 16, 2, 19);
  }
  fb.rect(cx - 30, y + 70, 60, 6, BRND);
  text(fb, 'AULD CUP 1938', cx - 38, y + 80, GOLD, K);
}

export function drawScene(fb: FB, scene: string, tick: number) {
  // Each scene draws into y 16..140
  fb.rect(0, 0, 320, 200, K);
  switch (scene) {
    case 'cabinet': case 'empty': case 'cuphome': {
      for (let y = 16; y < 140; y++) fb.rect(32, y, 256, 1, y % 8 === 0 ? 17 : 18);
      for (let x = 40; x < 288; x += 24) fb.rect(x, 16, 1, 124, 17);
      crest(fb, 160, 20);
      cabinet(fb, 160, 52, scene !== 'empty', tick, scene === 'empty');
      if (scene === 'cuphome') for (let i = 0; i < 40; i++) fb.pset(40 + ((i * 61 + tick) % 240), 16 + ((i * 37 + tick * 2) % 120), [GOLD, RED, WH, BLUE][i % 4]);
      break;
    }
    case 'note': {
      fb.rect(80, 30, 160, 100, WH);
      fb.rect(80, 30, 160, 2, GR);
      fb.rect(236, 30, 4, 100, GR);
      for (let i = 0; i < 6; i++) fb.rect(90, 50 + i * 12, 140, 1, 26);
      text(fb, 'TAKEN AS SECURITY.', 92, 46, BLUE, -1);
      text(fb, 'KIND REGARDS,', 92, 70, BLUE, -1);
      text(fb, 'THE BARON', 120, 94, BLUE, -1);
      fb.line(118, 104, 190, 101, BLUE);
      fb.circle(210, 115, 8, RED); textC(fb, 'B', 211, 112, GOLDL, -1);
      break;
    }
    case 'bobby': case 'bag': case 'phone': {
      for (let y = 16; y < 140; y++) fb.rect(32, y, 256, 1, y < 70 ? 2 : 3);
      // the main stand
      fb.rect(32, 60, 256, 40, 17);
      for (let x = 32; x < 288; x += 16) fb.rect(x, 60, 1, 40, 16);
      fb.rect(32, 56, 256, 4, 28);
      fb.rect(32, 100, 256, 40, 25);
      blitScaled(fb, BOBBY_SPR.stand, 136, 54, 3);
      // the scarf
      for (let i = 0; i < 8; i++) fb.rect(148 + i * 3, 81, 3, 3, i % 2 ? GOLD : K);
      if (scene === 'bag') blitScaled(fb, THING_SPR.kitbag, 186, 106, 2);
      if (scene === 'phone') {
        fb.rect(174, 64, 6, 12, K); fb.rect(175, 65, 4, 10, DG);
        if (tick % 40 < 20) text(fb, 'RING... RING...', 196, 50, WH, K);
      }
      rain(fb, tick, 32, 16, 256, 124);
      break;
    }
    case 'lada': {
      for (let y = 16; y < 140; y++) fb.rect(32, y, 256, 1, y < 90 ? 2 : y < 100 ? 3 : 2);
      fb.rect(32, 100, 256, 2, WH);
      for (let x = 32; x < 288; x += 24) fb.rect(x + ((tick * 4) % 24), 120, 12, 2, GOLD);
      const lx = 288 - ((tick * 2) % 380);
      blitScaled(fb, CREATURE_SPR.lada, lx, 90, 2);
      // Harbour Park's floodlights in the distance
      fb.rect(50, 30, 2, 60, 27); fb.rect(44, 26, 14, 6, GOLDL);
      fb.rect(250, 30, 2, 60, 27); fb.rect(244, 26, 14, 6, GOLDL);
      rain(fb, tick, 32, 16, 256, 124);
      break;
    }
    case 'chairman': {
      for (let y = 16; y < 140; y++) fb.rect(32, y, 256, 1, 21);
      for (let x = 40; x < 288; x += 36) { textC(fb, "SENGA'S PIES", x + 16, 30, GOLD, K); textC(fb, 'METHIL TYRES', x + 34, 46, WH, K); }
      blitScaled(fb, PEOPLE.chairman.walk2, 142, 50, 3);
      fb.rect(120, 104, 80, 36, BRND); fb.rect(121, 105, 78, 34, BRN);
      crest(fb, 160, 108);
      for (let i = 0; i < 3; i++) { fb.rect(144 + i * 12, 96, 2, 10, K); fb.rect(142 + i * 12, 93, 6, 4, DG); }
      if (tick % 50 < 3) fb.rect(32, 16, 256, 124, WH);
      break;
    }
    case 'stadium': {
      for (let y = 16; y < 140; y++) fb.rect(32, y, 256, 1, y < 50 ? 16 : y < 100 ? 17 : 24);
      for (let i = 0; i < 4; i++) {
        const x = 50 + i * 68;
        fb.rect(x, 22, 2, 40, 27); fb.rect(x - 8, 18, 18, 8, tick % 20 < 10 ? 31 : GOLDL);
      }
      for (let i = 0; i < 260; i++) fb.pset(32 + ((i * 41) % 256), 62 + ((i * 17) % 34), [SK, RED, GOLD, WH, BLUE][(i + (tick >> 3)) % 5]);
      fb.rect(146, 104, 28, 20, GR); fb.rect(146, 104, 28, 2, WH);
      blitScaled(fb, THING_SPR.cup, 146, 64, 2);
      break;
    }
    case 'pies': {
      for (let y = 16; y < 140; y++) fb.rect(32, y, 256, 1, 18);
      blitScaled(fb, THING_SPR.piestall, 120, 60, 5);
      blitScaled(fb, PEOPLE.senga.walk2, 210, 68, 3, true);
      for (let i = 0; i < 5; i++) blitScaled(fb, THING_SPR.pie, 60 + i * 12, 120 - (i % 2) * 6, 1);
      break;
    }
  }
}

// The fake disk loading picture: Bobby on the touchline in the rain,
// gripping his scarf, the gold cup in a beam of light behind him.
export function drawLoadingArt(fb: FB) {
  fb.rect(0, 0, 320, 200, K);
  // night sky bands
  for (let y = 0; y < 120; y++) fb.rect(0, y, 320, 1, y < 30 ? 16 : y < 60 ? 29 : y < 90 ? 17 : 18);
  // the beam of light
  for (let y = 0; y < 150; y++) {
    const w = 10 + y * 0.45;
    const x0 = 220 - w / 2;
    for (let x = 0; x < w; x++) if ((x + y) % 2 === 0 || y > 100) fb.pset(x0 + x, y, y > 90 ? GOLDD : 19);
  }
  // stand silhouette and floodlight pylons
  fb.rect(0, 110, 320, 40, 16);
  for (let x = 0; x < 320; x += 8) fb.rect(x, 110 + ((x * 7) % 5), 4, 2, 17);
  for (const px of [30, 290]) {
    fb.rect(px, 20, 3, 92, 27); fb.rect(px - 10, 12, 24, 10, K);
    for (let i = 0; i < 4; i++) fb.rect(px - 8 + i * 6, 14, 4, 6, GOLDL);
  }
  // pitch
  for (let y = 150; y < 200; y++) fb.rect(0, y, 320, 1, Math.floor(y / 6) % 2 ? 24 : 25);
  fb.rect(0, 160, 320, 1, WH);
  // the cup on its plinth, glowing
  fb.rect(204, 128, 32, 22, GR); fb.rect(204, 128, 32, 2, WH);
  blitScaled(fb, THING_SPR.cup, 206, 88, 2);
  // Bobby, big, gripping his scarf
  blitScaled(fb, BOBBY_SPR.stand, 40, 62, 4);
  for (let i = 0; i < 9; i++) fb.rect(54 + i * 4, 92, 4, 5, i % 2 ? GOLD : K);
  for (let i = 0; i < 5; i++) fb.rect(86, 97 + i * 5, 5, 5, i % 2 ? GOLD : K);
  // rain
  for (let i = 0; i < 160; i++) { const x = (i * 97) % 320, y = (i * 59) % 200; fb.pset(x, y, GR); fb.pset(x - 1, y + 2, GR); }
  bigText(fb, "BOBBY STRUGGLIN'", 160, 170, 2, 999);
}

export function drawTitleBack(fb: FB, tick: number) {
  fb.rect(0, 0, 320, 200, 0);
  // floodlight pylons with lamps that cycle (palette index 31 is cycled by the scene)
  for (const px of [20, 296]) {
    fb.rect(px, 30, 3, 120, 27);
    fb.rect(px - 12, 18, 28, 14, K);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) fb.rect(px - 10 + i * 9, 20 + j * 6, 7, 4, 31);
  }
  // the stand with the crowd
  fb.rect(0, 150, 320, 50, 16);
  for (let i = 0; i < 400; i++) fb.pset((i * 41) % 320, 152 + ((i * 17) % 30), [SK, RED, GOLD, WH, 21][(i + (tick >> 4)) % 5]);
  fb.rect(0, 182, 320, 18, 25);
  for (let x = 0; x < 320; x += 32) fb.rect(x, 182, 16, 18, 24);
}

export { REDD };
