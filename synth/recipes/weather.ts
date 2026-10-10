import {
  Biquad,
  BrownFilter,
  PinkFilter,
  SmoothRandom,
  TAU,
  addCircular,
  edgeFade,
  envelope,
  gauss,
  makeLoop,
  mixInto,
  range,
  reverb,
  widen,
} from '../dsp.ts';
import type { Rng, Stereo } from '../dsp.ts';
import type { BedRecipe } from '../types.ts';

/** Many small drops, few large ones. */
function dropGain(rng: Rng): number {
  return Math.pow(rng(), 2.6);
}

/** A raindrop hitting water: a tiny click followed by a rising bubble resonance. */
function waterDrop(sr: number, rng: Rng, fLo: number, fHi: number): Float32Array {
  const dur = range(rng, 0.006, 0.03);
  const n = Math.floor(dur * sr);
  const out = new Float32Array(n);
  const f0 = fLo * Math.pow(fHi / fLo, rng());
  const rise = range(rng, 0.2, 1.4);
  const clickLen = Math.floor(sr * 0.0012);
  let phase = rng() * TAU;
  const k = Math.exp(-1 / (dur * 0.35 * sr));
  let g = 1;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f = f0 * (1 + rise * t);
    phase += (TAU * f) / sr;
    let s = Math.sin(phase) * g * 0.6;
    if (i < clickLen) s += gauss(rng) * (1 - i / clickLen) * 0.5;
    out[i] = s;
    g *= k;
  }
  return edgeFade(out, 8);
}

/** A drop striking a taut surface (tent / roof): band-limited noise tap. */
function tap(sr: number, rng: Rng, fLo: number, fHi: number, q: number): Float32Array {
  const dur = range(rng, 0.01, 0.045);
  const n = Math.floor(dur * sr);
  const out = new Float32Array(n);
  const bp = new Biquad('bandpass', sr, fLo * Math.pow(fHi / fLo, rng()), q);
  const k = Math.exp(-1 / (dur * 0.25 * sr));
  let g = 1;
  for (let i = 0; i < n; i++) {
    out[i] = bp.process(gauss(rng)) * g * 2.2;
    g *= k;
  }
  return edgeFade(out, 6);
}

function rainBed(
  sr: number,
  frames: number,
  rng: Rng,
  opts: { hissHp: number; hissLp: number; hissGain: number; rumble: number; motion: number },
): Stereo {
  return makeLoop(frames, Math.floor(sr * 2), (out, n) => {
    const env = envelope(rng, sr, n, 0.12);
    for (let c = 0; c < 2; c++) {
      const p = new PinkFilter();
      const hp = new Biquad('highpass', sr, opts.hissHp, 0.6);
      const lp = new Biquad('lowpass', sr, opts.hissLp, 0.6);
      const br = new BrownFilter(sr);
      const rlp = new Biquad('lowpass', sr, 300, 0.6);
      const ch = out[c];
      for (let i = 0; i < n; i++) {
        const hiss = lp.process(hp.process(p.process(gauss(rng)))) * opts.hissGain;
        const rumble = rlp.process(br.process(gauss(rng))) * opts.rumble;
        ch[i] = (hiss + rumble) * (1 - opts.motion + opts.motion * env[i]);
      }
    }
  });
}


function scatter(
  buf: Stereo,
  sr: number,
  rng: Rng,
  perSecond: number,
  make: () => Float32Array,
  gain: number,
  spread = 0.9,
): void {
  const n = buf[0].length;
  const count = Math.floor((n / sr) * perSecond);
  for (let i = 0; i < count; i++) {
    addCircular(buf, make(), rng() * n, gain * dropGain(rng), range(rng, -spread, spread));
  }
}

