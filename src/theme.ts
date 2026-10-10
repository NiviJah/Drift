import { Platform } from 'react-native';

export const colors = {
  bg: '#070B18',
  bgTop: '#111833',
  surface: '#121A30',
  surfaceRaised: '#1A2442',
  surfacePressed: '#222E52',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  text: '#EEF1FA',
  textDim: '#A3ACC7',
  textMuted: '#6E7896',
  accent: '#9AA8FF',
  accentStrong: '#7C8CFF',
  accentText: '#0B1024',
  danger: '#FF7A8A',
  success: '#7EE3A1',
  overlay: 'rgba(3,6,15,0.7)',
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const type = {
  display: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5, color: colors.text },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.2, color: colors.text },
  heading: { fontSize: 17, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text },
  caption: { fontSize: 13, color: colors.textDim },
  micro: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.6, color: colors.textMuted },
  mono: {
    fontVariant: ['tabular-nums' as const],
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: undefined }),
  },
};

/** Appends an alpha channel to a #RRGGBB colour. */
export function alpha(hex: string, a: number): string {
  const v = Math.round(Math.min(1, Math.max(0, a)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${v}`;
}

export const TAB_BAR_HEIGHT = 58;
export const MINI_PLAYER_HEIGHT = 64;

/** The native animated driver isn't available on web. */
export const nativeDriver = Platform.OS !== 'web';
