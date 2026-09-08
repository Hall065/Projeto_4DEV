import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { chartPalette, radius, spacing } from '@/constants/designTokens';
import { useMotionPreference } from '@/hooks/useMotionPreference';
import { useThemeColors } from '@/hooks/useThemeColors';
import { notifySelection } from '@/utils/feedback';
import { ApexChart } from './ApexChart';
import { toApexDonut } from './apex/adapters';
import { ChartLegend } from './ChartLegend';
import type { ChartDatum } from './types';
import { useI18n } from '@/hooks/useI18n';

interface DonutStatusChartProps {
  data: ChartDatum[];
  size?: number;
  formatValue?: (value: number) => string;
  tone?: 'light' | 'dark';
}

export function DonutStatusChart({
  data,
  size = 176,
  formatValue = (value) => String(value),
  tone = 'light',
}: DonutStatusChartProps) {
  const { t } = useI18n();
  const theme = useThemeColors();
  const { reduceMotion, shouldAnimate } = useMotionPreference();
  const dark = tone === 'dark' || theme.isDark;
  const visibleData = useMemo(
    () =>
      data
        .map((item, index) => ({
          ...item,
          value: Number.isFinite(item.value) ? Math.max(0, item.value) : 0,
          color: item.color ?? chartPalette[index % chartPalette.length],
        }))
        .filter((item) => item.value > 0),
    [data]
  );
  const total = useMemo(() => visibleData.reduce((sum, item) => sum + item.value, 0), [visibleData]);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const selected = visibleData.find((item) => item.label === selectedLabel) ?? visibleData[0];
  const model = useMemo(
    () =>
      toApexDonut(visibleData, {
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
    [dark, shouldAnimate, theme.line, theme.surface, theme.surfaceSoft, theme.text, theme.textMuted, visibleData]
  );

  const selectLabel = (label: string | undefined) => {
    if (!label) return;
    setSelectedLabel(label);
    void notifySelection();
  };

  if (!visibleData.length) {
    return <Text style={[styles.empty, { color: theme.textMuted }]}>{t("Nenhum dado para exibir.")}</Text>;
  }

  return (
    <View style={styles.wrap}>
      <ApexChart
        model={model}
        height={Math.max(220, size + 44)}
        reduceMotion={reduceMotion}
        onSelect={(index) => selectLabel(visibleData[index]?.label)}
      />
      <View style={[styles.currentValue, { backgroundColor: dark ? theme.surfaceSoft : colors.panelSoft, borderColor: theme.line }]}>
        <Text style={[styles.centerValue, { color: theme.text }]}>{formatValue(selected?.value ?? total)}</Text>
        <Text numberOfLines={1} style={[styles.centerLabel, { color: theme.textMuted }]}>
          {selected?.label ?? t("Total")}
        </Text>
      </View>

      <View style={styles.selectedBox}>
        {visibleData.map((item) => {
          const active = selected?.label === item.label;
          const percent = total ? Math.round((item.value / total) * 100) : 0;

          return (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.label + ': ' + formatValue(item.value) + ', ' + percent + '%'}
              onPress={() => selectLabel(item.label)}
              style={[
                styles.statusRow,
                {
                  borderColor: active ? item.color : theme.line,
                  backgroundColor: active ? (dark ? theme.surfaceSoft : colors.panelSoft) : 'transparent',
                },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text numberOfLines={1} style={[styles.statusLabel, { color: theme.text }]}>
                {item.label}
              </Text>
              <Text style={[styles.statusValue, { color: item.color }]}>{percent}%</Text>
            </Pressable>
          );
        })}
      </View>
      <ChartLegend data={visibleData} formatValue={formatValue} showValue />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  currentValue: {
    minWidth: 132,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  centerValue: { fontSize: 23, fontWeight: '900' },
  centerLabel: { marginTop: 3, fontSize: 10, fontWeight: '800', textAlign: 'center' },
  selectedBox: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.lg },
  statusRow: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  dot: { width: 9, height: 9, borderRadius: radius.pill },
  statusLabel: { flex: 1, fontSize: 12, fontWeight: '900' },
  statusValue: { fontSize: 12, fontWeight: '900' },
  empty: { fontSize: 12, fontWeight: '700' },
});
