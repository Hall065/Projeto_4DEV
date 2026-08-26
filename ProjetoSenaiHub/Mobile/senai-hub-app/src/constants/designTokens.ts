import { colors } from './colors';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
} as const;

export const fontSize = {
  caption: 10,
  small: 11,
  body: 13,
  bodyLarge: 15,
  title: 18,
  metric: 24,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '600',
  semibold: '700',
  bold: '800',
  black: '900',
} as const;

export const shadow = {
  sm: {
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  md: {
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
} as const;

export const chartPalette = [
  colors.primary,
  colors.primaryLight,
  colors.secondary,
  colors.green,
  colors.orange,
  colors.purple,
] as const;

export const motion = {
  fast: 140,
  base: 220,
  slow: 320,
  stagger: 40,
  revealOffset: 8,
  modalOffset: 20,
} as const;

export const touchTarget = {
  min: 44,
} as const;

export const interaction = {
  pressedOpacity: 0.72,
  disabledOpacity: 0.56,
  pressScale: 0.97,
  focusRingWidth: 2,
} as const;
