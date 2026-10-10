import { Biquad, BrownFilter, TAU, edgeFade, gauss, range, reverb, stereo } from '../dsp.ts';
import type { Rng, Stereo } from '../dsp.ts';
import type { OneShotRecipe } from '../types.ts';

/** Pads a one-shot with silence so reverb tails have room, then applies reverb. */
function withTail(buf: Stereo, sr: number, tailSeconds: number, wet: number, room: number): Stereo {
  const n = buf[0].length + Math.floor(tailSeconds * sr);
  const out = stereo(n);
  out[0].set(buf[0]);
  out[1].set(buf[1]);
  // reverb() is circular; the silent tail absorbs the wrap so nothing bleeds into the attack
  reverb(out, sr, wet, room);
  edgeFade(out[0], Math.floor(sr * 0.01));
  edgeFade(out[1], Math.floor(sr * 0.01));
  return out;
}

function thunder(sr: number, rng: Rng, variant: number): Stereo {
  const near = variant % 2 === 0;
  const seconds = range(rng, 9, 14);
  const n = Math.floor(seconds * sr);
  const out = stereo(n);
  // several overlapping rumbles with their own swell and decay
  const rumbles = 3 + Math.floor(rng() * 4);
  const peaks: { at: number; rise: number; fall: number; amp: number }[] = [];
  for (let k = 0; k < rumbles; k++) {
    peaks.push({
      at: (k === 0 ? range(rng, 0.05, 0.4) : range(rng, 0.3, seconds * 0.55)) * sr,
      rise: range(rng, 0.1, 0.8) * sr,
      fall: range(rng, 1.5, 4.5) * sr,
      amp: k === 0 ? 1 : range(rng, 0.35, 0.9),
    });
  }
  for (let c = 0; c < 2; c++) {
    const br = new BrownFilter(sr);
    const lp = new Biquad('lowpass', sr, near ? 380 : 180, 0.8);
    const lp2 = new Biquad('lowpass', sr, near ? 520 : 240, 0.7);
    const crackHp = new Biquad('highpass', sr, 900, 0.7);
    const ch = out[c];
    for (let i = 0; i < n; i++) {
      let env = 0;
      for (const p of peaks) {
        const d = i - p.at;
        if (d < 0) continue;
        env += p.amp * (d < p.rise ? d / p.rise : Math.exp(-(d - p.rise) / p.fall));
      }
      // slow amplitude texture so the rumble "rolls"
      const roll = 0.7 + 0.3 * Math.sin((TAU * 0.9 * i) / sr + c + Math.sin((TAU * 0.23 * i) / sr) * 3);
      let s = lp2.process(lp.process(br.process(gauss(rng)))) * env * roll * 2.2;
      if (near && i < sr * 1.2) {
        // the initial crack of a close strike
        const t = i / sr;
        const crackEnv = t < 0.01 ? t / 0.01 : Math.exp(-(t - 0.01) * 6);
        s += crackHp.process(gauss(rng)) * crackEnv * 0.25 * (rng() < 0.3 ? 1.5 : 1);
      }
      ch[i] = s;
    }
  }
  return withTail(out, sr, 2, 0.4, 3);
}

// --- Birds -------------------------------------------------------------------

type Note = { f0: number; f1: number; dur: number; gap: number; amp: number; vib?: number; vibDepth?: number };

function renderNotes(sr: number, notes: Note[]): Float32Array {
  const total = notes.reduce((s, x) => s + x.dur + x.gap, 0);
  const out = new Float32Array(Math.floor(total * sr) + 1);
  let t0 = 0;
  for (const note of notes) {
    const n = Math.floor(note.dur * sr);
    const start = Math.floor(t0 * sr);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const x = i / n;
      const vib = note.vib ? Math.sin((TAU * note.vib * i) / sr) * (note.vibDepth ?? 0.03) : 0;
      // exponential glide between start and end pitch
      const f = note.f0 * Math.pow(note.f1 / note.f0, x) * (1 + vib);
      ph += (TAU * f) / sr;
      const env = Math.pow(Math.sin(Math.PI * x), 0.7);
      out[start + i] += (Math.sin(ph) + 0.15 * Math.sin(2 * ph)) * env * note.amp;
    }
    t0 += note.dur + note.gap;
  }
  return out;
}

