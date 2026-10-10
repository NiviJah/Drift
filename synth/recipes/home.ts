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

/** Sum of sines; frequencies are chosen so every partial completes whole cycles per loop. */
function addHum(buf: Stereo, sr: number, partials: { f: number; a: number }[]): void {
  const n = buf[0].length;
  for (const { f, a } of partials) {
    const w = (TAU * f) / sr;
    for (let i = 0; i < n; i++) {
      const s = Math.sin(w * i) * a;
      buf[0][i] += s;
      buf[1][i] += s;
    }
  }
}

/** Rounds a frequency so it holds an integer number of cycles in `seconds`. */
function loopFreq(f: number, seconds: number): number {
  return Math.round(f * seconds) / seconds;
}

function thump(sr: number, rng: Rng, f: number, dur: number, noise: number): Float32Array {
  const n = Math.floor(dur * sr);
  const out = new Float32Array(n);
  const lp = new Biquad('lowpass', sr, f * 4, 0.7);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    ph += (TAU * f * (1.25 - 0.35 * t)) / sr;
    const env = Math.sin(Math.min(1, t * 10) * Math.PI * 0.5) * Math.exp(-t * 5);
    out[i] = (Math.sin(ph) + lp.process(gauss(rng)) * noise) * env;
  }
  return edgeFade(out, 32);
}

function click(sr: number, rng: Rng, freqs: number[], dur: number): Float32Array {
  const n = Math.floor(dur * sr);
  const out = new Float32Array(n);
  const filters = freqs.map((f) => new Biquad('bandpass', sr, f, 9));
  for (let i = 0; i < n; i++) {
    const exc = i < sr * 0.0008 ? gauss(rng) : 0;
    let s = 0;
    for (const f of filters) s += f.process(exc);
    out[i] = s * 6 * Math.exp((-i / n) * 5);
  }
  return out;
}

function roomTone(sr: number, frames: number, rng: Rng, lpHz: number, gain: number): Stereo {
  return makeLoop(frames, Math.floor(sr * 2), (out, n) => {
    for (let c = 0; c < 2; c++) {
      const p = new PinkFilter();
      const lp = new Biquad('lowpass', sr, lpHz, 0.6);
      const hp = new Biquad('highpass', sr, 40, 0.6);
      const ch = out[c];
      for (let i = 0; i < n; i++) ch[i] = hp.process(lp.process(p.process(gauss(rng)))) * gain;
    }
  });
}

