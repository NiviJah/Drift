import { circularPad, makeLoop, mulberry32, normalize, peak, rms, seedFrom } from '../synth/dsp';
import { allBeds, allOneShots } from '../synth/recipes';

const SR = 8000; // low rate keeps the full-catalog render fast in tests

describe('dsp primitives', () => {
  it('seeded RNG is deterministic and in [0, 1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
    expect(seedFrom('rain')).not.toBe(seedFrom('fan'));
  });

  it('makeLoop crossfades the overshoot so the seam is continuous', () => {
    // a ramp generator: without the crossfade the seam would jump from ~1 back to 0
    const loop = makeLoop(
      1000,
      200,
      (out, n) => {
        for (let i = 0; i < n; i++) out[0][i] = out[1][i] = i / n;
      },
      false,
    );
    const ch = loop[0];
    const seamStep = Math.abs(ch[0] - ch[ch.length - 1]);
    expect(seamStep).toBeLessThan(0.01);
  });

  it('circularPad wraps the loop on both sides', () => {
    const buf = makeLoop(10, 0, (out, n) => {
      for (let i = 0; i < n; i++) out[0][i] = out[1][i] = i;
    });
    const padded = circularPad(buf, 3);
    expect(Array.from(padded[0])).toEqual([7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2]);
  });

  it('normalize hits the target RMS and never exceeds the ceiling', () => {
    const rng = mulberry32(1);
    const buf = makeLoop(4000, 0, (out, n) => {
      for (let i = 0; i < n; i++) out[0][i] = out[1][i] = (rng() * 2 - 1) * 3;
    });
    normalize(buf, -20, 0.95);
    expect(20 * Math.log10(rms(buf))).toBeCloseTo(-20, 0);
    expect(peak(buf)).toBeLessThanOrEqual(0.95);
  });
});

describe('sound recipes', () => {
  it('have unique ids', () => {
    const ids = allBeds.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(allBeds.map((b) => [b.id, b] as const))('%s renders a finite, non-silent loop of the right length', (_id, recipe) => {
    const frames = Math.round(recipe.seconds * SR);
    const buf = recipe.render(SR, frames, mulberry32(seedFrom(recipe.id)));
    expect(buf).toHaveLength(2);
    expect(buf[0].length).toBe(frames);
    expect(buf[1].length).toBe(frames);
    let finite = true;
    for (const ch of buf) for (let i = 0; i < ch.length; i += 7) if (!Number.isFinite(ch[i])) finite = false;
    expect(finite).toBe(true);
    expect(rms(buf)).toBeGreaterThan(1e-5);
  });

  it.each(allOneShots.map((o) => [o.id, o] as const))('%s one-shots render every variant', (_id, recipe) => {
    for (let v = 0; v < recipe.variants; v++) {
      const buf = recipe.render(SR, mulberry32(v + 1), v);
      expect(buf[0].length).toBeGreaterThan(SR * 0.5);
      expect(rms(buf)).toBeGreaterThan(1e-5);
    }
  });
});
