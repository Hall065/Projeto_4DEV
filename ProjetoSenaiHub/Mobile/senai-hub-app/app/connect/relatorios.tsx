import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BookOpen,
  BriefcaseBusiness,
  CalendarCheck,
  GraduationCap,
  RefreshCw,
  Users,
} from 'lucide-react-native';
import {
  ChartCard,
  DonutStatusChart,
  InteractiveBarChart,
  TrendLineChart,
} from '@/components/charts';
import { MetricGrid } from '@/components/common/MetricGrid';
import {
  FeedbackMessage,
  MetricTile,
  SurfaceCard,
} from '@/components/common/VisualPrimitives';
import {
  ChoiceChips,
  MobileReportBuilder,
  ReportTabs,
  ReportTextField,
  type MobileReportPreset,
  type MobileReportSection,
} from '@/components/reports/MobileReportBuilder';
import { ModuleScreen } from '@/components/screens/ModuleScreen';
import { colors, connectTheme } from '@/constants/colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { connectService } from '@/services/connect.service';
import type {
  Aluno,
  ContratoAluno,
  Curso,
  FrequenciaRegistro,
  Professor,
  Turma,
} from '@/types/connect.types';
import { buildDateTrend, percent, topGroups } from '@/utils/dashboardAnalytics';
import { useI18n } from '@/hooks/useI18n';

const CONNECT_PRESETS: MobileReportPreset[] = [
  {
    id: 'academic_full',
    label: 'Academico completo',
    description: 'Indicadores, frequencia, alunos, turmas, professores e contratos.',
    sections: [
      'executive_summary',
      'kpi_cards',
      'attendance_breakdown_chart',
      'students_by_course_chart',
      'attendance_trend_chart',
      'students_table',
      'teachers_table',
      'classes_table',
      'contracts_table',
      'attendance_marks_table',
      'class_attendance_ranking',
    ],
  },
  {
    id: 'attendance_focus',
    label: 'Foco em frequencia',
    description: 'Presencas, faltas, evolucao e ranking das turmas.',
    sections: [
      'executive_summary',
      'kpi_cards',
      'attendance_breakdown_chart',
      'attendance_trend_chart',
      'attendance_marks_table',
      'class_attendance_ranking',
    ],
  },
  {
    id: 'enrollment',
    label: 'Matriculas e contratos',
    description: 'Alunos, cursos, turmas e contratos ativos.',
    sections: [
      'executive_summary',
      'kpi_cards',
      'students_by_course_chart',
      'students_table',
      'classes_table',
      'contracts_table',
    ],
  },
];

