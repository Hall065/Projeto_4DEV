import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { ApexOptions } from 'apexcharts';
import type { ApexChartProps, ApexChartSeries } from './apex/types';

type ReactApexChartComponent = ComponentType<{
  type: string;
  options: ApexOptions;
  series: ApexChartSeries;
  width?: string | number;
  height?: string | number;
}>;

export function ApexChart({ model, height = 238, reduceMotion = false, onSelect }: ApexChartProps) {
  const [Chart, setChart] = useState<ReactApexChartComponent | null>(null);

  useEffect(() => {
    let active = true;
    void import('react-apexcharts').then((module) => {
      if (active) setChart(() => module.default as ReactApexChartComponent);
    });
    return () => {
      active = false;
    };
  }, []);

  const options = useMemo<ApexOptions>(
    () => ({
      ...model.options,
      chart: {
        ...model.options.chart,
        type: model.type,
        animations: {
          ...model.options.chart?.animations,
          enabled: !reduceMotion,
        },
        events: {
          ...model.options.chart?.events,
          dataPointSelection: (_event, _context, config) => {
            if (typeof config?.dataPointIndex === 'number') onSelect?.(config.dataPointIndex);
          },
        },
      },
    }),
    [model, onSelect, reduceMotion]
  );

  return (
    <View accessible accessibilityLabel={model.accessibilityLabel} style={[styles.wrap, { height }]}>
      {Chart ? (
        <Chart key={model.id} type={model.type} options={options} series={model.series} width="100%" height={height} />
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', justifyContent: 'center', overflow: 'hidden' },
});
