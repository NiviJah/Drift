import { Biquad, BrownFilter, PinkFilter, gauss, makeLoop } from '../dsp.ts';
import type { Rng, Stereo } from '../dsp.ts';
import type { BedRecipe } from '../types.ts';

type Chain = (x: number) => number;

/** Renders decorrelated L/R noise through a per-channel processing chain. */
function coloredLoop(sr: number, frames: number, rng: Rng, build: () => Chain): Stereo {
  return makeLoop(frames, Math.floor(sr * 2), (out, n) => {
    for (let c = 0; c < 2; c++) {
      const chain = build();
      const ch = out[c];
      for (let i = 0; i < n; i++) ch[i] = chain(gauss(rng));
    }
  });
}

export const noiseRecipes: BedRecipe[] = [
  {
    id: 'white',
    seconds: 30,
    loudnessDb: -25,
    render: (sr, frames, rng) =>
      coloredLoop(sr, frames, rng, () => {
        const hp = new Biquad('highpass', sr, 25);
        // a touch of top-end smoothing keeps it from sounding brittle after encoding
        const hs = new Biquad('highshelf', sr, 14000, 0.7, -3);
        return (x) => hs.process(hp.process(x));
      }),
  },
  {
    id: 'pink',
    seconds: 30,
    loudnessDb: -22,
    render: (sr, frames, rng) =>
      coloredLoop(sr, frames, rng, () => {
        const p = new PinkFilter();
        const hp = new Biquad('highpass', sr, 22);
        return (x) => hp.process(p.process(x));
      }),
  },
  {
    id: 'brown',
    seconds: 30,
    loudnessDb: -19,
    render: (sr, frames, rng) =>
      coloredLoop(sr, frames, rng, () => {
        const b = new BrownFilter(sr);
        return (x) => b.process(x);
      }),
  },
  {
    // Approximates an inverse equal-loudness curve: perceptually flat.
    id: 'grey',
    seconds: 30,
    loudnessDb: -22,
    render: (sr, frames, rng) =>
      coloredLoop(sr, frames, rng, () => {
        const p = new PinkFilter();
        const low = new Biquad('lowshelf', sr, 180, 0.7, 7);
        const dip = new Biquad('peaking', sr, 3500, 0.8, -6);
        const high = new Biquad('highshelf', sr, 11000, 0.7, 3);
        const hp = new Biquad('highpass', sr, 25);
        return (x) => hp.process(high.process(dip.process(low.process(p.process(x)))));
      }),
  },
  {
    // Centered around 500 Hz — the "middle of nature" spectrum.
    id: 'green',
    seconds: 30,
    loudnessDb: -22,
    render: (sr, frames, rng) =>
      coloredLoop(sr, frames, rng, () => {
        const p = new PinkFilter();
        const peak = new Biquad('peaking', sr, 500, 0.5, 10);
        const lp = new Biquad('lowpass', sr, 3500, 0.6);
        const hp = new Biquad('highpass', sr, 90, 0.6);
        return (x) => hp.process(lp.process(peak.process(p.process(x))));
      }),
  },
  {
    id: 'deep',
    seconds: 30,
    loudnessDb: -17,
    render: (sr, frames, rng) =>
      coloredLoop(sr, frames, rng, () => {
        const b = new BrownFilter(sr);
        const lp1 = new Biquad('lowpass', sr, 220, 0.6);
        const lp2 = new Biquad('lowpass', sr, 260, 0.6);
        return (x) => lp2.process(lp1.process(b.process(x)));
      }),
  },
];

