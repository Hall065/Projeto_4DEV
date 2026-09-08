import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Calculator,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  MinusCircle,
  PlusCircle,
  RefreshCw,
  TrendingDown,
  Users,
  Wallet,
} from 'lucide-react-native';
import { ExportModal } from '@/components/common/ExportModal';
import { MetricGrid } from '@/components/common/MetricGrid';
import {
  AnimatedPressable,
  AppButton,
  FeedbackMessage,
  ListRow,
  MetricTile,
  Pill,
  SearchField,
  SurfaceCard,
} from '@/components/common/VisualPrimitives';
import { ModuleScreen } from '@/components/screens/ModuleScreen';
import { colors, connectTheme } from '@/constants/colors';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { canManageConnectData } from '@/lib/permissions';
import { connectService } from '@/services/connect.service';
import { listSalariosByEmpresaId } from '@/services/empresa.service';
import { exportService } from '@/services/export.service';
import { useAuthStore } from '@/stores/auth.store';
import type { Aluno, SalarioAluno, SalaryPreviewData } from '@/types/connect.types';
import {
  formatCurrency,
  formatCurrencyInput,
  normalizeDecimalInput,
} from '@/utils/formatters';
import { useI18n } from '@/hooks/useI18n';

type StatusFilter = 'all' | 'calculado' | 'pago' | 'pendente';

