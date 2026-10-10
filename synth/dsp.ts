/**
 * Small, dependency-free DSP toolkit used to synthesize every sound in the app
 * at build time. Everything here is deterministic (seeded RNG) so the generated
 * audio is reproducible from source.
 *
 * Only erasable TypeScript syntax is used so this runs directly under Node's
 * type stripping (`node synth/build.ts`) as well as Jest.
 */

export type Rng = () => number;
export type Stereo = [Float32Array, Float32Array];

export const TAU = Math.PI * 2;

/** Mulberry32 — fast, decent-quality 32-bit seeded PRNG. Returns [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Uniform in [lo, hi). */
export function range(rng: Rng, lo: number, hi: number): number {
  return lo + (hi - lo) * rng();
}

/** Approximately normal (Irwin–Hall, 4 terms), unit variance. */
export function gauss(rng: Rng): number {
  return (rng() + rng() + rng() + rng() - 2) * 1.7320508;
}

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export type BiquadType = 'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'peaking' | 'lowshelf' | 'highshelf';

/** RBJ cookbook biquad (transposed direct form II). Coefficients can be retuned per sample. */
export class Biquad {
  b0 = 1;
  b1 = 0;
  b2 = 0;
  a1 = 0;
  a2 = 0;
  z1 = 0;
  z2 = 0;
  type: BiquadType;
  sr: number;

  constructor(type: BiquadType, sr: number, freq: number, q = 0.7071, gainDb = 0) {
    this.type = type;
    this.sr = sr;
    this.set(freq, q, gainDb);
  }

  set(freq: number, q = 0.7071, gainDb = 0): void {
    const f = clamp(freq, 5, this.sr * 0.49);
    const w0 = (TAU * f) / this.sr;
    const cos = Math.cos(w0);
    const sin = Math.sin(w0);
    const alpha = sin / (2 * q);
    const A = Math.pow(10, gainDb / 40);
    let b0 = 1;
    let b1 = 0;
    let b2 = 0;
    let a0 = 1;
    let a1 = 0;
    let a2 = 0;
    switch (this.type) {
      case 'lowpass':
        b0 = (1 - cos) / 2;
        b1 = 1 - cos;
        b2 = (1 - cos) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cos;
        a2 = 1 - alpha;
        break;
      case 'highpass':
        b0 = (1 + cos) / 2;
        b1 = -(1 + cos);
        b2 = (1 + cos) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cos;
        a2 = 1 - alpha;
        break;
      case 'bandpass': // constant 0 dB peak gain
        b0 = alpha;
        b1 = 0;
        b2 = -alpha;
        a0 = 1 + alpha;
        a1 = -2 * cos;
        a2 = 1 - alpha;
        break;
      case 'notch':
        b0 = 1;
        b1 = -2 * cos;
        b2 = 1;
        a0 = 1 + alpha;
        a1 = -2 * cos;
        a2 = 1 - alpha;
        break;
      case 'peaking':
        b0 = 1 + alpha * A;
        b1 = -2 * cos;
        b2 = 1 - alpha * A;
        a0 = 1 + alpha / A;
        a1 = -2 * cos;
        a2 = 1 - alpha / A;
        break;
      case 'lowshelf': {
        const s = 2 * Math.sqrt(A) * alpha;
        b0 = A * (A + 1 - (A - 1) * cos + s);
        b1 = 2 * A * (A - 1 - (A + 1) * cos);
        b2 = A * (A + 1 - (A - 1) * cos - s);
        a0 = A + 1 + (A - 1) * cos + s;
        a1 = -2 * (A - 1 + (A + 1) * cos);
        a2 = A + 1 + (A - 1) * cos - s;
        break;
      }
      case 'highshelf': {
        const s = 2 * Math.sqrt(A) * alpha;
        b0 = A * (A + 1 + (A - 1) * cos + s);
        b1 = -2 * A * (A - 1 + (A + 1) * cos);
        b2 = A * (A + 1 + (A - 1) * cos - s);
        a0 = A + 1 - (A - 1) * cos + s;
        a1 = 2 * (A - 1 - (A + 1) * cos);
        a2 = A + 1 - (A - 1) * cos - s;
        break;
      }
    }
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }

