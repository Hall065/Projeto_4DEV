import type { ApexAxisChartSeries, ApexOptions } from 'apexcharts';

export type ApexChartType = 'area' | 'bar' | 'donut';
export type ApexChartSeries = number[] | ApexAxisChartSeries;

export interface ApexChartModel {
  id: string;
  type: ApexChartType;
  series: ApexChartSeries;
  options: ApexOptions;
  accessibilityLabel: string;
}

export interface ApexChartProps {
  model: ApexChartModel;
  height?: number;
  reduceMotion?: boolean;
  onSelect?: (index: number) => void;
}
