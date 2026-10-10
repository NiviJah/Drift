import type { Rng, Stereo } from './dsp.ts';

/** A seamlessly looping background layer. */
export interface BedRecipe {
  id: string;
  /** Loop length in seconds. Tonal recipes pick lengths that hold whole cycles. */
  seconds: number;
  /** Target RMS in dBFS after normalization — keeps sounds balanced against each other. */
  loudnessDb: number;
  render: (sr: number, frames: number, rng: Rng) => Stereo;
}

/** A family of one-shot sounds the engine triggers at random times (thunder, bird calls...). */
export interface OneShotRecipe {
  id: string;
  variants: number;
  /** Target peak level in dBFS for each variant. */
  peakDb: number;
  render: (sr: number, rng: Rng, variant: number) => Stereo;
}
