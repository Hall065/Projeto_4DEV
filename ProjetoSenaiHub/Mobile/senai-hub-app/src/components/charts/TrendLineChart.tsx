import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/designTokens';
import { useMotionPreference } from '@/hooks/useMotionPreference';
import { useThemeColors } from '@/hooks/useThemeColors';
import { notifySelection } from '@/utils/feedback';
import { ApexChart } from './ApexChart';
import { toApexArea } from './apex/adapters';
import type { TimeSeriesDatum } from './types';

interface TrendLineChartProps {
  data: TimeSeriesDatum[];
  color?: string;
  formatValue?: (value: number) => string;
  tone?: 'light' | 'dark';
}

export function TrendLineChart({
  data,
  color = colors.blue,
  formatValue = (value) => String(value),
  tone = 'light',
}: TrendLineChartProps) {
  const theme = useThemeColors();
  const { reduceMotion, shouldAnimate } = useMotionPreference();
  const dark = tone === 'dark' || theme.isDark;
  const [selectedIndex, setSelectedIndex] = useState(Math.max(0, data.length - 1));
  const normalizedData = useMemo(
    () => data.map((item) => ({ ...item, value: Number.isFinite(item.value) ? item.value : 0 })),
    [data]
  );

  useEffect(() => {
    setSelectedIndex((current) => Math.max(0, Math.min(current, normalizedData.length - 1)));
  }, [normalizedData.length]);

  const model = useMemo(
    () =>
      toApexArea(normalizedData, {
        title: 'Evolucao',
        color,
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
    [color, dark, normalizedData, shouldAnimate, theme.line, theme.surface, theme.surfaceSoft, theme.text, theme.textMuted]
  );

  if (!normalizedData.length) {
    return <Text style={[styles.empty, { color: theme.textMuted }]}>Nenhum dado para exibir.</Text>;
  }

  const selected = normalizedData[selectedIndex] ?? normalizedData[normalizedData.length - 1];
  const selectIndex = (index: number) => {
    setSelectedIndex(index);
    void notifySelection();
  };

  return (
    <View style={styles.wrap}>
      <ApexChart model={model} height={230} reduceMotion={reduceMotion} onSelect={selectIndex} />
      <View style={[styles.tooltip, { backgroundColor: theme.surfaceSoft, borderColor: theme.line }]}>
        <Text style={[styles.tooltipLabel, { color: theme.textMuted }]}>{selected.label}</Text>
        <Text style={[styles.tooltipValue, { color }]}>{formatValue(selected.value)}</Text>
      </View>
      <View accessibilityRole="radiogroup" style={styles.pointControls}>
        {normalizedData.map((point, index) => (
          <Pressable
            key={point.label + '-control-' + index}
            accessibilityRole="radio"
            accessibilityState={{ selected: index === selectedIndex }}
            accessibilityLabel={point.label + ': ' + formatValue(point.value)}
            onPress={() => selectIndex(index)}
            style={[
              styles.pointControl,
              {
                borderColor: index === selectedIndex ? color : theme.line,
                backgroundColor: index === selectedIndex ? theme.surfaceSoft : 'transparent',
              },
            ]}
          >
            <Text style={[styles.pointControlText, { color: index === selectedIndex ? color : theme.textMuted }]}>
              {point.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  tooltip: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  tooltipLabel: { flex: 1, fontSize: 12, fontWeight: '800' },
  tooltipValue: { fontSize: 13, fontWeight: '900' },
  pointControls: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pointControl: {
    minHeight: 34,
    borderWidth: 1,
    borderRadius: radius.pill,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  pointControlText: { fontSize: 10, fontWeight: '800' },
  empty: { fontSize: 12, fontWeight: '700' },
});