  process(x: number): number {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
}

/** One-pole lowpass, cheap smoothing. */
export class OnePole {
  a: number;
  y = 0;
  constructor(sr: number, cutoff: number) {
    this.a = Math.exp((-TAU * cutoff) / sr);
  }
  setCutoff(sr: number, cutoff: number): void {
    this.a = Math.exp((-TAU * cutoff) / sr);
  }
  process(x: number): number {
    this.y = x + this.a * (this.y - x);
    return this.y;
  }
}

/** Paul Kellet's refined pink noise filter (−3 dB/oct), input white. */
export class PinkFilter {
  b0 = 0;
  b1 = 0;
  b2 = 0;
  b3 = 0;
  b4 = 0;
  b5 = 0;
  b6 = 0;
  process(white: number): number {
    this.b0 = 0.99886 * this.b0 + white * 0.0555179;
    this.b1 = 0.99332 * this.b1 + white * 0.0750759;
    this.b2 = 0.969 * this.b2 + white * 0.153852;
    this.b3 = 0.8665 * this.b3 + white * 0.3104856;
    this.b4 = 0.55 * this.b4 + white * 0.5329522;
    this.b5 = -0.7616 * this.b5 - white * 0.016898;
    const out = this.b0 + this.b1 + this.b2 + this.b3 + this.b4 + this.b5 + this.b6 + white * 0.5362;
    this.b6 = white * 0.115926;
    return out * 0.11;
  }
}

/** Leaky integrator for brown (red) noise, −6 dB/oct, with DC blocking. */
export class BrownFilter {
  y = 0;
  dc: Biquad;
  constructor(sr: number) {
    this.dc = new Biquad('highpass', sr, 18, 0.6);
  }
  process(white: number): number {
    this.y = (this.y + 0.02 * white) / 1.02;
    return this.dc.process(this.y * 3.5);
  }
}

/** Smoothly varying random value (interpolated random walk), useful for LFO-like modulation. */
export class SmoothRandom {
  rng: Rng;
  sr: number;
  rate: number;
  from: number;
  to: number;
  phase = 0;
  constructor(rng: Rng, sr: number, rate: number, initial?: number) {
    this.rng = rng;
    this.sr = sr;
    this.rate = rate;
    this.from = initial ?? rng();
    this.to = rng();
  }
  next(): number {
    this.phase += this.rate / this.sr;
    if (this.phase >= 1) {
      this.phase -= 1;
      this.from = this.to;
      this.to = this.rng();
    }
    // cosine interpolation
    const t = (1 - Math.cos(this.phase * Math.PI)) / 2;
    return this.from + (this.to - this.from) * t;
  }
}

/** Smooth random 0..1 envelope shared by both channels. */
export function envelope(rng: Rng, sr: number, n: number, rate: number): Float32Array {
  const sm = new SmoothRandom(rng, sr, rate);
  const env = new Float32Array(n);
  for (let i = 0; i < n; i++) env[i] = sm.next();
  return env;
}

// ---------------------------------------------------------------------------
// Buffers
// ---------------------------------------------------------------------------

export function stereo(frames: number): Stereo {
  return [new Float32Array(frames), new Float32Array(frames)];
}

/**
 * Builds a seamlessly looping stereo buffer from a continuous generator.
 * The generator renders `frames + fade` frames; the overshoot is crossfaded
 * into the head so sample N-1 flows straight into sample 0.
 *
 * `equalPower` suits uncorrelated noise; linear suits correlated material.
 */
export function makeLoop(
  frames: number,
  fade: number,
  render: (out: Stereo, frames: number) => void,
  equalPower = true,
): Stereo {
  const total = frames + fade;
  const raw = stereo(total);
  render(raw, total);
  const out = stereo(frames);
  for (let c = 0; c < 2; c++) {
    const src = raw[c];
    const dst = out[c];
    dst.set(src.subarray(0, frames));
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      const gIn = equalPower ? Math.sin((t * Math.PI) / 2) : t;
      const gOut = equalPower ? Math.cos((t * Math.PI) / 2) : 1 - t;
      dst[i] = src[i] * gIn + src[frames + i] * gOut;
    }
  }
  return out;
}

