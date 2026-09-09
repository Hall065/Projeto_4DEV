import { useChatbotPageContext } from '@/hooks/useChatbotPageContext';
import type { PageAnalysis } from '@/lib/chatbotContext';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { Reveal } from '@/components/common/MotionPrimitives';
import { AppButton } from '@/components/common/VisualPrimitives';
import { EmptyState } from '@/components/common/EmptyState';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { useThemeColors } from '@/hooks/useThemeColors';

interface ModuleScreenProps {
  analysis?: PageAnalysis;
  title: string;
  description: string;
  kicker?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  tone?: 'light' | 'dark';
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyTitle?: string;
  children?: ReactNode;
}

export function ModuleScreen({
  analysis,
  title,
  description,
  kicker,
  actionLabel,
  onActionPress,
  tone = 'light',
  isLoading,
  isEmpty,
  emptyTitle = 'Nenhum registro encontrado',
  children,
}: ModuleScreenProps) {
  useChatbotPageContext(title, analysis, Boolean(isLoading));
  const theme = useThemeColors();
  const { t } = useI18n();
  const dark = tone === 'dark' || theme.isDark;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: dark ? theme.appBackground : colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Reveal>
        <View style={styles.heading}>
          <View style={styles.headingText}>
            {kicker ? <Text style={[styles.kicker, dark && styles.kickerDark]}>{t(kicker)}</Text> : null}
            <Text style={[styles.title, { color: dark ? theme.text : colors.navy }]}>{t(title)}</Text>
            <Text style={[styles.description, { color: dark ? theme.textMuted : colors.grayText }]}>{t(description)}</Text>
          </View>
          {actionLabel ? (
            <AppButton
              label={actionLabel}
              onPress={onActionPress}
              disabled={!onActionPress}
              accent={dark ? colors.green : colors.red}
              tone={tone}
              style={styles.actionButton}
              textStyle={styles.actionButtonText}
            />
          ) : null}
        </View>
      </Reveal>

      {isLoading ? (
        <View style={styles.loadingStack}>
          <SkeletonCard rows={3} />
          <SkeletonCard rows={2} />
          <SkeletonCard rows={4} />
        </View>
      ) : isEmpty ? (
        <EmptyState title={emptyTitle} description="Os dados aparecerão após conectar o Supabase." />
      ) : (
        <Reveal delay={80} style={styles.body}>{children}</Reveal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  containerDark: { backgroundColor: colors.navyDark },
  content: { padding: 16, paddingBottom: 28 },
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
    paddingTop: 2,
  },
  headingText: { flex: 1, minWidth: 0 },
  kicker: {
    color: colors.red,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  kickerDark: { color: colors.green },
  title: { color: colors.navy, fontSize: 24, fontWeight: '900' },
  titleDark: { color: colors.white },
  description: { color: colors.grayText, fontSize: 12, marginTop: 4 },
  descriptionDark: { color: colors.mutedText },
  actionButton: {
    minHeight: 40,
    paddingHorizontal: 12,
  },
  actionButtonText: { fontSize: 11 },
  body: { flex: 1 },
  loadingStack: { gap: 12 },
});
