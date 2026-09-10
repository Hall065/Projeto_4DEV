import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  type ImageSourcePropType,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ArrowRight,
  CheckCircle2,
  Layers3,
  LogOut,
  Sparkles,
} from 'lucide-react-native';
import { AnimataPressable, AtmosphericGlow } from '@/components/common/AnimataPrimitives';
import { FeedbackMessage } from '@/components/common/VisualPrimitives';
import { Reveal, StaggerList } from '@/components/common/MotionPrimitives';
import { AppHeader } from '@/components/layout/AppHeader';
import { NotificationsModal } from '@/components/notifications/NotificationsModal';
import { getBrandAsset } from '@/constants/brandAssets';
import { colors } from '@/constants/colors';
import { radius, shadow } from '@/constants/designTokens';
import { useI18n } from '@/hooks/useI18n';
import { useNotifications } from '@/hooks/useNotifications';
import { useThemeColors } from '@/hooks/useThemeColors';
import { canAccessConnect, canAccessGrid, canAccessSafe } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth.store';

const connectCardImage = require('../assets/brand/hub-connect-card.png');
const gridCardImage = require('../assets/brand/hub-grid-card.png');
const safeCardImage = require('../assets/brand/hub-safe-card.png');

interface AppCardProps {
  title: string;
  description: string;
  accent: string;
  onPress: () => void;
  logo: ImageSourcePropType;
  image: ImageSourcePropType;
}

function AppCard({ title, description, accent, onPress, logo, image }: AppCardProps) {
  const theme = useThemeColors();
  const { t } = useI18n();
  return (
    <AnimataPressable
      accessibilityLabel={`${t(title)}. ${t('Acessar aplicativo')}`}
      accessibilityRole="button"
      rippleColor={`${accent}55`}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}
      onPress={onPress}
    >
      <View style={[styles.illustration, { backgroundColor: accent }]}>
        <Image source={image} style={styles.illustrationImage} resizeMode="cover" />
        <View style={[styles.imageWash, { backgroundColor: accent }]} />
        <View style={styles.imageLabel}>
          <Sparkles size={13} color={colors.white} />
          <Text style={styles.imageLabelText}>{t('Experi?ncia integrada')}</Text>
        </View>
        <View style={[styles.floatingLogo, { borderColor: `${accent}55` }]}>
          <Image source={logo} style={styles.floatingLogoImage} resizeMode="contain" />
        </View>
      </View>
      <View style={styles.cardHeader}>
        <View style={[styles.appIcon, { backgroundColor: theme.surfaceSoft, borderColor: theme.line }]}>
          <Image source={logo} style={styles.appIconImage} resizeMode="contain" />
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{t(title)}</Text>
          <Text style={[styles.cardDesc, { color: theme.textMuted }]}>{t(description)}</Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <CheckCircle2 size={15} color={colors.green} />
        <Text style={[styles.cardMetaText, { color: theme.textMuted }]}>{t('Acesso liberado conforme seu perfil')}</Text>
      </View>
      <View style={[styles.accessBtn, { backgroundColor: accent }]}>
        <Text style={styles.accessBtnText}>{t('Acessar aplicativo')}</Text>
        <ArrowRight size={16} color={colors.white} />
      </View>
    </AnimataPressable>
  );
}