function parseMoney(value: string) {
  const parsed = Number(normalizeDecimalInput(value));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function addMonths(value: string, amount: number) {
  const [year, month] = value.split('-').map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return value;
  const label = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function normalizedStatus(value?: string | null) {
  const status = String(value ?? 'calculado').toLowerCase();
  if (['paid', 'pago'].includes(status)) return 'pago';
  if (['pending', 'pendente'].includes(status)) return 'pendente';
  return 'calculado';
}

export default function SalarioScreen() {
  const { t } = useI18n();
  const theme = useThemeColors();
  const { confirm } = useConfirmDialog();
  const session = useAuthStore((state) => state.session);
  const { isEmpresa, empresa, empresaId, loading: empresaLoading } = useEmpresaContext();
  const canManage = canManageConnectData(session?.perfil?.tipo);

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [records, setRecords] = useState<SalarioAluno[]>([]);
  const [students, setStudents] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(canManage);
  const [previewing, setPreviewing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [batching, setBatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [recordSearch, setRecordSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [bonuses, setBonuses] = useState('0');
  const [deductions, setDeductions] = useState('0');
  const [useAutoDeductions, setUseAutoDeductions] = useState(true);
  const [preview, setPreview] = useState<SalaryPreviewData | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data =
        isEmpresa && empresaId
          ? await listSalariosByEmpresaId(empresaId)
          : await connectService.listSalarios(month);
      setRecords(
        data
          .filter((record) => record.mes_referencia?.slice(0, 7) === month)
          .sort((a, b) =>
            (a.aluno_nome ?? '').localeCompare(b.aluno_nome ?? '', 'pt-BR', {
              sensitivity: 'base',
            })
          )
      );
    } catch (err) {
      setRecords([]);
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar os salarios.');
    } finally {
      setLoading(false);
    }
  }, [empresaId, isEmpresa, month]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    let active = true;
    if (!canManage) {
      setStudents([]);
      setLoadingStudents(false);
      return;
    }

    setLoadingStudents(true);
    connectService
      .listAlunos()
      .then((data) => {
        if (!active) return;
        setStudents(
          data
            .filter((student) => student.status === 'ativo')
            .sort((a, b) =>
              a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
            )
        );
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Nao foi possivel carregar os alunos.');
        }
      })
      .finally(() => {
        if (active) setLoadingStudents(false);
      });

    return () => {
      active = false;
    };
  }, [canManage]);

  const selectedStudentData = students.find((student) => student.id === selectedStudent);
  const visibleStudents = useMemo(() => {
    const query = studentSearch.trim().toLocaleLowerCase('pt-BR');
    if (!query) return students;
    return students.filter((student) =>
      `${student.nome} ${student.rm ?? ''} ${student.turma_nome ?? ''}`
        .toLocaleLowerCase('pt-BR')
        .includes(query)
    );
  }, [studentSearch, students]);

  const filteredRecords = useMemo(() => {
    const query = recordSearch.trim().toLocaleLowerCase('pt-BR');
    return records.filter((record) => {
      const matchesSearch =
        !query ||
        `${record.aluno_nome ?? ''} ${record.empresa_nome ?? ''}`
          .toLocaleLowerCase('pt-BR')
          .includes(query);
      const matchesStatus =
        statusFilter === 'all' || normalizedStatus(record.status) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [recordSearch, records, statusFilter]);

  const summary = useMemo(
    () =>
      filteredRecords.reduce(
        (total, record) => ({
          base: total.base + record.salario_base,
          deductions:
            total.deductions + (record.deductions ?? record.outros_descontos ?? record.desconto ?? 0),
          bonuses: total.bonuses + (record.bonuses ?? 0),
          net: total.net + (record.salario_final ?? record.salario_base),
        }),
        { base: 0, deductions: 0, bonuses: 0, net: 0 }
      ),
    [filteredRecords]
  );

  const clearPreview = () => {
    setPreview(null);
    setSuccess(null);
  };

  const changeMonth = (nextMonth: string) => {
    setMonth(nextMonth);
    clearPreview();
  };

  const salaryInput = () => ({
    alunoId: selectedStudent,
    mesReferencia: month,
    bonuses: parseMoney(bonuses),
    deductions: useAutoDeductions ? undefined : parseMoney(deductions),
  });

  const handlePreview = async () => {
    if (!selectedStudent) {
      setError('Selecione um aprendiz para simular o calculo.');
      return;
    }

    setPreviewing(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await connectService.previewSalary(salaryInput());
      setPreview(data);
      if (useAutoDeductions) {
        setDeductions(formatCurrencyInput(String(data.amounts.deductions)));
      }
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : 'Nao foi possivel simular o salario.');
    } finally {
      setPreviewing(false);
    }
  };

  const handleCalculate = async () => {
    if (!preview) return;
    const confirmed = await confirm({
      title: 'Confirmar calculo salarial',
      message: `Salvar ${formatCurrency(preview.amounts.net)} para ${preview.student.full_name} em ${formatMonthLabel(month)}?`,
      confirmLabel: 'Salvar calculo',
    });
    if (!confirmed) return;

    setCalculating(true);
    setError(null);
    try {
      const result = await connectService.calculateSalary(salaryInput());
      setPreview(result.preview);
      setSuccess(
        result.updated
          ? 'Calculo salarial atualizado com sucesso.'
          : 'Calculo salarial salvo com sucesso.'
      );
      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel salvar o calculo.');
    } finally {
      setCalculating(false);
    }
  };

  const handleBatch = async () => {
    const confirmed = await confirm({
      title: 'Calcular todos os aprendizes',
      message: `Gerar ou atualizar os calculos de ${formatMonthLabel(month)} usando faltas injustificadas e contratos ativos?`,
      confirmLabel: 'Calcular todos',
    });
    if (!confirmed) return;

    setBatching(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await connectService.calculateSalaryBatch(month);
      setSuccess(`${result.processed} calculo(s) processado(s).`);
      if (result.errors.length > 0) {
        setError(`${result.errors.length} aluno(s) nao puderam ser calculados.`);
      }
      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel calcular em lote.');
    } finally {
      setBatching(false);
    }
  };

  const recalculate = (record: SalarioAluno) => {
    setSelectedStudent(record.aluno_id);
    changeMonth(record.mes_referencia?.slice(0, 7) ?? month);
    setBonuses(formatCurrencyInput(String(record.bonuses ?? 0)));
    setDeductions(
      formatCurrencyInput(
        String(record.deductions ?? record.outros_descontos ?? record.desconto ?? 0)
      )
    );
    setUseAutoDeductions(false);
    setPreview(null);
    setSuccess('Valores carregados no simulador para recalculo.');
  };

  const screenLoading = loading || (isEmpresa && empresaLoading);

  return (
    <>
      <ModuleScreen
        kicker="SENAI Connect"
        title="Calculo salarial"
        description={
          isEmpresa
            ? `Bolsas e descontos dos aprendizes de ${empresa?.nome ?? 'sua empresa'}.`
            : 'Simule, confira e salve o fechamento mensal dos aprendizes.'
        }
        isLoading={screenLoading}
      >
        <MonthSelector
          month={month}
          onPrevious={() => changeMonth(addMonths(month, -1))}
          onNext={() => changeMonth(addMonths(month, 1))}
        />

        {error ? <FeedbackMessage variant="danger" message={error} /> : null}
        {success ? <FeedbackMessage variant="success" message={success} /> : null}

        <MetricGrid>
          <MetricTile
            label="Registros"
            value={filteredRecords.length}
            accent={colors.blue}
            icon={<Users size={16} color={colors.blue} />}
          />
          <MetricTile
            label="Folha base"
            value={formatCurrency(summary.base)}
            accent={connectTheme.accent}
            icon={<Wallet size={16} color={connectTheme.accent} />}
          />
          <MetricTile
            label="Total liquido"
            value={formatCurrency(summary.net)}
            accent={colors.green}
            icon={<CircleDollarSign size={16} color={colors.green} />}
          />
          <MetricTile
            label="Descontos"
            value={formatCurrency(summary.deductions)}
            accent={colors.orange}
            icon={<TrendingDown size={16} color={colors.orange} />}
          />
        </MetricGrid>

        {canManage ? (
          <SurfaceCard
            title="Simulador"
            subtitle="Selecione o aprendiz e confira a previa antes de salvar"
          >
            <Text style={[styles.label, { color: theme.text }]}>{t("Aprendiz")}</Text>
            <SearchField
              placeholder={t("Buscar por nome, RM ou turma...")}
              value={studentSearch}
              onChangeText={setStudentSearch}
            />
            {loadingStudents ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator color={connectTheme.accent} />
                <Text style={[styles.helperText, { color: theme.textMuted }]}>
                  {t("Carregando aprendizes...")}</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.studentOptions}
              >
                {visibleStudents.slice(0, 30).map((student) => (
                  <StudentChip
                    key={student.id}
                    student={student}
                    active={student.id === selectedStudent}
                    onPress={() => {
                      setSelectedStudent(student.id);
                      clearPreview();
                    }}
                  />
                ))}
              </ScrollView>
            )}

            {selectedStudentData ? (
              <View
                style={[
                  styles.studentInfo,
                  { backgroundColor: theme.surfaceSoft, borderColor: theme.line },
                ]}
              >
                <Text style={[styles.studentInfoName, { color: theme.text }]}>
                  {selectedStudentData.nome}
                </Text>
                <Text style={[styles.helperText, { color: theme.textMuted }]}>
                  {selectedStudentData.turma_nome ?? t("Turma nao informada")} ·{' '}
                  {selectedStudentData.curso_nome ?? t("Curso nao informado")} {' '}{t("· RM")}{' '}
                  {selectedStudentData.rm ?? t("nao informado")}
                </Text>
              </View>
            ) : null}

            <View style={styles.inputGrid}>
              <MoneyField
                label="Bonificacoes"
                value={bonuses}
                onChange={(value) => {
                  setBonuses(value);
                  clearPreview();
                }}
              />
              <MoneyField
                label="Descontos"
                value={deductions}
                disabled={useAutoDeductions}
                onChange={(value) => {
                  setDeductions(value);
                  clearPreview();
                }}
              />
            </View>

            <View
              style={[
                styles.switchRow,
                { backgroundColor: theme.surfaceSoft, borderColor: theme.line },
              ]}
            >
              <View style={styles.switchText}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>
                  {t("Desconto automatico por faltas")}</Text>
                <Text style={[styles.helperText, { color: theme.textMuted }]}>
                  {t("Usa as faltas injustificadas registradas no mes")}</Text>
              </View>
              <Switch
                value={useAutoDeductions}
                onValueChange={(value) => {
                  setUseAutoDeductions(value);
                  clearPreview();
                }}
                trackColor={{ false: theme.line, true: '#F5A3AA' }}
                thumbColor={useAutoDeductions ? connectTheme.accent : theme.textMuted}
              />
            </View>

            <View style={styles.simulatorActions}>
              <AppButton
                label={previewing ? 'Simulando...' : 'Simular'}
                variant="secondary"
                accent={connectTheme.accent}
                icon={<Calculator size={16} color={connectTheme.accent} />}
                onPress={handlePreview}
                loading={previewing}
                disabled={!selectedStudent}
                wrapperStyle={styles.action}
              />
              <AppButton
                label={calculating ? 'Salvando...' : 'Confirmar calculo'}
                accent={connectTheme.accent}
                onPress={handleCalculate}
                loading={calculating}
                disabled={!preview}
                wrapperStyle={styles.action}
              />
            </View>
          </SurfaceCard>
        ) : null}

        {canManage ? <SalaryPreview preview={preview} /> : null}

        <SurfaceCard
          title="Calculos do mes"
          subtitle={`${filteredRecords.length} fechamento(s) em ${formatMonthLabel(month)}`}
        >
          <SearchField
            placeholder={t("Buscar aprendiz ou empresa...")}
            value={recordSearch}
            onChangeText={setRecordSearch}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {(
              [
                ['all', 'Todos'],
                ['calculado', 'Calculados'],
                ['pendente', 'Pendentes'],
                ['pago', 'Pagos'],
              ] as [StatusFilter, string][]
            ).map(([value, label]) => (
              <FilterChip
                key={value}
                label={label}
                active={statusFilter === value}
                onPress={() => setStatusFilter(value)}
              />
            ))}
          </ScrollView>

          <View style={styles.listActions}>
            {canManage ? (
              <AppButton
                label={batching ? 'Calculando...' : 'Calcular todos'}
                variant="secondary"
                accent={colors.blue}
                icon={<RefreshCw size={16} color={colors.blue} />}
                onPress={handleBatch}
                loading={batching}
                wrapperStyle={styles.listAction}
              />
            ) : null}
            <AppButton
              label="Exportar"
              variant="secondary"
              accent={connectTheme.accent}
              icon={<Download size={16} color={connectTheme.accent} />}
              onPress={() => setExportOpen(true)}
              wrapperStyle={styles.listAction}
            />
          </View>

          {filteredRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <Wallet size={34} color={theme.textSubtle} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {t("Nenhum calculo neste mes")}</Text>
              <Text style={[styles.helperText, { color: theme.textMuted }]}>
                {t("Use o simulador ou o calculo em lote para gerar os fechamentos.")}</Text>
            </View>
          ) : null}

          {filteredRecords.map((record) => (
            <ListRow
              key={record.id}
              title={record.aluno_nome ?? 'Aluno nao vinculado'}
              subtitle={`${record.empresa_nome ?? 'Sem empresa'} · Base ${formatCurrency(record.salario_base)}`}
              badge={formatCurrency(record.salario_final ?? record.salario_base)}
              badgeVariant={normalizedStatus(record.status) === 'pago' ? 'info' : 'success'}
              meta={`${record.faltas_injustificadas ?? 0} FI · ${record.frequencia_percentual ?? 0}%`}
              initials={(record.aluno_nome ?? 'SL').slice(0, 2).toUpperCase()}
              accent={colors.green}
              onEdit={canManage ? () => recalculate(record) : undefined}
            />
          ))}
        </SurfaceCard>
      </ModuleScreen>

      <ExportModal
        visible={exportOpen}
        title="Exportar salarios"
        onClose={() => setExportOpen(false)}
        onPDF={async () => {
          await exportService.exportarPDF(toRows(filteredRecords), 'Relatorio de salarios');
          setExportOpen(false);
        }}
        onExcel={async () => {
          await exportService.exportarExcel(toRows(filteredRecords), 'relatorio-salarios');
          setExportOpen(false);
        }}
      />
    </>
  );
}

