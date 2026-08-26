import { colors } from '@/constants/colors';
import { useAppStore, type ThemeMode } from '@/stores/app.store';

export function getThemeColors(mode: ThemeMode) {
  const isDark = mode === 'dark';

  return {
    ...colors,
    isDark,
    mode,
    appBackground: isDark ? '#020617' : colors.background,
    surface: isDark ? '#0B1220' : colors.panel,
    surfaceSoft: isDark ? '#111827' : colors.panelSoft,
    surfaceMuted: isDark ? '#0F172A' : colors.white,
    text: isDark ? '#F8FAFC' : colors.navy,
    textMuted: isDark ? '#CBD5E1' : colors.grayText,
    textSubtle: isDark ? '#94A3B8' : colors.mutedText,
    line: isDark ? '#1F2937' : colors.border,
    elevatedLine: isDark ? '#334155' : colors.borderDark,
    overlay: isDark ? 'rgba(2,6,23,0.74)' : 'rgba(0,0,0,0.45)',
    focusRing: isDark ? colors.primaryLight : colors.primary,
    pressedOverlay: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(6,27,51,0.06)',
    disabled: isDark ? '#334155' : '#E2E8F0',
    input: isDark ? '#0B1220' : colors.white,
    inputFocused: isDark ? colors.primaryLight : colors.primary,
    nav: isDark ? '#0B1220' : colors.white,
    connectHeader: isDark ? '#09090B' : colors.navy,
    gridHeader: isDark ? '#09090B' : colors.navy,
  };
}

export function useThemeColors() {
  const mode = useAppStore((state) => state.themeMode);
  return getThemeColors(mode);
}