export default function HubScreen() {
  const router = useRouter();
  const { session, logout } = useAuthStore();
  const theme = useThemeColors();
  const { t } = useI18n();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifications = useNotifications(session?.userId);

  useEffect(() => {
    if (!session) {
      router.replace('/login');
    }
  }, [session, router]);

  if (!session?.perfil) return null;

  const apps = [];
  if (canAccessConnect(session.perfil, session.aplicacoes)) {
    apps.push({
      key: 'connect',
      title: 'SENAI Connect',
      description: 'Gestão completa de alunos, turmas, frequência, contratos e informações acadêmicas.',
      accent: '#3DBE4A',
      route: '/connect' as const,
      logo: getBrandAsset('connect', 'icon', theme.isDark),
      image: connectCardImage,
    });
  }
  if (canAccessGrid(session.perfil, session.aplicacoes)) {
    apps.push({
      key: 'grid',
      title: 'SENAI Grid',
      description: 'Gestão de manutenção predial, infraestrutura, chamados, estoque e equipes.',
      accent: '#F7941D',
      route: '/grid' as const,
      logo: getBrandAsset('grid', 'icon', theme.isDark),
      image: gridCardImage,
    });
  }
  if (canAccessSafe(session.perfil, session.aplicacoes)) {
    apps.push({
      key: 'safe',
      title: 'SENAI Safe',
      description: 'Controle de autorizacoes de entrada e saida com aprovacao do professor e portaria.',
      accent: colors.purple,
      route: '/safe' as const,
      logo: getBrandAsset('safe', 'icon', theme.isDark),
      image: safeCardImage,
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.appBackground }]}>
      <AppHeader
        title="SENAI Hub"
        brandArea="hub"
        showMenu={false}
        notificationCount={notifications.unreadCount}
        onNotificationsPress={() => setNotificationsOpen(true)}
      />

      <ScrollView
        style={{ backgroundColor: theme.appBackground }}
        contentContainerStyle={[styles.content, { backgroundColor: theme.appBackground }]}
        showsVerticalScrollIndicator={false}
      >
        <Reveal>
          <View style={styles.hero}>
            <AtmosphericGlow />
            <View style={styles.heroTopline}>
              <View style={styles.livePill}>
                <Sparkles size={13} color={colors.white} />
                <Text style={styles.livePillText}>{t('Experiência integrada')}</Text>
              </View>
              <AnimataPressable
                accessibilityLabel={t('Sair da conta')}
                accessibilityRole="button"
                haptic={false}
                hitSlop={8}
                style={styles.logoutAction}
                wrapperStyle={styles.logoutWrapper}
                onPress={async () => {
                  await logout();
                  router.replace('/login');
                }}
              >
                <LogOut size={18} color={colors.white} />
              </AnimataPressable>
            </View>

            <Text style={styles.heroEyebrow}>{t('Bem-vindo')}, {session.perfil.nome.split(' ')[0]}</Text>
            <Text style={styles.heroTitle}>SENAI</Text>
            <Text style={styles.heroTitleAccent}>HUB</Text>
            <Text style={styles.heroDescription}>
              {t('Um login. Todos os sistemas certos para o seu perfil.')}
            </Text>

            <View style={styles.heroFooter}>
              <View>
                <Text style={styles.heroMetricValue}>{String(apps.length).padStart(2, '0')}</Text>
                <Text style={styles.heroMetricLabel}>{t('Módulos liberados')}</Text>
              </View>
              <View style={styles.heroRule} />
              <View>
                <Text style={styles.heroMetricValueSmall}>{t('ACESSO RBAC')}</Text>
                <Text style={styles.heroMetricLabel}>{t('Personalizado por perfil')}</Text>
              </View>
            </View>
          </View>
        </Reveal>

        <Reveal delay={40} style={styles.sectionHeading}>
          <View>
            <Text style={[styles.sectionEyebrow, { color: theme.textMuted }]}>{t('SEUS APLICATIVOS')}</Text>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('Escolha onde continuar')}</Text>
          </View>
          <View style={[styles.layersBadge, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Layers3 size={18} color={colors.red} />
          </View>
        </Reveal>

        <StaggerList style={styles.cards}>
          {apps.map((app) => (
            <AppCard
              key={app.key}
              title={app.title}
              description={app.description}
              accent={app.accent}
              logo={app.logo}
              image={app.image}
              onPress={() => router.push(app.route as never)}
            />
          ))}
        </StaggerList>

        {apps.length === 0 ? (
          <FeedbackMessage
            variant="warning"
            message="Nenhuma aplicação liberada para seu perfil."
            style={styles.emptyMessage}
          />
        ) : null}
      </ScrollView>

      <NotificationsModal
        visible={notificationsOpen}
        notifications={notifications.notifications}
        loading={notifications.loading}
        error={notifications.error}
        pendingIds={notifications.pendingIds}
        markingAll={notifications.markingAll}
        onClose={() => setNotificationsOpen(false)}
        onMarkAsRead={notifications.markAsRead}
        onMarkAllAsRead={notifications.markAllAsRead}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 42 },
  hero: {
    minHeight: 370,
    margin: 18,
    padding: 22,
    overflow: 'hidden',
    borderRadius: radius.hero,
    backgroundColor: colors.navy,
    ...shadow.lg,
  },
  heroTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  livePill: {
    minHeight: 30,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  livePillText: { color: colors.white, fontSize: 10, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
  logoutWrapper: { borderRadius: radius.pill },
  logoutAction: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEyebrow: { marginTop: 38, color: 'rgba(255,255,255,0.58)', fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  heroTitle: { marginTop: 7, color: colors.white, fontSize: 58, lineHeight: 55, fontWeight: '900', letterSpacing: -3 },
  heroTitleAccent: { color: colors.red, fontSize: 58, lineHeight: 55, fontWeight: '900', letterSpacing: -3 },
  heroDescription: { marginTop: 15, maxWidth: 270, color: 'rgba(255,255,255,0.72)', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  heroFooter: { marginTop: 'auto', paddingTop: 22, flexDirection: 'row', alignItems: 'flex-end' },
  heroMetricValue: { color: colors.white, fontSize: 24, fontWeight: '900' },
  heroMetricValueSmall: { color: colors.white, fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  heroMetricLabel: { marginTop: 2, color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  heroRule: { width: 1, height: 34, marginHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.14)' },
  sectionHeading: { marginTop: 8, marginBottom: 17, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.7 },
  sectionTitle: { marginTop: 4, fontSize: 24, fontWeight: '900', letterSpacing: -0.8 },
  layersBadge: { width: 40, height: 40, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cards: { gap: 18, paddingHorizontal: 18 },
  card: { borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, ...shadow.lg },
  illustration: { height: 190, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  illustrationImage: { width: '100%', height: '100%' },
  imageWash: { ...StyleSheet.absoluteFillObject, opacity: 0.28 },
  imageLabel: { position: 'absolute', left: 14, top: 14, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: 'rgba(3,18,37,0.78)', flexDirection: 'row', alignItems: 'center', gap: 6 },
  imageLabelText: { color: colors.white, fontSize: 9, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
  floatingLogo: { position: 'absolute', left: 16, bottom: 16, width: 58, height: 58, borderRadius: radius.xl, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' },
  floatingLogoImage: { width: 36, height: 36 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18 },
  appIcon: { width: 46, height: 46, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  appIconImage: { width: 30, height: 30 },
  cardTitleWrap: { flex: 1, minWidth: 0 },
  cardTitle: { color: colors.navy, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  cardDesc: { color: colors.grayText, fontSize: 13, lineHeight: 19, marginTop: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 15, paddingHorizontal: 18 },
  cardMetaText: { color: colors.grayText, fontSize: 11, fontWeight: '700' },
  accessBtn: { minHeight: 48, marginHorizontal: 18, marginTop: 15, marginBottom: 18, borderRadius: radius.lg, backgroundColor: colors.navy, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  accessBtnText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  emptyMessage: { marginHorizontal: 18, marginTop: 6 },
});
