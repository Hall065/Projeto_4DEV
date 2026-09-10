import { useChatbotPageContext } from '@/hooks/useChatbotPageContext';
import type { PageAnalysis } from '@/lib/chatbotContext';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { AtmosphericGlow } from '@/components/common/AnimataPrimitives';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { Reveal } from '@/components/common/MotionPrimitives';
import { AppButton } from '@/components/common/VisualPrimitives';
import { EmptyState } from '@/components/common/EmptyState';
import { colors } from '@/constants/colors';
import { radius, shadow } from '@/constants/designTokens';
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

function resolveModuleAccent(title: string) {
  if (/safe|autoriza|portaria|aprova/i.test(title)) return colors.purple;
  if (/grid|chamado|tarefa|estoque|manuten/i.test(title)) return colors.orange;
  if (/connect|aluno|turma|curso|frequ|contrato|professor|empresa/i.test(title)) return colors.green;
  return colors.red;
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
  const accent = resolveModuleAccent(`${kicker ?? ''} ${title}`);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: dark ? theme.appBackground : colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Reveal>
        <View style={styles.hero}>
          <AtmosphericGlow accent={accent} />
          <View style={styles.heroContent}>
            <View style={styles.kickerPill}>
              <Sparkles size={12} color={accent} />
              <Text style={[styles.kicker, { color: accent }]}>{t(kicker ?? 'SENAI HUB')}</Text>
            </View>
            <Text style={styles.title}>{t(title)}</Text>
            <Text style={styles.description}>{t(description)}</Text>
            {actionLabel ? (
              <AppButton
                label={actionLabel}
                onPress={onActionPress}
                disabled={!onActionPress}
                accent={accent}
                tone="dark"
                style={styles.actionButton}
                textStyle={styles.actionButtonText}
              />
            ) : null}
          </View>
        </View>
      </Reveal>

      {isLoading ? (
        <View style={styles.loadingStack}>
          <SkeletonCard rows={3} />
          <SkeletonCard rows={2} />
          <SkeletonCard rows={4} />
        </View>
      ) : isEmpty ? (
        <View style={[styles.emptySurface, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <EmptyState title={emptyTitle} description="Os dados aparecerão após conectar o Supabase." />
        </View>
      ) : (
        <Reveal delay={80} style={styles.body}>{children}</Reveal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  hero: {
    minHeight: 210,
    marginBottom: 20,
    overflow: 'hidden',
    borderRadius: radius.hero,
    backgroundColor: colors.navy,
    ...shadow.lg,
  },
  heroContent: { flex: 1, padding: 22, justifyContent: 'flex-end' },
  kickerPill: {
    alignSelf: 'flex-start',
    minHeight: 28,
    marginBottom: 16,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { color: colors.white, fontSize: 30, lineHeight: 34, fontWeight: '900', letterSpacing: -1.1 },
  description: { maxWidth: 560, color: 'rgba(255,255,255,0.68)', fontSize: 13, lineHeight: 19, marginTop: 7 },
  actionButton: { alignSelf: 'flex-start', minHeight: 44, marginTop: 18, paddingHorizontal: 16 },
  actionButtonText: { fontSize: 11 },
  body: { flex: 1 },
  loadingStack: { gap: 12 },
  emptySurface: { minHeight: 240, borderRadius: radius.card, borderWidth: 1, ...shadow.sm },
});
