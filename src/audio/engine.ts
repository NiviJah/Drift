import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import { AudioContext } from 'react-native-audio-api';
import type { AudioBuffer, AudioBufferSourceNode, GainNode, WaveShaperNode } from 'react-native-audio-api';

import { SOUND_BY_ID } from './catalog';
import type { EventLayer } from './catalog';
import { BED_ASSETS, ONE_SHOT_ASSETS } from './generated/manifest';
import { buildFadeCurve, sliderToGain, timerFadePlan } from './math';

/** How many decoded loops to keep around when they're not playing (each is ~10 MB). */
const IDLE_CACHE_SIZE = 4;
const VOICE_FADE_IN = 0.6;
const VOICE_FADE_OUT = 0.25;
const PAUSE_FADE = 0.35;
/**
 * Makeup gain after the master volume. Each loop is mastered quietly (≈ −20 to −29 dBFS RMS)
 * so several can be stacked; this lifts a typical mix to a comfortable level, and the soft
 * limiter catches peaks when many loud sounds are layered.
 */
const OUTPUT_GAIN = 2.5;

type LoadingListener = (loading: ReadonlySet<string>) => void;

interface Voice {
  id: string;
  gain: GainNode;
  source: AudioBufferSourceNode | null;
  eventTimer: ReturnType<typeof setTimeout> | null;
  alive: boolean;
}

function rand(range: [number, number]): number {
  return range[0] + Math.random() * (range[1] - range[0]);
}

/** Resolves a bundled asset module into something decodeAudioData accepts on this platform. */
function audioSource(mod: number): number | string {
  // Native decoding resolves bundled modules itself; the web implementation needs a URL.
  return Platform.OS === 'web' ? Asset.fromModule(mod).uri : mod;
}

