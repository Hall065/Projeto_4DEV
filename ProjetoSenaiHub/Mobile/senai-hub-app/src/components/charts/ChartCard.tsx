import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '@/components/common/EmptyState';
import { FeedbackMessage, LoadingState, SurfaceCard } from '@/components/common/VisualPrimitives';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/designTokens';
import { useThemeColors } from '@/hooks/useThemeColors';

interface ChartCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  empty?: boolean;
  emptyTitle?: string;
  loading?: boolean;
  error?: string | null;
  summary?: string;
  tone?: 'light' | 'dark';
}

export function ChartCard({
  title,
  subtitle,
  children,
  empty,
  emptyTitle = 'Nenhum dado para exibir',
  loading = false,
  error,
  summary,
  tone = 'light',
}: ChartCardProps) {
  const theme = useThemeColors();
  const dark = tone === 'dark' || theme.isDark;

  return (
    <SurfaceCard title={title} subtitle={subtitle} tone={tone}>
      {summary ? (
        <View style={[styles.summary, { backgroundColor: dark ? theme.surfaceSoft : colors.panelSoft, borderColor: theme.line }]}>
          <Text style={[styles.summaryText, { color: dark ? theme.textMuted : colors.grayText }]}>{summary}</Text>
        </View>
      ) : null}
      {loading ? (
        <LoadingState label="Carregando dados do gráfico..." tone={tone} />
      ) : error ? (
        <FeedbackMessage message={error} variant="danger" tone={tone} />
      ) : empty ? (
        <EmptyState title={emptyTitle} description="Ajuste os filtros ou cadastre novos registros." />
      ) : (
        children
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  summary: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
