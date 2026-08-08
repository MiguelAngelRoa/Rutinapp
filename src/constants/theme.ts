/**
 * Rutinapp design system: black & citrus theme.
 * Colors are defined for light and dark mode.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    /** App background: black */
    background: '#000000',
    /** Cards and surfaces: dark charcoal */
    backgroundElement: '#16161C',
    /** Pressed / selected surfaces */
    backgroundSelected: '#232329',
    /** Primary text: white */
    text: '#FFFFFF',
    /** Secondary text: light gray */
    textSecondary: '#9CA3AF',
    /** Brand citrus lime (black text has strong contrast) */
    accent: '#A3E635',
    /** Soft lime tint for chips, fills and tracks */
    accentSoft: '#1F2B10',
    /** Text on top of accent surfaces */
    onAccent: '#000000',
    /** Hairline borders: medium white-gray */
    border: '#4A4A52',
    /** Positive feedback (rest finished, workout done) */
    success: '#4ADE80',
    /** Soft green tint for finished states */
    successSoft: '#12331E',
  },
  dark: {
    background: '#000000',
    backgroundElement: '#16161C',
    backgroundSelected: '#232329',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    accent: '#A3E635',
    accentSoft: '#1F2B10',
    onAccent: '#000000',
    border: '#4A4A52',
    success: '#4ADE80',
    successSoft: '#12331E',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  full: 999,
} as const;

export const Shadow = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  android: {
    elevation: 3,
  },
  web: {
    boxShadow: '0 8px 28px rgba(11, 36, 71, 0.10)',
  },
  default: {},
});

/** Extra top space on web so content clears the floating tab bar. */
export const TopInset = Platform.select({ web: 88, default: 0 }) ?? 0;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