/** Adds a (mono or stereo) event into a loop buffer at `at`, wrapping around the end. */
export function addCircular(
  dst: Stereo,
  event: Float32Array | Stereo,
  at: number,
  gain = 1,
  pan = 0,
): void {
  const n = dst[0].length;
  const isStereo = Array.isArray(event);
  const len = isStereo ? event[0].length : event.length;
  // constant-power pan
  const p = (clamp(pan, -1, 1) + 1) * 0.25 * Math.PI;
  const gl = Math.cos(p) * Math.SQRT2 * gain;
  const gr = Math.sin(p) * Math.SQRT2 * gain;
  let idx = ((Math.floor(at) % n) + n) % n;
  for (let i = 0; i < len; i++) {
    if (isStereo) {
      dst[0][idx] += event[0][i] * gl;
      dst[1][idx] += event[1][i] * gr;
    } else {
      const s = event[i];
      dst[0][idx] += s * gl;
      dst[1][idx] += s * gr;
    }
    idx++;
    if (idx === n) idx = 0;
  }
}

/** Mixes src into dst with gain. */
export function mixInto(dst: Stereo, src: Stereo, gain = 1): void {
  for (let c = 0; c < 2; c++) {
    const d = dst[c];
    const s = src[c];
    for (let i = 0; i < d.length; i++) d[i] += s[i] * gain;
  }
}

export function rms(buf: Stereo): number {
  let sum = 0;
  let n = 0;
  for (const ch of buf) {
    for (let i = 0; i < ch.length; i++) sum += ch[i] * ch[i];
    n += ch.length;
  }
  return Math.sqrt(sum / Math.max(1, n));
}

export function peak(buf: Stereo): number {
  let p = 0;
  for (const ch of buf) for (let i = 0; i < ch.length; i++) p = Math.max(p, Math.abs(ch[i]));
  return p;
}

/**
 * Normalizes to a target RMS (dBFS) and gently soft-clips anything above
 * `ceiling` so lossy encoding never clips.
 */
export function normalize(buf: Stereo, targetDb: number, ceiling = 0.95): Stereo {
  const current = rms(buf);
  if (current <= 1e-9) return buf;
  const g = dbToGain(targetDb) / current;
  const knee = ceiling * 0.8;
  for (const ch of buf) {
    for (let i = 0; i < ch.length; i++) {
      let x = ch[i] * g;
      const ax = Math.abs(x);
      if (ax > knee) {
        const over = (ax - knee) / (ceiling - knee);
        x = Math.sign(x) * (knee + (ceiling - knee) * Math.tanh(over));
      }
      ch[i] = x;
    }
  }
  return buf;
}

/** Simple exponential decay envelope multiply in place. */
export function decay(buf: Float32Array, sr: number, seconds: number): Float32Array {
  const k = Math.exp(-1 / (seconds * sr));
  let g = 1;
  for (let i = 0; i < buf.length; i++) {
    buf[i] *= g;
    g *= k;
  }
  return buf;
}

/** Short raised-cosine fades at both ends of a one-shot to avoid clicks. */
export function edgeFade(buf: Float32Array, frames: number): Float32Array {
  const n = Math.min(frames, Math.floor(buf.length / 2));
  for (let i = 0; i < n; i++) {
    const g = 0.5 - 0.5 * Math.cos((Math.PI * i) / n);
    buf[i] *= g;
    buf[buf.length - 1 - i] *= g;
  }
  return buf;
}

/**
 * Cheap stereo widener / room: a few short decorrelated delays mixed into the
 * opposite channel. Makes mono-ish sources feel spacious without a full reverb.
 */
