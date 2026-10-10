import { MAX_MIX_SIZE, mixesEqual, sanitizeMix, useStore } from '../src/state/store';
import { SOUNDS } from '../src/audio/catalog';

const s = () => useStore.getState();

beforeEach(() => {
  s().resetAll();
});

describe('mix', () => {
  it('toggling a sound adds it at its default volume and starts playback', () => {
    expect(s().toggleSound('pink')).toBe('added');
    expect(s().mix.pink).toBeCloseTo(SOUNDS.find((x) => x.id === 'pink')!.defaultVolume);
    expect(s().isPlaying).toBe(true);
    expect(s().toggleSound('pink')).toBe('removed');
    expect(s().mix).toEqual({});
    expect(s().isPlaying).toBe(false);
  });

  it(`caps a mix at ${MAX_MIX_SIZE} sounds`, () => {
    SOUNDS.slice(0, MAX_MIX_SIZE).forEach((x) => s().toggleSound(x.id));
    expect(s().toggleSound(SOUNDS[MAX_MIX_SIZE].id)).toBe('limit');
    expect(Object.keys(s().mix)).toHaveLength(MAX_MIX_SIZE);
  });

  it('clamps per-sound volume', () => {
    s().toggleSound('brown');
    s().setSoundVolume('brown', 1.7);
    expect(s().mix.brown).toBe(1);
    s().setSoundVolume('brown', -1);
    expect(s().mix.brown).toBe(0);
  });

  it('random mix produces 2–3 known sounds and plays', () => {
    for (let i = 0; i < 20; i++) {
      s().randomMix();
      const ids = Object.keys(s().mix);
      expect(ids.length).toBeGreaterThanOrEqual(2);
      expect(ids.length).toBeLessThanOrEqual(3);
      expect(s().isPlaying).toBe(true);
    }
  });

  it('sanitizes unknown ids and bad volumes', () => {
    expect(sanitizeMix({ pink: 2, nope: 0.5, brown: NaN as unknown as number })).toEqual({ pink: 1, brown: 0 });
  });
});

describe('presets', () => {
  it('saves, updates, renames and deletes', () => {
    s().loadMix({ ocean: 0.6, wind: 0.3 });
    const p = s().savePreset('  Beach  ');
    expect(p.name).toBe('Beach');
    expect(s().activePresetId).toBe(p.id);
    expect(mixesEqual(s().presets[0].mix, { ocean: 0.6, wind: 0.3 })).toBe(true);

    s().setSoundVolume('wind', 0.5);
    s().updatePreset(p.id);
    expect(s().presets[0].mix.wind).toBe(0.5);

    s().renamePreset(p.id, 'Shore');
    expect(s().presets[0].name).toBe('Shore');

    s().deletePreset(p.id);
    expect(s().presets).toHaveLength(0);
    expect(s().activePresetId).toBeNull();
  });
});

describe('sleep timer', () => {
  it('starts with a clamped fade and extends', () => {
    s().loadMix({ pink: 0.5 });
    s().startTimer(30, 60);
    const t = s().timer!;
    expect(t.durationMs).toBe(30 * 60_000);
    expect(t.fadeMs).toBe(30 * 60_000); // fade can't exceed the timer
    s().extendTimer(15);
    expect(s().timer!.endsAt - t.endsAt).toBe(15 * 60_000);
    s().cancelTimer();
    expect(s().timer).toBeNull();
  });
});
