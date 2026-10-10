import { router } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { formatClock } from '../audio/math';
import { describeMix } from '../audio/useAudioController';
import { Icon, IconButton } from '../components/ui';
import { useNow } from '../hooks/useNow';
import { useStore } from '../state/store';
import { nativeDriver } from '../theme';

const DIM = '#5B5470';

/** A dark bedside clock. Keeps the screen on and nudges the clock around to avoid burn-in. */
export default function NightstandScreen() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const now = useNow(true, 1000);
  const { mix, isPlaying, timer, activePresetId, togglePlay } = useStore(
    useShallow((s) => ({ mix: s.mix, isPlaying: s.isPlaying, timer: s.timer, activePresetId: s.activePresetId, togglePlay: s.togglePlay })),
  );
  const [controls, setControls] = useState(true);
  const [fade] = useState(() => new Animated.Value(1));
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minute = Math.floor(now / 60_000);
  const offset = {
    x: ((minute * 37) % 41) - 20,
    y: ((minute * 53) % 61) - 30,
  };

  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 800, useNativeDriver: nativeDriver }).start(() => setControls(false));
    }, 4000);
  };

  const showControls = () => {
    setControls(true);
    Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: nativeDriver }).start();
    scheduleHide();
  };

  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const date = new Date(now);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const day = date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const big = Math.min(width, height) * 0.22;
  const hasMix = Object.keys(mix).length > 0;

  return (
    <Pressable style={styles.root} onPress={showControls} accessibilityLabel="Bedside clock. Tap to show controls">
      <View style={[styles.center, { transform: [{ translateX: offset.x }, { translateY: offset.y }] }]}>
        <Text style={[styles.time, { fontSize: big }]} accessibilityRole="text">
          {time}
        </Text>
        <Text style={styles.date}>{day}</Text>
        {timer ? (
          <View style={styles.timer}>
            <Icon name="timer-sand" size={16} color={DIM} />
            <Text style={styles.small}>{formatClock(timer.endsAt - now)}</Text>
          </View>
        ) : null}
      </View>

      {controls ? (
        <Animated.View style={[styles.controls, { opacity: fade, paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.small} numberOfLines={1}>
            {hasMix ? describeMix(mix, activePresetId) : 'No sounds selected'}
          </Text>
          <View style={styles.buttons}>
            <IconButton icon="close" label="Exit bedside clock" color={DIM} size={26} onPress={() => router.back()} />
            <IconButton
              icon={isPlaying ? 'pause-circle-outline' : 'play-circle-outline'}
              label={isPlaying ? 'Pause' : 'Play'}
              color={DIM}
              size={52}
              onPress={() => {
                togglePlay();
                showControls();
              }}
            />
            <IconButton icon="timer-outline" label="Sleep timer" color={DIM} size={26} onPress={() => router.navigate('/timer')} />
          </View>
        </Animated.View>
      ) : null}
      <View style={{ height: insets.top }} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
  },
  time: {
    color: DIM,
    fontWeight: '200',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  date: {
    color: DIM,
    fontSize: 16,
    marginTop: 4,
    opacity: 0.8,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  small: {
    color: DIM,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    gap: 12,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
  },
});
