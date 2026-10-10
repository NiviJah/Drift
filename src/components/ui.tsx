import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

import type { IconName } from '../audio/catalog';
import { haptic } from '../haptics';
import { alpha, colors, radius, spacing, type } from '../theme';

export function Icon({ name, size = 22, color = colors.text }: { name: IconName; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

/** Night-sky gradient used behind every screen. */
export function Backdrop() {
  return (
    <LinearGradient
      colors={[colors.bgTop, colors.bg, colors.bg]}
      locations={[0, 0.55, 1]}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  icon,
  onPress,
  variant = 'primary',
  disabled,
  style,
  compact,
  accessibilityHint,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  accessibilityHint?: string;
}) {
  const fg =
    variant === 'primary' ? colors.accentText : variant === 'danger' ? colors.danger : variant === 'ghost' ? colors.accent : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        variant === 'primary' && { backgroundColor: pressed ? colors.accentStrong : colors.accent },
        variant === 'secondary' && { backgroundColor: pressed ? colors.surfacePressed : colors.surfaceRaised },
        variant === 'danger' && { backgroundColor: pressed ? alpha(colors.danger, 0.25) : alpha(colors.danger, 0.12) },
        variant === 'ghost' && { backgroundColor: pressed ? alpha(colors.accent, 0.12) : 'transparent' },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={compact ? 18 : 20} color={fg} /> : null}
      <Text style={[styles.buttonLabel, compact && { fontSize: 14 }, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  size = 22,
  color = colors.text,
  style,
  filled,
  ...rest
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  filled?: boolean;
} & Omit<PressableProps, 'onPress' | 'style'>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size + 20, height: size + 20 },
        filled && { backgroundColor: colors.surfaceRaised },
        pressed && { backgroundColor: colors.surfacePressed },
        style,
      ]}
      {...rest}
    >
      <Icon name={icon} size={size} color={color} />
    </Pressable>
  );
}

export function Chip({
  label,
  icon,
  selected,
  onPress,
  color = colors.accent,
}: {
  label: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        selected ? { backgroundColor: alpha(color, 0.18), borderColor: alpha(color, 0.6) } : null,
        pressed && !selected && { backgroundColor: colors.surfacePressed },
      ]}
    >
      {icon ? <Icon name={icon} size={16} color={selected ? color : colors.textDim} /> : null}
      <Text style={[styles.chipLabel, selected && { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function VolumeSlider({
  value,
  onChange,
  color = colors.accent,
  label,
  onSlidingComplete,
}: {
  value: number;
  onChange: (v: number) => void;
  color?: string;
  label: string;
  onSlidingComplete?: (v: number) => void;
}) {
  return (
    <Slider
      accessibilityLabel={label}
      style={styles.slider}
      minimumValue={0}
      maximumValue={1}
      step={0}
      value={value}
      onValueChange={onChange}
      onSlidingComplete={onSlidingComplete}
      minimumTrackTintColor={color}
      maximumTrackTintColor="rgba(255,255,255,0.14)"
      thumbTintColor="#FFFFFF"
    />
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={type.micro} accessibilityRole="header">
        {title.toUpperCase()}
      </Text>
      {action}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SettingRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  onPress,
  right,
  destructive,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  value?: boolean;
  onValueChange?: (v: boolean) => void;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
}) {
  const content = (
    <>
      <View style={styles.settingIcon}>
        <Icon name={icon} size={20} color={destructive ? colors.danger : colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[type.body, destructive && { color: colors.danger }]}>{title}</Text>
        {subtitle ? <Text style={[type.caption, { marginTop: 2 }]}>{subtitle}</Text> : null}
      </View>
      {onValueChange ? (
        <Switch
          accessibilityLabel={title}
          value={value}
          onValueChange={(v) => {
            haptic.select();
            onValueChange(v);
          }}
          trackColor={{ true: colors.accentStrong, false: colors.surfacePressed }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={colors.surfacePressed}
        />
      ) : (
        right ?? (onPress ? <Icon name="chevron-right" size={20} color={colors.textMuted} /> : null)
      )}
    </>
  );
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          haptic.tap();
          onPress();
        }}
        style={({ pressed }) => [styles.settingRow, pressed && { backgroundColor: colors.surfacePressed }]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={styles.settingRow}>{content}</View>;
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    height: 52,
    borderRadius: radius.pill,
  },
  buttonCompact: {
    height: 40,
    paddingHorizontal: spacing.lg,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textDim,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    minHeight: 56,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: alpha(colors.accent, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 62,
  },
});
