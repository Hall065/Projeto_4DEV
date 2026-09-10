import { cloneElement, isValidElement, type ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { AnimataPressable } from '@/components/common/AnimataPrimitives';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { useThemeColors } from '@/hooks/useThemeColors';

export interface NavItem {
  label: string;
  route: string;
  icon: ReactElement<{ color?: string; size?: number }>;
}

interface BottomNavProps {
  items: NavItem[];
  accentColor?: string;
}

function isRootModuleRoute(route: string) {
  return route.split('/').filter(Boolean).length <= 1;
}

function isActiveRoute(pathname: string, route: string) {
  if (pathname === route) return true;
  if (isRootModuleRoute(route)) return false;
  return pathname.startsWith(`${route}/`);
}

export function BottomNav({ items, accentColor = colors.navy }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const theme = useThemeColors();
  const { t } = useI18n();
  const activeBg =
    theme.isDark
      ? accentColor === colors.green
        ? 'rgba(0,168,90,0.18)'
        : accentColor === colors.red
          ? 'rgba(227,6,19,0.18)'
          : theme.surfaceSoft
      : accentColor === colors.red ? '#FFE7E9' : accentColor === colors.green ? '#E6F8EE' : colors.panelSoft;

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom + 8,
          backgroundColor: theme.isDark ? theme.nav : colors.white,
          borderTopColor: theme.isDark ? theme.line : colors.border,
        },
      ]}
    >
      {items.map((item) => {
        const active = isActiveRoute(pathname, item.route);
        const iconColor = active ? accentColor : theme.isDark ? theme.textMuted : colors.grayText;
        const icon = isValidElement(item.icon)
          ? cloneElement(item.icon, { color: iconColor, size: active ? 22 : 20 })
          : item.icon;
        return (
          <AnimataPressable
            key={item.route}
            wrapperStyle={styles.itemWrap}
            style={[styles.item, active && { backgroundColor: activeBg }]}
            onPress={() => router.push(item.route as never)}
          >
            {active ? <View style={[styles.activeBar, { backgroundColor: accentColor }]} /> : null}
            {icon}
            <Text style={[styles.label, { color: theme.isDark ? theme.textMuted : colors.grayText }, active && { color: accentColor, fontWeight: '700' }]}>
              {t(item.label)}
            </Text>
          </AnimataPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 7,
    paddingHorizontal: 8,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  itemWrap: { flex: 1 },
  item: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  activeBar: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  label: { fontSize: 10, color: colors.grayText, fontWeight: '700' },
});
