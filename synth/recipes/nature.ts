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
import type { Rng, Stereo } from '../dsp.ts';
import type { BedRecipe } from '../types.ts';

function crackle(sr: number, rng: Rng, big: boolean): Float32Array {
  const dur = big ? range(rng, 0.006, 0.02) : range(rng, 0.0006, 0.004);
  const n = Math.max(8, Math.floor(dur * sr));
  const out = new Float32Array(n);
  const bp = new Biquad('bandpass', sr, big ? range(rng, 700, 2500) : range(rng, 1800, 7000), big ? 1.2 : 0.9);
  const k = Math.exp(-1 / (n * 0.3));
  let g = 1;
  for (let i = 0; i < n; i++) {
    out[i] = bp.process(gauss(rng)) * g * 3;
    g *= k;
  }
  return out;
}

/** Quiet outdoor night air used under several nature beds. */
function nightAir(sr: number, frames: number, rng: Rng, gain: number): Stereo {
  return makeLoop(frames, Math.floor(sr * 2), (out, n) => {
    for (let c = 0; c < 2; c++) {
      const p = new PinkFilter();
      const lp = new Biquad('lowpass', sr, 700, 0.6);
      const hp = new Biquad('highpass', sr, 60, 0.6);
      const ch = out[c];
      for (let i = 0; i < n; i++) ch[i] = hp.process(lp.process(p.process(gauss(rng)))) * gain;
    }
  });
}

/** Adds a population of crickets: chirps made of short sine pulses. */
function addCrickets(buf: Stereo, sr: number, rng: Rng, count: number, level: number, distance = 0): void {
  const n = buf[0].length;
  for (let k = 0; k < count; k++) {
    const freq = range(rng, 3900, 5600);
    const pulseRate = range(rng, 26, 42);
    const pulses = 2 + Math.floor(rng() * 3);
    const period = range(rng, 0.45, 1.0);
    const gain = level * range(rng, 0.35, 1) * (1 - distance * rng() * 0.7);
    const pan = range(rng, -0.9, 0.9);
    const pulseLen = Math.floor((sr / pulseRate) * 0.6);
    const chirpLen = Math.floor((sr / pulseRate) * pulses);
    const chirp = new Float32Array(chirpLen);
    const lp = new Biquad('lowpass', sr, 9000 - distance * 5000, 0.7);
    let ph = 0;
    for (let i = 0; i < chirpLen; i++) {
      const pi = i % Math.floor(sr / pulseRate);
      ph += (TAU * freq * (1 - 0.02 * (pi / pulseLen))) / sr;
      const env = pi < pulseLen ? Math.pow(Math.sin((Math.PI * pi) / pulseLen), 2) : 0;
      chirp[i] = lp.process(Math.sin(ph) * env + 0.18 * Math.sin(ph * 2) * env);
    }
    let t = rng() * period * sr;
    // crickets occasionally pause, which keeps the chorus from sounding mechanical
    while (t < n) {
      if (rng() > 0.06) addCircular(buf, chirp, t, gain * range(rng, 0.8, 1), pan);
      t += period * sr * range(rng, 0.97, 1.03) + (rng() < 0.04 ? range(rng, 1, 4) * sr : 0);
    }
  }
}

function croak(sr: number, rng: Rng, pitch: number, f1: number, f2: number): Float32Array {
  const dur = range(rng, 0.18, 0.5);
  const n = Math.floor(dur * sr);
  const src = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    ph += (pitch * (1 + 0.15 * Math.sin(Math.PI * t))) / sr;
    if (ph >= 1) {
      ph -= 1;
      src[i] = 1; // glottal pulse
    }
  }
  const a = new Biquad('bandpass', sr, f1, 5);
  const b = new Biquad('bandpass', sr, f2, 7);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const env = Math.sin(Math.PI * Math.min(1, t * 1.2)) * (1 - t * 0.3);
    const x = src[i] + gauss(rng) * 0.02;
    out[i] = (a.process(x) * 2.2 + b.process(x) * 1.4) * env;
  }
  return edgeFade(out, 64);
}

