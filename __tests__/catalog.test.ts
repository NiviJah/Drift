import { CATEGORIES, SOUNDS, SOUND_BY_ID, searchSounds } from '../src/audio/catalog';
import { BED_ASSETS, ONE_SHOT_ASSETS } from '../src/audio/generated/manifest';
import { FEATURED_PRESETS } from '../src/state/presets';
import { allBeds } from '../synth/recipes';

describe('catalog', () => {
  it('every sound has a generated, looped asset and a recipe', () => {
    const recipeIds = new Set(allBeds.map((r) => r.id));
    for (const s of SOUNDS) {
      expect(BED_ASSETS[s.id]).toBeDefined();
      expect(BED_ASSETS[s.id].loopEnd).toBeGreaterThan(BED_ASSETS[s.id].loopStart);
      expect(recipeIds.has(s.id)).toBe(true);
    }
  });

  it('every event layer has one-shot assets', () => {
    for (const s of SOUNDS.filter((x) => x.events)) {
      expect(ONE_SHOT_ASSETS[s.events!.asset].length).toBeGreaterThan(0);
    }
  });

  it('uses known categories and unique ids', () => {
    const cats = new Set(CATEGORIES.map((c) => c.id));
    expect(new Set(SOUNDS.map((s) => s.id)).size).toBe(SOUNDS.length);
    for (const s of SOUNDS) expect(cats.has(s.category)).toBe(true);
  });

  it('featured presets only reference real sounds', () => {
    for (const p of FEATURED_PRESETS) {
      for (const id of Object.keys(p.mix)) expect(SOUND_BY_ID[id]).toBeDefined();
    }
  });
});

describe('search', () => {
  it('matches names, tags and categories, case/accent-insensitively', () => {
    expect(searchSounds('RAIN').map((s) => s.id)).toEqual(expect.arrayContaining(['light-rain', 'heavy-rain', 'rain-tent']));
    expect(searchSounds('adhd').map((s) => s.id)).toContain('brown');
    expect(searchSounds('baby').length).toBeGreaterThan(3);
    expect(searchSounds('café')).toEqual(searchSounds('cafe'));
  });

  it('ranks name prefix matches first', () => {
    expect(searchSounds('ocean')[0].id).toBe('ocean');
  });

  it('returns everything for an empty query and nothing for nonsense', () => {
    expect(searchSounds('  ')).toHaveLength(SOUNDS.length);
    expect(searchSounds('zzzqqq')).toHaveLength(0);
  });
});
