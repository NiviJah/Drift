import {
  Biquad,
  BrownFilter,
  PinkFilter,
  TAU,
  addCircular,
  edgeFade,
  envelope,
  gauss,
  makeLoop,
  range,
  reverb,
  widen,
} from '../dsp.ts';
import type { Rng } from '../dsp.ts';
import type { BedRecipe } from '../types.ts';

/**
 * Builds a periodic wave envelope: a sequence of swells that exactly fills the
 * loop. Each wave rises slowly, breaks, then washes back.
 */
function waveSchedule(rng: Rng, sr: number, frames: number) {
  const durations: number[] = [];
  let total = 0;
  while (total < frames / sr - 6) {
    const d = range(rng, 7, 12);
    durations.push(d);
    total += d;
  }
  const scale = frames / sr / total;
  const waves: { start: number; len: number; height: number; pan: number }[] = [];
  let t = 0;
  for (const d of durations) {
    const len = Math.floor(d * scale * sr);
    waves.push({ start: t, len, height: range(rng, 0.55, 1), pan: range(rng, -0.5, 0.5) });
    t += len;
  }
  return waves;
}

/** Shape of a single wave over phase 0..1: slow swell, crash, receding wash. */
function waveShape(x: number): { body: number; wash: number } {
  const crash = 0.42;
  let body: number;
  if (x < crash) body = Math.pow(x / crash, 2.2);
  else body = Math.exp(-(x - crash) * 4.2);
  // foam hiss: arrives right after the break and fades as the water drains back
  const d = x - crash;
  const w = d < 0 ? 0 : (1 - Math.exp(-d * 25)) * Math.exp(-d * 4.5);
  return { body, wash: w };
}

function bubble(sr: number, rng: Rng, fLo: number, fHi: number): Float32Array {
  const dur = range(rng, 0.015, 0.07);
  const n = Math.floor(dur * sr);
  const out = new Float32Array(n);
  const f0 = fLo * Math.pow(fHi / fLo, rng());
  const rise = range(rng, 0.3, 2.2);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    ph += (TAU * f0 * (1 + rise * t * t)) / sr;
    out[i] = Math.sin(ph) * Math.exp(-t * 4) * Math.sin(Math.min(1, t * 12) * Math.PI * 0.5);
  }
  return edgeFade(out, 16);
}

