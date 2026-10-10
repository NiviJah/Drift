import { buildFadeCurve, fadeLevel, formatClock, formatDuration, sliderToGain, timerFadePlan } from '../src/audio/math';

describe('volume mapping', () => {
  it('uses a perceptual taper and clamps', () => {
    expect(sliderToGain(0)).toBe(0);
    expect(sliderToGain(1)).toBe(1);
    expect(sliderToGain(0.5)).toBeCloseTo(0.25);
    expect(sliderToGain(2)).toBe(1);
    expect(sliderToGain(-1)).toBe(0);
  });
});

describe('sleep timer fade', () => {
  it('fade curve starts at full volume, decreases monotonically and ends silent', () => {
    expect(fadeLevel(0)).toBe(1);
    expect(fadeLevel(1)).toBe(0);
    const curve = buildFadeCurve(0, 64);
    for (let i = 1; i < curve.length; i++) expect(curve[i]).toBeLessThan(curve[i - 1]);
    expect(curve[curve.length - 1]).toBe(0);
  });

  it('plans a delayed fade when the fade window is in the future', () => {
    const now = 1_000_000;
    const plan = timerFadePlan(now + 30 * 60_000, 10 * 60_000, now);
    expect(plan.startLevel).toBe(1);
    expect(plan.delay).toBeCloseTo(20 * 60);
    expect(plan.duration).toBeCloseTo(10 * 60);
    expect(plan.startProgress).toBe(0);
  });

  it('re-anchors mid-fade (e.g. after resuming playback)', () => {
    const now = 1_000_000;
    const plan = timerFadePlan(now + 5 * 60_000, 10 * 60_000, now);
    expect(plan.delay).toBe(0);
    expect(plan.duration).toBeCloseTo(5 * 60);
    expect(plan.startProgress).toBeCloseTo(0.5);
    expect(plan.startLevel).toBeCloseTo(fadeLevel(0.5));
  });

  it('fades across the entire timer when fade equals duration', () => {
    const plan = timerFadePlan(60_000, 60_000, 0);
    expect(plan).toEqual({ startLevel: 1, delay: 0, duration: 60, startProgress: 0 });
  });

  it('handles no fade and expired timers', () => {
    expect(timerFadePlan(10_000, 0, 0)).toEqual({ startLevel: 1, delay: 10, duration: 0, startProgress: 0 });
    expect(timerFadePlan(0, 60_000, 5_000).startLevel).toBe(0);
  });
});

describe('formatting', () => {
  it('formats clocks and durations', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(61_000)).toBe('1:01');
    expect(formatClock(3_600_000 + 5_000)).toBe('1:00:05');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(90)).toBe('1 h 30 min');
  });
});
