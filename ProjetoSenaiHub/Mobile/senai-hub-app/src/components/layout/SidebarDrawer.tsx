import { cloneElement, isValidElement, useEffect, useRef, useState, type ReactElement } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Home, LogOut, X } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/common/VisualPrimitives';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/stores/app.store';
import { useAuthStore } from '@/stores/auth.store';

export interface DrawerMenuItem {
  label: string;
  route: string;
  icon?: ReactElement<{ color?: string; size?: number }>;
  section?: string;
}

interface SidebarDrawerProps {
  items: DrawerMenuItem[];
  moduleTitle: string;
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

export function SidebarDrawer({ items, moduleTitle, accentColor = colors.red }: SidebarDrawerProps) {
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const logout = useAuthStore((s) => s.logout);
  const session = useAuthStore((s) => s.session);
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(sidebarOpen);
  const progress = useRef(new Animated.Value(sidebarOpen ? 1 : 0)).current;

  useEffect(() => {
    if (sidebarOpen) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(progress, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [progress, sidebarOpen]);

  const navigate = (route: string) => {
    setSidebarOpen(false);
    router.push(route as never);
  };

  if (!mounted) return null;

  const overlayOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const drawerTranslate = progress.interpolate({ inputRange: [0, 1], outputRange: [-340, 0] });
  const initials =
    session?.perfil?.nome
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() ?? 'SH';

  let currentSection = '';

  return (
    <Modal visible={mounted} animationType="none" transparent onRequestClose={() => setSidebarOpen(false)}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: overlayOpacity, backgroundColor: theme.isDark ? 'rgba(2,6,23,0.78)' : 'rgba(2,6,23,0.62)' }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setSidebarOpen(false)} />

        <Animated.View
          style={[
            styles.drawer,
            {
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 14,
              transform: [{ translateX: drawerTranslate }],
            },
          ]}
        >
          <View style={styles.brandRow}>
            <View style={styles.brandLeft}>
              <View style={styles.senaiMark}>
                <Text style={styles.senaiText}>{t("SENAI")}</Text>
              </View>
              <Text style={styles.moduleTitle}>{moduleTitle.replace('SENAI ', '')}</Text>
            </View>
            <AnimatedPressable style={styles.closeButton} onPress={() => setSidebarOpen(false)} hitSlop={8}>
              <X size={18} color={colors.white} />
            </AnimatedPressable>
          </View>

          <View style={styles.userCard}>
            <View style={[styles.avatar, { backgroundColor: accentColor }]}>
              {session?.perfil?.foto_url ? (
                <Image source={{ uri: session.perfil.foto_url }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            <View style={styles.userTextWrap}>
              <Text numberOfLines={1} style={styles.userName}>
                {session?.perfil?.nome ?? t("Usuário")}
              </Text>
              <Text numberOfLines={1} style={styles.userRole}>
                {session?.perfil?.tipo ?? t("perfil ativo")}
              </Text>
            </View>
          </View>

          <ScrollView style={styles.menu} contentContainerStyle={styles.menuContent} showsVerticalScrollIndicator={false}>
            {items.map((item) => {
              const active = isActiveRoute(pathname, item.route);
              const showSection = item.section && item.section !== currentSection;
              if (item.section) currentSection = item.section;
              const iconColor = active ? colors.white : colors.mutedText;
              const icon =
                item.icon && isValidElement(item.icon)
                  ? cloneElement(item.icon, { color: iconColor, size: 18 })
                  : null;

              return (
                <View key={item.route}>
                  {showSection ? <Text style={styles.sectionLabel}>{t(item.section)}</Text> : null}
                  <AnimatedPressable
                    style={[styles.menuItem, active && { backgroundColor: accentColor }]}
                    onPress={() => navigate(item.route)}
                  >
                    <View style={styles.menuItemLeft}>
                      <View style={[styles.menuIcon, active && styles.menuIconActive]}>{icon}</View>
                      <Text style={[styles.menuText, active && styles.menuTextActive]}>{t(item.label)}</Text>
                    </View>
                    <ChevronRight size={16} color={active ? colors.white : colors.mutedText} />
                  </AnimatedPressable>
                </View>
              );
            })}

            <AnimatedPressable
              style={styles.menuItem}
              onPress={() => {
                setSidebarOpen(false);
                router.replace('/hub' as never);
              }}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIcon}>
                  <Home size={18} color={colors.mutedText} />
                </View>
                <Text style={styles.menuText}>{t('Voltar ao Hub')}</Text>
              </View>
              <ChevronRight size={16} color={colors.mutedText} />
            </AnimatedPressable>
          </ScrollView>

          <AnimatedPressable
            style={styles.logout}
            onPress={async () => {
              setSidebarOpen(false);
              await logout();
              router.replace('/login');
            }}
          >
            <LogOut size={18} color={colors.red} />
            <Text style={styles.logoutText}>{t('Sair')}</Text>
          </AnimatedPressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,23,0.62)',
  },
  drawer: {
    width: '84%',
    maxWidth: 340,
    backgroundColor: colors.navyDark,
    paddingHorizontal: 16,
    height: '100%',
    shadowColor: colors.black,
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 6, height: 0 },
    elevation: 16,
  },
  brandRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  brandLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  senaiMark: {
    height: 25,
    borderRadius: 4,
    backgroundColor: colors.red,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  senaiText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  moduleTitle: {
    flex: 1,
    minWidth: 0,
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCard: {
    minHeight: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderDark,
    backgroundColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
  userTextWrap: { flex: 1, minWidth: 0 },
  userName: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  userRole: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
    textTransform: 'capitalize',
  },
  menu: { flex: 1 },
  menuContent: { paddingBottom: 12 },
  sectionLabel: {
    color: colors.mutedText,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 10,
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  menuItem: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 7,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  menuItemLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  menuIcon: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  menuIconActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  menuText: {
    flex: 1,
    minWidth: 0,
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '800',
  },
  menuTextActive: { color: colors.white },
  logout: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(227,6,19,0.26)',
    backgroundColor: 'rgba(227,6,19,0.1)',
  },
  logoutText: { color: colors.red, fontWeight: '900', fontSize: 14 },
});
