import { useMemo, useState } from 'react';
import type { DimensionValue } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { chartPalette, radius, spacing } from '@/constants/designTokens';
import { useMotionPreference } from '@/hooks/useMotionPreference';
import { useThemeColors } from '@/hooks/useThemeColors';
import { notifySelection } from '@/utils/feedback';
import { ApexChart } from './ApexChart';
import { toApexHorizontalBar } from './apex/adapters';
import type { ChartDatum } from './types';
import { useI18n } from '@/hooks/useI18n';

interface InteractiveBarChartProps {
  data: ChartDatum[];
  formatValue?: (value: number) => string;
  tone?: 'light' | 'dark';
}

export function InteractiveBarChart({
  data,
  formatValue = (value) => String(value),
  tone = 'light',
}: InteractiveBarChartProps) {
  const { t } = useI18n();
  const theme = useThemeColors();
  const { reduceMotion, shouldAnimate } = useMotionPreference();
  const dark = tone === 'dark' || theme.isDark;
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const normalizedData = useMemo(
    () =>
      data.map((item, index) => ({
        ...item,
        value: Number.isFinite(item.value) ? Math.max(0, item.value) : 0,
        color: item.color ?? chartPalette[index % chartPalette.length],
      })),
    [data]
  );
  const maxValue = useMemo(() => Math.max(1, ...normalizedData.map((item) => item.value)), [normalizedData]);
  const total = useMemo(() => normalizedData.reduce((sum, item) => sum + item.value, 0), [normalizedData]);
  const selected = normalizedData.find((item) => item.label === selectedLabel) ?? normalizedData[0];
  const model = useMemo(
    () =>
      toApexHorizontalBar(normalizedData, {
        title: 'Distribuicao',
        shouldAnimate,
        theme: {
          dark,
          text: theme.text,
          textMuted: theme.textMuted,
          line: theme.line,
          surface: theme.surface,
          surfaceSoft: theme.surfaceSoft,
        },
      }),
    [dark, normalizedData, shouldAnimate, theme.line, theme.surface, theme.surfaceSoft, theme.text, theme.textMuted]
  );

  const selectLabel = (label: string | undefined) => {
    if (!label) return;
    setSelectedLabel(label);
    void notifySelection();
  };

  if (!normalizedData.length) {
    return <Text style={[styles.empty, { color: theme.textMuted }]}>{t("Nenhum dado para exibir.")}</Text>;
  }

  return (
    <View style={styles.wrap}>
      <ApexChart
        model={model}
        height={Math.max(220, normalizedData.length * 44 + 72)}
        reduceMotion={reduceMotion}
        onSelect={(index) => selectLabel(normalizedData[index]?.label)}
      />
      <View style={styles.rows}>
        {normalizedData.map((item) => {
          const isSelected = selected?.label === item.label;
          const width = (String(item.value === 0 ? 0 : Math.round((item.value / maxValue) * 100)) + '%') as DimensionValue;
          const percent = total ? Math.round((item.value / total) * 100) : 0;

          return (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.label + ': ' + formatValue(item.value) + ', ' + percent + '%'}
              onPress={() => selectLabel(item.label)}
              style={({ pressed }) => [
                styles.row,
                {
                  borderColor: isSelected ? item.color : theme.line,
                  backgroundColor: dark ? theme.surfaceSoft : colors.white,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <View style={styles.rowHeader}>
                <Text numberOfLines={1} style={[styles.label, { color: theme.text }]}>
                  {item.label}
                </Text>
                <Text style={[styles.value, { color: item.color }]}>{formatValue(item.value)}</Text>
              </View>
              <View style={[styles.track, { backgroundColor: dark ? theme.surface : colors.panelSoft }]}>
                <View style={[styles.fill, { width, backgroundColor: item.color }]} />
              </View>
              {isSelected ? (
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  {item.meta ?? `${percent}${t('% do total analisado')}`}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  rows: { gap: spacing.sm },
  row: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, minHeight: 74 },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  label: { flex: 1, fontSize: 12, fontWeight: '900' },
  value: { fontSize: 12, fontWeight: '900' },
  track: { height: 9, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  meta: { marginTop: spacing.sm, fontSize: 11, fontWeight: '700' },
  empty: { fontSize: 12, fontWeight: '700' },
});
