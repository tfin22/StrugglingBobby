// Paula-style sound: every sample is generated in code at startup as 8-bit
// data, played on four music channels plus effects, through a gentle
// low-pass like the Amiga's output filter. Nothing sampled or recorded.
import { SONGS, Song } from '../content/music';

const SR = 22050;

function q8(v: number) { return Math.round(Math.max(-1, Math.min(1, v)) * 127) / 127; } // 8-bit grit

type Gen = (t: number, i: number, n: number) => number;

let seed = 1;
function noise() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed / 0x3fffffff) - 1; }

function midiHz(n: number) { return 440 * Math.pow(2, (n - 69) / 12); }
function parseNote(s: string): number | null {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(s);
  if (!m) return null;
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  return 12 * (Number(m[3]) + 1) + base[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

export class Audio {
  ctx: AudioContext | null = null;
  master!: GainNode; musicGain!: GainNode; sfxGain!: GainNode; crowdGain!: GainNode;
  buffers: Record<string, AudioBuffer> = {};
  waves: Record<string, AudioBuffer> = {};
  musicOn = true; sfxOn = true;
  song: Song | null = null; songName = '';
  row = 0; nextTime = 0; patIdx = 0;
  voices: (AudioBufferSourceNode | null)[] = [null, null, null, null];
  voiceGains: (GainNode | null)[] = [null, null, null, null];
  crowdLevel = 0;
  lastPlay: Record<string, number> = {};

  // Build every sample up front (during the loading screen); the context stays
  // suspended until the first tap or key, as browsers require.
  prepare() { if (!this.ctx) this.create(); }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    this.create();
    (this.ctx as AudioContext | null)?.resume();
  }

  private create() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 5200; lp.Q.value = 0.4;
    this.master = ctx.createGain(); this.master.gain.value = 0.8;
    this.master.connect(lp); lp.connect(ctx.destination);
    this.musicGain = ctx.createGain(); this.musicGain.gain.value = 0.32; this.musicGain.connect(this.master);
    // A tracker-style echo: a delayed, filtered copy of the music fed back on itself.
    const dl = ctx.createDelay(1); dl.delayTime.value = 0.27;
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    const wet = ctx.createGain(); wet.gain.value = 0.22;
    const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2400;
    this.musicGain.connect(dl); dl.connect(dlp); dlp.connect(fb); fb.connect(dl); dlp.connect(wet); wet.connect(this.master);
    this.sfxGain = ctx.createGain(); this.sfxGain.gain.value = 0.55; this.sfxGain.connect(this.master);
    this.crowdGain = ctx.createGain(); this.crowdGain.gain.value = 0; this.crowdGain.connect(this.master);
    this.build();
    this.startCrowd();
  }

  private buf(len: number, gen: Gen): AudioBuffer {
    const n = Math.max(1, Math.floor(len * SR));
    const b = this.ctx!.createBuffer(1, n, SR);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = q8(gen(i / SR, i, n));
    return b;
  }

  private build() {
    // Single-cycle instrument waves (looped and pitched by playbackRate). 64 samples at C4-ish.
    const cyc = (f: (p: number) => number) => {
      const n = 128;
      const b = this.ctx!.createBuffer(1, n, SR);
      const d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = q8(f(i / n));
      return b;
    };
    this.waves.lead = cyc((p) => (p < 0.25 ? 0.7 : -0.7));
    this.waves.stab = cyc((p) => (p < 0.5 ? 0.6 : -0.6));
    this.waves.bass = cyc((p) => (p < 0.5 ? 4 * p - 1 : 3 - 4 * p) * 0.9);
    this.waves.brass = cyc((p) => (2 * p - 1) * 0.6 + (p < 0.3 ? 0.25 : -0.1));
    this.waves.pad = cyc((p) => Math.sin(p * Math.PI * 2) * 0.6 + Math.sin(p * Math.PI * 4) * 0.2);
    this.waves.flute = cyc((p) => Math.sin(p * Math.PI * 2) * 0.75 + Math.sin(p * Math.PI * 6) * 0.08 + (p < 0.5 ? 0.05 : -0.05));

    const env = (t: number, a: number, d: number) => (t < a ? t / a : Math.exp(-(t - a) / d));
    const B = this.buffers;
    B.K = this.buf(0.18, (t) => Math.sin(2 * Math.PI * (60 + 120 * Math.exp(-t * 30)) * t) * env(t, 0.002, 0.06));
    B.S = this.buf(0.16, (t) => (noise() * 0.7 + Math.sin(2 * Math.PI * 190 * t) * 0.3) * env(t, 0.001, 0.05));
    B.H = this.buf(0.05, (t) => noise() * env(t, 0.001, 0.012) * 0.6);
    let hp = 0;
    B.O = this.buf(0.3, (t) => { const n = noise(); const v = n - hp; hp = n; return v * env(t, 0.002, 0.09) * 0.45; });
    B.T = this.buf(0.3, (t) => Math.sin(2 * Math.PI * (95 + 60 * Math.exp(-t * 18)) * t) * env(t, 0.002, 0.12) * 0.9);
    B.C = this.buf(1.1, (t) => { const n = noise(); const v = n - hp; hp = n * 0.6; return (v * 0.7 + n * 0.2) * env(t, 0.002, 0.35) * 0.5; });

    // Effects
    let ph = 0;
    const sweep = (len: number, f0: number, f1: number, shape: 'sq' | 'sin' | 'saw', vol = 0.7, dec = 0.3) => {
      ph = 0;
      return this.buf(len, (t) => {
        const f = f0 + (f1 - f0) * (t / len);
        ph += f / SR;
        const p = ph % 1;
        const v = shape === 'sq' ? (p < 0.5 ? 1 : -1) : shape === 'saw' ? 2 * p - 1 : Math.sin(p * 2 * Math.PI);
        return v * vol * env(t, 0.003, dec);
      });
    };
    let lpS = 0;
    const nz = (len: number, cutoff: number, vol = 0.7, dec = 0.2, a = 0.002) => {
      lpS = 0;
      const k = Math.min(1, cutoff / SR * 6);
      return this.buf(len, (t) => { lpS += (noise() - lpS) * k; return lpS * vol * env(t, a, dec) * (1 / Math.sqrt(k)) * 0.5; });
    };
    // A springy hop: a pulse sweeping up with a wobble, and a little scuff
    ph = 0;
    B.jump = this.buf(0.2, (t) => { const f = 260 + 900 * t + 60 * Math.sin(t * 90); ph += f / SR; return (((ph % 1) < 0.3 ? 1 : -1) * 0.32 + noise() * 0.15 * Math.exp(-t * 80)) * env(t, 0.002, 0.07); });
    B.step = nz(0.04, 1800, 0.35, 0.012);
    B.land = this.buf(0.12, (t) => (Math.sin(2 * Math.PI * (110 - 300 * t) * t) * 0.6 + noise() * 0.35) * env(t, 0.001, 0.035));
    // The ball off Bobby's boot: a thump, a leathery pock, a click of the laces
    B.kick = this.buf(0.16, (t) => (Math.sin(2 * Math.PI * (70 + 160 * Math.exp(-t * 45)) * t) * 0.85 + Math.sin(2 * Math.PI * 340 * t) * 0.35 * Math.exp(-t * 60) + noise() * 0.4 * Math.exp(-t * 150)) * env(t, 0.001, 0.05));
    B.bounce = this.buf(0.12, (t) => (Math.sin(2 * Math.PI * (300 - 900 * t) * t) * 0.6 + noise() * 0.2 * Math.exp(-t * 120)) * env(t, 0.001, 0.04));
    B.thud = nz(0.15, 300, 0.9, 0.05);
    // A lit pie: crackles, not just hiss
    B.fizz = this.buf(0.25, (t) => (Math.random() < 0.04 ? (Math.random() - 0.5) * 1.6 : 0) + noise() * 0.12 * env(t, 0.01, 0.1));
    // A soggy boom with a deep body and a crunchy tail
    B.boom = this.buf(1.2, (t) => { lpS += (noise() - lpS) * (0.04 + 0.35 * Math.exp(-t * 7)); const body = Math.sin(2 * Math.PI * (38 + 50 * Math.exp(-t * 10)) * t) * 0.9; return (lpS * 2.4 + body) * env(t, 0.002, 0.3); });
    B.crack = this.buf(0.08, (t) => (noise() * 0.8 + Math.sin(2 * Math.PI * 2400 * t) * 0.3) * env(t, 0.0005, 0.012));
    B.rumble = this.buf(0.8, (t) => { lpS += (noise() - lpS) * 0.02; return (lpS * 5 + Math.sin(2 * Math.PI * 34 * t) * 0.5) * env(t, 0.1, 0.45); });
    // The referee's pea whistle: a shrill tone with the pea rattling inside
    ph = 0;
    const pea = (len: number, vol: number) => this.buf(len, (t) => { const f = 2850 + 260 * Math.sin(t * 2 * Math.PI * 42) + 80 * Math.sin(t * 2 * Math.PI * 7); ph += f / SR; const am = 0.75 + 0.25 * Math.sin(t * 2 * Math.PI * 42); return Math.sin(ph * 2 * Math.PI) * vol * am * Math.min(1, t * 60) * Math.min(1, (len - t) * 30) + noise() * 0.03; });
    B.whistle = pea(0.6, 0.4);
    B.whistle2 = pea(0.28, 0.3);
    // The crowd, as voices: many detuned throats through a vowel shape
    const crowd = (len: number, vowel: [number, number], f0: (t: number) => number, vol: number, shape: (t: number) => number) => {
      const voices = 10, phs = new Array(voices).fill(0).map(() => Math.random());
      const det = new Array(voices).fill(0).map(() => 0.8 + Math.random() * 0.45);
      const form = (f: number) => Math.exp(-(((f - vowel[0]) / 180) ** 2)) + 0.6 * Math.exp(-(((f - vowel[1]) / 260) ** 2));
      return this.buf(len, (t) => {
        let v = 0;
        for (let i = 0; i < voices; i++) {
          const f = f0(t) * det[i];
          phs[i] += f / SR;
          for (let h = 1; h <= 7; h++) v += Math.sin(phs[i] * h * 2 * Math.PI) * form(f * h) / h;
        }
        lpS += (noise() - lpS) * 0.2;
        return (v / voices * 1.4 + lpS * 0.5) * vol * shape(t);
      });
    };
    B.groan = crowd(1.3, [480, 850], (t) => 190 - 60 * t, 0.9, (t) => (t < 0.15 ? t / 0.15 : Math.exp(-(t - 0.15) / 0.5)));
    B.roar = crowd(2.2, [750, 1200], (t) => 210 + 40 * Math.min(1, t * 2), 0.9, (t) => (t < 0.35 ? t / 0.35 : Math.exp(-(t - 0.35) / 1)));
    const arp = (notes: number[], step: number, vol = 0.4) => this.buf(notes.length * step + 0.1, (t) => {
      const i = Math.min(notes.length - 1, Math.floor(t / step));
      const f = midiHz(notes[i]);
      return ((t * f) % 1 < 0.5 ? 1 : -1) * vol * env(t - i * step, 0.002, 0.08);
    });
    // Pickups: two bright voices an octave apart
    const arp2 = (notes: number[], step: number, vol = 0.32) => this.buf(notes.length * step + 0.15, (t) => {
      const i = Math.min(notes.length - 1, Math.floor(t / step)), f = midiHz(notes[i]), tt = t - i * step;
      return (((t * f) % 1 < 0.5 ? 1 : -1) * 0.7 + Math.sin(2 * Math.PI * f * 2 * t) * 0.4) * vol * env(tt, 0.002, i === notes.length - 1 ? 0.15 : 0.06);
    });
    B.pickup = arp2([76, 79, 84, 88], 0.045);
    B.life = arp2([67, 72, 76, 79, 84, 88, 91, 96], 0.065);
    B.empty = sweep(0.05, 200, 150, 'sq', 0.25, 0.02);
    B.creak = this.buf(0.35, (t) => ((t * (180 + Math.sin(t * 40) * 60)) % 1 < 0.15 ? 0.5 : -0.1) * env(t, 0.02, 0.2));
    B.click = nz(0.02, 8000, 0.5, 0.005);
    B.crumble = nz(0.4, 900, 0.7, 0.15);
    B.smash = nz(0.5, 2500, 0.9, 0.15);
    B.dart = sweep(0.12, 1800, 600, 'saw', 0.25, 0.08);
    B.spit = nz(0.15, 5000, 0.4, 0.06);
    B.thunk = sweep(0.06, 300, 120, 'sq', 0.4, 0.03);
    B.studs = this.buf(0.2, (t) => (Math.sin(2 * Math.PI * 2200 * t) * 0.3 + noise() * 0.2) * env(t, 0.001, 0.05));
    B.swish = nz(0.18, 4000, 0.4, 0.07, 0.04);
    B.crunch = nz(0.25, 1500, 0.8, 0.08);
    B.hiss = nz(0.5, 8000, 0.3, 0.3, 0.05);
    B.pyro = nz(0.6, 3000, 0.6, 0.3, 0.02);
    B.engine = this.buf(0.25, (t) => ((t * 55) % 1 < 0.3 ? 0.5 : -0.3) * env(t, 0.01, 0.15));
    B.beep = sweep(0.06, 1500, 1500, 'sq', 0.2, 0.05);
    B.squawk = sweep(0.25, 1400, 700, 'saw', 0.3, 0.1);
    B.oof = sweep(0.2, 220, 110, 'saw', 0.45, 0.08);
    B.stun = arp([84, 79, 84, 79], 0.04, 0.25);
    B.snuff = nz(0.2, 2000, 0.4, 0.08);
    B.pop = sweep(0.08, 900, 300, 'sq', 0.4, 0.03);
    B.boing = sweep(0.25, 200, 500, 'sin', 0.4, 0.1);
    B.throw = nz(0.12, 3000, 0.3, 0.05, 0.03);
    B.lever = sweep(0.1, 500, 250, 'sq', 0.35, 0.05);
    B.twang = this.buf(0.4, (t) => Math.sin(2 * Math.PI * (330 + 30 * Math.sin(t * 60)) * t) * 0.4 * env(t, 0.001, 0.15));
    B.splat = nz(0.25, 700, 0.8, 0.08);
    B.clang = this.buf(0.4, (t) => (Math.sin(2 * Math.PI * 820 * t) + Math.sin(2 * Math.PI * 1230 * t) * 0.6) * 0.3 * env(t, 0.001, 0.12));
    B.stomp = nz(0.12, 400, 0.8, 0.04);
    B.rustle = nz(0.3, 6000, 0.3, 0.1, 0.05);
    B.gate = this.buf(0.4, (t) => ((t * 70) % 1 < 0.5 ? 0.3 : -0.3) * env(t, 0.02, 0.2) + noise() * 0.1 * env(t, 0.01, 0.1));
    B.climb = nz(0.03, 2000, 0.2, 0.01);
    B.scarf = nz(0.1, 5000, 0.25, 0.04, 0.02);
    B.whoosh = nz(0.3, 2000, 0.4, 0.15, 0.08);
    B.hissCat = nz(0.3, 7000, 0.3, 0.12, 0.02);
    B.typing = nz(0.02, 6000, 0.25, 0.006);
    B.select = arp([76, 83], 0.04, 0.3);
    B.move = sweep(0.03, 900, 900, 'sq', 0.15, 0.02);
    B.crowdbed = this.buf(2, () => { lpS += (noise() - lpS) * 0.12; return lpS * 1.5; });
  }

  sfx(name: string) {
    if (!this.ctx || !this.sfxOn) return;
    if (name === 'hiss' && this.buffers.hissCat && Math.random() < 0) name = 'hissCat';
    const b = this.buffers[name];
    if (!b) return;
    const now = this.ctx.currentTime;
    if (this.lastPlay[name] && now - this.lastPlay[name] < 0.03) return;
    this.lastPlay[name] = now;
    const s = this.ctx.createBufferSource();
    s.buffer = b;
    s.connect(this.sfxGain);
    s.start();
  }

  private startCrowd() {
    if (!this.ctx) return;
    const s = this.ctx.createBufferSource();
    s.buffer = this.buffers.crowdbed; s.loop = true;
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6;
    s.connect(bp); bp.connect(this.crowdGain); s.start();
  }
  setCrowd(level: number) {
    this.crowdLevel = level;
    if (!this.ctx) return;
    this.crowdGain.gain.setTargetAtTime(this.sfxOn ? level * 0.25 : 0, this.ctx.currentTime, 0.5);
  }

  music(name: string | null) {
    if (name === this.songName) return;
    this.stopVoices();
    this.songName = name ?? '';
    this.song = name ? SONGS[name] ?? null : null;
    this.row = 0; this.patIdx = 0;
    if (this.ctx) this.nextTime = this.ctx.currentTime + 0.05;
  }
  private stopVoices() {
    for (let i = 0; i < 4; i++) { try { this.voices[i]?.stop(); } catch { /* already stopped */ } this.voices[i] = null; }
  }
  setMusicOn(on: boolean) { this.musicOn = on; if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(on ? 0.32 : 0, this.ctx.currentTime, 0.05); }
  setSfxOn(on: boolean) { this.sfxOn = on; this.setCrowd(this.crowdLevel); }

  // Schedule notes a little ahead of time.
  tick() {
    const ctx = this.ctx, song = this.song;
    if (!ctx || !song) return;
    const rowDur = 1 / song.rps;
    if (this.nextTime < ctx.currentTime - 0.5) this.nextTime = ctx.currentTime + 0.02;
    while (this.nextTime < ctx.currentTime + 0.15) {
      const ord = song.order[this.patIdx];
      const [pi, tr] = typeof ord === 'number' ? [ord, 0] : ord;
      const pat = song.pats[pi];
      for (let ch = 0; ch < 4; ch++) {
        const toks = pat[ch].trim().split(/\s+/);
        const tok = toks[this.row % toks.length];
        this.playTok(ch, tok, song.ins[ch], this.nextTime, rowDur, ch === 3 ? 0 : tr);
      }
      this.nextTime += rowDur;
      this.row++;
      const len = song.pats[pi][0].trim().split(/\s+/).length;
      if (this.row >= len) {
        this.row = 0; this.patIdx++;
        if (this.patIdx >= song.order.length) {
          if (song.loop === false) { this.song = null; return; }
          this.patIdx = 0;
        }
      }
    }
  }

  private playTok(ch: number, tok: string, ins: string, t: number, rowDur: number, transpose = 0) {
    const ctx = this.ctx!;
    if (tok === '.') return;
    if (ins === 'drums') {
      const b = this.buffers[tok];
      if (!b) return;
      const s = ctx.createBufferSource(); s.buffer = b;
      const g = ctx.createGain(); g.gain.value = tok === 'H' ? 0.5 : tok === 'C' ? 0.6 : 0.9;
      s.connect(g); g.connect(this.musicGain); s.start(t);
      return;
    }
    // Stop the previous note on this channel (Paula: one sample per channel)
    const old = this.voices[ch], og = this.voiceGains[ch];
    if (old && og) { og.gain.setTargetAtTime(0, t, 0.01); try { old.stop(t + 0.05); } catch { /* */ } }
    this.voices[ch] = null;
    if (tok === '-') return;
    const n0 = parseNote(tok);
    if (n0 === null) return;
    const n = n0 + transpose;
    const s = ctx.createBufferSource();
    s.buffer = this.waves[ins] ?? this.waves.lead; s.loop = true;
    s.playbackRate.value = midiHz(n) / (SR / 128);
    const g = ctx.createGain();
    const vol = ins === 'bass' ? 0.55 : ins === 'stab' ? 0.22 : ins === 'pad' ? 0.3 : ins === 'flute' ? 0.45 : 0.4;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    const decay = ins === 'stab' ? rowDur * 0.7 : ins === 'pad' ? rowDur * 6 : rowDur * 2.2;
    g.gain.setTargetAtTime(vol * (ins === 'stab' ? 0 : 0.55), t + 0.01, decay);
    if (ins === 'lead' || ins === 'brass' || ins === 'flute') {
      // A touch of vibrato, as Amiga trackers loved
      const lfo = ctx.createOscillator(); lfo.frequency.value = 5.5;
      const lg = ctx.createGain(); lg.gain.value = s.playbackRate.value * 0.008;
      lfo.connect(lg); lg.connect(s.playbackRate); lfo.start(t + 0.15); lfo.stop(t + 4);
    }
    s.connect(g); g.connect(this.musicGain);
    s.start(t); s.stop(t + 4);
    this.voices[ch] = s; this.voiceGains[ch] = g;
  }
}

export const audio = new Audio();
