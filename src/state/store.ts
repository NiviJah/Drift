import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { CATEGORIES, SOUNDS, SOUND_BY_ID } from '../audio/catalog';
import type { Preset } from './presets';

export const MAX_MIX_SIZE = 8;

export interface TimerState {
  endsAt: number;
  startedAt: number;
  durationMs: number;
  fadeMs: number;
}

export interface Settings {
  /** Seconds to fade in when playback starts. */
  fadeInSeconds: number;
  haptics: boolean;
  /** Let other apps' audio (podcasts, music) play alongside. */
  mixWithOthers: boolean;
  /** Keep the screen on while the app is open and playing. */
  keepAwake: boolean;
  /** Pause automatically when headphones are unplugged. */
  pauseOnDisconnect: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  fadeInSeconds: 3,
  haptics: true,
  mixWithOthers: false,
  keepAwake: false,
  pauseOnDisconnect: true,
};

export type ToggleResult = 'added' | 'removed' | 'limit';

interface PersistedState {
  mix: Record<string, number>;
  masterVolume: number;
  favorites: string[];
  presets: Preset[];
  activePresetId: string | null;
  timerPrefs: { minutes: number; fadeMinutes: number };
  settings: Settings;
}

interface State extends PersistedState {
  isPlaying: boolean;
  timer: TimerState | null;
  hydrated: boolean;

  toggleSound: (id: string) => ToggleResult;
  setSoundVolume: (id: string, volume: number) => void;
  removeSound: (id: string) => void;
  clearMix: () => void;
  loadMix: (mix: Record<string, number>, presetId?: string | null) => void;
  randomMix: () => void;

  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setMasterVolume: (volume: number) => void;

  toggleFavorite: (id: string) => void;

  savePreset: (name: string) => Preset;
  updatePreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;
  deletePreset: (id: string) => void;

  startTimer: (minutes: number, fadeMinutes: number) => void;
  extendTimer: (minutes: number) => void;
  cancelTimer: () => void;

  updateSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;
}

const initialPersisted: PersistedState = {
  mix: {},
  masterVolume: 0.8,
  favorites: [],
  presets: [],
  activePresetId: null,
  timerPrefs: { minutes: 45, fadeMinutes: 10 },
  settings: DEFAULT_SETTINGS,
};

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Drops unknown sound ids (e.g. from an older app version) and clamps volumes. */
export function sanitizeMix(mix: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, v] of Object.entries(mix)) {
    if (SOUND_BY_ID[id] && Object.keys(out).length < MAX_MIX_SIZE) out[id] = clamp01(Number(v) || 0);
  }
  return out;
}

export function mixesEqual(a: Record<string, number>, b: Record<string, number>): boolean {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => k in b && Math.abs(a[k] - b[k]) < 0.005);
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initialPersisted,
      isPlaying: false,
      timer: null,
      hydrated: false,

      toggleSound: (id) => {
        const { mix } = get();
        if (id in mix) {
          get().removeSound(id);
          return 'removed';
        }
        if (Object.keys(mix).length >= MAX_MIX_SIZE) return 'limit';
        const def = SOUND_BY_ID[id];
        if (!def) return 'limit';
        set({ mix: { ...mix, [id]: def.defaultVolume }, isPlaying: true });
        return 'added';
      },

      setSoundVolume: (id, volume) => {
        const { mix } = get();
        if (!(id in mix)) return;
        set({ mix: { ...mix, [id]: clamp01(volume) } });
      },

      removeSound: (id) => {
        const next = { ...get().mix };
        delete next[id];
        const empty = Object.keys(next).length === 0;
        set({ mix: next, ...(empty ? { isPlaying: false, activePresetId: null } : null) });
      },

      clearMix: () => set({ mix: {}, isPlaying: false, activePresetId: null }),

      loadMix: (mix, presetId = null) => {
        const clean = sanitizeMix(mix);
        set({ mix: clean, activePresetId: presetId, isPlaying: Object.keys(clean).length > 0 });
      },

      randomMix: () => {
        // One bed from a "texture" category plus one or two accents from others.
        const shuffledCats = [...CATEGORIES].sort(() => Math.random() - 0.5);
        const count = 2 + Math.floor(Math.random() * 2);
        const mix: Record<string, number> = {};
        for (const cat of shuffledCats) {
          if (Object.keys(mix).length >= count) break;
          const pool = SOUNDS.filter((s) => s.category === cat.id && !s.headphones);
          if (!pool.length) continue;
          const pick = pool[Math.floor(Math.random() * pool.length)];
          const lead = Object.keys(mix).length === 0;
          mix[pick.id] = lead ? 0.6 : 0.25 + Math.random() * 0.2;
        }
        get().loadMix(mix, null);
      },

      play: () => {
        if (Object.keys(get().mix).length === 0) return;
        set({ isPlaying: true });
      },
      pause: () => set({ isPlaying: false }),
      togglePlay: () => (get().isPlaying ? get().pause() : get().play()),
      setMasterVolume: (volume) => set({ masterVolume: clamp01(volume) }),

      toggleFavorite: (id) => {
        const favs = get().favorites;
        set({ favorites: favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id] });
      },

      savePreset: (name) => {
        const preset: Preset = { id: newId(), name: name.trim() || 'My Mix', mix: { ...get().mix }, createdAt: Date.now() };
        set({ presets: [preset, ...get().presets], activePresetId: preset.id });
        return preset;
      },
      updatePreset: (id) =>
        set({
          presets: get().presets.map((p) => (p.id === id ? { ...p, mix: { ...get().mix }, updatedAt: Date.now() } : p)),
          activePresetId: id,
        }),
      renamePreset: (id, name) =>
        set({ presets: get().presets.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)) }),
      deletePreset: (id) =>
        set({
          presets: get().presets.filter((p) => p.id !== id),
          activePresetId: get().activePresetId === id ? null : get().activePresetId,
        }),

      startTimer: (minutes, fadeMinutes) => {
        const durationMs = Math.max(1, minutes) * 60_000;
        const fadeMs = Math.min(durationMs, Math.max(0, fadeMinutes) * 60_000);
        const now = Date.now();
        set({
          timer: { startedAt: now, endsAt: now + durationMs, durationMs, fadeMs },
          timerPrefs: { minutes, fadeMinutes },
        });
        get().play();
      },
      extendTimer: (minutes) => {
        const t = get().timer;
        if (!t) return;
        const add = minutes * 60_000;
        set({ timer: { ...t, endsAt: t.endsAt + add, durationMs: t.durationMs + add } });
      },
      cancelTimer: () => set({ timer: null }),

      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),

      resetAll: () => set({ ...initialPersisted, isPlaying: false, timer: null }),
    }),
    {
      name: 'drift-store',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): PersistedState => ({
        mix: s.mix,
        masterVolume: s.masterVolume,
        favorites: s.favorites,
        presets: s.presets,
        activePresetId: s.activePresetId,
        timerPrefs: s.timerPrefs,
        settings: s.settings,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedState>;
        return {
          ...current,
          ...p,
          mix: sanitizeMix(p.mix ?? {}),
          favorites: (p.favorites ?? []).filter((id) => SOUND_BY_ID[id]),
          presets: (p.presets ?? []).map((pr) => ({ ...pr, mix: sanitizeMix(pr.mix) })),
          settings: { ...DEFAULT_SETTINGS, ...p.settings },
        };
      },
      onRehydrateStorage: () => () => {
        useStore.setState({ hydrated: true });
      },
    },
  ),
);