export const homeRecipes: BedRecipe[] = [
  {
    id: 'fan',
    seconds: 30,
    loudnessDb: -21,
    render: (sr, frames, rng) => {
      const bladeRate = loopFreq(21, 30);
      const buf = makeLoop(frames, Math.floor(sr * 2), (out, n) => {
        for (let c = 0; c < 2; c++) {
          const p = new PinkFilter();
          const br = new BrownFilter(sr);
          const lp = new Biquad('lowpass', sr, 2200, 0.6);
          const pk = new Biquad('peaking', sr, 380, 0.9, 4);
          const ch = out[c];
          for (let i = 0; i < n; i++) {
            const am = 1 + 0.07 * Math.sin((TAU * bladeRate * i) / sr + c * 0.6);
            ch[i] = lp.process(pk.process(p.process(gauss(rng)) * 0.7 + br.process(gauss(rng)) * 0.6)) * am;
          }
        }
      });
      addHum(buf, sr, [
        { f: loopFreq(118, 30), a: 0.004 },
        { f: loopFreq(236, 30), a: 0.002 },
      ]);
      return widen(buf, sr, 0.2);
    },
  },
  {
    id: 'air-conditioner',
    seconds: 30,
    loudnessDb: -22,
    render: (sr, frames, rng) => {
      const buf = makeLoop(frames, Math.floor(sr * 2), (out, n) => {
        const env = envelope(rng, sr, n, 0.05);
        for (let c = 0; c < 2; c++) {
          const p = new PinkFilter();
          const lp = new Biquad('lowpass', sr, 1300, 0.6);
          const pk = new Biquad('peaking', sr, 260, 1, 5);
          const hp = new Biquad('highpass', sr, 55, 0.6);
          const ch = out[c];
          for (let i = 0; i < n; i++) ch[i] = hp.process(pk.process(lp.process(p.process(gauss(rng))))) * (0.92 + 0.08 * env[i]);
        }
      });
      addHum(buf, sr, [
        { f: 50, a: 0.006 },
        { f: 100, a: 0.004 },
        { f: 150, a: 0.0015 },
      ]);
      return widen(buf, sr, 0.25);
    },
  },
  {
    id: 'airplane',
    seconds: 30,
    loudnessDb: -19,
    render: (sr, frames, rng) => {
      const buf = makeLoop(frames, Math.floor(sr * 2), (out, n) => {
        for (let c = 0; c < 2; c++) {
          const p = new PinkFilter();
          const br = new BrownFilter(sr);
          const lp = new Biquad('lowpass', sr, 650, 0.6);
          const shelf = new Biquad('lowshelf', sr, 150, 0.7, 4);
          const ch = out[c];
          for (let i = 0; i < n; i++) ch[i] = shelf.process(lp.process(p.process(gauss(rng)) * 0.6 + br.process(gauss(rng)) * 0.8));
        }
      });
      // two engines slightly out of tune produce a slow, soothing beat
      addHum(buf, sr, [
        { f: loopFreq(88, 30), a: 0.01 },
        { f: loopFreq(88.3, 30), a: 0.01 },
        { f: loopFreq(176, 30), a: 0.004 },
        { f: loopFreq(264.4, 30), a: 0.002 },
      ]);
      return widen(buf, sr, 0.3);
    },
  },
  {
    id: 'hair-dryer',
    seconds: 30,
    loudnessDb: -24,
    render: (sr, frames, rng) => {
      const buf = makeLoop(frames, Math.floor(sr * 2), (out, n) => {
        for (let c = 0; c < 2; c++) {
          const bp = new Biquad('bandpass', sr, 1900, 0.45);
          const hs = new Biquad('highshelf', sr, 7000, 0.7, -4);
          const br = new BrownFilter(sr);
          const ch = out[c];
          for (let i = 0; i < n; i++) ch[i] = hs.process(bp.process(gauss(rng))) * 1.2 + br.process(gauss(rng)) * 0.15;
        }
      });
      const base = loopFreq(233, 30);
      addHum(buf, sr, [
        { f: base, a: 0.006 },
        { f: base * 2, a: 0.004 },
        { f: base * 3, a: 0.002 },
      ]);
      return buf;
    },
  },
  {
    // Rhythmic "shhh" — a classic for settling babies.
    id: 'shush',
    seconds: 30,
    loudnessDb: -23,
    render: (sr, frames, rng) => {
      const period = 30 / 22; // 22 shushes per loop
      return makeLoop(frames, sr, (out, n) => {
        for (let c = 0; c < 2; c++) {
          const bp = new Biquad('bandpass', sr, 3200, 0.7);
          const hp = new Biquad('highpass', sr, 1500, 0.7);
          const ch = out[c];
          for (let i = 0; i < n; i++) {
            const ph = ((i / sr) % period) / period;
            const env = ph < 0.72 ? Math.pow(Math.sin((Math.PI * ph) / 0.72), 0.6) : 0;
            ch[i] = hp.process(bp.process(gauss(rng))) * (0.08 + env);
          }
        }
      });
    },
  },
  {
    id: 'clock',
    seconds: 30,
    loudnessDb: -34,
    render: (sr, frames, rng) => {
      const buf = roomTone(sr, frames, rng, 400, 0.01);
      for (let s = 0; s < 30; s++) {
        const tick = s % 2 === 0;
        const ev = click(sr, rng, tick ? [2900, 5200, 7600] : [2300, 4100, 6900], 0.03);
        addCircular(buf, ev, (s + 0.25) * sr + range(rng, -0.002, 0.002) * sr, tick ? 1 : 0.85, 0);
      }
      return reverb(buf, sr, 0.25, 0.6);
    },
  },
  {
    id: 'heartbeat',
    seconds: 30,
    loudnessDb: -22,
    render: (sr, frames, rng) => {
      const beats = 36; // 72 bpm
      const beat = frames / beats;
      // womb "whoosh": low noise swelling after each beat
      const buf = makeLoop(frames, sr, (out, n) => {
        for (let c = 0; c < 2; c++) {
          const br = new BrownFilter(sr);
          const lp = new Biquad('lowpass', sr, 260, 0.7);
          const ch = out[c];
          for (let i = 0; i < n; i++) {
            const ph = (i % beat) / beat;
            // circular distance keeps the envelope smooth across beat boundaries
            const d = Math.min(Math.abs(ph - 0.35), 1 - Math.abs(ph - 0.35));
            const swell = 0.35 + 0.65 * Math.exp(-Math.pow(d / 0.2, 2));
            ch[i] = lp.process(br.process(gauss(rng))) * swell * 0.6;
          }
        }
      });
      for (let b = 0; b < beats; b++) {
        const v = range(rng, 0.85, 1);
        // beats sit just after the whoosh peak; offset keeps a thump off sample 0
        const at = b * beat + 0.1 * sr;
        addCircular(buf, thump(sr, rng, 48, 0.14, 0.4), at, 1.0 * v, 0);
        addCircular(buf, thump(sr, rng, 64, 0.1, 0.3), at + 0.29 * sr, 0.6 * v, 0);
      }
      return buf;
    },
  },
  {
    id: 'train',
    seconds: 30,
    loudnessDb: -21,
    render: (sr, frames, rng) => {
      const buf = makeLoop(frames, Math.floor(sr * 2), (out, n) => {
        const sway = envelope(rng, sr, n, 0.2);
        for (let c = 0; c < 2; c++) {
          const br = new BrownFilter(sr);
          const lp = new Biquad('lowpass', sr, 240, 0.7);
          const p = new PinkFilter();
          const bp = new Biquad('bandpass', sr, 700, 0.6);
          const ch = out[c];
          for (let i = 0; i < n; i++) {
            ch[i] = (lp.process(br.process(gauss(rng))) * 0.9 + bp.process(p.process(gauss(rng))) * 0.5) * (0.8 + 0.2 * sway[i]);
          }
        }
      });
      // a car passes a rail joint every 1.5 s: two bogies, clack-clack ... clack-clack
      for (let k = 0; k < 20; k++) {
        const t = k * 1.5 * sr;
        for (const off of [0, 0.16, 0.95, 1.11]) {
          const ev = thump(sr, rng, range(rng, 70, 90), 0.09, 1.2);
          addCircular(buf, ev, t + off * sr + range(rng, -0.004, 0.004) * sr, range(rng, 0.5, 0.75), range(rng, -0.15, 0.15));
          addCircular(buf, click(sr, rng, [1400, 2600], 0.03), t + off * sr, range(rng, 0.05, 0.1), 0);
        }
      }
      return reverb(buf, sr, 0.12, 0.7);
    },
  },
  {
    id: 'dryer',
    seconds: 30,
    loudnessDb: -21,
    render: (sr, frames, rng) => {
      const tumble = 24; // one tumble every 1.25 s
      const buf = makeLoop(frames, Math.floor(sr * 2), (out, n) => {
        for (let c = 0; c < 2; c++) {
          const br = new BrownFilter(sr);
          const lp = new Biquad('lowpass', sr, 220, 0.7);
          const p = new PinkFilter();
          const lp2 = new Biquad('lowpass', sr, 1500, 0.6);
          const ch = out[c];
          for (let i = 0; i < n; i++) {
            const ph = (i / n) * tumble;
            const am = 1 + 0.12 * Math.sin(TAU * ph);
            ch[i] = (lp.process(br.process(gauss(rng))) * 0.9 + lp2.process(p.process(gauss(rng))) * 0.35) * am;
          }
        }
      });
      addHum(buf, sr, [
        { f: 100, a: 0.006 },
        { f: 200, a: 0.002 },
      ]);
      for (let k = 0; k < tumble; k++) {
        const t = (k / tumble) * frames + range(rng, 0.45, 0.7) * (frames / tumble);
        if (rng() < 0.85) addCircular(buf, thump(sr, rng, range(rng, 55, 75), 0.18, 1.5), t, range(rng, 0.15, 0.4), range(rng, -0.2, 0.2));
      }
      return widen(buf, sr, 0.2);
    },
  },
];
