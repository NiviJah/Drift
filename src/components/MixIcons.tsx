import { StyleSheet, Text, View } from 'react-native';

import { CATEGORY_BY_ID, SOUND_BY_ID } from '../audio/catalog';
import { alpha, colors } from '../theme';
import { Icon } from './ui';

/** Small overlapping icon stack representing a mix. */
export function MixIcons({ mix, max = 4, size = 30 }: { mix: Record<string, number>; max?: number; size?: number }) {
  const ids = Object.keys(mix).filter((id) => SOUND_BY_ID[id]);
  const extra = ids.length - max;
  return (
    <View style={styles.row}>
      {ids.slice(0, max).map((id, i) => {
        const def = SOUND_BY_ID[id];
        const tint = CATEGORY_BY_ID[def.category].color;
        return (
          <View
            key={id}
            style={[
              styles.bubble,
              { width: size, height: size, borderRadius: size / 2, backgroundColor: alpha(tint, 0.22), marginLeft: i === 0 ? 0 : -size * 0.3 },
            ]}
          >
            <Icon name={def.icon} size={size * 0.52} color={tint} />
          </View>
        );
      })}
      {extra > 0 ? (
        <View style={[styles.bubble, { width: size, height: size, borderRadius: size / 2, marginLeft: -size * 0.3, backgroundColor: colors.surfacePressed }]}>
          <Text style={styles.extra}>+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function mixSummary(mix: Record<string, number>): string {
  return Object.keys(mix)
    .map((id) => SOUND_BY_ID[id]?.name)
    .filter(Boolean)
    .join(' · ');
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  extra: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
  },
});
