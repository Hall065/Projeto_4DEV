export const colors = {
  primary: '#1E40AF',
  primaryLight: '#3B82F6',
  primaryDark: '#1E3A8A',
  secondary: '#DC2626',
  navy: '#061B33',
  navyDark: '#031225',
  navySoft: '#0C2D4F',
  red: '#E30613',
  redDark: '#B90412',
  green: '#00A85A',
  blue: '#1D5EF4',
  cyan: '#0EA5E9',
  orange: '#F59E0B',
  yellow: '#FACC15',
  purple: '#7C3AED',
  grayText: '#64748B',
  mutedText: '#94A3B8',
  border: '#DDE6F1',
  borderDark: '#153657',
  background: '#F3F6FA',
  panel: '#FFFFFF',
  panelSoft: '#F8FAFC',
  darkPanel: '#0A243F',
  darkPanelSoft: '#0E3154',
  white: '#FFFFFF',
  black: '#020617',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#0284C7',
} as const;

export const connectTheme = {
  primary: colors.navy,
  accent: colors.green,
  background: colors.white,
};

export const gridTheme = {
  primary: colors.navy,
  accent: colors.orange,
  background: colors.background,
};