/**
 * Owns the single AudioContext and the mixing graph:
 *
 *   voice gains ─┐
 *   voice gains ─┼─► bus (master volume) ─► transport (play/pause fades)
 *   voice gains ─┘        ─► timer (sleep-timer fade) ─► limiter ─► destination
 *
 * Loops are sample-accurate (AudioBufferSourceNode.loop with explicit loop
 * points), so there is never a gap at the seam. All fades are scheduled on the
 * audio thread, so they stay smooth even if JavaScript is busy or throttled.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private bus!: GainNode;
  private transport!: GainNode;
  private timerGain!: GainNode;
  private limiter!: WaveShaperNode;

  private voices = new Map<string, Voice>();
  private desired = new Map<string, number>();
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private recent: string[] = [];
  private oneShots = new Map<string, Promise<AudioBuffer[]>>();

  private playing = false;
  private masterVolume = 0.8;
  private timer: { endsAt: number; fadeMs: number } | null = null;
  private suspendTimeout: ReturnType<typeof setTimeout> | null = null;

  private loading = new Set<string>();
  private loadingListeners = new Set<LoadingListener>();
  /** Serializes play/pause so rapid taps, lock-screen buttons and interruptions can't race. */
  private queue: Promise<unknown> = Promise.resolve();

  get isPlaying(): boolean {
    return this.playing;
  }

  get context(): AudioContext | null {
    return this.ctx;
  }

  private ensureContext(): AudioContext {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext();
    this.bus = ctx.createGain();
    this.transport = ctx.createGain();
    this.timerGain = ctx.createGain();
    this.limiter = ctx.createWaveShaper();
    this.limiter.curve = softLimiterCurve();
    this.bus.gain.value = sliderToGain(this.masterVolume) * OUTPUT_GAIN;
    this.transport.gain.value = 0;
    this.timerGain.gain.value = 1;
    this.bus.connect(this.transport);
    this.transport.connect(this.timerGain);
    this.timerGain.connect(this.limiter);
    this.limiter.connect(ctx.destination);
    this.ctx = ctx;
    return ctx;
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  onLoadingChange(listener: LoadingListener): () => void {
    this.loadingListeners.add(listener);
    listener(this.loading);
    return () => this.loadingListeners.delete(listener);
  }

  private setLoading(id: string, on: boolean): void {
    if (on === this.loading.has(id)) return;
    if (on) this.loading.add(id);
    else this.loading.delete(id);
    const snapshot = new Set(this.loading);
    this.loadingListeners.forEach((l) => l(snapshot));
  }

  private loadBuffer(id: string): Promise<AudioBuffer> {
    const cached = this.buffers.get(id);
    if (cached) return cached;
    const asset = BED_ASSETS[id];
    if (!asset) return Promise.reject(new Error(`Unknown sound: ${id}`));
    const ctx = this.ensureContext();
    this.setLoading(id, true);
    const promise = ctx
      .decodeAudioData(audioSource(asset.module))
      .finally(() => this.setLoading(id, false));
    promise.catch(() => this.buffers.delete(id));
    this.buffers.set(id, promise);
    return promise;
  }

  private loadOneShots(asset: EventLayer['asset']): Promise<AudioBuffer[]> {
    const cached = this.oneShots.get(asset);
    if (cached) return cached;
    const ctx = this.ensureContext();
    const promise = Promise.all(ONE_SHOT_ASSETS[asset].map((m) => ctx.decodeAudioData(audioSource(m))));
    promise.catch(() => this.oneShots.delete(asset));
    this.oneShots.set(asset, promise);
    return promise;
  }

  /** Warms the cache for sounds that are likely to be played. No-op until audio has started once. */
  preload(ids: string[]): void {
    if (!this.ctx) return;
    for (const id of ids) {
      this.loadBuffer(id).catch(() => undefined);
      const events = SOUND_BY_ID[id]?.events;
      if (events) this.loadOneShots(events.asset).catch(() => undefined);
    }
  }

  /** Drops decoded audio that isn't playing, keeping a few recently used loops. */
  private trimCache(): void {
    const idle = this.recent.filter((id) => !this.voices.has(id));
    for (const id of idle.slice(IDLE_CACHE_SIZE)) {
      this.buffers.delete(id);
      this.recent = this.recent.filter((r) => r !== id);
    }
  }

  private touch(id: string): void {
    this.recent = [id, ...this.recent.filter((r) => r !== id)];
  }

  // ---------------------------------------------------------------------------
  // Mix
  // ---------------------------------------------------------------------------

  /** Reconciles the playing voices with the desired mix (sound id → slider 0..1). */
  setMix(mix: Record<string, number>): void {
    const next = new Map(Object.entries(mix));
    // The context is created lazily on first play: creating it at launch would activate the
    // audio session and could interrupt the user's music just by opening the app.
    if (!this.ctx) {
      this.desired = next;
      return;
    }
    for (const id of [...this.voices.keys()]) {
      if (!next.has(id)) this.removeVoice(id);
    }
    this.desired = next;
    for (const [id, volume] of next) {
      const voice = this.voices.get(id);
      if (voice) this.rampVoice(voice, volume, 0.08);
      else this.addVoice(id);
    }
  }

  private addVoice(id: string): void {
    const def = SOUND_BY_ID[id];
    if (!def) return;
    const ctx = this.ensureContext();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.bus);
    const voice: Voice = { id, gain, source: null, eventTimer: null, alive: true };
    this.voices.set(id, voice);
    this.touch(id);

    this.loadBuffer(id)
      .then((buffer) => {
        if (!voice.alive || this.voices.get(id) !== voice) return;
        const asset = BED_ASSETS[id];
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.loopStart = asset.loopStart;
        source.loopEnd = asset.loopEnd;
        source.connect(gain);
        // Start somewhere random inside the loop so the same sound never begins identically.
        const offset = asset.loopStart + Math.random() * (asset.loopEnd - asset.loopStart);
        source.start(ctx.currentTime, offset);
        voice.source = source;
        this.rampVoice(voice, this.desired.get(id) ?? def.defaultVolume, VOICE_FADE_IN / 3);
        if (def.events) this.scheduleEvent(voice, def.events, true);
      })
      .catch((err) => {
        console.warn(`[audio] failed to load ${id}`, err);
      });
    this.trimCache();
  }

  private rampVoice(voice: Voice, volume: number, timeConstant: number): void {
    if (!this.ctx || !voice.source) return;
    const now = this.ctx.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(sliderToGain(volume), now, timeConstant);
  }

  private removeVoice(id: string): void {
    const voice = this.voices.get(id);
    if (!voice) return;
    this.voices.delete(id);
    voice.alive = false;
    if (voice.eventTimer) clearTimeout(voice.eventTimer);
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0, now, VOICE_FADE_OUT / 3);
    const source = voice.source;
    // While suspended the fade can't progress, so tear down immediately in that case.
    const delay = ctx.state === 'running' ? VOICE_FADE_OUT * 1000 + 150 : 0;
    setTimeout(() => {
      try {
        source?.stop();
      } catch {
        // already stopped
      }
      source?.disconnect();
      voice.gain.disconnect();
    }, delay);
    this.trimCache();
  }

  // ---------------------------------------------------------------------------
  // One-shot events (thunder, birds)
  // ---------------------------------------------------------------------------

  private scheduleEvent(voice: Voice, layer: EventLayer, first = false): void {
    const delay = (first ? rand(layer.firstDelay) : rand(layer.gap)) * 1000;
    voice.eventTimer = setTimeout(() => {
      if (!voice.alive) return;
      this.fireEvent(voice, layer).finally(() => {
        if (voice.alive) this.scheduleEvent(voice, layer);
      });
    }, delay);
  }

  private async fireEvent(voice: Voice, layer: EventLayer): Promise<void> {
    const ctx = this.ctx;
    if (!ctx || !this.playing || ctx.state !== 'running') return;
    let buffers: AudioBuffer[];
    try {
      buffers = await this.loadOneShots(layer.asset);
    } catch {
      return;
    }
    if (!voice.alive || buffers.length === 0) return;
    const src = ctx.createBufferSource();
    src.buffer = buffers[Math.floor(Math.random() * buffers.length)];
    src.playbackRate.value = rand(layer.rate);
    const pan = ctx.createStereoPanner();
    pan.pan.value = rand(layer.pan);
    const g = ctx.createGain();
    g.gain.value = rand(layer.gain);
    src.connect(pan);
    pan.connect(g);
    g.connect(voice.gain);
    src.onEnded = () => {
      src.disconnect();
      pan.disconnect();
      g.disconnect();
    };
    src.start(ctx.currentTime + 0.02);
  }

  // ---------------------------------------------------------------------------
  // Transport
  // ---------------------------------------------------------------------------

  setPlaying(playing: boolean, fadeInSeconds = 2): Promise<void> {
    const task = this.queue.then(() => (playing ? this.doPlay(fadeInSeconds) : this.doPause()));
    this.queue = task.catch(() => undefined);
    return task;
  }

  private async doPlay(fadeInSeconds: number): Promise<void> {
    const firstStart = !this.ctx;
    const ctx = this.ensureContext();
    if (firstStart) this.setMix(Object.fromEntries(this.desired));
    if (this.suspendTimeout) {
      clearTimeout(this.suspendTimeout);
      this.suspendTimeout = null;
    }
    this.playing = true;
    if (ctx.state !== 'running') await ctx.resume();
    const now = ctx.currentTime;
    const g = this.transport.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(0, now);
    g.linearRampToValueAtTime(1, now + Math.max(0.05, fadeInSeconds));
    // context time froze while suspended, so re-anchor the sleep-timer fade
    this.applyTimer();
  }

  private async doPause(): Promise<void> {
    this.playing = false;
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const g = this.transport.gain;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(0, now, PAUSE_FADE / 4);
    await new Promise<void>((resolve) => {
      this.suspendTimeout = setTimeout(() => {
        this.suspendTimeout = null;
        resolve();
      }, PAUSE_FADE * 1000 + 50);
    });
    // Suspending saves battery and lets iOS show "paused" on the lock screen.
    if (!this.playing && ctx.state === 'running') await ctx.suspend();
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = volume;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.bus.gain.cancelScheduledValues(now);
    this.bus.gain.setTargetAtTime(sliderToGain(volume) * OUTPUT_GAIN, now, 0.04);
  }

  // ---------------------------------------------------------------------------
  // Sleep timer fade
  // ---------------------------------------------------------------------------

  /** Schedules (or clears) the gradual sleep-timer fade-out on the audio thread. */
  setTimer(timer: { endsAt: number; fadeMs: number } | null): void {
    this.timer = timer;
    this.applyTimer();
  }

  private applyTimer(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const g = this.timerGain.gain;
    const now = ctx.currentTime;
    g.cancelScheduledValues(now);
    const plan = this.timer ? timerFadePlan(this.timer.endsAt, this.timer.fadeMs, Date.now()) : null;
    if (!plan) {
      g.setTargetAtTime(1, now, 0.1);
      return;
    }
    g.setValueAtTime(plan.startLevel, now);
    if (plan.duration <= 0) return;
    const curve = buildFadeCurve(plan.startProgress, 256);
    g.setValueCurveAtTime(curve, now + plan.delay + 0.01, plan.duration);
  }

  dispose(): void {
    for (const id of [...this.voices.keys()]) this.removeVoice(id);
    this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.buffers.clear();
    this.oneShots.clear();
  }
}

/** Transparent below ~-4 dBFS, then rounds off peaks so stacked sounds never hard-clip. */
function softLimiterCurve(): Float32Array<ArrayBuffer> {
  const n = 2049;
  const curve = new Float32Array(n);
  const knee = 0.6;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const ax = Math.abs(x);
    const y = ax <= knee ? ax : knee + (1 - knee) * Math.tanh((ax - knee) / (1 - knee));
    curve[i] = Math.sign(x) * y * 0.98;
  }
  return curve;
}

export const engine = new AudioEngine();
