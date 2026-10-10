/**
 * Pure audio math shared by the engine and the UI. Kept free of React Native
 * imports so it is trivially unit-testable.
 */

/** Maps a 0..1 slider position to linear gain with a perceptual (squared) taper. */
export function sliderToGain(value: number): number {
  const v = Math.min(1, Math.max(0, value));
  return v * v;
}

/**
 * Sleep-timer fade shape. Linear in decibels (perceptually even — the sound
 * seems to shrink at a steady rate) down to −50 dB, then tapered to true silence.
 * `progress` runs 0 → 1 across the fade.
 */
export function fadeLevel(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return Math.pow(10, -2.5 * p) * (1 - p);
}

/** Samples the fade from `startProgress` to the end into an automation curve. */
export function buildFadeCurve(startProgress: number, points: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(Math.max(2, points));
  const span = 1 - startProgress;
  for (let i = 0; i < curve.length; i++) {
    curve[i] = fadeLevel(startProgress + (span * i) / (curve.length - 1));
  }
  return curve;
}

export interface TimerFadePlan {
  /** Gain to jump to right now. */
  startLevel: number;
  /** Seconds from now until the fade curve begins. */
  delay: number;
  /** Seconds the fade curve lasts (0 = no fade). */
  duration: number;
  /** Where in the fade (0..1) the curve starts — non-zero when re-anchoring mid-fade. */
  startProgress: number;
}

/**
 * Works out how to schedule the sleep-timer fade given wall-clock times.
 * Handles being called before the fade, mid-fade (e.g. after resuming), or late.
 */
export function timerFadePlan(endsAt: number, fadeMs: number, now: number): TimerFadePlan {
  const remaining = (endsAt - now) / 1000;
  const fade = Math.max(0, fadeMs / 1000);
  if (remaining <= 0) return { startLevel: 0, delay: 0, duration: 0, startProgress: 1 };
  if (fade <= 0) return { startLevel: 1, delay: remaining, duration: 0, startProgress: 0 };
  if (fade >= remaining) {
    const startProgress = 1 - remaining / fade;
    return { startLevel: fadeLevel(startProgress), delay: 0, duration: remaining, startProgress };
  }
  return { startLevel: 1, delay: remaining - fade, duration: fade, startProgress: 0 };
}

/** Formats milliseconds as H:MM:SS or M:SS. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Human duration like "1 h 30 min" or "45 min". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}
