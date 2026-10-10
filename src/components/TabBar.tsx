import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from '../audio/catalog';
import { haptic } from '../haptics';
import { TAB_BAR_HEIGHT, colors } from '../theme';
import { NowPlayingBar } from './NowPlayingBar';
import { Icon } from './ui';

const TAB_ICONS: Record<string, { on: IconName; off: IconName }> = {
  index: { on: 'music-note', off: 'music-note-outline' },
  mixes: { on: 'bookmark-multiple', off: 'bookmark-multiple-outline' },
  timer: { on: 'timer-sand', off: 'timer-outline' },
  settings: { on: 'cog', off: 'cog-outline' },
};

/** Bottom tabs with the mini player docked on top. */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <NowPlayingBar />
      <View style={styles.row} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = typeof options.title === 'string' ? options.title : route.name;
          const icons = TAB_ICONS[route.name] ?? { on: 'circle', off: 'circle-outline' };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  haptic.select();
                  navigation.navigate(route.name, route.params);
                }
              }}
              style={styles.tab}
            >
              <Icon name={focused ? icons.on : icons.off} size={24} color={focused ? colors.accent : colors.textMuted} />
              <Text style={[styles.label, focused && { color: colors.text }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(7,11,24,0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