function MonthSelector({
  month,
  onPrevious,
  onNext,
}: {
  month: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { t } = useI18n();
  const theme = useThemeColors();
  return (
    <View
      style={[
        styles.monthSelector,
        { backgroundColor: theme.surface, borderColor: theme.line },
      ]}
    >
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={t("Mes anterior")}
        onPress={onPrevious}
        style={styles.monthButton}
      >
        <ChevronLeft size={20} color={theme.text} />
      </AnimatedPressable>
      <View style={styles.monthValue}>
        <Text style={[styles.monthLabel, { color: theme.textMuted }]}>{t("Referencia")}</Text>
        <Text style={[styles.monthText, { color: theme.text }]}>
          {formatMonthLabel(month)}
        </Text>
      </View>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={t("Proximo mes")}
        onPress={onNext}
        style={styles.monthButton}
      >
        <ChevronRight size={20} color={theme.text} />
      </AnimatedPressable>
    </View>
  );
}

function StudentChip({
  student,
  active,
  onPress,
}: {
  student: Aluno;
  active: boolean;
  onPress: () => void;
}) {
  const { t } = useI18n();
  const theme = useThemeColors();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.studentChip,
        {
          backgroundColor: active ? connectTheme.accent : theme.surfaceSoft,
          borderColor: active ? connectTheme.accent : theme.line,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[styles.studentChipName, { color: active ? colors.white : theme.text }]}
      >
        {student.nome}
      </Text>
      <Text
        numberOfLines={1}
        style={[
          styles.studentChipMeta,
          { color: active ? 'rgba(255,255,255,0.82)' : theme.textMuted },
        ]}
      >
        {t("RM")}{' '}{student.rm ?? t("nao informado")}
      </Text>
    </AnimatedPressable>
  );
}

