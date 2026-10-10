import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { AudioManager, PlaybackNotificationManager } from 'react-native-audio-api';

import { showToast } from '../components/Toast';
import { FEATURED_PRESETS } from '../state/presets';
import { useStore } from '../state/store';
import { SOUND_BY_ID } from './catalog';
import { describeError, logEvent } from './diagnostics';
import { engine } from './engine';

const KEEP_AWAKE_TAG = 'drift-playback';
/**
 * Pause commands and focus losses that arrive this soon after playback starts are ignored.
 * Car head units and some Bluetooth devices fire a play/pause toggle (or briefly take audio
 * focus) the moment a new media session starts, which would otherwise stop playback instantly.
 */
const START_GRACE_MS = 2500;
const isNative = Platform.OS !== 'web';

/** A friendly title for the lock screen / notification. */
export function describeMix(mix: Record<string, number>, presetId: string | null): string {
  if (presetId) {
    const s = useStore.getState();
    const preset = s.presets.find((p) => p.id === presetId) ?? FEATURED_PRESETS.find((p) => p.id === presetId);
    if (preset) return preset.name;
  }
  const names = Object.keys(mix).map((id) => SOUND_BY_ID[id]?.name ?? id);
  if (names.length === 0) return 'Drift';
  if (names.length <= 2) return names.join(' + ');
  return `${names.slice(0, 2).join(' + ')} +${names.length - 2}`;
}

function configureSession(mixWithOthers: boolean): void {
  if (!isNative) return;
  try {
    AudioManager.setAudioSessionOptions({
      iosCategory: 'playback',
      iosMode: 'default',
      iosOptions: mixWithOthers ? ['mixWithOthers'] : [],
    });
    // Take full audio focus unless the user wants to layer us under other apps.
    AudioManager.observeAudioInterruptions(mixWithOthers ? false : 'gain');
    logEvent(`session: configured (mixWithOthers=${mixWithOthers})`);
  } catch (e) {
    console.warn('[audio] session config failed', e);
    logEvent(`session: config failed (${describeError(e)})`);
  }
}

/** Android grants audio focus per request; ask again on every play so we hold it over Bluetooth/car audio. */
function requestFocus(mixWithOthers: boolean): void {
  if (Platform.OS !== 'android' || mixWithOthers) return;
  try {
    AudioManager.observeAudioInterruptions('gain');
  } catch (e) {
    logEvent(`session: focus request failed (${describeError(e)})`);
  }
}

let notificationPermissionAsked = false;
let controlsConfigured = false;

async function updateNotification(playing: boolean, title: string, hasMix: boolean): Promise<void> {
  if (!isNative) return;
  try {
    if (!hasMix) {
      await PlaybackNotificationManager.hide();
      return;
    }
    if (Platform.OS === 'android' && playing && !notificationPermissionAsked) {
      notificationPermissionAsked = true;
      // Android 13+ needs this for the media notification that keeps playback alive in the background.
      await AudioManager.requestNotificationPermissions().catch(() => undefined);
    }
    await PlaybackNotificationManager.show({
      title,
      artist: 'Drift — Sleep Sounds',
      state: playing ? 'playing' : 'paused',
    });
    if (!controlsConfigured) {
      controlsConfigured = true;
      // Ambient sound has no tracks to skip or seek through — only play/pause.
      for (const control of ['nextTrack', 'previousTrack', 'skipForward', 'skipBackward', 'seekTo'] as const) {
        await PlaybackNotificationManager.enableControl(control, false).catch(() => undefined);
      }
    }
  } catch (e) {
    console.warn('[audio] notification update failed', e);
  }
}

/**
 * Bridges app state to the audio engine and the OS: playback, mixing, the sleep
 * timer, lock-screen controls, interruptions (calls, alarms), headphone
 * unplugging and keep-awake. Mount once at the root.
 */
