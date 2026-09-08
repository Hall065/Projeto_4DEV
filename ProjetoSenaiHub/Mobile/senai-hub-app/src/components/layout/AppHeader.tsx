import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, Menu } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/common/VisualPrimitives';
import { getBrandAsset, type BrandArea } from '@/constants/brandAssets';
import { colors } from '@/constants/colors';
import { radius, shadow, touchTarget } from '@/constants/designTokens';
import { useI18n } from '@/hooks/useI18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/stores/app.store';
import { useAuthStore } from '@/stores/auth.store';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showMenu?: boolean;
  notificationCount?: number;
  onNotificationsPress?: () => void;
  accentColor?: string;
  brandArea?: BrandArea;
  profileRoute?: string;
}

export function AppHeader({
  title,
  subtitle,
  showMenu = true,
  notificationCount = 0,
  onNotificationsPress,
  accentColor = colors.navy,
  brandArea,
  profileRoute = '/perfil',
}: AppHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const { t } = useI18n();
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const session = useAuthStore((s) => s.session);
  const moduleName = title.replace('SENAI ', '');
  const profileName = session?.perfil?.nome?.split(' ')[0] ?? 'Usuário';
  const initials = session?.perfil?.nome
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() ?? 'SH';
  const moduleSubtitle =
    subtitle ??
    (title.includes('Grid')
      ? 'Gestão de manutenção e infraestrutura'
      : title.includes('Connect')
        ? 'Ensino conectado e gestão acadêmica'
        : title.includes('Safe')
          ? 'Controle seguro de entradas e saídas'
        : 'Hub Unificado de Infraestrutura e Serviços');
  const resolvedBrandArea =
    brandArea ?? (title.includes('Grid') ? 'grid' : title.includes('Connect') || title.includes('Aluno') ? 'connect' : title.includes('Safe') ? 'safe' : 'hub');
  const brandLogo = getBrandAsset(resolvedBrandArea, 'slogan', theme.isDark);
  const headerColor = theme.isDark
    ? title.includes('Grid')
      ? '#052E16'
      : title.includes('Connect') || title.includes('Aluno')
        ? '#450A0A'
        : title.includes('Safe')
          ? '#450A0A'
        : '#020617'
    : theme.surface;
  const headerBorderColor = theme.isDark ? 'rgba(255,255,255,0.08)' : theme.line;
  const headerIconColor = theme.isDark ? colors.white : accentColor;
  const headerIconBackground = theme.isDark ? 'rgba(255,255,255,0.1)' : theme.surfaceSoft;
  const headerIconBorder = theme.isDark ? 'rgba(255,255,255,0.12)' : theme.line;
  const avatarBackground = theme.isDark ? colors.white : accentColor;
  const avatarTextColor = theme.isDark ? colors.navy : colors.white;
  const profileTextColor = theme.isDark ? colors.white : theme.text;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 8, backgroundColor: headerColor, borderBottomColor: headerBorderColor },
      ]}
    >
      <View style={styles.row}>
        {showMenu ? (
          <AnimatedPressable
            accessibilityLabel={t("Abrir menu")}
            style={[styles.iconButton, { backgroundColor: headerIconBackground, borderColor: headerIconBorder }]}
            onPress={toggleSidebar}
            hitSlop={8}
          >
            <Menu color={headerIconColor} size={21} />
          </AnimatedPressable>
        ) : (
          <View style={styles.spacer} />
        )}
        <View style={styles.brandWrap}>
          <Image
            source={brandLogo}
            style={styles.brandLogo}
            resizeMode="contain"
            accessibilityLabel={`${t(moduleName)}. ${t(moduleSubtitle)}`}
          />
        </View>
        <AnimatedPressable
          accessibilityLabel={t("Abrir notificações")}
          style={[styles.iconButton, { backgroundColor: headerIconBackground, borderColor: headerIconBorder }]}
          onPress={onNotificationsPress}
          hitSlop={8}
        >
          <Bell color={headerIconColor} size={22} />
          {notificationCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {notificationCount > 99 ? '99+' : notificationCount}
              </Text>
            </View>
          ) : null}
        </AnimatedPressable>
        <AnimatedPressable
          accessibilityLabel={t("Abrir perfil")}
          accessibilityRole="button"
          style={styles.profile}
          onPress={() => router.push(profileRoute as never)}
          hitSlop={8}
        >
          <View style={[styles.avatar, { backgroundColor: avatarBackground }]}>
            {session?.perfil?.foto_url ? (
              <Image source={{ uri: session.perfil.foto_url }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: avatarTextColor }]}>{initials}</Text>
            )}
          </View>
          <Text numberOfLines={1} style={[styles.profileName, { color: profileTextColor }]}>
            {profileName}
          </Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingBottom: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    ...shadow.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spacer: { width: 36 },
  iconButton: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  brandWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  brandLogo: { width: '100%', maxWidth: 150, height: 38 },
  badge: {
    position: 'absolute',
    top: 3,
    right: 4,
    backgroundColor: colors.red,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  profile: {
    maxWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  avatar: {
    width: 31,
    height: 31,
    borderRadius: 8,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: colors.navy, fontSize: 10, fontWeight: '900' },
  profileName: { color: colors.white, fontSize: 9, fontWeight: '700' },
});