function MoneyField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const theme = useThemeColors();
  return (
    <View style={styles.moneyField}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View
        style={[
          styles.moneyInput,
          {
            backgroundColor: disabled ? theme.surfaceSoft : theme.input,
            borderColor: theme.line,
            opacity: disabled ? 0.68 : 1,
          },
        ]}
      >
        <Text style={[styles.currencyPrefix, { color: theme.textMuted }]}>{t("R$")}</Text>
        <TextInput
          value={value}
          editable={!disabled}
          keyboardType="decimal-pad"
          onChangeText={(text) => onChange(formatCurrencyInput(text))}
          style={[styles.moneyInputText, { color: theme.text }]}
          placeholder={t("0,00")}
          placeholderTextColor={theme.textSubtle}
        />
      </View>
    </View>
  );
}

function SalaryPreview({ preview }: { preview: SalaryPreviewData | null }) {
  const { t } = useI18n();
  const theme = useThemeColors();

  if (!preview) {
    return (
      <SurfaceCard title="Previa do calculo" subtitle="Confira os valores antes de salvar">
        <View style={styles.previewEmpty}>
          <Calculator size={38} color={theme.textSubtle} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {t("Selecione um aprendiz e toque em Simular")}</Text>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            {t("O calculo considera contrato, frequencia, bonus e descontos.")}</Text>
        </View>
      </SurfaceCard>
    );
  }

  const total = Math.max(preview.attendance.total_days, 1);
  const presentWidth = `${(preview.attendance.present_days / total) * 100}%` as const;
  const justifiedWidth = `${(preview.attendance.justified_absences / total) * 100}%` as const;
  const absentWidth = `${(preview.attendance.unjustified_absences / total) * 100}%` as const;

  return (
    <SurfaceCard
      title={preview.student.full_name}
      subtitle={`${formatMonthLabel(preview.reference_month)} · ${
        preview.contract?.company_name ?? 'Sem contrato ativo'
      }`}
    >
      <Text style={[styles.netLabel, { color: theme.textMuted }]}>{t("Valor liquido")}</Text>
      <Text style={styles.netValue}>{formatCurrency(preview.amounts.net)}</Text>

      <View style={[styles.attendanceTrack, { backgroundColor: theme.surfaceSoft }]}>
        <View style={{ width: presentWidth, backgroundColor: colors.green }} />
        <View style={{ width: justifiedWidth, backgroundColor: colors.orange }} />
        <View style={{ width: absentWidth, backgroundColor: colors.red }} />
      </View>
      <View style={styles.attendanceLegend}>
        <Pill label={`${preview.attendance.present_days} presentes`} variant="success" />
        <Pill
          label={`${preview.attendance.justified_absences} justificadas`}
          variant="warning"
        />
        <Pill
          label={`${preview.attendance.unjustified_absences} injustificadas`}
          variant="danger"
        />
        <Pill label={`${preview.attendance.rate}% frequencia`} variant="info" />
      </View>

      <View style={styles.previewMetrics}>
        <PreviewMetric
          label="Valor por dia"
          value={formatCurrency(preview.daily_rate)}
        />
        <PreviewMetric
          label="Base do contrato"
          value={formatCurrency(preview.amounts.base)}
        />
        <PreviewMetric
          label="Desconto por faltas"
          value={formatCurrency(preview.amounts.absence_deduction)}
          danger
        />
      </View>

      <View style={[styles.breakdown, { borderColor: theme.line }]}>
        {preview.breakdown.map((line) => (
          <View key={line.label} style={styles.breakdownRow}>
            <View style={styles.breakdownLabel}>
              {line.type === 'bonus' ? (
                <PlusCircle size={15} color={colors.green} />
              ) : line.type === 'deduction' ? (
                <MinusCircle size={15} color={colors.red} />
              ) : line.type === 'net' ? (
                <CircleDollarSign size={15} color={colors.green} />
              ) : (
                <Wallet size={15} color={colors.blue} />
              )}
              <Text style={[styles.breakdownText, { color: theme.textMuted }]}>
                {line.label}
              </Text>
            </View>
            <Text
              style={[
                styles.breakdownValue,
                {
                  color:
                    line.type === 'net'
                      ? colors.green
                      : line.value < 0
                        ? colors.red
                        : theme.text,
                },
              ]}
            >
              {formatCurrency(Math.abs(line.value))}
              {line.value < 0 ? ' (-)' : ''}
            </Text>
          </View>
        ))}
      </View>
    </SurfaceCard>
  );
}

