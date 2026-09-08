import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BookOpen, CalendarCheck, MapPin, WalletCards } from 'lucide-react-native';
import { ChartCard, DonutStatusChart, InteractiveBarChart, TrendLineChart } from '@/components/charts';
import { MetricGrid } from '@/components/common/MetricGrid';
import { ListRow, LoadingState, MetricTile, Pill, SurfaceCard } from '@/components/common/VisualPrimitives';
import { colors, connectTheme } from '@/constants/colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { studentService, type StudentDashboardData } from '@/services/student.service';
import { useAuthStore } from '@/stores/auth.store';
import { buildDateTrend } from '@/utils/dashboardAnalytics';
import { useI18n } from '@/hooks/useI18n';

export default function AlunoDashboardScreen() {
  const { t } = useI18n();
  const session = useAuthStore((s) => s.session);
  const theme = useThemeColors();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudentDashboardData | null>(null);

  useEffect(() => {
    if (!session?.userId) return;
    studentService
      .getDashboard(session.userId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [session?.userId]);

  if (loading) return <LoadingState />;

  const aluno = data?.aluno;
  const frequencias = data?.frequencias ?? [];
  const presentes = frequencias.filter((item) => ['presente', 'p'].includes(item.status.toLowerCase())).length;
  const justificadas = frequencias.filter((item) => ['falta_justificada', 'fj'].includes(item.status.toLowerCase())).length;
  const injustificadas = frequencias.filter((item) => ['falta_injustificada', 'fi'].includes(item.status.toLowerCase())).length;
  const frequenciaPerc = frequencias.length ? Math.round((presentes / frequencias.length) * 100) : 0;
  const dentro = Boolean(data?.localizacao?.dentro_do_senai ?? data?.localizacao?.dentro_perimetro);
  const frequenciaData = [
    { label: 'Presencas', value: presentes, color: colors.green },
    { label: 'Justificadas', value: justificadas, color: colors.orange },
    { label: 'Injustificadas', value: injustificadas, color: colors.red },
  ];
  const presencasTrend = buildDateTrend(
    frequencias.filter((item) => ['presente', 'p'].includes(item.status.toLowerCase())),
    ['data_aula', 'data'],
    { limit: 6 }
  );
  const salario = data?.salario;
  const descontos = salario?.desconto ?? salario?.deductions ?? salario?.outros_descontos ?? 0;
  const salarioData = [
    { label: 'Base', value: Math.round(salario?.salario_base ?? 0), color: colors.blue },
    { label: 'Bonus', value: Math.round(salario?.bonuses ?? 0), color: colors.green },
    { label: 'Descontos', value: Math.round(descontos), color: colors.red },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.appBackground }]} contentContainerStyle={styles.content}>
      <SurfaceCard title="Meu perfil" subtitle="Dados academicos principais">
        <ListRow
          title={aluno?.nome ?? session?.perfil?.nome ?? 'Aluno'}
          subtitle={`${aluno?.curso_nome ?? 'Curso nao vinculado'} - ${aluno?.turma_nome ?? 'Turma nao vinculada'}`}
          badge={aluno?.status === 'ativo' ? 'Ativo' : aluno?.status ?? 'Sem status'}
          badgeVariant={aluno?.status === 'ativo' ? 'success' : 'neutral'}
          initials={(aluno?.nome ?? session?.perfil?.nome ?? 'AL').slice(0, 2).toUpperCase()}
          imageUri={aluno?.foto_url ?? session?.perfil?.foto_url}
          accent={connectTheme.accent}
        />
        <View style={styles.statusRow}>
          <Pill label={dentro ? 'Dentro do SENAI' : 'Fora do SENAI'} variant={dentro ? 'success' : 'danger'} />
          <Pill label={aluno?.rm ? `RM ${aluno.rm}` : 'RM nao informado'} variant="info" />
        </View>
      </SurfaceCard>

      <MetricGrid>
        <MetricTile label="Frequencia mes" value={`${frequenciaPerc}%`} accent={colors.green} icon={<CalendarCheck size={16} color={colors.green} />} />
        <MetricTile label="Faltas injustificadas" value={data?.salario?.faltas_injustificadas ?? 0} accent={colors.red} icon={<BookOpen size={16} color={colors.red} />} />
        <MetricTile label="Salario final" value={`R$ ${Math.round(data?.salario?.salario_final ?? 0).toLocaleString('pt-BR')}`} accent={connectTheme.accent} icon={<WalletCards size={16} color={connectTheme.accent} />} />
        <MetricTile label="Localizacao" value={dentro ? 'Ativa' : 'Inativa'} accent={dentro ? colors.green : colors.red} icon={<MapPin size={16} color={dentro ? colors.green : colors.red} />} />
      </MetricGrid>

      <ChartCard
        title="Resumo de frequencia"
        subtitle="Lancamentos deste mes"
        empty={frequencias.length === 0}
        summary={`${frequenciaPerc}% de presenca em ${frequencias.length} registros`}
      >
        <DonutStatusChart data={frequenciaData} />
      </ChartCard>

      <ChartCard
        title="Presencas por data"
        subtitle="Evolucao recente do aluno"
        empty={presencasTrend.length === 0}
        summary={`${presentes} presencas registradas no periodo carregado`}
      >
        <TrendLineChart data={presencasTrend} color={colors.green} />
      </ChartCard>

      <ChartCard
        title="Componentes salariais"
        subtitle="Base, bonus e descontos"
        empty={!salario}
        summary={salario ? `Liquido: R$ ${Math.round(salario.salario_final ?? 0).toLocaleString('pt-BR')} - referencia ${salario.mes_referencia ?? salario.mes ?? 'atual'}` : 'Nenhum calculo salarial encontrado'}
      >
        <InteractiveBarChart data={salarioData} formatValue={(value) => `R$ ${value.toLocaleString('pt-BR')}`} />
      </ChartCard>

      <SurfaceCard title="Aulas recentes" subtitle="Ultimos registros encontrados">
        {frequencias.slice(0, 5).map((item) => (
          <ListRow
            key={item.id}
            title={item.disciplina ?? 'Aula'}
            subtitle={item.data_aula ?? item.data ?? 'Sem data'}
            badge={item.status}
            badgeVariant={item.status === 'presente' ? 'success' : item.status === 'falta_justificada' ? 'warning' : 'danger'}
            initials="FR"
            accent={colors.green}
          />
        ))}
        {frequencias.length === 0 ? <Text style={[styles.empty, { color: theme.textMuted }]}>{t("Nenhuma frequencia cadastrada.")}</Text> : null}
      </SurfaceCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 14, paddingBottom: 24 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  empty: { color: colors.grayText, fontSize: 12, fontWeight: '700' },
});