function birdCall(sr: number, rng: Rng, variant: number): Float32Array {
  const p = range(rng, 0.9, 1.12); // pitch individuality
  const notes: Note[] = [];
  switch (variant % 8) {
    case 0: {
      // quick descending chirps
      const k = 3 + Math.floor(rng() * 4);
      for (let i = 0; i < k; i++) notes.push({ f0: 5200 * p, f1: 3100 * p, dur: 0.045, gap: 0.06, amp: 0.8 });
      break;
    }
    case 1: {
      // trill
      const k = 10 + Math.floor(rng() * 10);
      for (let i = 0; i < k; i++) notes.push({ f0: 4100 * p, f1: 4500 * p, dur: 0.022, gap: 0.012, amp: 0.6 + 0.4 * Math.sin((Math.PI * i) / k) });
      break;
    }
    case 2:
      // two-note "fee-bee" whistle
      notes.push({ f0: 3300 * p, f1: 3250 * p, dur: 0.32, gap: 0.08, amp: 0.9, vib: 6, vibDepth: 0.004 });
      notes.push({ f0: 2850 * p, f1: 2800 * p, dur: 0.38, gap: 0, amp: 0.8, vib: 6, vibDepth: 0.004 });
      break;
    case 3:
      // warble
      notes.push({ f0: 3400 * p, f1: 3700 * p, dur: 1.1, gap: 0, amp: 0.7, vib: 11, vibDepth: 0.09 });
      break;
    case 4: {
      // dove: soft low hoots
      notes.push({ f0: 520 * p, f1: 620 * p, dur: 0.35, gap: 0.12, amp: 1 });
      for (let i = 0; i < 3; i++) notes.push({ f0: 600 * p, f1: 560 * p, dur: 0.42, gap: 0.18, amp: 0.85 });
      break;
    }
    case 5: {
      // robin-like phrase of varied notes
      const k = 4 + Math.floor(rng() * 4);
      for (let i = 0; i < k; i++) {
        const a = range(rng, 2200, 4200) * p;
        notes.push({ f0: a, f1: a * range(rng, 0.75, 1.35), dur: range(rng, 0.07, 0.16), gap: range(rng, 0.03, 0.08), amp: range(rng, 0.6, 1) });
      }
      break;
    }
    case 6: {
      // rising "sweet" calls
      const k = 2 + Math.floor(rng() * 3);
      for (let i = 0; i < k; i++) notes.push({ f0: 2600 * p, f1: 4300 * p, dur: 0.12, gap: 0.18, amp: 0.8 });
      break;
    }
    default: {
      // chickadee-ish buzz: "dee-dee-dee"
      notes.push({ f0: 6000 * p, f1: 5400 * p, dur: 0.09, gap: 0.05, amp: 0.7 });
      for (let i = 0; i < 3; i++) notes.push({ f0: 3600 * p, f1: 3500 * p, dur: 0.14, gap: 0.06, amp: 0.6, vib: 70, vibDepth: 0.05 });
    }
  }
  return edgeFade(renderNotes(sr, notes), 32);
}

function birds(sr: number, rng: Rng, variant: number): Stereo {
  const mono = birdCall(sr, rng, variant);
  const out = stereo(mono.length);
  out[0].set(mono);
  out[1].set(mono);
  return withTail(out, sr, 1.2, 0.35, 1.6);
}

export const oneShotRecipes: OneShotRecipe[] = [
  { id: 'thunder', variants: 4, peakDb: -3, render: thunder },
  { id: 'birds', variants: 8, peakDb: -9, render: birds },
];
