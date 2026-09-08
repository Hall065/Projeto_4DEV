import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, CheckCheck, X } from 'lucide-react-native';
import { AnimatedPressable, AppButton, FeedbackMessage, LoadingState } from '@/components/common/VisualPrimitives';
import { colors } from '@/constants/colors';
import { radius, spacing, touchTarget } from '@/constants/designTokens';
import { useI18n } from '@/hooks/useI18n';
import { useMotionPreference } from '@/hooks/useMotionPreference';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { Notificacao } from '@/services/notification.service';
import { getAppLocale } from '@/utils/locale';

interface NotificationsModalProps {
  visible: boolean;
  notifications: Notificacao[];
  loading?: boolean;
  error?: string | null;
  pendingIds?: string[];
  markingAll?: boolean;
  onClose: () => void;
  onMarkAsRead: (id: string) => void | Promise<boolean>;
  onMarkAllAsRead: () => void | Promise<boolean>;
}

function isToday(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toDateString() === new Date().toDateString();
}

function formatRelativeTime(value: string, locale: string, fallback: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return fallback;
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absolute = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (absolute < 60) return formatter.format(diffSeconds, 'second');
  if (absolute < 3600) return formatter.format(Math.round(diffSeconds / 60), 'minute');
  if (absolute < 86400) return formatter.format(Math.round(diffSeconds / 3600), 'hour');
  return formatter.format(Math.round(diffSeconds / 86400), 'day');
}

export function NotificationsModal({
  visible,
  notifications,
  loading,
  error,
  pendingIds = [],
  markingAll = false,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationsModalProps) {
  const theme = useThemeColors();
  const { language, t } = useI18n();
  const locale = getAppLocale(language);
  const { duration } = useMotionPreference();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const groups = useMemo(
    () => ({
      today: notifications.filter((item) => isToday(item.created_at)),
      previous: notifications.filter((item) => !isToday(item.created_at)),
    }),
    [notifications]
  );

  useEffect(() => {
    if (!visible) return;
    opacity.setValue(duration === 0 ? 1 : 0);
    translateY.setValue(duration === 0 ? 0 : 24);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [duration, opacity, translateY, visible]);

  const renderGroup = (title: string, items: Notificacao[]) => {
    if (!items.length) return null;
    return (
      <View style={styles.group}>
        <Text accessibilityRole="header" style={[styles.groupTitle, { color: theme.textMuted }]}>
          {t(title)}
        </Text>
        {items.map((notification) => {
          const pending = pendingIds.includes(notification.id);
          const actionable = !notification.lida && !pending;
          return (
            <AnimatedPressable
              key={notification.id}
              accessibilityRole="button"
              accessibilityLabel={`${notification.titulo}. ${notification.mensagem}. ${formatRelativeTime(notification.created_at, locale, t('Data indisponivel'))}`}
              accessibilityHint={actionable ? t('Toque para marcar como lida') : undefined}
              accessibilityState={{ disabled: !actionable }}
              disabled={!actionable}
              style={[
                styles.item,
                {
                  backgroundColor: !notification.lida && !theme.isDark ? '#E8F1FF' : theme.surfaceSoft,
                  borderColor: !notification.lida ? colors.blue : theme.line,
                  opacity: pending ? 0.68 : 1,
                },
              ]}
              onPress={() => void onMarkAsRead(notification.id)}
            >
              <View style={styles.itemTop}>
                <Text style={[styles.itemTitle, { color: theme.text }]}>{notification.titulo}</Text>
                {!notification.lida ? (
                  <View accessibilityLabel={t('Nao lida')} style={styles.dot} />
                ) : null}
              </View>
              <Text style={[styles.itemText, { color: theme.textMuted }]}>
                {notification.mensagem}
              </Text>
              <Text style={[styles.itemDate, { color: theme.textMuted }]}>
                {formatRelativeTime(notification.created_at, locale, t('Data indisponivel'))}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            { backgroundColor: theme.surface, opacity, transform: [{ translateY }] },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <Bell size={18} color={theme.text} />
              <Text style={[styles.title, { color: theme.text }]}>{t('Notificacoes')}</Text>
            </View>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={t('Fechar notificacoes')}
              style={[styles.closeButton, { backgroundColor: theme.surfaceSoft }]}
              onPress={onClose}
            >
              <X size={18} color={theme.text} />
            </AnimatedPressable>
          </View>

          <AppButton
            label="Marcar todas como lidas"
            variant="secondary"
            accent={colors.navy}
            icon={<CheckCheck size={16} color={theme.isDark ? theme.text : colors.navy} />}
            onPress={() => void onMarkAllAsRead()}
            loading={markingAll}
            disabled={markingAll || notifications.every((notification) => notification.lida)}
          />

          <ScrollView contentContainerStyle={styles.list}>
            {error ? <FeedbackMessage variant="danger" message={error} /> : null}
            {loading && notifications.length === 0 ? <LoadingState label="Carregando notificacoes..." /> : null}
            {!loading && notifications.length === 0 ? (
              <FeedbackMessage variant="neutral" message="Nenhuma notificacao encontrada." />
            ) : null}
            {renderGroup('Hoje', groups.today)}
            {renderGroup('Anteriores', groups.previous)}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  sheet: {
    maxHeight: '84%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.white,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: colors.navy, fontSize: 18, fontWeight: '900' },
  closeButton: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: radius.md,
    backgroundColor: colors.panelSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { gap: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  group: { gap: spacing.sm },
  groupTitle: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  item: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemTitle: { flex: 1, color: colors.navy, fontSize: 13, fontWeight: '900' },
  itemText: { color: colors.grayText, fontSize: 12, lineHeight: 17, marginTop: 5 },
  itemDate: { color: colors.grayText, fontSize: 10, fontWeight: '700', marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red },
});
