import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  BarChart3,
  Check,
  Eye,
  FileDown,
  SlidersHorizontal,
} from 'lucide-react-native';
import {
  ChartCard,
  DonutStatusChart,
  InteractiveBarChart,
  TrendLineChart,
  type ChartDatum,
} from '@/components/charts';
import { ExportModal } from '@/components/common/ExportModal';
import { MetricGrid } from '@/components/common/MetricGrid';
import {
  AnimatedPressable,
  AppButton,
  FeedbackMessage,
  MetricTile,
  SurfaceCard,
} from '@/components/common/VisualPrimitives';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/designTokens';
import { useI18n } from '@/hooks/useI18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { exportService, type ExportRow } from '@/services/export.service';
import { formatAppDateTime, formatAppNumber } from '@/utils/locale';

export type ReportSectionKind = 'summary' | 'metrics' | 'donut' | 'bar' | 'trend' | 'table';

export interface ReportColumn {
  key: string;
  label: string;
}

export interface MobileReportSection {
  id: string;
  label: string;
  description: string;
  kind: ReportSectionKind;
  paragraphs?: string[];
  items?: ChartDatum[];
  rows?: ExportRow[];
  columns?: ReportColumn[];
}

export interface MobileReportPreset {
  id: string;
  label: string;
  description: string;
  sections: string[];
}

interface MobileReportBuilderProps {
  moduleKey: 'connect' | 'grid';
  defaultTitle: string;
  defaultSubtitle: string;
  accent: string;
  presets: MobileReportPreset[];
  sections: MobileReportSection[];
  filterControls: ReactNode;
  filterSummary: string[];
  revisionKey: string;
}

interface ChoiceOption {
  label: string;
  value: string;
}

interface ChoiceChipsProps {
  label: string;
  value: string;
  options: ChoiceOption[];
  onChange: (value: string) => void;
  accent?: string;
}