export const natureRecipes: BedRecipe[] = [
  {
    id: 'campfire',
    seconds: 45,
    loudnessDb: -23,
    render: (sr, frames, rng) => {
      const buf = makeLoop(frames, Math.floor(sr * 2), (out, n) => {
        const flicker = envelope(rng, sr, n, 0.8);
        const breath = envelope(rng, sr, n, 0.15);
        for (let c = 0; c < 2; c++) {
          const br = new BrownFilter(sr);
          const lp = new Biquad('lowpass', sr, 320, 0.7);
          const hp = new Biquad('bandpass', sr, 3000, 0.6);
          const ch = out[c];
          for (let i = 0; i < n; i++) {
            const roar = lp.process(br.process(gauss(rng))) * (0.5 + 0.5 * flicker[i]) * (0.6 + 0.4 * breath[i]);
            const hiss = hp.process(gauss(rng)) * 0.05 * (0.4 + 0.6 * flicker[i]);
            ch[i] = roar * 0.9 + hiss;
          }
        }
      });
      const n = buf[0].length;
      // Crackles arrive in clusters (Poisson clusters), with occasional larger pops.
      let t = 0;
      while (t < n) {
        t += sr * -Math.log(1 - rng()) * 0.35;
        const cluster = 1 + Math.floor(Math.pow(rng(), 2) * 14);
        const pan = range(rng, -0.6, 0.6);
        let ct = t;
        for (let j = 0; j < cluster; j++) {
          ct += sr * range(rng, 0.004, 0.09);
          addCircular(buf, crackle(sr, rng, false), ct, 0.35 * Math.pow(rng(), 1.5), pan + range(rng, -0.1, 0.1));
        }
        if (rng() < 0.12) addCircular(buf, crackle(sr, rng, true), t, range(rng, 0.25, 0.6), pan);
      }
      return reverb(buf, sr, 0.15, 0.8);
    },
  },
  {
    id: 'crickets',
    seconds: 30,
    loudnessDb: -27,
    render: (sr, frames, rng) => {
      const buf = nightAir(sr, frames, rng, 0.05);
      addCrickets(buf, sr, rng, 5, 0.22, 0);
      addCrickets(buf, sr, rng, 9, 0.08, 1);
      return reverb(buf, sr, 0.25, 1.4);
    },
  },
  {
    id: 'frogs',
    seconds: 40,
    loudnessDb: -25,
    render: (sr, frames, rng) => {
      const buf = nightAir(sr, frames, rng, 0.05);
      const n = buf[0].length;
      const species = [
        { pitch: 55, f1: 520, f2: 1300, rate: 1.3 },
        { pitch: 85, f1: 900, f2: 2100, rate: 2.1 },
        { pitch: 38, f1: 300, f2: 820, rate: 0.6 },
      ];
      for (let k = 0; k < 8; k++) {
        const sp = species[k % species.length];
        const pan = range(rng, -0.9, 0.9);
        const level = range(rng, 0.25, 0.8);
        const pitch = sp.pitch * range(rng, 0.9, 1.12);
        let t = rng() * sr * 2;
        while (t < n) {
          // frogs call in bouts of a few croaks, then rest
          const bout = 1 + Math.floor(rng() * 5);
          for (let j = 0; j < bout; j++) {
            addCircular(buf, croak(sr, rng, pitch, sp.f1, sp.f2), t, level * 0.25, pan);
            t += (sr / sp.rate) * range(rng, 0.8, 1.2);
          }
          t += sr * range(rng, 1.5, 7);
        }
      }
      addCrickets(buf, sr, rng, 6, 0.05, 1);
      return reverb(buf, sr, 0.3, 1.6);
    },
  },
  {
    id: 'forest',
    // Leafy breeze bed; bird calls are triggered live by the engine.
    seconds: 40,
    loudnessDb: -29,
    render: (sr, frames, rng) => {
      const buf = makeLoop(frames, Math.floor(sr * 3), (out, n) => {
        const gust = envelope(rng, sr, n, 0.14);
        const rustle = envelope(rng, sr, n, 1.7);
        for (let c = 0; c < 2; c++) {
          const p = new PinkFilter();
          const bp = new Biquad('bandpass', sr, 2600, 0.5);
          const lp = new Biquad('lowpass', sr, 500, 0.6);
          const ch = out[c];
          for (let i = 0; i < n; i++) {
            const x = p.process(gauss(rng));
            const g = gust[i] * gust[i];
            ch[i] = bp.process(x) * (0.15 + 0.85 * g) * (0.7 + 0.3 * rustle[i]) + lp.process(x) * 0.3;
          }
        }
      });
      return widen(buf, sr, 0.35);
    },
  },
  {
    id: 'purr',
    seconds: 30,
    loudnessDb: -22,
    render: (sr, frames, rng) => {
      // 12 breath cycles of 2.5 s: the inhale purr is slightly faster and softer.
      // Everything is a function of the position within the cycle, so it is periodic.
      const cycle = frames / 12;
      const inhaleEnd = 0.45;
      const rateIn = 27;
      const rateOut = 23.5;
      const cycleSec = cycle / sr;
      const buf = makeLoop(frames, sr, (out, n) => {
        const lp = new Biquad('lowpass', sr, 700, 0.7);
        const f1 = new Biquad('peaking', sr, 220, 1.2, 8);
        const br = new BrownFilter(sr);
        for (let i = 0; i < n; i++) {
          const cp = (i % cycle) / cycle;
          const inhale = cp < inhaleEnd;
          const t = cp * cycleSec;
          const ph = inhale ? rateIn * t : rateIn * inhaleEnd * cycleSec + rateOut * (t - inhaleEnd * cycleSec);
          const breathEnv = inhale
            ? Math.sin((Math.PI * cp) / inhaleEnd) * 0.7
            : Math.sin((Math.PI * (cp - inhaleEnd)) / (1 - inhaleEnd));
          const pulse = Math.pow(Math.abs(Math.sin(Math.PI * ph)), 6);
          const x = br.process(gauss(rng)) * 0.6 + gauss(rng) * 0.08;
          const v = lp.process(f1.process(x * (0.15 + pulse) * (0.15 + 0.85 * breathEnv)));
          out[0][i] = v;
          out[1][i] = v;
        }
      });
      return widen(buf, sr, 0.15);
    },
  },
];

