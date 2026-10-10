import type { IconName } from '../audio/catalog';

export interface Preset {
  id: string;
  name: string;
  /** Sound id → slider volume (0..1). */
  mix: Record<string, number>;
  createdAt: number;
  updatedAt?: number;
}

export interface FeaturedPreset extends Preset {
  description: string;
  icon: IconName;
  collection: 'Sleep' | 'Focus' | 'Relax' | 'Baby';
  colors: [string, string];
}

/** Curated mixes shipped with the app. */
export const FEATURED_PRESETS: FeaturedPreset[] = [
  {
    id: 'featured-rainy-cabin',
    name: 'Rainy Cabin',
    description: 'Rain on the roof, a crackling fire and far-off thunder.',
    icon: 'campfire',
    collection: 'Sleep',
    colors: ['#3B2F63', '#C46A3C'],
    mix: { 'rain-tent': 0.6, campfire: 0.5, thunder: 0.35 },
    createdAt: 0,
  },
  {
    id: 'featured-deep-sleep',
    name: 'Deep Sleep',
    description: 'Brown noise wrapped in steady rain with a delta-wave undertone.',
    icon: 'sleep',
    collection: 'Sleep',
    colors: ['#141B3A', '#4B3F8F'],
    mix: { brown: 0.55, 'light-rain': 0.45, 'binaural-delta': 0.25 },
    createdAt: 0,
  },
  {
    id: 'featured-ocean-night',
    name: 'Ocean Night',
    description: 'Waves on the shore beneath a chorus of crickets.',
    icon: 'waves',
    collection: 'Sleep',
    colors: ['#0E2A47', '#1F7A8C'],
    mix: { ocean: 0.65, crickets: 0.3, wind: 0.2 },
    createdAt: 0,
  },
  {
    id: 'featured-thunderstorm',
    name: 'Thunderstorm',
    description: 'A full storm: heavy rain, gusting wind and rolling thunder.',
    icon: 'weather-lightning-rainy',
    collection: 'Sleep',
    colors: ['#1C2333', '#55607A'],
    mix: { 'heavy-rain': 0.6, thunder: 0.6, wind: 0.3 },
    createdAt: 0,
  },
  {
    id: 'featured-deep-focus',
    name: 'Deep Focus',
    description: 'Brown noise and a beta-wave pulse to tune out distractions.',
    icon: 'brain',
    collection: 'Focus',
    colors: ['#1E2A2F', '#2F7A6A'],
    mix: { brown: 0.6, 'binaural-beta': 0.25, 'air-conditioner': 0.25 },
    createdAt: 0,
  },
  {
    id: 'featured-coffee-rain',
    name: 'Study by the Window',
    description: 'Soft rain against a ticking clock for steady concentration.',
    icon: 'clock-outline',
    collection: 'Focus',
    colors: ['#2B2238', '#7A5C8F'],
    mix: { 'light-rain': 0.55, clock: 0.3, pink: 0.25 },
    createdAt: 0,
  },
  {
    id: 'featured-red-eye',
    name: 'Red-Eye Flight',
    description: 'Cabin drone and soft air — a surprisingly good focus bed.',
    icon: 'airplane',
    collection: 'Focus',
    colors: ['#1B1F2E', '#3D5A80'],
    mix: { airplane: 0.6, grey: 0.25 },
    createdAt: 0,
  },
  {
    id: 'featured-forest-morning',
    name: 'Forest Morning',
    description: 'Birdsong over a babbling stream.',
    icon: 'bird',
    collection: 'Relax',
    colors: ['#173A2A', '#5FA86E'],
    mix: { forest: 0.6, stream: 0.45, green: 0.15 },
    createdAt: 0,
  },
  {
    id: 'featured-zen',
    name: 'Zen Garden',
    description: 'Singing bowls, a gentle stream and an Om drone.',
    icon: 'meditation',
    collection: 'Relax',
    colors: ['#2E1F3A', '#B0709A'],
    mix: { 'singing-bowls': 0.5, stream: 0.3, om: 0.3, 'binaural-theta': 0.2 },
    createdAt: 0,
  },
  {
    id: 'featured-cozy-cat',
    name: 'Cozy Evening',
    description: 'A purring cat by the fire while rain falls outside.',
    icon: 'cat',
    collection: 'Relax',
    colors: ['#3A2620', '#B5763F'],
    mix: { purr: 0.55, campfire: 0.4, 'light-rain': 0.35 },
    createdAt: 0,
  },
  {
    id: 'featured-womb',
    name: 'Womb',
    description: 'Heartbeat and muffled whooshing, just like before birth.',
    icon: 'heart-pulse',
    collection: 'Baby',
    colors: ['#3A1C2C', '#B0506E'],
    mix: { heartbeat: 0.6, underwater: 0.4, pink: 0.2 },
    createdAt: 0,
  },
  {
    id: 'featured-baby-shush',
    name: 'Settle Down',
    description: 'Rhythmic shushing over a soft white-noise blanket.',
    icon: 'baby-face-outline',
    collection: 'Baby',
    colors: ['#1F2A44', '#6C8CD5'],
    mix: { shush: 0.5, white: 0.3, fan: 0.3 },
    createdAt: 0,
  },
];