export function ReportTabs({
  value,
  onChange,
  accent = colors.red,
}: {
  value: 'summary' | 'builder';
  onChange: (value: 'summary' | 'builder') => void;
  accent?: string;
}) {
  const theme = useThemeColors();
  const { t } = useI18n();

  return (
    <View style={[styles.tabs, { backgroundColor: theme.surfaceSoft, borderColor: theme.line }]}>
      {[
        { value: 'summary' as const, label: 'Visao geral', icon: BarChart3 },
        { value: 'builder' as const, label: 'Construtor', icon: SlidersHorizontal },
      ].map((tab) => {
        const active = value === tab.value;
        const Icon = tab.icon;
        return (
          <AnimatedPressable
            key={tab.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[
              styles.tab,
              active && { backgroundColor: theme.surface, borderColor: accent },
            ]}
            onPress={() => onChange(tab.value)}
          >
            <Icon size={16} color={active ? accent : theme.textMuted} />
            <Text style={[styles.tabText, { color: active ? theme.text : theme.textMuted }]}>
              {t(tab.label)}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

export function ChoiceChips({
  label,
  value,
  options,
  onChange,
  accent = colors.red,
}: ChoiceChipsProps) {
  const theme = useThemeColors();
  const { t } = useI18n();

  return (
    <View style={styles.controlGroup}>
      <Text style={[styles.controlLabel, { color: theme.text }]}>{t(label)}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {options.map((option) => {
          const active = value === option.value;
          return (
            <AnimatedPressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? accent : theme.surfaceSoft,
                  borderColor: active ? accent : theme.line,
                },
              ]}
              onPress={() => onChange(option.value)}
            >
              {active ? <Check size={13} color={colors.white} /> : null}
              <Text style={[styles.chipText, { color: active ? colors.white : theme.text }]}>
                {t(option.label)}
              </Text>
            </AnimatedPressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function ReportTextField({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  const theme = useThemeColors();
  const { t } = useI18n();

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.controlLabel, { color: theme.text }]}>{t(label)}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={t(placeholder)}
        placeholderTextColor={theme.textSubtle}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.input,
            borderColor: theme.line,
          },
        ]}
      />
    </View>
  );
}

export function MobileReportBuilder({
  moduleKey,
  defaultTitle,
  defaultSubtitle,
  accent,
  presets,
  sections,
  filterControls,
  filterSummary,
  revisionKey,
}: MobileReportBuilderProps) {
  const theme = useThemeColors();
  const { language, t } = useI18n();
  const initialPreset = presets[0];
  const [title, setTitle] = useState(defaultTitle);
  const [subtitle, setSubtitle] = useState(defaultSubtitle);
  const [presetId, setPresetId] = useState(initialPreset?.id ?? '');
  const [selectedSections, setSelectedSections] = useState<string[]>(
    initialPreset?.sections ?? sections.map((section) => section.id)
  );
  const [selectedColumns, setSelectedColumns] = useState<Record<string, string[]>>(() =>
    createDefaultColumns(sections)
  );
  const [previewGenerated, setPreviewGenerated] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setSelectedColumns((current) => {
      const next = { ...current };
      sections.forEach((section) => {
        if (section.columns?.length && !next[section.id]) {
          next[section.id] = section.columns.map((column) => column.key);
        }
      });
      return next;
    });
  }, [sections]);

  useEffect(() => {
    setPreviewGenerated(false);
  }, [revisionKey]);

  const visibleSections = useMemo(
    () => sections.filter((section) => selectedSections.includes(section.id)),
    [sections, selectedSections]
  );

  const exportRows = useMemo(
    () => buildExportRows(visibleSections, selectedColumns),
    [selectedColumns, visibleSections]
  );

  const selectPreset = (preset: MobileReportPreset) => {
    setPresetId(preset.id);
    setSelectedSections(preset.sections);
    setPreviewGenerated(false);
  };

  const toggleSection = (sectionId: string) => {
    setPresetId('');
    setSelectedSections((current) =>
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId]
    );
    setPreviewGenerated(false);
  };

  const toggleColumn = (sectionId: string, columnKey: string) => {
    setPresetId('');
    setSelectedColumns((current) => {
      const selected = current[sectionId] ?? [];
      const next = selected.includes(columnKey)
        ? selected.filter((key) => key !== columnKey)
        : [...selected, columnKey];
      return { ...current, [sectionId]: next };
    });
    setPreviewGenerated(false);
  };

  const generatePreview = () => {
    if (!title.trim()) {
      Alert.alert(t('Titulo obrigatorio'), t('Informe um titulo para gerar o relatorio.'));
      return;
    }
    if (!selectedSections.length) {
      Alert.alert(t('Selecione as secoes'), t('Escolha pelo menos uma secao para o relatorio.'));
      return;
    }
    setGeneratedAt(new Date());
    setPreviewGenerated(true);
  };

  const runExport = async (format: 'pdf' | 'excel') => {
    try {
      setExporting(true);
      if (format === 'pdf') {
        await exportService.exportarPDF(exportRows, title.trim());
      } else {
        await exportService.exportarExcel(exportRows, `${moduleKey}-${title.trim()}`);
      }
      setExportOpen(false);
    } catch (error) {
      Alert.alert(
        t('Falha ao exportar'),
        error instanceof Error ? error.message : t('Nao foi possivel gerar o arquivo.')
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <View>
      <SurfaceCard title="Configurar relatorio" subtitle="Defina o recorte e o conteudo antes de exportar">
        <View style={styles.fieldRow}>
          <ReportTextField label="Titulo" value={title} onChangeText={setTitle} />
          <ReportTextField
            label="Subtitulo"
            value={subtitle}
            onChangeText={setSubtitle}
            placeholder={t("Contexto do relatorio")}
          />
        </View>

        <Text style={[styles.controlLabel, { color: theme.text }]}>{t('Modelo rapido')}</Text>
        <View style={styles.presetGrid}>
          {presets.map((preset) => {
            const active = preset.id === presetId;
            return (
              <AnimatedPressable
                key={preset.id}
                style={[
                  styles.preset,
                  {
                    backgroundColor: active ? theme.surfaceSoft : theme.surface,
                    borderColor: active ? accent : theme.line,
                  },
                ]}
                onPress={() => selectPreset(preset)}
              >
                <Text style={[styles.presetTitle, { color: active ? accent : theme.text }]}>
                  {t(preset.label)}
                </Text>
                <Text style={[styles.presetDescription, { color: theme.textMuted }]}>
                  {t(preset.description)}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>

        <View style={[styles.divider, { backgroundColor: theme.line }]} />
        {filterControls}
      </SurfaceCard>

      <SurfaceCard
        title="Secoes do relatorio"
        subtitle={`${formatAppNumber(selectedSections.length, language)} ${t(
          selectedSections.length === 1 ? 'secao selecionada' : 'secoes selecionadas'
        )}`}
      >
        {sections.map((section) => {
          const enabled = selectedSections.includes(section.id);
          const columns = selectedColumns[section.id] ?? [];
          return (
            <View key={section.id} style={[styles.sectionOption, { borderBottomColor: theme.line }]}>
              <View style={styles.sectionOptionHeader}>
                <View style={styles.sectionOptionText}>
                  <Text style={[styles.sectionOptionTitle, { color: theme.text }]}>{t(section.label)}</Text>
                  <Text style={[styles.sectionOptionDescription, { color: theme.textMuted }]}>
                    {t(section.description)}
                  </Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={() => toggleSection(section.id)}
                  trackColor={{ false: theme.line, true: accent }}
                  thumbColor={colors.white}
                />
              </View>

              {enabled && section.kind === 'table' && section.columns?.length ? (
                <View style={styles.columnWrap}>
                  {section.columns.map((column) => {
                    const active = columns.includes(column.key);
                    return (
                      <AnimatedPressable
                        key={column.key}
                        style={[
                          styles.columnChip,
                          {
                            backgroundColor: active ? theme.surfaceSoft : 'transparent',
                            borderColor: active ? accent : theme.line,
                          },
                        ]}
                        onPress={() => toggleColumn(section.id, column.key)}
                      >
                        <Text style={[styles.columnChipText, { color: active ? accent : theme.textMuted }]}>
                          {t(column.label)}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}

        <View style={styles.builderActions}>
          <AppButton
            label="Gerar previa"
            accent={accent}
            icon={<Eye size={17} color={colors.white} />}
            onPress={generatePreview}
            wrapperStyle={styles.flexAction}
          />
          <AppButton
            label="Exportar"
            variant="secondary"
            accent={accent}
            icon={<FileDown size={17} color={accent} />}
            disabled={!previewGenerated}
            onPress={() => setExportOpen(true)}
            wrapperStyle={styles.flexAction}
          />
        </View>
      </SurfaceCard>

      {previewGenerated ? (
        <View>
          <FeedbackMessage
            variant="success"
            message={`${t('Previa atualizada com')} ${formatAppNumber(exportRows.length, language)} ${t(
              exportRows.length === 1 ? 'linha exportavel.' : 'linhas exportaveis.'
            )}`}
          />
          <View style={[styles.reportCover, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Text style={[styles.reportKicker, { color: accent }]}>
              {moduleKey === 'connect' ? t("SENAI CONNECT") : t("SENAI GRID")}
            </Text>
            <Text style={[styles.reportTitle, { color: theme.text }]}>{title}</Text>
            {subtitle ? <Text style={[styles.reportSubtitle, { color: theme.textMuted }]}>{subtitle}</Text> : null}
            <Text style={[styles.reportMeta, { color: theme.textSubtle }]}>
              {filterSummary.join(' | ')}
            </Text>
            <Text style={[styles.reportMeta, { color: theme.textSubtle }]}>
              {t('Gerado em')}{' '}
              {generatedAt ? formatAppDateTime(generatedAt, language, t('Nao informado')) : ''}
            </Text>
          </View>

          {visibleSections.map((section) => (
            <ReportSectionPreview
              key={section.id}
              section={section}
              selectedColumns={selectedColumns[section.id] ?? []}
              accent={accent}
            />
          ))}
        </View>
      ) : (
        <View style={[styles.previewHint, { borderColor: theme.line, backgroundColor: theme.surfaceSoft }]}>
          <Eye size={18} color={theme.textMuted} />
          <Text style={[styles.previewHintText, { color: theme.textMuted }]}>
            {t('Gere a previa para conferir os dados antes de exportar.')}
          </Text>
        </View>
      )}

      <ExportModal
        visible={exportOpen}
        title="Exportar relatorio"
        loading={exporting}
        onClose={() => setExportOpen(false)}
        onPDF={() => runExport('pdf')}
        onExcel={() => runExport('excel')}
      />
    </View>
  );
}

function ReportSectionPreview({
  section,
  selectedColumns,
  accent,
}: {
  section: MobileReportSection;
  selectedColumns: string[];
  accent: string;
}) {
  const theme = useThemeColors();
  const { language, t } = useI18n();

  if (section.kind === 'summary') {
    return (
      <SurfaceCard title={section.label} subtitle={section.description}>
        <View style={styles.summaryTextWrap}>
          {(section.paragraphs ?? []).map((paragraph, index) => (
            <Text key={`${section.id}-${index}`} style={[styles.summaryParagraph, { color: theme.textMuted }]}>
              {paragraph}
            </Text>
          ))}
        </View>
      </SurfaceCard>
    );
  }

  if (section.kind === 'metrics') {
    return (
      <View>
        <Text style={[styles.previewSectionTitle, { color: theme.text }]}>{t(section.label)}</Text>
        <MetricGrid>
          {(section.items ?? []).map((item) => (
            <MetricTile
              key={item.label}
              label={item.label}
              value={item.value}
              hint={item.meta}
              accent={item.color ?? accent}
              icon={<BarChart3 size={16} color={item.color ?? accent} />}
            />
          ))}
        </MetricGrid>
      </View>
    );
  }

  if (section.kind === 'donut') {
    return (
      <ChartCard
        title={section.label}
        subtitle={section.description}
        empty={!section.items?.some((item) => item.value > 0)}
      >
        <DonutStatusChart data={section.items ?? []} />
      </ChartCard>
    );
  }

  if (section.kind === 'bar') {
    return (
      <ChartCard
        title={section.label}
        subtitle={section.description}
        empty={!section.items?.some((item) => item.value > 0)}
      >
        <InteractiveBarChart data={section.items ?? []} />
      </ChartCard>
    );
  }

  if (section.kind === 'trend') {
    return (
      <ChartCard
        title={section.label}
        subtitle={section.description}
        empty={!section.items?.some((item) => item.value > 0)}
      >
        <TrendLineChart data={section.items ?? []} color={accent} />
      </ChartCard>
    );
  }

  const columns = (section.columns ?? []).filter((column) => selectedColumns.includes(column.key));
  const rows = section.rows ?? [];

  return (
    <SurfaceCard
      title={section.label}
      subtitle={`${formatAppNumber(rows.length, language)} ${t(
        rows.length === 1 ? 'registro no recorte' : 'registros no recorte'
      )} | ${t('exibindo ate 6 na previa')}`}
    >
      {rows.length && columns.length ? (
        rows.slice(0, 6).map((row, index) => (
          <View
            key={`${section.id}-${index}`}
            style={[styles.previewRow, { borderColor: theme.line, backgroundColor: theme.surfaceSoft }]}
          >
            {columns.map((column) => (
              <View key={column.key} style={styles.previewCell}>
                <Text style={[styles.previewCellLabel, { color: theme.textSubtle }]}>
                  {t(column.label)}
                </Text>
                <Text numberOfLines={2} style={[styles.previewCellValue, { color: theme.text }]}>
                  {formatReportValue(row[column.key], t)}
                </Text>
              </View>
            ))}
          </View>
        ))
      ) : (
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>
          {t('Nenhum registro encontrado para os filtros atuais.')}
        </Text>
      )}
    </SurfaceCard>
  );
}

function createDefaultColumns(sections: MobileReportSection[]) {
  return sections.reduce<Record<string, string[]>>((accumulator, section) => {
    if (section.columns?.length) {
      accumulator[section.id] = section.columns.map((column) => column.key);
    }
    return accumulator;
  }, {});
}

function buildExportRows(
  sections: MobileReportSection[],
  selectedColumns: Record<string, string[]>
): ExportRow[] {
  return sections.flatMap((section) => {
    if (section.kind === 'summary') {
      return (section.paragraphs ?? []).map((paragraph) => ({
        secao: section.label,
        indicador: 'Resumo',
        valor: paragraph,
      }));
    }

    if (section.kind === 'metrics' || section.kind === 'donut' || section.kind === 'bar' || section.kind === 'trend') {
      return (section.items ?? []).map((item) => ({
        secao: section.label,
        indicador: item.label,
        valor: item.value,
        detalhe: item.meta ?? '',
      }));
    }

    const keys = selectedColumns[section.id] ?? [];
    const columns = (section.columns ?? []).filter((column) => keys.includes(column.key));
    return (section.rows ?? []).map((row) => {
      const projected: ExportRow = { secao: section.label };
      columns.forEach((column) => {
        projected[column.label] = row[column.key];
      });
      return projected;
    });
  });
}

function formatReportValue(
  value: ExportRow[string],
  t: (value: string | undefined | null) => string
) {
  if (value == null || value === '') return '-';
  if (typeof value === 'boolean') return t(value ? 'Sim' : 'Nao');
  return String(value);
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '900',
  },
  controlGroup: {
    marginBottom: spacing.md,
  },
  controlLabel: {
    fontSize: 11,
    fontWeight: '900',
    marginBottom: spacing.sm,
  },
  chips: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  chip: {
    minHeight: 38,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '900',
  },
  fieldRow: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  fieldWrap: {
    flex: 1,
    minWidth: 0,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 12,
    fontWeight: '700',
  },
  presetGrid: {
    gap: spacing.sm,
  },
  preset: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  presetTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  presetDescription: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  sectionOption: {
    borderBottomWidth: 1,
    paddingVertical: spacing.md,
  },
  sectionOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sectionOptionText: {
    flex: 1,
    minWidth: 0,
  },
  sectionOptionTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  sectionOptionDescription: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
  },
  columnWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  columnChip: {
    minHeight: 32,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
  },
  columnChipText: {
    fontSize: 10,
    fontWeight: '800',
  },
  builderActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  flexAction: {
    flex: 1,
    minWidth: 130,
  },
  reportCover: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  reportKicker: {
    fontSize: 10,
    fontWeight: '900',
  },
  reportTitle: {
    marginTop: spacing.sm,
    fontSize: 21,
    fontWeight: '900',
  },
  reportSubtitle: {
    marginTop: 4,
    fontSize: 12,
  },
  reportMeta: {
    marginTop: spacing.sm,
    fontSize: 10,
    fontWeight: '700',
  },
  previewSectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: spacing.sm,
  },
  summaryTextWrap: {
    gap: spacing.sm,
  },
  summaryParagraph: {
    fontSize: 12,
    lineHeight: 18,
  },
  previewRow: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  previewCell: {
    minWidth: 110,
    flex: 1,
  },
  previewCellLabel: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  previewCellValue: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '800',
  },
  previewHint: {
    minHeight: 74,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewHintText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