export const weatherRecipes: BedRecipe[] = [
  {
    id: 'light-rain',
    seconds: 30,
    loudnessDb: -24,
    render: (sr, frames, rng) => {
      const buf = rainBed(sr, frames, rng, { hissHp: 900, hissLp: 9000, hissGain: 0.55, rumble: 0.08, motion: 0.15 });
      scatter(buf, sr, rng, 90, () => waterDrop(sr, rng, 1800, 6000), 0.5);
      scatter(buf, sr, rng, 25, () => tap(sr, rng, 2500, 7000, 2.5), 0.4);
      return reverb(buf, sr, 0.18, 0.9);
    },
  },
  {
    id: 'heavy-rain',
    seconds: 30,
    loudnessDb: -20,
    render: (sr, frames, rng) => {
      const buf = rainBed(sr, frames, rng, { hissHp: 400, hissLp: 11000, hissGain: 0.9, rumble: 0.35, motion: 0.25 });
      scatter(buf, sr, rng, 260, () => waterDrop(sr, rng, 1200, 5000), 0.35);
      scatter(buf, sr, rng, 160, () => tap(sr, rng, 1500, 8000, 1.6), 0.3);
      return reverb(buf, sr, 0.22, 1.4);
    },
  },
  {
    id: 'rain-tent',
    seconds: 30,
    loudnessDb: -22,
    render: (sr, frames, rng) => {
      const buf = rainBed(sr, frames, rng, { hissHp: 300, hissLp: 4000, hissGain: 0.35, rumble: 0.2, motion: 0.2 });
      scatter(buf, sr, rng, 180, () => tap(sr, rng, 450, 2200, 4), 0.9, 0.7);
      scatter(buf, sr, rng, 12, () => tap(sr, rng, 180, 420, 3), 1.2, 0.5);
      return widen(buf, sr, 0.25);
    },
  },
  {
    // Distant storm bed; individual thunder claps are triggered live by the engine.
    id: 'thunder',
    seconds: 30,
    loudnessDb: -27,
    render: (sr, frames, rng) => {
      const buf = makeLoop(frames, Math.floor(sr * 3), (out, n) => {
        const env = envelope(rng, sr, n, 0.08);
        for (let c = 0; c < 2; c++) {
          const br = new BrownFilter(sr);
          const lp = new Biquad('lowpass', sr, 110, 0.7);
          const ch = out[c];
          for (let i = 0; i < n; i++) ch[i] = lp.process(br.process(gauss(rng))) * (0.4 + 0.6 * env[i] * env[i]);
        }
      });
      const hiss = rainBed(sr, frames, rng, { hissHp: 600, hissLp: 6000, hissGain: 0.06, rumble: 0, motion: 0.1 });
      mixInto(buf, hiss, 1);
      return buf;
    },
  },
  {
    id: 'wind',
    seconds: 60,
    loudnessDb: -23,
    render: (sr, frames, rng) => {
      const buf = makeLoop(frames, Math.floor(sr * 4), (out, n) => {
        const gust = new SmoothRandom(rng, sr, 0.11, 0.4);
        const flutter = new SmoothRandom(rng, sr, 0.9);
        const whistleF = new SmoothRandom(rng, sr, 0.05);
        const bands = [0, 1].map(() => ({
          p: new PinkFilter(),
          bp: new Biquad('bandpass', sr, 500, 0.9),
          wh: new Biquad('bandpass', sr, 900, 22),
          br: new BrownFilter(sr),
          lp: new Biquad('lowpass', sr, 140, 0.7),
        }));
        // gust lags slightly between ears for a sense of movement
        const lag = Math.floor(sr * 0.35);
        const hist = new Float32Array(lag);
        for (let i = 0; i < n; i++) {
          const gNow = gust.next();
          const fl = flutter.next();
          const gL = gNow;
          const gR = hist[i % lag] || gNow;
          hist[i % lag] = gNow;
          const wf = 600 + 900 * whistleF.next();
          for (let c = 0; c < 2; c++) {
            const b = bands[c];
            const g = c === 0 ? gL : gR;
            const shaped = g * g;
            if ((i & 63) === 0) {
              b.bp.set(220 + 1100 * shaped + 120 * fl, 0.8);
              b.wh.set(wf * (0.85 + 0.3 * g) * (c === 0 ? 1 : 1.03), 26);
            }
            const x = gauss(rng);
            const body = b.bp.process(b.p.process(x)) * (0.25 + 1.6 * shaped);
            const whistle = b.wh.process(x) * 0.9 * shaped * shaped;
            const low = b.lp.process(b.br.process(gauss(rng))) * (0.3 + 0.5 * g);
            out[c][i] = body + whistle + low;
          }
        }
      });
      return widen(buf, sr, 0.2);
    },
  },
];
