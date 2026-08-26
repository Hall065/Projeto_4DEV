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
  LogOut,
} from 'lucide-react-native';
import { AnimatedPressable, FeedbackMessage } from '@/components/common/VisualPrimitives';
import { Reveal, StaggerList } from '@/components/common/MotionPrimitives';
import { AppHeader } from '@/components/layout/AppHeader';
import { NotificationsModal } from '@/components/notifications/NotificationsModal';
import { getBrandAsset } from '@/constants/brandAssets';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { useNotifications } from '@/hooks/useNotifications';
import { useThemeColors } from '@/hooks/useThemeColors';
import { canAccessConnect, canAccessGrid } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth.store';

const connectCardImage = require('../assets/brand/hub-connect-card.png');
const gridCardImage = require('../assets/brand/hub-grid-card.png');

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
    <AnimatedPressable accessibilityRole="button" style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]} onPress={onPress}>
      <View style={[styles.illustration, { backgroundColor: theme.surfaceSoft }]}>
        <Image source={image} style={styles.illustrationImage} resizeMode="cover" />
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
    </AnimatedPressable>
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
      accent: colors.red,
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
      accent: colors.green,
      route: '/grid' as const,
      logo: getBrandAsset('grid', 'icon', theme.isDark),
      image: gridCardImage,
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
          <View style={styles.titleRow}>
            <View style={styles.titleCopy}>
              <Text style={[styles.eyebrow, { color: theme.textMuted }]}>{t('Bem-vindo')}, {session.perfil.nome.split(' ')[0]}</Text>
              <Text style={[styles.hubTitle, { color: theme.text }]}>{t('Hub de Aplicações')}</Text>
              <Text style={[styles.description, { color: theme.textMuted }]}>{t('Acesse os sistemas disponíveis para o seu perfil.')}</Text>
            </View>
            <AnimatedPressable
              accessibilityLabel="Sair da conta"
              accessibilityRole="button"
              style={[styles.logoutAction, { backgroundColor: theme.surface, borderColor: theme.line }]}
              onPress={async () => {
                await logout();
                router.replace('/login');
              }}
              hitSlop={8}
            >
              <LogOut size={19} color={theme.textMuted} />
            </AnimatedPressable>
          </View>
        </Reveal>

        <Reveal delay={40}>
          <FeedbackMessage
            variant="info"
            message="Os aplicativos exibidos abaixo dependem do seu perfil e permissões de acesso."
            style={styles.infoBox}
          />
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
              onPress={() => router.push(app.route)}
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
  content: { padding: 18, paddingBottom: 34 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleCopy: { flex: 1, minWidth: 0 },
  logoutAction: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: { color: colors.grayText, fontSize: 13, fontWeight: '700' },
  hubTitle: { color: colors.navy, fontSize: 27, fontWeight: '900', marginTop: 4 },
  description: { color: colors.grayText, fontSize: 13, marginTop: 5 },
  infoBox: { marginTop: 18 },
  cards: { gap: 14 },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 14,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  illustration: {
    height: 160,
    borderRadius: 8,
    backgroundColor: colors.panelSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  illustrationImage: {
    width: '100%',
    height: '100%',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appIcon: {
    width: 46,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconImage: { width: 30, height: 30 },
  cardTitleWrap: { flex: 1, minWidth: 0 },
  cardTitle: { color: colors.navy, fontSize: 19, fontWeight: '900' },
  cardDesc: { color: colors.grayText, fontSize: 12, lineHeight: 17, marginTop: 3 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  cardMetaText: { color: colors.grayText, fontSize: 11, fontWeight: '700' },
  accessBtn: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  accessBtnText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  emptyMessage: { marginTop: 18 },
});
