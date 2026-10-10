import { TAU, addCircular, range, reverb, stereo } from '../dsp.ts';
import type { Rng, Stereo } from '../dsp.ts';
import type { BedRecipe } from '../types.ts';

/**
 * Binaural beat: slightly different pure tones in each ear. Integer
 * frequencies over a whole-second loop guarantee a click-free seam.
 */
function binaural(sr: number, frames: number, carrier: number, beat: number): Stereo {
  const buf = stereo(frames);
  const wl = (TAU * carrier) / sr;
  const wr = (TAU * (carrier + beat)) / sr;
  for (let i = 0; i < frames; i++) {
    // a whisper of the octave softens the pure sine
    buf[0][i] = Math.sin(wl * i) + 0.08 * Math.sin(2 * wl * i);
    buf[1][i] = Math.sin(wr * i) + 0.08 * Math.sin(2 * wr * i);
  }
  return buf;
}

/** Vowel-like formant weighting for a given frequency. */
function formant(f: number, centers: number[], widths: number[], gains: number[]): number {
  let g = 0.02;
  for (let k = 0; k < centers.length; k++) {
    const d = (f - centers[k]) / widths[k];
    g += gains[k] * Math.exp(-d * d);
  }
  return g;
}

/** A singing bowl strike: inharmonic partials, each a slowly beating pair. */
function bowl(sr: number, rng: Rng, f0: number): Stereo {
  const seconds = 22;
  const n = Math.floor(seconds * sr);
  const out = stereo(n);
  const partials = [
    { r: 1, a: 1, d: 16 },
    { r: 2.71, a: 0.55, d: 10 },
    { r: 5.15, a: 0.25, d: 6 },
    { r: 8.17, a: 0.12, d: 3.5 },
  ];
  for (const p of partials) {
    const f = f0 * p.r;
    const beat = range(rng, 0.4, 2.2);
    const w1 = (TAU * f) / sr;
    const w2 = (TAU * (f + beat)) / sr;
    const k = Math.exp(-1 / (p.d * sr));
    let g = p.a;
    const ph = rng() * TAU;
    for (let i = 0; i < n; i++) {
      const attack = i < 0.004 * sr ? i / (0.004 * sr) : 1;
      const s1 = Math.sin(w1 * i + ph) * g * attack;
      const s2 = Math.sin(w2 * i) * g * attack;
      out[0][i] += s1 * 0.6 + s2 * 0.4;
      out[1][i] += s1 * 0.4 + s2 * 0.6;
      g *= k;
    }
  }
  // fade the last second so the wrapped tail never steps
  const fade = sr;
  for (let i = 0; i < fade; i++) {
    const g = 1 - i / fade;
    out[0][n - fade + i] *= g;
    out[1][n - fade + i] *= g;
  }
  return out;
}

export const toneRecipes: BedRecipe[] = [
  { id: 'binaural-delta', seconds: 20, loudnessDb: -26, render: (sr, frames) => binaural(sr, frames, 136, 2) },
  { id: 'binaural-theta', seconds: 20, loudnessDb: -26, render: (sr, frames) => binaural(sr, frames, 180, 6) },
  { id: 'binaural-alpha', seconds: 20, loudnessDb: -26, render: (sr, frames) => binaural(sr, frames, 200, 10) },
  { id: 'binaural-beta', seconds: 20, loudnessDb: -26, render: (sr, frames) => binaural(sr, frames, 220, 16) },
  {
    // An "Om" drone: additive harmonics shaped by a slowly moving vowel formant.
    // 136.1 Hz × 20 s = 2722 whole cycles, so the loop is seamless.
    id: 'om',
    seconds: 20,
    loudnessDb: -24,
    render: (sr, frames) => {
      const buf = stereo(frames);
      const f0 = 136.1;
      const voices = [
        { f: f0, pan: 0 },
        { f: f0 + 0.05, pan: -0.5 },
        { f: f0 - 0.05, pan: 0.5 },
        { f: f0 / 2, pan: 0 },
      ];
      const harmonics = 24;
      for (const v of voices) {
        const sub = v.f < f0 * 0.75;
        for (let h = 1; h <= harmonics; h++) {
          const f = v.f * h;
          if (f > 4000) break;
          const w = (TAU * f) / sr;
          const gl = Math.cos(((v.pan + 1) * Math.PI) / 4);
          const gr = Math.sin(((v.pan + 1) * Math.PI) / 4);
          for (let i = 0; i < frames; i++) {
            // breath cycle: two per loop, morphing "ooo" -> "mmm"
            const breath = 0.5 - 0.5 * Math.cos((TAU * 2 * i) / frames);
            const g =
              formant(f, [400 - 120 * breath, 800 - 350 * breath], [120, 220], [1, 0.5 * (1 - breath)]) *
              (1 / h) *
              (sub ? 0.5 : 0.33) *
              (0.75 + 0.25 * breath);
            const s = Math.sin(w * i) * g;
            buf[0][i] += s * gl;
            buf[1][i] += s * gr;
          }
        }
      }
      return reverb(buf, sr, 0.3, 2.5);
    },
  },
  {
    id: 'singing-bowls',
    seconds: 60,
    loudnessDb: -25,
    render: (sr, frames, rng) => {
      const buf = stereo(frames);
      const notes = [196, 220, 261.63, 293.66, 329.63];
      const strikes = 5;
      for (let s = 0; s < strikes; s++) {
        const at = (s / strikes) * frames + range(rng, -1.5, 1.5) * sr;
        const f = notes[Math.floor(rng() * notes.length)];
        addCircular(buf, bowl(sr, rng, f), at, range(rng, 0.6, 1), range(rng, -0.5, 0.5));
      }
      return reverb(buf, sr, 0.35, 3);
    },
  },
];
