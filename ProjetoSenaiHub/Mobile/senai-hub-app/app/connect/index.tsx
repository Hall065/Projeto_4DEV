import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BookOpen, BriefcaseBusiness, CalendarCheck, CircleDollarSign, FileText, GraduationCap, Users } from 'lucide-react-native';
import { ChartCard, DonutStatusChart, InteractiveBarChart, TrendLineChart } from '@/components/charts';
import { MetricGrid } from '@/components/common/MetricGrid';
import {
  AppButton,
  FeedbackMessage,
  ListRow,
  MetricTile,
  Pill,
  RingMetric,
  SurfaceCard,
} from '@/components/common/VisualPrimitives';
import { ModuleScreen } from '@/components/screens/ModuleScreen';
import { colors, connectTheme } from '@/constants/colors';
import { ROUTES } from '@/constants/routes';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  getEmpresaDashboardMetrics,
  listContratosByEmpresaId,
  listFrequenciasByEmpresaId,
  listSalariosByEmpresaId,
} from '@/services/empresa.service';
import { connectService } from '@/services/connect.service';
import type { ContratoAluno, Curso, FrequenciaRegistro, SalarioAluno, Turma } from '@/types/connect.types';
import { buildDateTrend, buildMonthTotals, countByStatus, percent, topGroups } from '@/utils/dashboardAnalytics';
import { useI18n } from '@/hooks/useI18n';

