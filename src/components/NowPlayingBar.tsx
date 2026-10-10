import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { CATEGORY_BY_ID, SOUND_BY_ID } from '../audio/catalog';
import { formatClock } from '../audio/math';
import { describeMix } from '../audio/useAudioController';
import { haptic } from '../haptics';
import { useNow } from '../hooks/useNow';
import { useStore } from '../state/store';
import { MINI_PLAYER_HEIGHT, alpha, colors, radius } from '../theme';
import { Icon } from './ui';

/** Compact player pinned above the tab bar whenever a mix exists. */
export function NowPlayingBar() {
  const { mix, isPlaying, timer, activePresetId, togglePlay } = useStore(
    useShallow((s) => ({
      mix: s.mix,
      isPlaying: s.isPlaying,
      timer: s.timer,
      activePresetId: s.activePresetId,
      togglePlay: s.togglePlay,
    })),
  );
  const now = useNow(!!timer);
  const ids = Object.keys(mix);
  if (ids.length === 0) return null;

  const title = describeMix(mix, activePresetId);
  const subtitle = timer
    ? `Sleep timer · ${formatClock(timer.endsAt - now)}`
    : `${ids.length} sound${ids.length === 1 ? '' : 's'} · Tap to adjust`;

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Now playing: ${title}. Open mixer`}
        onPress={() => {
          haptic.tap();
          router.push('/mixer');
        }}
        style={({ pressed }) => [styles.bar, pressed && { backgroundColor: colors.surfacePressed }]}
      >
        <View style={styles.stack}>
          {ids.slice(0, 3).map((id, i) => {
            const def = SOUND_BY_ID[id];
            const tint = CATEGORY_BY_ID[def.category].color;
            return (
              <View
                key={id}
                style={[styles.bubble, { backgroundColor: alpha(tint, 0.22), borderColor: colors.surfaceRaised, marginLeft: i === 0 ? 0 : -12, zIndex: 3 - i }]}
              >
                <Icon name={def.icon} size={16} color={tint} />
              </View>
            );
          })}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          hitSlop={10}
          onPress={() => {
            haptic.tap();
            togglePlay();
          }}
          style={({ pressed }) => [styles.play, pressed && { backgroundColor: colors.accentStrong }]}
        >
          <Icon name={isPlaying ? 'pause' : 'play'} size={24} color={colors.accentText} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  bar: {
    height: MINI_PLAYER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  stack: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 36,
  },
  bubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
