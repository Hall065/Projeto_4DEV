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
import { ChevronRight, Headphones, Home, LogOut, ShieldCheck, X } from 'lucide-react-native';
import { AnimataPressable } from '@/components/common/AnimataPrimitives';
import { getBrandAsset, type BrandArea } from '@/constants/brandAssets';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { useMotionPreference } from '@/hooks/useMotionPreference';
import { isStudentRole } from '@/lib/permissions';
import { useAppStore } from '@/stores/app.store';
import { useAuthStore } from '@/stores/auth.store';
import { useChatbotStore } from '@/stores/chatbot.store';

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

function resolveBrandArea(moduleTitle: string): BrandArea {
  const normalized = moduleTitle.toLowerCase();
  if (normalized.includes('connect')) return 'connect';
  if (normalized.includes('grid')) return 'grid';
  if (normalized.includes('safe')) return 'safe';
  return 'hub';
}

export function SidebarDrawer({ items, moduleTitle, accentColor = colors.red }: SidebarDrawerProps) {
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const logout = useAuthStore((s) => s.logout);
  const session = useAuthStore((s) => s.session);
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(sidebarOpen);
  const progress = useRef(new Animated.Value(sidebarOpen ? 1 : 0)).current;
  const { shouldAnimate } = useMotionPreference();
  const openChatbot = useChatbotStore((state) => state.open);

  useEffect(() => {
    if (sidebarOpen) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: shouldAnimate ? 280 : 0,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(progress, {
      toValue: 0,
      duration: shouldAnimate ? 190 : 0,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [progress, shouldAnimate, sidebarOpen]);

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
  const brandArea = resolveBrandArea(moduleTitle);
  const brandLogo = getBrandAsset(brandArea, 'slogan', true);
  const canOpenSupport = !isStudentRole(session?.perfil?.tipo);

  let currentSection = '';

  return (
    <Modal visible={mounted} animationType="none" transparent onRequestClose={() => setSidebarOpen(false)}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]} />
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
          <View pointerEvents="none" style={[styles.accentGlow, { backgroundColor: accentColor }]} />
          <View pointerEvents="none" style={[styles.accentRail, { backgroundColor: accentColor }]} />
          <View style={styles.brandRow}>
            <AnimataPressable
              haptic={false}
              style={styles.brandButton}
              onPress={() => navigate('/' + brandArea)}
              accessibilityRole="button"
              accessibilityLabel={t('Ir para o painel do módulo')}
            >
              <Image source={brandLogo} style={styles.brandLogo} resizeMode="contain" />
            </AnimataPressable>
            <AnimataPressable haptic={false} style={styles.closeButton} onPress={() => setSidebarOpen(false)} hitSlop={8}>
              <X size={19} color={colors.white} strokeWidth={2.2} />
            </AnimataPressable>
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
                  {showSection ? (
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionLabel}>{t(item.section)}</Text>
                      <View style={styles.sectionLine} />
                    </View>
                  ) : null}
                  <AnimataPressable
                    style={[styles.menuItem, active && { backgroundColor: accentColor, borderColor: accentColor }]}
                    onPress={() => navigate(item.route)}
                  >
                    <View style={styles.menuItemLeft}>
                      <View style={[styles.menuIcon, active && styles.menuIconActive]}>{icon}</View>
                      <Text style={[styles.menuText, active && styles.menuTextActive]}>{t(item.label)}</Text>
                    </View>
                    <ChevronRight size={16} color={active ? colors.white : 'rgba(255,255,255,0.42)'} />
                  </AnimataPressable>
                </View>
              );
            })}

            <AnimataPressable
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
            </AnimataPressable>
          </ScrollView>

          <View style={styles.securityHint}>
            <ShieldCheck size={15} color="rgba(255,255,255,0.48)" />
            <Text style={styles.securityHintText}>{t('Acesso protegido pelo seu perfil SENAI')}</Text>
          </View>

          {canOpenSupport ? (
            <AnimataPressable
              style={styles.supportButton}
              onPress={() => {
                setSidebarOpen(false);
                openChatbot();
              }}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.supportIcon}>
                  <Headphones size={18} color={colors.white} />
                </View>
                <Text style={styles.supportText}>{t('Central de suporte')}</Text>
              </View>
              <ChevronRight size={16} color="rgba(255,255,255,0.42)" />
            </AnimataPressable>
          ) : null}

          <AnimataPressable
            style={styles.logout}
            onPress={async () => {
              setSidebarOpen(false);
              await logout();
              router.replace('/login');
            }}
          >
            <LogOut size={18} color={colors.red} />
            <Text style={styles.logoutText}>{t('Sair')}</Text>
          </AnimataPressable>
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
    backgroundColor: 'rgba(2,6,23,0.7)',
  },
  drawer: {
    width: '86%',
    maxWidth: 304,
    backgroundColor: colors.navy,
    paddingHorizontal: 22,
    height: '100%',
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 6, height: 0 },
    elevation: 16,
  },
  accentGlow: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    top: -118,
    right: -95,
    opacity: 0.14,
  },
  accentRail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 3,
  },
  brandRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  brandButton: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  brandLogo: {
    width: 176,
    height: 48,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCard: {
    minHeight: 76,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    marginBottom: 18,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
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
  menuContent: { paddingBottom: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 13,
    marginBottom: 7,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  menuItem: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 4,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
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
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  menuIconActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  menuText: {
    flex: 1,
    minWidth: 0,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    fontWeight: '700',
  },
  menuTextActive: { color: colors.white },
  securityHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 8,
  },
  securityHintText: {
    flex: 1,
    color: 'rgba(255,255,255,0.48)',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 15,
  },
  supportButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 13,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  supportIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportText: { flex: 1, color: colors.white, fontSize: 13, fontWeight: '700' },
  logout: {
    minHeight: 46,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(227,6,19,0.26)',
    backgroundColor: 'rgba(227,6,19,0.1)',
  },
  logoutText: { color: colors.red, fontWeight: '900', fontSize: 14 },
});
