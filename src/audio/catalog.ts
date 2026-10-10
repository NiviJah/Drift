import type { ComponentProps } from 'react';
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type CategoryId = 'noise' | 'rain' | 'water' | 'nature' | 'air' | 'home' | 'tones';

export interface Category {
  id: CategoryId;
  name: string;
  icon: IconName;
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: 'noise', name: 'Noise', icon: 'blur', color: '#B4A3FF' },
  { id: 'rain', name: 'Rain', icon: 'weather-rainy', color: '#7FB2FF' },
  { id: 'water', name: 'Water', icon: 'waves', color: '#5ED8F0' },
  { id: 'nature', name: 'Nature', icon: 'pine-tree', color: '#7EE3A1' },
  { id: 'air', name: 'Air', icon: 'weather-windy', color: '#C9D3E6' },
  { id: 'home', name: 'Home', icon: 'home-outline', color: '#FFC58A' },
  { id: 'tones', name: 'Tones', icon: 'sine-wave', color: '#FF9ECF' },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, Category>;

/** Randomly triggered one-shots layered on top of a looping bed (thunder claps, bird calls). */
export interface EventLayer {
  asset: 'thunder' | 'birds';
  /** Seconds between events. */
  gap: [number, number];
  /** Delay before the first event after the sound starts. */
  firstDelay: [number, number];
  /** Linear gain multiplier range applied per event. */
  gain: [number, number];
  /** Stereo position range (-1..1). */
  pan: [number, number];
  /** Playback-rate range — subtle pitch/size variation. */
  rate: [number, number];
}

export interface SoundDef {
  id: string;
  name: string;
  category: CategoryId;
  icon: IconName;
  description: string;
  /** Extra search terms. */
  tags: string[];
  /** Initial slider position (0..1) when added to a mix. */
  defaultVolume: number;
  events?: EventLayer;
  /** Best experienced with headphones (binaural beats). */
  headphones?: boolean;
}

