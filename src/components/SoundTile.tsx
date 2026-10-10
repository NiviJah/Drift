import { memo, useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { CATEGORY_BY_ID } from '../audio/catalog';
import type { SoundDef } from '../audio/catalog';
import { alpha, colors, nativeDriver, radius } from '../theme';
import { Icon } from './ui';

interface Props {
  sound: SoundDef;
  active: boolean;
  volume: number;
  favorite: boolean;
  loading: boolean;
  playing: boolean;
  width: number;
  onPress: (id: string) => void;
  onLongPress: (id: string) => void;
}

function SoundTileBase({ sound, active, volume, favorite, loading, playing, width, onPress, onLongPress }: Props) {
  const tint = CATEGORY_BY_ID[sound.category].color;
  const [pulse] = useState(() => new Animated.Value(0));

  // A slow "breathing" glow on sounds that are currently audible.
  useEffect(() => {
    if (!(active && playing)) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2200, useNativeDriver: nativeDriver }),
        Animated.timing(pulse, { toValue: 0, duration: 2200, useNativeDriver: nativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, playing, pulse]);

  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: active, busy: loading }}
      accessibilityLabel={`${sound.name}${favorite ? ', favourite' : ''}`}
      accessibilityHint={active ? 'Removes this sound from the mix. Long press for details.' : 'Adds this sound to the mix. Long press for details.'}
      onPress={() => onPress(sound.id)}
      onLongPress={() => onLongPress(sound.id)}
      delayLongPress={350}
      style={({ pressed }) => [
        styles.tile,
        { width },
        active && { backgroundColor: alpha(tint, 0.14), borderColor: alpha(tint, 0.55) },
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      <View style={styles.iconWrap}>
        {active ? (
          <Animated.View style={[styles.glow, { backgroundColor: tint, opacity: glowOpacity }]} pointerEvents="none" />
        ) : null}
        <View style={[styles.iconCircle, { backgroundColor: active ? alpha(tint, 0.25) : colors.surfaceRaised }]}>
          {loading ? (
            <ActivityIndicator color={tint} />
          ) : (
            <Icon name={sound.icon} size={28} color={active ? tint : colors.textDim} />
          )}
        </View>
      </View>
      <Text style={[styles.name, active && { color: colors.text }]} numberOfLines={2}>
        {sound.name}
      </Text>
      {favorite ? (
        <View style={styles.fav} pointerEvents="none">
          <Icon name="heart" size={12} color={colors.danger} />
        </View>
      ) : null}
      {sound.headphones ? (
        <View style={styles.headphones} pointerEvents="none">
          <Icon name="headphones" size={12} color={colors.textMuted} />
        </View>
      ) : null}
      <View style={styles.levelTrack} pointerEvents="none">
        {active ? <View style={[styles.levelFill, { width: `${Math.round(volume * 100)}%`, backgroundColor: tint }]} /> : null}
      </View>
    </Pressable>
  );
}

export const SoundTile = memo(SoundTileBase);

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  iconWrap: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  glow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    transform: [{ scale: 1.15 }],
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textDim,
    textAlign: 'center',
    minHeight: 34,
  },
  fav: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  headphones: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  levelTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
  },
  levelFill: {
    height: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
});