export function useAudioController(): void {
  useEffect(() => {
    const initial = useStore.getState();
    configureSession(initial.settings.mixWithOthers);
    engine.setMasterVolume(initial.masterVolume);
    engine.setMix(initial.mix);
    engine.preload(Object.keys(initial.mix));

    let wasInterrupted = false;
    let resumeTimeout: ReturnType<typeof setTimeout> | null = null;
    let playStartedAt = 0;
    const inStartGrace = () => Date.now() - playStartedAt < START_GRACE_MS;

    const syncPlayback = (s: ReturnType<typeof useStore.getState>) => {
      logEvent(s.isPlaying ? `play requested (${Object.keys(s.mix).join(', ') || 'empty mix'})` : 'pause requested');
      if (s.isPlaying) {
        playStartedAt = Date.now();
        requestFocus(s.settings.mixWithOthers);
      }
      engine.setPlaying(s.isPlaying, s.settings.fadeInSeconds).catch((e) => {
        console.warn('[audio] transport failed', e);
        logEvent(`transport failed (${describeError(e)})`);
        showToast('Couldn’t start audio on this output. See Settings → Playback diagnostics.');
        useStore.setState({ isPlaying: false });
      });
      if (isNative) AudioManager.setAudioSessionActivity(s.isPlaying).catch(() => undefined);
      updateNotification(s.isPlaying, describeMix(s.mix, s.activePresetId), Object.keys(s.mix).length > 0);
      if (s.isPlaying && s.settings.keepAwake) activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
      else deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    };

    const unsubscribe = useStore.subscribe((s, prev) => {
      if (s.hydrated && !prev.hydrated) engine.preload(Object.keys(s.mix));
      if (s.mix !== prev.mix) engine.setMix(s.mix);
      if (s.masterVolume !== prev.masterVolume) engine.setMasterVolume(s.masterVolume);
      if (s.timer !== prev.timer) engine.setTimer(s.timer ? { endsAt: s.timer.endsAt, fadeMs: s.timer.fadeMs } : null);
      if (s.settings.mixWithOthers !== prev.settings.mixWithOthers) configureSession(s.settings.mixWithOthers);
      if (s.isPlaying !== prev.isPlaying || s.settings.keepAwake !== prev.settings.keepAwake) {
        if (s.isPlaying) wasInterrupted = false;
        syncPlayback(s);
      } else if (s.activePresetId !== prev.activePresetId || (s.mix !== prev.mix && Object.keys(s.mix).length !== Object.keys(prev.mix).length)) {
        updateNotification(s.isPlaying, describeMix(s.mix, s.activePresetId), Object.keys(s.mix).length > 0);
      }
    });

    // Sleep timer: the fade itself runs on the audio thread; this just ends playback.
    const tick = setInterval(() => {
      const { timer, isPlaying } = useStore.getState();
      if (timer && Date.now() >= timer.endsAt) {
        useStore.setState({ timer: null, isPlaying: false });
        if (!isPlaying) engine.setTimer(null);
      }
    }, 1000);

    const subs = [
      AudioManager.addSystemEventListener('interruption', (event) => {
        const s = useStore.getState();
        logEvent(`os: interruption ${event.type} (shouldResume=${event.shouldResume})`);
        if (event.type === 'began') {
          if (s.isPlaying && inStartGrace()) {
            // Typically a Bluetooth/car device grabbing focus as our session starts: take it back.
            logEvent('os: interruption ignored (just started) — re-requesting focus');
            requestFocus(s.settings.mixWithOthers);
          } else if (s.isPlaying) {
            wasInterrupted = true;
            s.pause();
          }
        } else if (event.type === 'ended' && wasInterrupted && event.shouldResume) {
          if (resumeTimeout) clearTimeout(resumeTimeout);
          // give the OS a moment to hand the audio session back
          resumeTimeout = setTimeout(() => {
            if (wasInterrupted) useStore.getState().play();
          }, 1000);
        }
      }),
      AudioManager.addSystemEventListener('routeChange', (event) => {
        const s = useStore.getState();
        logEvent(`os: route change (${event.reason})`);
        if (event.reason === 'OldDeviceUnavailable' && s.settings.pauseOnDisconnect && s.isPlaying && !inStartGrace()) s.pause();
      }),
    ];

    const handleRemotePause = (kind: string) => {
      if (inStartGrace()) {
        logEvent(`media button: ${kind} ignored (just started)`);
        // Re-assert the playing state so the device shows the right button.
        const s = useStore.getState();
        updateNotification(true, describeMix(s.mix, s.activePresetId), Object.keys(s.mix).length > 0);
        return;
      }
      logEvent(`media button: ${kind}`);
      useStore.getState().pause();
    };

    const notificationSubs = isNative
      ? [
          PlaybackNotificationManager.addEventListener('playbackNotificationPlay', () => {
            logEvent('media button: play');
            useStore.getState().play();
          }),
          PlaybackNotificationManager.addEventListener('playbackNotificationPause', () => handleRemotePause('pause')),
          PlaybackNotificationManager.addEventListener('playbackNotificationStop', () => handleRemotePause('stop')),
        ]
      : [];

    // Restore any state that changed before this effect ran.
    const now = useStore.getState();
    if (now.isPlaying) syncPlayback(now);

    return () => {
      unsubscribe();
      clearInterval(tick);
      if (resumeTimeout) clearTimeout(resumeTimeout);
      subs.forEach((sub) => sub?.remove());
      notificationSubs.forEach((sub) => sub?.remove());
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    };
  }, []);
}