export const SOUNDS: SoundDef[] = [
  // Noise
  { id: 'white', name: 'White Noise', category: 'noise', icon: 'grain', description: 'Equal energy across all frequencies. Masks sudden sounds best.', tags: ['static', 'tv', 'mask', 'focus', 'baby', 'tinnitus'], defaultVolume: 0.5 },
  { id: 'pink', name: 'Pink Noise', category: 'noise', icon: 'blur', description: 'Softer than white — balanced and natural, like steady rain.', tags: ['sleep', 'deep sleep', 'focus', 'memory'], defaultVolume: 0.55 },
  { id: 'brown', name: 'Brown Noise', category: 'noise', icon: 'blur-radial', description: 'Deep, warm rumble. A favourite for focus and ADHD.', tags: ['red', 'adhd', 'focus', 'study', 'rumble', 'deep'], defaultVolume: 0.6 },
  { id: 'grey', name: 'Grey Noise', category: 'noise', icon: 'chart-bell-curve', description: 'Tuned to sound equally loud at every pitch to the human ear.', tags: ['gray', 'tinnitus', 'balanced'], defaultVolume: 0.55 },
  { id: 'green', name: 'Green Noise', category: 'noise', icon: 'leaf', description: 'Centred on the mid-range — the hum of the natural world.', tags: ['nature', 'calm', 'relax'], defaultVolume: 0.55 },
  { id: 'deep', name: 'Deep Rumble', category: 'noise', icon: 'weather-hazy', description: 'A very low, enveloping drone. Felt as much as heard.', tags: ['low', 'bass', 'brown', 'snore', 'mask'], defaultVolume: 0.6 },

  // Rain
  { id: 'light-rain', name: 'Light Rain', category: 'rain', icon: 'weather-rainy', description: 'Gentle drizzle with soft, scattered drops.', tags: ['drizzle', 'sleep', 'calm', 'storm'], defaultVolume: 0.6 },
  { id: 'heavy-rain', name: 'Heavy Rain', category: 'rain', icon: 'weather-pouring', description: 'A steady downpour — dense, rich and immersive.', tags: ['downpour', 'storm', 'monsoon', 'sleep'], defaultVolume: 0.55 },
  { id: 'rain-tent', name: 'Rain on Tent', category: 'rain', icon: 'tent', description: 'Raindrops pattering on canvas. Cozy and close.', tags: ['camping', 'roof', 'cozy', 'patter'], defaultVolume: 0.6 },
  {
    id: 'thunder',
    name: 'Thunder',
    category: 'rain',
    icon: 'weather-lightning-rainy',
    description: 'Distant storm with rolling thunder. Pairs perfectly with rain.',
    tags: ['storm', 'thunderstorm', 'lightning', 'rumble'],
    defaultVolume: 0.6,
    events: { asset: 'thunder', gap: [18, 50], firstDelay: [3, 10], gain: [0.45, 1], pan: [-0.6, 0.6], rate: [0.85, 1.1] },
  },

  // Water
  { id: 'ocean', name: 'Ocean Waves', category: 'water', icon: 'waves', description: 'Slow waves rolling in and washing back out.', tags: ['sea', 'beach', 'surf', 'shore', 'tide'], defaultVolume: 0.6 },
  { id: 'stream', name: 'Forest Stream', category: 'water', icon: 'water-outline', description: 'A babbling brook over smooth stones.', tags: ['brook', 'river', 'creek', 'babbling'], defaultVolume: 0.55 },
  { id: 'waterfall', name: 'Waterfall', category: 'water', icon: 'waterfall', description: 'Powerful, constant cascading water.', tags: ['falls', 'cascade', 'shower', 'mask'], defaultVolume: 0.5 },
  { id: 'underwater', name: 'Underwater', category: 'water', icon: 'jellyfish', description: 'Muffled depths with drifting bubbles.', tags: ['deep', 'ocean', 'womb', 'bubbles', 'dive'], defaultVolume: 0.6 },

  // Nature
  { id: 'campfire', name: 'Campfire', category: 'nature', icon: 'campfire', description: 'Crackling logs and a warm, flickering roar.', tags: ['fire', 'fireplace', 'crackle', 'cozy', 'hearth'], defaultVolume: 0.6 },
  {
    id: 'forest',
    name: 'Birdsong',
    category: 'nature',
    icon: 'bird',
    description: 'Leaves in the breeze and birds calling through the trees.',
    tags: ['birds', 'forest', 'morning', 'spring', 'woods', 'chirp'],
    defaultVolume: 0.6,
    events: { asset: 'birds', gap: [1.5, 7], firstDelay: [0.5, 2.5], gain: [0.25, 0.9], pan: [-0.9, 0.9], rate: [0.92, 1.1] },
  },
  { id: 'crickets', name: 'Crickets', category: 'nature', icon: 'grass', description: 'A summer-night chorus of chirping crickets.', tags: ['night', 'summer', 'insects', 'countryside'], defaultVolume: 0.55 },
  { id: 'frogs', name: 'Night Pond', category: 'nature', icon: 'weather-night', description: 'Frogs croaking by the water under the stars.', tags: ['frogs', 'night', 'pond', 'swamp', 'toads'], defaultVolume: 0.55 },
  { id: 'purr', name: 'Cat Purr', category: 'nature', icon: 'cat', description: 'A contented cat purring beside you.', tags: ['cat', 'kitten', 'pet', 'cozy', 'animal'], defaultVolume: 0.6 },

  // Air
  { id: 'wind', name: 'Wind', category: 'air', icon: 'weather-windy', description: 'Gusts sweeping across open land.', tags: ['breeze', 'gust', 'storm', 'mountain', 'winter'], defaultVolume: 0.55 },
  { id: 'fan', name: 'Box Fan', category: 'air', icon: 'fan', description: 'The steady whir of a bedside fan.', tags: ['fan', 'whir', 'bedroom', 'mask', 'baby'], defaultVolume: 0.55 },
  { id: 'air-conditioner', name: 'Air Conditioner', category: 'air', icon: 'air-conditioner', description: 'A low, even hum of cool air.', tags: ['ac', 'hvac', 'hum', 'purifier'], defaultVolume: 0.55 },
  { id: 'airplane', name: 'Airplane Cabin', category: 'air', icon: 'airplane', description: 'Cruising altitude: deep engine drone and cabin air.', tags: ['flight', 'plane', 'travel', 'jet', 'brown'], defaultVolume: 0.55 },
  { id: 'hair-dryer', name: 'Hair Dryer', category: 'air', icon: 'hair-dryer', description: 'A classic for soothing fussy babies.', tags: ['baby', 'blow dryer', 'colic', 'hum'], defaultVolume: 0.5 },

  // Home
  { id: 'shush', name: 'Shushing', category: 'home', icon: 'baby-face-outline', description: 'Rhythmic “shhh” — the oldest baby soother there is.', tags: ['baby', 'shh', 'newborn', 'infant', 'calm'], defaultVolume: 0.5 },
  { id: 'heartbeat', name: 'Heartbeat', category: 'home', icon: 'heart-pulse', description: 'A slow resting heartbeat with a womb-like whoosh.', tags: ['womb', 'baby', 'pulse', 'mother', 'calm'], defaultVolume: 0.6 },
  { id: 'clock', name: 'Ticking Clock', category: 'home', icon: 'clock-outline', description: 'Soft tick-tock of an old wall clock.', tags: ['tick', 'tock', 'grandfather', 'metronome'], defaultVolume: 0.5 },
  { id: 'train', name: 'Night Train', category: 'home', icon: 'train', description: 'The rhythmic clack of rails on a long journey.', tags: ['rail', 'travel', 'sleeper', 'rhythm'], defaultVolume: 0.55 },
  { id: 'dryer', name: 'Clothes Dryer', category: 'home', icon: 'tumble-dryer', description: 'A tumbling dryer with a warm, low hum.', tags: ['laundry', 'washing machine', 'tumble', 'baby'], defaultVolume: 0.55 },

  // Tones
  { id: 'binaural-delta', name: 'Delta Waves', category: 'tones', icon: 'sleep', description: '2 Hz binaural beat associated with deep sleep. Use headphones.', tags: ['binaural', 'sleep', 'delta', 'brainwave'], defaultVolume: 0.45, headphones: true },
  { id: 'binaural-theta', name: 'Theta Waves', category: 'tones', icon: 'meditation', description: '6 Hz binaural beat for meditation and drifting off. Use headphones.', tags: ['binaural', 'meditation', 'theta', 'brainwave'], defaultVolume: 0.45, headphones: true },
  { id: 'binaural-alpha', name: 'Alpha Waves', category: 'tones', icon: 'yoga', description: '10 Hz binaural beat for calm relaxation. Use headphones.', tags: ['binaural', 'relax', 'alpha', 'brainwave'], defaultVolume: 0.45, headphones: true },
  { id: 'binaural-beta', name: 'Beta Waves', category: 'tones', icon: 'brain', description: '16 Hz binaural beat for alert focus. Use headphones.', tags: ['binaural', 'focus', 'beta', 'study', 'brainwave'], defaultVolume: 0.45, headphones: true },
  { id: 'om', name: 'Om Drone', category: 'tones', icon: 'om', description: 'A resonant, breathing “Om” at 136.1 Hz.', tags: ['meditation', 'chant', 'drone', 'yoga', 'mantra'], defaultVolume: 0.5 },
  { id: 'singing-bowls', name: 'Singing Bowls', category: 'tones', icon: 'bell-ring-outline', description: 'Tibetan bowls ringing out and fading slowly.', tags: ['tibetan', 'meditation', 'bell', 'zen', 'yoga'], defaultVolume: 0.55 },
];

export const SOUND_BY_ID: Record<string, SoundDef> = Object.fromEntries(SOUNDS.map((s) => [s.id, s]));

/** Case- and accent-insensitive search over name, category, description and tags. */
export function searchSounds(query: string, sounds: SoundDef[] = SOUNDS): SoundDef[] {
  const q = normalize(query);
  if (!q) return sounds;
  const terms = q.split(/\s+/);
  return sounds
    .map((s) => {
      const name = normalize(s.name);
      const hay = [name, normalize(CATEGORY_BY_ID[s.category].name), normalize(s.description), ...s.tags.map(normalize)].join(' ');
      if (!terms.every((t) => hay.includes(t))) return null;
      // rank: name prefix > name contains > tag/description match
      const score = name.startsWith(q) ? 0 : name.includes(q) ? 1 : 2;
      return { s, score };
    })
    .filter((x): x is { s: SoundDef; score: number } => x !== null)
    .sort((a, b) => a.score - b.score)
    .map((x) => x.s);
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}