export default function ConnectDashboard() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useThemeColors();
  const themedTone = theme.isDark ? 'dark' : 'light';
  const { isEmpresa, empresa, empresaId, loading: empresaLoading } = useEmpresaContext();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalAlunos: 0,
    totalProfessores: 0,
    totalTurmas: 0,
    totalCursos: 0,
  });
  const [empresaMetrics, setEmpresaMetrics] = useState({
    totalContratos: 0,
    contratosAtivos: 0,
    totalAlunos: 0,
    totalFrequencias: 0,
    totalSalarios: 0,
  });
  const [contratos, setContratos] = useState<ContratoAluno[]>([]);
  const [frequencias, setFrequencias] = useState<FrequenciaRegistro[]>([]);
  const [salarios, setSalarios] = useState<SalarioAluno[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (isEmpresa && empresaId) {
          const [dashboardMetrics, contratosData, frequenciasData, salariosData] = await Promise.all([
            getEmpresaDashboardMetrics(empresaId),
            listContratosByEmpresaId(empresaId),
            listFrequenciasByEmpresaId(empresaId),
            listSalariosByEmpresaId(empresaId),
          ]);
          setEmpresaMetrics(dashboardMetrics);
          setContratos(contratosData);
          setFrequencias(frequenciasData);
          setSalarios(salariosData);
          return;
        }

        const [dashboardMetrics, cursosData, turmasData, frequenciasData, contratosData, salariosData] = await Promise.all([
          connectService.getDashboardMetrics(),
          connectService.listCursos(),
          connectService.listTurmas(),
          connectService.listFrequencias(),
          connectService.listContratos(),
          connectService.listSalarios(),
        ]);
        setMetrics(dashboardMetrics);
        setCursos(cursosData);
        setTurmas(turmasData);
        setFrequencias(frequenciasData);
        setContratos(contratosData);
        setSalarios(salariosData);
      } catch {
        setMetrics({ totalAlunos: 0, totalProfessores: 0, totalTurmas: 0, totalCursos: 0 });
        setEmpresaMetrics({
          totalContratos: 0,
          contratosAtivos: 0,
          totalAlunos: 0,
          totalFrequencias: 0,
          totalSalarios: 0,
        });
        setContratos([]);
        setFrequencias([]);
        setSalarios([]);
        setCursos([]);
        setTurmas([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [empresaId, isEmpresa]);

  const screenLoading = loading || (isEmpresa && empresaLoading);

  const contratosPorStatus = [
    { label: 'Ativos', value: contratos.filter((contrato) => contrato.status === 'ativo').length, color: colors.green },
    { label: 'Pendentes', value: contratos.filter((contrato) => contrato.status === 'pendente').length, color: colors.orange },
    {
      label: 'Outros',
      value: contratos.filter((contrato) => contrato.status !== 'ativo' && contrato.status !== 'pendente').length,
      color: colors.blue,
    },
  ];

  const cursosPorPeriodo = [
    { label: 'Manhã', value: cursos.filter((c) => c.periodo === 'manha').length, color: colors.blue },
    { label: 'Tarde', value: cursos.filter((c) => c.periodo === 'tarde').length, color: connectTheme.accent },
    { label: 'Noite', value: cursos.filter((c) => c.periodo === 'noite').length, color: colors.orange },
    { label: 'Integral', value: cursos.filter((c) => c.periodo === 'integral').length, color: colors.green },
  ];
  const frequenciaStatus = countByStatus(frequencias, [
    { label: 'Presencas', status: ['presente', 'P'], color: colors.green },
    { label: 'Justificadas', status: ['falta_justificada', 'FJ'], color: colors.orange },
    { label: 'Injustificadas', status: ['falta_injustificada', 'FI'], color: colors.red },
  ]);
  const presentes = frequencias.filter((item) => item.status === 'presente' || item.status === 'P').length;
  const presencaGeral = percent(presentes, frequencias.length);
  const frequenciaTrend = buildDateTrend(frequencias, ['data_aula', 'data'], { limit: 6 });
  const salariosPorMes = buildMonthTotals(
    salarios,
    ['mes_referencia', 'mes'],
    (item) => item.salario_final ?? item.salario_base ?? 0,
    { limit: 5 }
  );
  const turmasPorCurso = topGroups(turmas, (turma) => turma.curso_nome, { limit: 5, fallbackLabel: 'Sem curso' });

  if (isEmpresa) {
    return (
      <ModuleScreen
        kicker="SENAI Connect"
        title="Portal da empresa"
        description={`Acompanhe contratos, frequência e salários dos aprendizes de ${empresa?.nome ?? 'sua empresa'}.`}
        isLoading={screenLoading}
      >
        {isEmpresa && !empresa && !screenLoading ? (
          <FeedbackMessage
            variant="warning"
            message="Não foi possível identificar a empresa vinculada ao seu usuário. Verifique se o e-mail de login corresponde ao cadastro da empresa."
          />
        ) : null}

        <SurfaceCard tone={themedTone} title={empresa?.nome ?? 'Empresa parceira'} subtitle="Resumo dos aprendizes vinculados">
          <View style={styles.heroContent}>
            <RingMetric value={empresaMetrics.totalAlunos} label="aprendizes" accent={connectTheme.accent} tone={themedTone} />
            <View style={styles.heroBody}>
              <Text style={[styles.heroTitle, { color: theme.text }]}>{t("Gestão dos seus contratos")}</Text>
              <Text style={[styles.heroText, { color: theme.textMuted }]}>
                {t("Consulte contratos, frequência e cálculo salarial apenas dos alunos vinculados à sua empresa.")}</Text>
              <View style={styles.heroPills}>
                <Pill label={`${empresaMetrics.contratosAtivos} contratos ativos`} variant="info" tone={themedTone} />
                <Pill label={`${empresaMetrics.totalFrequencias} registros`} variant="success" tone={themedTone} />
              </View>
            </View>
          </View>
        </SurfaceCard>

        <MetricGrid>
          <MetricTile label="Contratos" value={empresaMetrics.totalContratos} accent={connectTheme.accent} icon={<FileText size={16} color={connectTheme.accent} />} />
          <MetricTile label="Aprendizes" value={empresaMetrics.totalAlunos} accent={colors.blue} icon={<Users size={16} color={colors.blue} />} />
          <MetricTile label="Frequência" value={empresaMetrics.totalFrequencias} accent={colors.orange} icon={<CalendarCheck size={16} color={colors.orange} />} />
          <MetricTile label="Cálculos" value={empresaMetrics.totalSalarios} accent={colors.green} icon={<CircleDollarSign size={16} color={colors.green} />} />
        </MetricGrid>

        <ChartCard
          title="Contratos por status"
          subtitle="Distribuicao dos vinculos da empresa"
          empty={contratos.length === 0}
          summary={`${contratos.length} contratos analisados`}
        >
          <DonutStatusChart data={contratosPorStatus} />
        </ChartCard>

        <ChartCard
          title="Presenca dos aprendizes"
          subtitle="Composicao real dos lancamentos"
          empty={frequencias.length === 0}
          summary={`${presencaGeral}% de presenca em ${frequencias.length} registros`}
        >
          <DonutStatusChart data={frequenciaStatus} />
        </ChartCard>

        <ChartCard
          title="Fechamento salarial"
          subtitle="Total calculado por mes"
          empty={salariosPorMes.length === 0}
          summary={`${salarios.length} calculos salariais analisados`}
        >
          <InteractiveBarChart data={salariosPorMes} formatValue={(value) => `R$ ${value.toLocaleString('pt-BR')}`} />
        </ChartCard>

        <SurfaceCard title="Atalhos rápidos" subtitle="Áreas liberadas para o perfil empresa">
          <View style={styles.quickGrid}>
            <AppButton
              label="Contratos"
              variant="secondary"
              accent={connectTheme.accent}
              icon={<FileText size={16} color={connectTheme.accent} />}
              onPress={() => router.push(ROUTES.connect.contratos as never)}
              wrapperStyle={styles.quickButton}
            />
            <AppButton
              label="Frequência"
              variant="secondary"
              accent={colors.blue}
              icon={<CalendarCheck size={16} color={colors.blue} />}
              onPress={() => router.push(ROUTES.connect.gerenciarFrequencia as never)}
              wrapperStyle={styles.quickButton}
            />
            <AppButton
              label="Salário"
              variant="secondary"
              accent={colors.green}
              icon={<CircleDollarSign size={16} color={colors.green} />}
              onPress={() => router.push(ROUTES.connect.salario as never)}
              wrapperStyle={styles.quickButton}
            />
          </View>
        </SurfaceCard>

        <SurfaceCard title="Contratos recentes" subtitle="Aprendizes vinculados à empresa">
          {contratos.length === 0 ? <Text style={styles.empty}>{t("Nenhum contrato encontrado.")}</Text> : null}
          {contratos.slice(0, 5).map((contrato) => (
            <ListRow
              key={contrato.id}
              title={contrato.aluno_nome ?? contrato.aluno_id ?? 'Aluno'}
              subtitle={`${contrato.carga_horaria ?? 'carga não informada'} • ${contrato.status ?? 'ativo'}`}
              badge={contrato.status ?? 'ativo'}
              badgeVariant={contrato.status === 'ativo' ? 'success' : 'neutral'}
              initials="CT"
              accent={colors.blue}
            />
          ))}
        </SurfaceCard>
      </ModuleScreen>
    );
  }

  return (
    <ModuleScreen
      kicker="SENAI Connect"
      title="Visão geral"
      description="Dashboard acadêmico do SENAI Connect."
      isLoading={screenLoading}
    >
      <SurfaceCard tone={themedTone} title="Operação acadêmica" subtitle="Resumo carregado do Supabase">
        <View style={styles.heroContent}>
          <RingMetric value={metrics.totalAlunos} label="alunos ativos" accent={connectTheme.accent} tone={themedTone} />
          <View style={styles.heroBody}>
            <Text style={[styles.heroTitle, { color: theme.text }]}>{t("Acompanhamento centralizado")}</Text>
            <Text style={[styles.heroText, { color: theme.textMuted }]}>
              {t("Cursos, turmas, professores e frequência reunidos para consulta rápida.")}</Text>
            <View style={styles.heroPills}>
              <Pill label={`${metrics.totalTurmas} turmas`} variant="info" tone={themedTone} />
              <Pill label={`${metrics.totalCursos} cursos`} variant="success" tone={themedTone} />
            </View>
          </View>
        </View>
      </SurfaceCard>

      <MetricGrid>
        <MetricTile label="Alunos ativos" value={metrics.totalAlunos} accent={connectTheme.accent} icon={<Users size={16} color={connectTheme.accent} />} />
        <MetricTile label="Professores" value={metrics.totalProfessores} accent={colors.blue} icon={<GraduationCap size={16} color={colors.blue} />} />
        <MetricTile label="Turmas" value={metrics.totalTurmas} accent={colors.orange} icon={<BookOpen size={16} color={colors.orange} />} />
        <MetricTile label="Cursos" value={metrics.totalCursos} accent={colors.green} icon={<BriefcaseBusiness size={16} color={colors.green} />} />
      </MetricGrid>

      <SurfaceCard title="Atalhos rápidos" subtitle="Ações usadas na rotina acadêmica">
        <View style={styles.quickGrid}>
          <AppButton
            label="Alunos"
            variant="secondary"
            accent={connectTheme.accent}
            icon={<Users size={16} color={connectTheme.accent} />}
            onPress={() => router.push(ROUTES.connect.alunos as never)}
            wrapperStyle={styles.quickButton}
          />
          <AppButton
            label="Turmas"
            variant="secondary"
            accent={colors.blue}
            icon={<GraduationCap size={16} color={colors.blue} />}
            onPress={() => router.push(ROUTES.connect.turmas as never)}
            wrapperStyle={styles.quickButton}
          />
          <AppButton
            label="Frequência"
            variant="secondary"
            accent={colors.orange}
            icon={<CalendarCheck size={16} color={colors.orange} />}
            onPress={() => router.push(ROUTES.connect.frequencia as never)}
            wrapperStyle={styles.quickButton}
          />
          <AppButton
            label="Cursos"
            variant="secondary"
            accent={colors.green}
            icon={<BookOpen size={16} color={colors.green} />}
            onPress={() => router.push(ROUTES.connect.cursos as never)}
            wrapperStyle={styles.quickButton}
          />
        </View>
      </SurfaceCard>

      <ChartCard
        title="Cursos por período"
        subtitle="Distribuição real do catálogo"
        empty={cursos.length === 0}
        summary={`${cursos.length} cursos analisados por periodo`}
      >
        <InteractiveBarChart data={cursosPorPeriodo} />
      </ChartCard>

      <ChartCard
        title="Frequencia geral"
        subtitle="Presencas, justificativas e faltas"
        empty={frequencias.length === 0}
        summary={`${presencaGeral}% de presenca em ${frequencias.length} registros`}
      >
        <DonutStatusChart data={frequenciaStatus} />
      </ChartCard>

      <ChartCard
        title="Lancamentos por data"
        subtitle="Evolucao recente das chamadas"
        empty={frequenciaTrend.length === 0}
        summary={`${frequenciaTrend.length} pontos recentes com registros de frequencia`}
      >
        <TrendLineChart data={frequenciaTrend} color={colors.green} />
      </ChartCard>

      <ChartCard
        title="Turmas por curso"
        subtitle="Cursos com mais turmas cadastradas"
        empty={turmasPorCurso.length === 0}
        summary={`${turmas.length} turmas analisadas`}
      >
        <InteractiveBarChart data={turmasPorCurso} />
      </ChartCard>

      <ChartCard
        title="Salarios por mes"
        subtitle="Fechamentos calculados no Connect"
        empty={salariosPorMes.length === 0}
        summary={`${salarios.length} calculos salariais analisados`}
      >
        <InteractiveBarChart data={salariosPorMes} formatValue={(value) => `R$ ${value.toLocaleString('pt-BR')}`} />
      </ChartCard>

      <SurfaceCard title="Turmas cadastradas" subtitle="Últimas turmas carregadas do Supabase">
        {turmas.length === 0 ? <Text style={styles.empty}>{t("Nenhum dado cadastrado ainda.")}</Text> : null}
        {turmas.slice(0, 5).map((turma) => (
          <ListRow
            key={turma.id}
            title={turma.nome}
            subtitle={`${turma.curso_nome ?? 'Curso não vinculado'} - ${turma.periodo ?? 'sem período'}`}
            badge={turma.status}
            badgeVariant={turma.status === 'ativa' ? 'success' : 'neutral'}
            initials={turma.nome.slice(0, 2).toUpperCase()}
            accent={colors.blue}
          />
        ))}
      </SurfaceCard>
    </ModuleScreen>
  );
}

const styles = StyleSheet.create({
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroBody: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 16, fontWeight: '900' },
  heroText: { fontSize: 12, lineHeight: 17, marginTop: 5 },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 11,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  metric: { width: '48%' },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickButton: { width: '48%' },
  empty: { color: colors.grayText, fontSize: 12, fontWeight: '700' },
});