export default function RelatoriosConnectScreen() {
  const { t } = useI18n();
  const theme = useThemeColors();
  const [mode, setMode] = useState<'summary' | 'builder'>('summary');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [contratos, setContratos] = useState<ContratoAluno[]>([]);
  const [frequencias, setFrequencias] = useState<FrequenciaRegistro[]>([]);
  const [courseId, setCourseId] = useState('all');
  const [classId, setClassId] = useState('all');
  const [studentStatus, setStudentStatus] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [studentData, teacherData, courseData, classData, contractData, attendanceData] =
        await Promise.all([
          connectService.listAlunos(),
          connectService.listProfessores(),
          connectService.listCursos(),
          connectService.listTurmas(),
          connectService.listContratos(),
          connectService.listFrequencias(),
        ]);
      setAlunos(studentData);
      setProfessores(teacherData);
      setCursos(courseData);
      setTurmas(classData);
      setContratos(contractData);
      setFrequencias(attendanceData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Nao foi possivel carregar os dados academicos.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredStudents = useMemo(
    () =>
      alunos.filter(
        (student) =>
          (courseId === 'all' || student.curso_id === courseId) &&
          (classId === 'all' || student.turma_id === classId) &&
          (studentStatus === 'all' || normalize(student.status) === studentStatus)
      ),
    [alunos, classId, courseId, studentStatus]
  );

  const studentIds = useMemo(
    () => new Set(filteredStudents.map((student) => student.id)),
    [filteredStudents]
  );

  const filteredClasses = useMemo(
    () =>
      turmas.filter(
        (classItem) =>
          (courseId === 'all' || classItem.curso_id === courseId) &&
          (classId === 'all' || classItem.id === classId)
      ),
    [classId, courseId, turmas]
  );

  const filteredAttendance = useMemo(
    () =>
      frequencias.filter((record) => {
        const belongsToStudent = studentIds.has(record.aluno_id);
        const belongsToClass = classId === 'all' || record.turma_id === classId;
        return belongsToStudent && belongsToClass && inDateRange(attendanceDate(record), fromDate, toDate);
      }),
    [classId, frequencias, fromDate, studentIds, toDate]
  );

  const filteredContracts = useMemo(
    () =>
      contratos.filter(
        (contract) =>
          studentIds.has(contract.aluno_id) &&
          inDateRange(contract.data_inicio, fromDate, toDate, true)
      ),
    [contratos, fromDate, studentIds, toDate]
  );

  const filteredTeachers = useMemo(() => {
    if (courseId === 'all' && classId === 'all') return professores;
    const teacherIds = new Set(
      filteredClasses
        .map((classItem) => classItem.professor_responsavel_id)
        .filter((id): id is string => Boolean(id))
    );
    return professores.filter((teacher) => teacherIds.has(teacher.id));
  }, [classId, courseId, filteredClasses, professores]);

  const activeStudents = filteredStudents.filter((student) => isActive(student.status)).length;
  const activeClasses = filteredClasses.filter((classItem) => isActive(classItem.status)).length;
  const activeContracts = filteredContracts.filter((contract) => isActive(contract.status)).length;
  const attendanceCounts = countAttendance(filteredAttendance);
  const attendanceRate = percent(attendanceCounts.present, filteredAttendance.length);

  const attendanceChart = useMemo(
    () => [
      { label: 'Presencas', value: attendanceCounts.present, color: colors.green },
      { label: 'Justificadas', value: attendanceCounts.justified, color: colors.orange },
      { label: 'Injustificadas', value: attendanceCounts.unjustified, color: colors.red },
    ],
    [attendanceCounts.justified, attendanceCounts.present, attendanceCounts.unjustified]
  );
  const studentsByCourse = topGroups(
    filteredStudents,
    (student) => student.curso_nome ?? cursos.find((course) => course.id === student.curso_id)?.nome,
    { limit: 8, fallbackLabel: 'Sem curso' }
  );
  const attendanceTrend = buildDateTrend(
    filteredAttendance,
    ['data_aula', 'data'],
    { limit: 10 }
  );
  const classRanking = buildClassRanking(filteredAttendance);

  const reportSections = useMemo<MobileReportSection[]>(
    () => [
      {
        id: 'executive_summary',
        label: 'Resumo executivo',
        description: 'Leitura rapida do recorte academico selecionado.',
        kind: 'summary',
        paragraphs: [
          `${filteredStudents.length} alunos foram analisados, sendo ${activeStudents} ativos.`,
          `A taxa de presenca do periodo e ${attendanceRate}% em ${filteredAttendance.length} lancamentos.`,
          `${activeClasses} turmas e ${activeContracts} contratos ativos compoem o recorte atual.`,
        ],
      },
      {
        id: 'kpi_cards',
        label: 'Indicadores principais',
        description: 'Metricas academicas e contratuais.',
        kind: 'metrics',
        items: [
          { label: 'Alunos', value: filteredStudents.length, color: colors.red, meta: `${activeStudents} ativos` },
          { label: 'Professores', value: filteredTeachers.length, color: colors.blue },
          { label: 'Turmas ativas', value: activeClasses, color: colors.orange },
          { label: 'Contratos ativos', value: activeContracts, color: colors.purple },
          { label: 'Presenca', value: attendanceRate, color: colors.green, meta: 'percentual' },
          { label: 'Lancamentos', value: filteredAttendance.length, color: colors.cyan },
        ],
      },
      {
        id: 'attendance_breakdown_chart',
        label: 'Distribuicao de frequencia',
        description: 'Presencas e tipos de falta no periodo.',
        kind: 'donut',
        items: attendanceChart,
      },
      {
        id: 'students_by_course_chart',
        label: 'Alunos por curso',
        description: 'Distribuicao das matriculas entre os cursos.',
        kind: 'bar',
        items: studentsByCourse,
      },
      {
        id: 'attendance_trend_chart',
        label: 'Evolucao dos lancamentos',
        description: 'Volume de registros de frequencia por data.',
        kind: 'trend',
        items: attendanceTrend,
      },
      {
        id: 'students_table',
        label: 'Alunos',
        description: 'Cadastro academico dos alunos filtrados.',
        kind: 'table',
        columns: [
          { key: 'matricula', label: 'Matricula' },
          { key: 'nome', label: 'Nome' },
          { key: 'cpf', label: 'CPF' },
          { key: 'email', label: 'Email' },
          { key: 'telefone', label: 'Telefone' },
          { key: 'turma', label: 'Turma' },
          { key: 'curso', label: 'Curso' },
          { key: 'status', label: 'Status' },
        ],
        rows: filteredStudents.map((student) => ({
          matricula: student.rm,
          nome: student.nome,
          cpf: student.cpf,
          email: student.email_institucional ?? student.email ?? student.email_pessoal,
          telefone: student.telefone,
          turma: student.turma_nome,
          curso: student.curso_nome,
          status: statusLabel(student.status),
        })),
      },
      {
        id: 'teachers_table',
        label: 'Professores',
        description: 'Equipe docente relacionada ao recorte.',
        kind: 'table',
        columns: [
          { key: 'nome', label: 'Nome' },
          { key: 'especialidade', label: 'Especialidade' },
          { key: 'email', label: 'Email' },
          { key: 'telefone', label: 'Telefone' },
          { key: 'status', label: 'Status' },
        ],
        rows: filteredTeachers.map((teacher) => ({
          nome: teacher.nome,
          especialidade: teacher.especialidade,
          email: teacher.email,
          telefone: teacher.celular ?? teacher.telefone,
          status: statusLabel(teacher.status),
        })),
      },
      {
        id: 'classes_table',
        label: 'Turmas',
        description: 'Turmas, cursos e responsaveis.',
        kind: 'table',
        columns: [
          { key: 'turma', label: 'Turma' },
          { key: 'curso', label: 'Curso' },
          { key: 'professor', label: 'Professor' },
          { key: 'periodo', label: 'Periodo' },
          { key: 'inicio', label: 'Inicio' },
          { key: 'termino', label: 'Termino' },
          { key: 'status', label: 'Status' },
        ],
        rows: filteredClasses.map((classItem) => ({
          turma: classItem.nome,
          curso: classItem.curso_nome,
          professor: classItem.professor_nome,
          periodo: statusLabel(classItem.periodo),
          inicio: formatDate(classItem.data_inicio),
          termino: formatDate(classItem.data_termino),
          status: statusLabel(classItem.status),
        })),
      },
      {
        id: 'contracts_table',
        label: 'Contratos',
        description: 'Vinculos entre alunos e empresas.',
        kind: 'table',
        columns: [
          { key: 'aluno', label: 'Aluno' },
          { key: 'matricula', label: 'Matricula' },
          { key: 'empresa', label: 'Empresa' },
          { key: 'inicio', label: 'Inicio' },
          { key: 'termino', label: 'Termino' },
          { key: 'valor', label: 'Valor mensal' },
          { key: 'status', label: 'Status' },
        ],
        rows: filteredContracts.map((contract) => ({
          aluno: contract.aluno_nome,
          matricula: contract.aluno_rm,
          empresa: contract.empresa_nome,
          inicio: formatDate(contract.data_inicio),
          termino: formatDate(contract.data_termino ?? contract.data_fim),
          valor: formatCurrency(contract.monthly_value),
          status: statusLabel(contract.status),
        })),
      },
      {
        id: 'attendance_marks_table',
        label: 'Lancamentos de frequencia',
        description: 'Detalhamento por aluno, turma e data.',
        kind: 'table',
        columns: [
          { key: 'data', label: 'Data' },
          { key: 'aluno', label: 'Aluno' },
          { key: 'turma', label: 'Turma' },
          { key: 'disciplina', label: 'Disciplina' },
          { key: 'status', label: 'Status' },
          { key: 'aulas_faltadas', label: 'Aulas faltadas' },
          { key: 'observacao', label: 'Observacao' },
        ],
        rows: filteredAttendance.map((record) => ({
          data: formatDate(attendanceDate(record)),
          aluno: record.aluno_nome,
          turma: record.turma_nome,
          disciplina: record.disciplina,
          status: attendanceStatusLabel(record.status),
          aulas_faltadas: record.quantidade_aulas_faltadas ?? 0,
          observacao: record.justificativa ?? record.observacao,
        })),
      },
      {
        id: 'class_attendance_ranking',
        label: 'Ranking de frequencia por turma',
        description: 'Comparativo de presenca entre as turmas.',
        kind: 'table',
        columns: [
          { key: 'turma', label: 'Turma' },
          { key: 'lancamentos', label: 'Lancamentos' },
          { key: 'presencas', label: 'Presencas' },
          { key: 'faltas', label: 'Faltas' },
          { key: 'taxa', label: 'Taxa de presenca' },
        ],
        rows: classRanking,
      },
    ],
    [
      activeClasses,
      activeContracts,
      activeStudents,
      attendanceChart,
      attendanceRate,
      attendanceTrend,
      classRanking,
      filteredAttendance,
      filteredClasses,
      filteredContracts,
      filteredStudents,
      filteredTeachers,
      studentsByCourse,
    ]
  );

  const courseOptions = [
    { label: 'Todos', value: 'all' },
    ...cursos
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((course) => ({ label: course.nome, value: course.id })),
  ];
  const classOptions = [
    { label: 'Todas', value: 'all' },
    ...turmas
      .filter((classItem) => courseId === 'all' || classItem.curso_id === courseId)
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((classItem) => ({ label: classItem.nome, value: classItem.id })),
  ];
  const filterSummary = [
    courseId === 'all' ? 'Todos os cursos' : cursos.find((course) => course.id === courseId)?.nome ?? 'Curso',
    classId === 'all' ? 'Todas as turmas' : turmas.find((classItem) => classItem.id === classId)?.nome ?? 'Turma',
    studentStatus === 'all' ? 'Todos os status' : statusLabel(studentStatus),
    fromDate || toDate ? `${fromDate || 'inicio'} a ${toDate || 'hoje'}` : 'Todo o periodo',
  ];

  return (
    <ModuleScreen
      analysis={{ datasets: { alunos: filteredStudents, professores: filteredTeachers, turmas: filteredClasses, contratos: filteredContracts, frequencias: filteredAttendance }, filters: { courseId, classId, studentStatus, fromDate, toDate, mode }, limitations: mode === 'builder' ? ['Análise do resumo filtrado; seleções internas do construtor de relatórios não estão incluídas.'] : [], error }}
      kicker="SENAI Connect"
      title="Relatorios academicos"
      description="Analise, personalize e exporte dados reais do Connect."
      isLoading={loading}
      actionLabel="Atualizar"
      onActionPress={loadData}
    >
      {error ? <FeedbackMessage message={error} variant="danger" /> : null}
      <ReportTabs value={mode} onChange={setMode} accent={connectTheme.accent} />

      {mode === 'summary' ? (
        <View>
          <MetricGrid>
            <MetricTile
              label="Alunos ativos"
              value={activeStudents}
              hint={`${filteredStudents.length} no recorte`}
              accent={colors.red}
              icon={<Users size={16} color={colors.red} />}
            />
            <MetricTile
              label="Professores"
              value={filteredTeachers.length}
              accent={colors.blue}
              icon={<GraduationCap size={16} color={colors.blue} />}
            />
            <MetricTile
              label="Turmas ativas"
              value={activeClasses}
              accent={colors.orange}
              icon={<BookOpen size={16} color={colors.orange} />}
            />
            <MetricTile
              label="Contratos ativos"
              value={activeContracts}
              accent={colors.purple}
              icon={<BriefcaseBusiness size={16} color={colors.purple} />}
            />
            <MetricTile
              label="Taxa de presenca"
              value={`${attendanceRate}%`}
              accent={colors.green}
              icon={<CalendarCheck size={16} color={colors.green} />}
            />
            <MetricTile
              label="Lancamentos"
              value={filteredAttendance.length}
              accent={colors.cyan}
              icon={<RefreshCw size={16} color={colors.cyan} />}
            />
          </MetricGrid>

          <ChartCard
            title="Frequencia por situacao"
            subtitle="Toque em uma categoria para ver sua participacao"
            empty={!filteredAttendance.length}
            summary={`${attendanceRate}% de presenca no recorte atual`}
          >
            <DonutStatusChart data={attendanceChart} />
          </ChartCard>

          <ChartCard
            title="Alunos por curso"
            subtitle="Distribuicao das matriculas filtradas"
            empty={!studentsByCourse.length}
          >
            <InteractiveBarChart data={studentsByCourse} />
          </ChartCard>

          <ChartCard
            title="Evolucao dos lancamentos"
            subtitle="Registros de frequencia ao longo do periodo"
            empty={!attendanceTrend.length}
          >
            <TrendLineChart data={attendanceTrend} color={colors.green} />
          </ChartCard>

          <SurfaceCard title="Desempenho por turma" subtitle="Turmas com maior taxa de presenca">
            {classRanking.length ? (
              classRanking.slice(0, 5).map((item, index) => (
                <View
                  key={String(item.turma)}
                  style={[styles.rankingRow, { borderBottomColor: theme.line }]}
                >
                  <Text style={[styles.rankingPosition, { color: connectTheme.accent }]}>
                    {index + 1}
                  </Text>
                  <View style={styles.rankingBody}>
                    <Text style={[styles.rankingTitle, { color: theme.text }]}>
                      {String(item.turma)}
                    </Text>
                    <Text style={[styles.rankingMeta, { color: theme.textMuted }]}>
                      {item.presencas} {' '}{t("presencas em")}{' '}{item.lancamentos} {' '}{t("lancamentos")}</Text>
                  </View>
                  <Text style={[styles.rankingRate, { color: colors.green }]}>{item.taxa}</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.empty, { color: theme.textMuted }]}>
                {t("Nenhum lancamento de frequencia encontrado.")}</Text>
            )}
          </SurfaceCard>
        </View>
      ) : (
        <MobileReportBuilder
          moduleKey="connect"
          defaultTitle="Relatorio academico"
          defaultSubtitle="Indicadores de alunos, turmas, contratos e frequencia"
          accent={connectTheme.accent}
          presets={CONNECT_PRESETS}
          sections={reportSections}
          filterSummary={filterSummary}
          revisionKey={[courseId, classId, studentStatus, fromDate, toDate].join('|')}
          filterControls={
            <View>
              <ChoiceChips
                label="Curso"
                value={courseId}
                options={courseOptions}
                onChange={(value) => {
                  setCourseId(value);
                  setClassId('all');
                }}
                accent={connectTheme.accent}
              />
              <ChoiceChips
                label="Turma"
                value={classId}
                options={classOptions}
                onChange={setClassId}
                accent={connectTheme.accent}
              />
              <ChoiceChips
                label="Status do aluno"
                value={studentStatus}
                options={[
                  { label: 'Todos', value: 'all' },
                  { label: 'Ativos', value: 'ativo' },
                  { label: 'Inativos', value: 'inativo' },
                  { label: 'Formados', value: 'formado' },
                  { label: 'Trancados', value: 'trancado' },
                ]}
                onChange={setStudentStatus}
                accent={connectTheme.accent}
              />
              <View style={styles.dateFields}>
                <ReportTextField
                  label="Data inicial"
                  value={fromDate}
                  onChangeText={setFromDate}
                  placeholder={t("AAAA-MM-DD")}
                />
                <ReportTextField
                  label="Data final"
                  value={toDate}
                  onChangeText={setToDate}
                  placeholder={t("AAAA-MM-DD")}
                />
              </View>
            </View>
          }
        />
      )}
    </ModuleScreen>
  );
}

function countAttendance(records: FrequenciaRegistro[]) {
  return records.reduce(
    (counts, record) => {
      const status = normalize(record.status);
      if (status === 'p' || status === 'presente') counts.present += 1;
      else if (status === 'fj' || status === 'falta_justificada') counts.justified += 1;
      else counts.unjustified += 1;
      return counts;
    },
    { present: 0, justified: 0, unjustified: 0 }
  );
}

function buildClassRanking(records: FrequenciaRegistro[]) {
  const groups = new Map<string, { total: number; present: number }>();
  records.forEach((record) => {
    const name = record.turma_nome || 'Sem turma';
    const current = groups.get(name) ?? { total: 0, present: 0 };
    current.total += 1;
    if (['p', 'presente'].includes(normalize(record.status))) current.present += 1;
    groups.set(name, current);
  });

  return Array.from(groups.entries())
    .map(([turma, counts]) => ({
      turma,
      lancamentos: counts.total,
      presencas: counts.present,
      faltas: counts.total - counts.present,
      taxa: `${percent(counts.present, counts.total)}%`,
      rateValue: percent(counts.present, counts.total),
    }))
    .sort((a, b) => b.rateValue - a.rateValue)
    .map(({ rateValue: _rateValue, ...item }) => item);
}

function attendanceDate(record: FrequenciaRegistro) {
  return record.data_aula ?? record.data;
}

function inDateRange(value?: string | null, fromDate?: string, toDate?: string, allowMissing = false) {
  if (!fromDate && !toDate) return true;
  if (!value) return allowMissing;
  const date = value.slice(0, 10);
  if (fromDate && date < fromDate) return false;
  if (toDate && date > toDate) return false;
  return true;
}

function normalize(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function isActive(value?: string | null) {
  return ['ativo', 'ativa', 'active', 'matriculado', 'vigente', 'em_andamento'].includes(normalize(value));
}

function statusLabel(value?: string | null) {
  if (!value) return '-';
  return normalize(value)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function attendanceStatusLabel(value?: string | null) {
  const status = normalize(value);
  if (status === 'p' || status === 'presente') return 'Presente';
  if (status === 'fj' || status === 'falta_justificada') return 'Falta justificada';
  return 'Falta injustificada';
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatCurrency(value?: number | null) {
  if (value == null) return '-';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const styles = StyleSheet.create({
  rankingRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    paddingVertical: 9,
  },
  rankingPosition: {
    width: 24,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  rankingBody: {
    flex: 1,
    minWidth: 0,
  },
  rankingTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  rankingMeta: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: '700',
  },
  rankingRate: {
    fontSize: 14,
    fontWeight: '900',
  },
  empty: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateFields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
