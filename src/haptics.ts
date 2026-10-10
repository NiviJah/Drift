import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useStore } from './state/store';

function enabled(): boolean {
  return Platform.OS !== 'web' && useStore.getState().settings.haptics;
}

export const haptic = {
  tap(): void {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  },
  select(): void {
    if (enabled()) Haptics.selectionAsync().catch(() => undefined);
  },
  success(): void {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  },
  warning(): void {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
  },
};