function PreviewMetric({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  const theme = useThemeColors();
  return (
    <View style={[styles.previewMetric, { backgroundColor: theme.surfaceSoft }]}>
      <Text style={[styles.previewMetricLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.previewMetricValue, { color: danger ? colors.red : theme.text }]}
      >
        {value}
      </Text>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useThemeColors();
  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: active ? connectTheme.accent : theme.surfaceSoft,
          borderColor: active ? connectTheme.accent : theme.line,
        },
      ]}
    >
      <Text
        style={[
          styles.filterChipText,
          { color: active ? colors.white : theme.textMuted },
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

function toRows(items: SalarioAluno[]) {
  return items.map((item) => ({
    aluno: item.aluno_nome ?? item.aluno_id,
    empresa: item.empresa_nome,
    mes: item.mes_referencia,
    salario_base: item.salario_base,
    bonificacoes: item.bonuses,
    descontos: item.deductions ?? item.outros_descontos ?? item.desconto,
    salario_final: item.salario_final,
    frequencia: item.frequencia_percentual,
    faltas_injustificadas: item.faltas_injustificadas,
    status: item.status,
  }));
}

const styles = StyleSheet.create({
  monthSelector: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  monthButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthValue: { flex: 1, minWidth: 0, alignItems: 'center' },
  monthLabel: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  monthText: { marginTop: 2, fontSize: 14, fontWeight: '900', textTransform: 'capitalize' },
  label: { marginBottom: 6, fontSize: 11, fontWeight: '900' },
  studentOptions: { gap: 8, paddingVertical: 4, paddingRight: 4 },
  studentChip: {
    width: 170,
    minHeight: 54,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  studentChipName: { fontSize: 12, fontWeight: '900' },
  studentChipMeta: { marginTop: 3, fontSize: 9, fontWeight: '700' },
  studentInfo: { marginTop: 10, borderWidth: 1, borderRadius: 8, padding: 11 },
  studentInfoName: { fontSize: 13, fontWeight: '900' },
  helperText: { fontSize: 10, lineHeight: 15, fontWeight: '600' },
  inlineLoading: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  inputGrid: { flexDirection: 'row', gap: 10, marginTop: 12 },
  moneyField: { flex: 1, minWidth: 0 },
  moneyInput: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  currencyPrefix: { fontSize: 11, fontWeight: '900' },
  moneyInputText: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 7,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '900',
  },
  switchRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  switchText: { flex: 1, minWidth: 0 },
  switchLabel: { fontSize: 11, fontWeight: '900' },
  simulatorActions: { flexDirection: 'row', gap: 9, marginTop: 12 },
  action: { flex: 1 },
  previewEmpty: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  emptyTitle: { textAlign: 'center', fontSize: 13, fontWeight: '900' },
  netLabel: { fontSize: 10, fontWeight: '800' },
  netValue: { color: colors.green, fontSize: 28, fontWeight: '900', marginTop: 2 },
  attendanceTrack: {
    height: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 5,
    marginTop: 14,
  },
  attendanceLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  previewMetrics: { flexDirection: 'row', gap: 8, marginTop: 14 },
  previewMetric: { flex: 1, minWidth: 0, borderRadius: 8, padding: 9 },
  previewMetricLabel: { fontSize: 9, fontWeight: '700' },
  previewMetricValue: { marginTop: 4, fontSize: 12, fontWeight: '900' },
  breakdown: { gap: 10, borderWidth: 1, borderRadius: 8, marginTop: 14, padding: 12 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  breakdownLabel: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7 },
  breakdownText: { flex: 1, fontSize: 10, fontWeight: '700' },
  breakdownValue: { fontSize: 11, fontWeight: '900' },
  filters: { gap: 7, marginTop: 10, marginBottom: 10 },
  filterChip: {
    minHeight: 36,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  filterChipText: { fontSize: 10, fontWeight: '900' },
  listActions: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  listAction: { flex: 1 },
  emptyState: {
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 20,
  },
});