export function widen(buf: Stereo, sr: number, amount = 0.3): Stereo {
  const n = buf[0].length;
  const dl = Math.floor(sr * 0.0117);
  const dr = Math.floor(sr * 0.0173);
  const l = Float32Array.from(buf[0]);
  const r = Float32Array.from(buf[1]);
  for (let i = 0; i < n; i++) {
    buf[0][i] = l[i] + amount * r[(i - dr + n) % n];
    buf[1][i] = r[i] + amount * l[(i - dl + n) % n];
  }
  return buf;
}

/**
 * Small Schroeder-style reverb (4 combs + 2 allpasses per channel), processed
 * circularly over the loop twice so the tail wraps seamlessly.
 */
export function reverb(buf: Stereo, sr: number, wet = 0.25, roomSeconds = 1.2): Stereo {
  const n = buf[0].length;
  const combTimes = [0.0297, 0.0371, 0.0411, 0.0437];
  const apTimes = [0.005, 0.0017];
  const fb = Math.pow(0.001, 0.035 / roomSeconds);
  for (let c = 0; c < 2; c++) {
    const input = buf[c];
    const out = new Float32Array(n);
    const spread = c === 0 ? 1 : 1.07;
    const combs = combTimes.map((t) => ({
      line: new Float32Array(Math.floor(t * spread * sr)),
      i: 0,
      lp: 0,
    }));
    const aps = apTimes.map((t) => ({ line: new Float32Array(Math.floor(t * spread * sr)), i: 0 }));
    // two passes: first warms up the delay lines, second writes output
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 0; k < n; k++) {
        const x = input[k];
        let y = 0;
        for (const cb of combs) {
          const d = cb.line[cb.i];
          cb.lp = d * 0.7 + cb.lp * 0.3; // damping
          cb.line[cb.i] = x + cb.lp * fb;
          cb.i = (cb.i + 1) % cb.line.length;
          y += d;
        }
        y *= 0.25;
        for (const ap of aps) {
          const d = ap.line[ap.i];
          const v = y + d * 0.5;
          ap.line[ap.i] = v;
          ap.i = (ap.i + 1) % ap.line.length;
          y = d - v * 0.5;
        }
        if (pass === 1) out[k] = y;
      }
    }
    for (let k = 0; k < n; k++) input[k] = input[k] * (1 - wet * 0.5) + out[k] * wet;
  }
  return buf;
}

// ---------------------------------------------------------------------------
// Noise sources
// ---------------------------------------------------------------------------

export type NoiseColor = 'white' | 'pink' | 'brown';

export function noiseSource(color: NoiseColor, rng: Rng, sr: number): () => number {
  if (color === 'white') return () => gauss(rng) * 0.35;
  if (color === 'pink') {
    const f = new PinkFilter();
    return () => f.process(gauss(rng)) * 1.0;
  }
  const f = new BrownFilter(sr);
  return () => f.process(gauss(rng));
}

// ---------------------------------------------------------------------------
// WAV I/O
// ---------------------------------------------------------------------------

/** Encodes stereo float audio to a 16-bit PCM WAV byte array. */
export function encodeWav(buf: Stereo, sr: number): Uint8Array {
  const frames = buf[0].length;
  const dataBytes = frames * 2 * 2;
  const out = new Uint8Array(44 + dataBytes);
  const view = new DataView(out.buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataBytes, true);
  let off = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < 2; c++) {
      const s = clamp(buf[c][i], -1, 1);
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return out;
}

/**
 * Pads a loop circularly: [last `pad` frames | loop | first `pad` frames].
 * Any window of exactly `frames` samples inside the padded region loops
 * seamlessly, which makes playback immune to codec priming/padding offsets.
 */
export function circularPad(buf: Stereo, pad: number): Stereo {
  const n = buf[0].length;
  const out = stereo(n + pad * 2);
  for (let c = 0; c < 2; c++) {
    const s = buf[c];
    const d = out[c];
    for (let i = 0; i < pad; i++) d[i] = s[(n - pad + i + n * 4) % n];
    d.set(s, pad);
    for (let i = 0; i < pad; i++) d[pad + n + i] = s[i % n];
  }
  return out;
}
