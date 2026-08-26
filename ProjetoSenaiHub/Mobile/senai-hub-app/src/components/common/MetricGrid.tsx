import { Children, type ReactNode } from 'react';
import type { DimensionValue } from 'react-native';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Reveal } from '@/components/common/MotionPrimitives';
import { motion, spacing } from '@/constants/designTokens';

interface MetricGridProps {
  children: ReactNode;
}

function getColumnWidth(width: number): DimensionValue {
  if (width >= 900) return '23.5%';
  if (width >= 640) return '31.7%';
  if (width < 340) return '100%';
  return '48%';
}

export function MetricGrid({ children }: MetricGridProps) {
  const { width } = useWindowDimensions();
  const itemWidth = getColumnWidth(width);

  return (
    <View style={styles.grid}>
      {Children.map(children, (child, index) => (
        <Reveal
          key={index}
          enabled={index < 6}
          delay={index * motion.stagger}
          style={[styles.item, { width: itemWidth }]}
        >
          {child}
        </Reveal>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md - 2,
    marginBottom: spacing.md,
  },
  item: {
    minWidth: 0,
  },
});
