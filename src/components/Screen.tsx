import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, type } from '../theme';
import { Backdrop } from './ui';

/** Scrollable tab screen with the backdrop, safe-area padding and a large title. */
export function Screen({
  title,
  subtitle,
  right,
  children,
  header,
  ...scrollProps
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  /** Content rendered under the title that stays part of the scroll. */
  header?: ReactNode;
} & ScrollViewProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <Backdrop />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        {...scrollProps}
      >
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={type.display} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text style={[type.caption, { marginTop: 4 }]}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
        {header}
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
});
