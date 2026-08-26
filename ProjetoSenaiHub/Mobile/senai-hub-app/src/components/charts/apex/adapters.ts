import type { ApexAxisChartSeries, ApexOptions } from 'apexcharts';
import { chartPalette } from '@/constants/designTokens';
import type { ChartDatum, TimeSeriesDatum } from '../types';
import type { ApexChartModel } from './types';

export interface ApexThemeInput {
  dark: boolean;
  text: string;
  textMuted: string;
  line: string;
  surface: string;
  surfaceSoft: string;
}

interface AdapterOptions {
  theme: ApexThemeInput;
  shouldAnimate: boolean;
  color?: string;
  title: string;
}

function normalizeValue(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normalizeData(data: ChartDatum[]) {
  return data.map((item, index) => ({
    ...item,
    value: normalizeValue(item.value),
    color: item.color ?? chartPalette[index % chartPalette.length],
  }));
}

function baseOptions(
  type: ApexChartModel['type'],
  { theme, shouldAnimate }: AdapterOptions
): ApexOptions {
  return {
    chart: {
      type,
      background: 'transparent',
      foreColor: theme.textMuted,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: {
        enabled: shouldAnimate,
        speed: 320,
        animateGradually: { enabled: shouldAnimate, delay: 60 },
      },
    },
    theme: { mode: theme.dark ? 'dark' : 'light' },
    dataLabels: { enabled: false },
    grid: {
      borderColor: theme.line,
      strokeDashArray: 4,
      padding: { left: 4, right: 8 },
    },
    tooltip: { theme: theme.dark ? 'dark' : 'light' },
    legend: { show: false },
  };
}

export function toApexDonut(
  data: ChartDatum[],
  config: AdapterOptions
): ApexChartModel {
  const items = normalizeData(data).filter((item) => item.value > 0);
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return {
    id: 'donut-' + items.map((item) => item.label + ':' + item.value).join('|'),
    type: 'donut',
    series: items.map((item) => item.value),
    accessibilityLabel: config.title + '. Total ' + total + '. ' + items.map((item) => item.label + ': ' + item.value).join(', '),
    options: {
      ...baseOptions('donut', config),
      labels: items.map((item) => item.label),
      colors: items.map((item) => item.color),
      stroke: { width: 3, colors: [config.theme.surface] },
      plotOptions: {
        pie: {
          expandOnClick: false,
          donut: {
            size: '70%',
            labels: {
              show: true,
              name: { show: true, color: config.theme.textMuted, offsetY: 18 },
              value: { show: true, color: config.theme.text, fontSize: '24px', fontWeight: 700, offsetY: -12 },
              total: {
                show: true,
                label: 'Total',
                color: config.theme.textMuted,
                formatter: () => String(total),
              },
            },
          },
        },
      },
    },
  };
}

export function toApexHorizontalBar(
  data: ChartDatum[],
  config: AdapterOptions
): ApexChartModel {
  const items = normalizeData(data);
  const series: ApexAxisChartSeries = [{ name: config.title, data: items.map((item) => item.value) }];

  return {
    id: 'bar-' + items.map((item) => item.label + ':' + item.value).join('|'),
    type: 'bar',
    series,
    accessibilityLabel: config.title + '. ' + items.map((item) => item.label + ': ' + item.value).join(', '),
    options: {
      ...baseOptions('bar', config),
      colors: items.map((item) => item.color),
      plotOptions: {
        bar: {
          horizontal: true,
          distributed: true,
          borderRadius: 6,
          barHeight: '58%',
        },
      },
      xaxis: {
        categories: items.map((item) => item.label),
        min: 0,
        labels: { style: { colors: config.theme.textMuted, fontSize: '11px' } },
      },
      yaxis: {
        labels: {
          style: { colors: config.theme.text, fontSize: '12px', fontWeight: 600 },
          maxWidth: 142,
        },
      },
    },
  };
}

export function toApexArea(
  data: TimeSeriesDatum[],
  config: AdapterOptions
): ApexChartModel {
  const items = data.map((item) => ({ ...item, value: normalizeValue(item.value) }));
  const color = config.color ?? chartPalette[0];

  return {
    id: 'area-' + items.map((item) => item.label + ':' + item.value).join('|'),
    type: 'area',
    series: [{ name: config.title, data: items.map((item) => item.value) }],
    accessibilityLabel: config.title + '. ' + items.map((item) => item.label + ': ' + item.value).join(', '),
    options: {
      ...baseOptions('area', config),
      colors: [color],
      stroke: { curve: 'smooth', width: 3 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 0.35,
          opacityFrom: 0.32,
          opacityTo: 0.03,
          stops: [0, 92, 100],
        },
      },
      markers: { size: 4, strokeColors: config.theme.surface, strokeWidth: 2 },
      xaxis: {
        categories: items.map((item) => item.label),
        labels: {
          trim: true,
          rotate: 0,
          style: { colors: config.theme.textMuted, fontSize: '10px' },
        },
        axisBorder: { color: config.theme.line },
        axisTicks: { color: config.theme.line },
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: {
          formatter: (value) => String(Math.round(value)),
          style: { colors: config.theme.textMuted, fontSize: '10px' },
        },
      },
    },
  };
}