export const waterRecipes: BedRecipe[] = [
  {
    id: 'ocean',
    seconds: 60,
    loudnessDb: -21,
    render: (sr, frames, rng) => {
      const waves = waveSchedule(rng, sr, frames);
      // Per-sample envelope values (periodic over the loop).
      const body = new Float32Array(frames);
      const wash = new Float32Array(frames);
      const panArr = new Float32Array(frames);
      for (const w of waves) {
        // tails run on past the next wave's start so nothing is cut off
        for (let i = 0; i < w.len * 1.8; i++) {
          const s = waveShape(i / w.len);
          // overlap the tail of each wave into the next for continuity
          const idx = (w.start + i) % frames;
          body[idx] = Math.max(body[idx], s.body * w.height);
          wash[idx] += s.wash * w.height;
          if (i < w.len) panArr[idx] = w.pan;
        }
      }
      // smooth discontinuities between waves (circular one-pole, two passes)
      for (const arr of [body, wash, panArr]) {
        const a = Math.exp((-TAU * 1.2) / sr);
        let y = arr[frames - 1];
        for (let pass = 0; pass < 2; pass++)
          for (let i = 0; i < frames; i++) {
            y = arr[i] + a * (y - arr[i]);
            if (pass === 1) arr[i] = y;
          }
      }
      const buf = makeLoop(frames, Math.floor(sr * 2), (out, n) => {
        for (let c = 0; c < 2; c++) {
          const p = new PinkFilter();
          const lp = new Biquad('lowpass', sr, 400, 0.6);
          const lp2 = new Biquad('lowpass', sr, 400, 0.6);
          const hp = new Biquad('highpass', sr, 1800, 0.6);
          const flp = new Biquad('lowpass', sr, 9000, 0.6);
          const br = new BrownFilter(sr);
          const blp = new Biquad('lowpass', sr, 160, 0.7);
          const ch = out[c];
          for (let i = 0; i < n; i++) {
            const k = i % frames;
            const b = body[k];
            const side = c === 0 ? 1 - panArr[k] * 0.6 : 1 + panArr[k] * 0.6;
            if ((i & 31) === 0) {
              const f = 250 + 4200 * b * b;
              lp.set(f, 0.6);
              lp2.set(f * 1.1, 0.6);
            }
            const x = p.process(gauss(rng));
            const roar = lp2.process(lp.process(x)) * (0.08 + 1.1 * b);
            const fizz = flp.process(hp.process(gauss(rng))) * 0.3 * wash[k];
            const under = blp.process(br.process(gauss(rng))) * 0.35;
            ch[i] = (roar + fizz) * side + under;
          }
        }
      });
      return reverb(widen(buf, sr, 0.25), sr, 0.15, 1.8);
    },
  },
  {
    id: 'stream',
    seconds: 30,
    loudnessDb: -23,
    render: (sr, frames, rng) => {
      const buf = makeLoop(frames, Math.floor(sr * 2), (out, n) => {
        const env = envelope(rng, sr, n, 0.4);
        for (let c = 0; c < 2; c++) {
          const p = new PinkFilter();
          const bp = new Biquad('bandpass', sr, 1100, 0.45);
          const hs = new Biquad('highshelf', sr, 6000, 0.7, -6);
          const ch = out[c];
          for (let i = 0; i < n; i++) ch[i] = hs.process(bp.process(p.process(gauss(rng)))) * (0.6 + 0.4 * env[i]) * 1.4;
        }
      });
      const n = buf[0].length;
      const count = Math.floor((n / sr) * 140);
      for (let i = 0; i < count; i++) {
        addCircular(buf, bubble(sr, rng, 350, 2600), rng() * n, 0.12 * Math.pow(rng(), 1.8), range(rng, -0.85, 0.85));
      }
      return reverb(buf, sr, 0.2, 0.8);
    },
  },
  {
    id: 'waterfall',
    seconds: 30,
    loudnessDb: -20,
    render: (sr, frames, rng) => {
      const buf = makeLoop(frames, Math.floor(sr * 2), (out, n) => {
        const env = envelope(rng, sr, n, 0.3);
        for (let c = 0; c < 2; c++) {
          const p = new PinkFilter();
          const low = new Biquad('lowshelf', sr, 250, 0.7, 5);
          const pk = new Biquad('peaking', sr, 1800, 0.6, 3);
          const hp = new Biquad('highpass', sr, 40, 0.6);
          const br = new BrownFilter(sr);
          const ch = out[c];
          for (let i = 0; i < n; i++) {
            const x = gauss(rng);
            const v = pk.process(low.process(p.process(x))) + br.process(gauss(rng)) * 0.25 + x * 0.04;
            ch[i] = hp.process(v) * (0.88 + 0.12 * env[i]);
          }
        }
      });
      return reverb(widen(buf, sr, 0.3), sr, 0.2, 1.6);
    },
  },
  {
    id: 'underwater',
    seconds: 30,
    loudnessDb: -20,
    render: (sr, frames, rng) => {
      const buf = makeLoop(frames, Math.floor(sr * 3), (out, n) => {
        const env = envelope(rng, sr, n, 0.07);
        for (let c = 0; c < 2; c++) {
          const br = new BrownFilter(sr);
          const lp = new Biquad('lowpass', sr, 300, 1.4);
          const lp2 = new Biquad('lowpass', sr, 500, 0.7);
          const ch = out[c];
          for (let i = 0; i < n; i++) {
            if ((i & 63) === 0) lp.set(180 + 420 * env[i], 1.6);
            ch[i] = lp2.process(lp.process(br.process(gauss(rng))));
          }
        }
      });
      const n = buf[0].length;
      const count = Math.floor((n / sr) * 3);
      for (let i = 0; i < count; i++) {
        // little clusters of low bubbles
        const at = rng() * n;
        const k = 1 + Math.floor(rng() * 5);
        for (let j = 0; j < k; j++) {
          addCircular(buf, bubble(sr, rng, 140, 520), at + j * sr * range(rng, 0.03, 0.12), 0.05, range(rng, -0.6, 0.6));
        }
      }
      return reverb(buf, sr, 0.35, 2.2);
    },
  },
];
