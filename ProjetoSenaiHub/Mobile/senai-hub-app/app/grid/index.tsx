import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, CheckCircle2, ClipboardList, Map, Package, Wrench } from 'lucide-react-native';
import { ChartCard, DonutStatusChart, InteractiveBarChart, TrendLineChart } from '@/components/charts';
import { MetricGrid } from '@/components/common/MetricGrid';
import {
  AppButton,
  ListRow,
  MetricTile,
  Pill,
  RingMetric,
  SurfaceCard,
} from '@/components/common/VisualPrimitives';
import { ModuleScreen } from '@/components/screens/ModuleScreen';
import { colors, gridTheme } from '@/constants/colors';
import { ROUTES } from '@/constants/routes';
import { useThemeColors } from '@/hooks/useThemeColors';
import { gridService } from '@/services/grid.service';
import type { Chamado, ItemEstoque, Tarefa } from '@/types/grid.types';
import { buildDateTrend, countByStatus, topGroups } from '@/utils/dashboardAnalytics';

export default function GridDashboard() {
  const router = useRouter();
  const theme = useThemeColors();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    chamadosAbertos: 0,
    chamadosEmAndamento: 0,
    itensEstoqueBaixo: 0,
    chamadosConcluidos: 0,
  });
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [estoque, setEstoque] = useState<ItemEstoque[]>([]);

  useEffect(() => {
    Promise.all([
      gridService.getDashboardMetrics(),
      gridService.listChamados(),
      gridService.listTarefas(),
      gridService.listEstoque(),
    ])
      .then(([dashboardMetrics, chamadosData, tarefasData, estoqueData]) => {
        setMetrics(dashboardMetrics);
        setChamados(chamadosData);
        setTarefas(tarefasData);
        setEstoque(estoqueData);
      })
      .catch(() => {
        setMetrics({
          chamadosAbertos: 0,
          chamadosEmAndamento: 0,
          itensEstoqueBaixo: 0,
          chamadosConcluidos: 0,
        });
        setChamados([]);
        setTarefas([]);
        setEstoque([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const itensCriticos = estoque.filter(
    (item) => item.quantidade_disponivel <= item.quantidade_minima
  );
  const prioridades = [
    { label: 'Baixa', value: chamados.filter((c) => c.prioridade === 'baixa').length, color: colors.green },
    { label: 'Media', value: chamados.filter((c) => c.prioridade === 'media').length, color: colors.blue },
    { label: 'Alta', value: chamados.filter((c) => c.prioridade === 'alta').length, color: colors.orange },
    { label: 'Urgente', value: chamados.filter((c) => c.prioridade === 'urgente').length, color: colors.red },
  ];
  const chamadosPorStatus = countByStatus(chamados, [
    { label: 'Abertos', status: 'aberto', color: colors.orange },
    { label: 'Aguardando', status: 'aguardando', color: colors.blue },
    { label: 'Em andamento', status: 'em_andamento', color: colors.purple },
    { label: 'Concluidos', status: ['concluido', 'concluida'], color: colors.green },
  ]);
  const tarefasPorStatus = countByStatus(tarefas, [
    { label: 'A fazer', status: 'a_fazer', color: colors.blue },
    { label: 'Em andamento', status: 'em_andamento', color: colors.orange },
    { label: 'Concluidas', status: ['concluido', 'concluida'], color: colors.green },
  ]);
  const estoquePorStatus = [
    {
      label: 'Disponivel',
      value: estoque.filter(
        (item) => item.status === 'disponivel' && item.quantidade_disponivel > item.quantidade_minima
      ).length,
      color: colors.green,
    },
    {
      label: 'Estoque baixo',
      value: estoque.filter(
        (item) => item.status === 'disponivel' && item.quantidade_disponivel <= item.quantidade_minima
      ).length,
      color: colors.orange,
    },
    {
      label: 'Indisponivel',
      value: estoque.filter((item) => item.status === 'indisponivel').length,
      color: colors.red,
    },
  ];
  const chamadosTrend = buildDateTrend(chamados, ['data_abertura', 'criado_em', 'created_at'], { limit: 6 });
  const estoquePorCategoria = topGroups(estoque, (item) => item.categoria_nome, { limit: 5, fallbackLabel: 'Sem categoria' });
  const tarefasAbertas = tarefas.filter((tarefa) => tarefa.status === 'a_fazer' || tarefa.status === 'em_andamento').length;

  return (
    <ModuleScreen
      kicker="SENAI Grid"
      title="Dashboard"
      description="Resumo operacional da manutenção e infraestrutura."
      isLoading={loading}
    >
      <SurfaceCard title="Operação de infraestrutura" subtitle="Prioridades e chamados em tempo real">
        <View style={styles.heroContent}>
          <RingMetric value={metrics.chamadosAbertos} label="chamados abertos" accent={gridTheme.accent} />
          <View style={styles.heroBody}>
            <Text style={[styles.heroTitle, { color: theme.text }]}>Fila operacional organizada</Text>
            <Text style={[styles.heroText, { color: theme.textMuted }]}>
              Chamados, tarefas e estoque aparecem juntos para facilitar a tomada de decisão.
            </Text>
            <View style={styles.heroPills}>
              <Pill label={`${metrics.chamadosEmAndamento} em andamento`} variant="warning" />
              <Pill label={`${itensCriticos.length} itens críticos`} variant="danger" />
            </View>
          </View>
        </View>
      </SurfaceCard>

      <MetricGrid>
        <MetricTile label="Chamados abertos" value={metrics.chamadosAbertos} accent={gridTheme.accent} icon={<ClipboardList size={16} color={gridTheme.accent} />} />
        <MetricTile label="Em andamento" value={metrics.chamadosEmAndamento} accent={colors.orange} icon={<Wrench size={16} color={colors.orange} />} />
        <MetricTile label="Concluídos" value={metrics.chamadosConcluidos} accent={colors.green} icon={<CheckCircle2 size={16} color={colors.green} />} />
        <MetricTile label="Estoque crítico" value={itensCriticos.length} accent={colors.red} icon={<AlertTriangle size={16} color={colors.red} />} />
        <MetricTile label="Tarefas abertas" value={tarefasAbertas} accent={colors.blue} icon={<ClipboardList size={16} color={colors.blue} />} />
      </MetricGrid>

      <SurfaceCard title="Atalhos rápidos" subtitle="Acesso direto às rotinas de manutenção">
        <View style={styles.quickGrid}>
          <AppButton
            label="Chamados"
            variant="secondary"
            accent={gridTheme.accent}
            icon={<Wrench size={16} color={gridTheme.accent} />}
            onPress={() => router.push(ROUTES.grid.chamados as never)}
            wrapperStyle={styles.quickButton}
          />
          <AppButton
            label="Tarefas"
            variant="secondary"
            accent={colors.blue}
            icon={<ClipboardList size={16} color={colors.blue} />}
            onPress={() => router.push(ROUTES.grid.tarefas as never)}
            wrapperStyle={styles.quickButton}
          />
          <AppButton
            label="Estoque"
            variant="secondary"
            accent={colors.orange}
            icon={<Package size={16} color={colors.orange} />}
            onPress={() => router.push(ROUTES.grid.estoque as never)}
            wrapperStyle={styles.quickButton}
          />
          <AppButton
            label="Mapa"
            variant="secondary"
            accent={colors.red}
            icon={<Map size={16} color={colors.red} />}
            onPress={() => router.push(ROUTES.grid.mapaTarefas as never)}
            wrapperStyle={styles.quickButton}
          />
        </View>
      </SurfaceCard>

      <SurfaceCard title="Chamados recentes" subtitle="Últimas solicitações registradas">
        {chamados.length === 0 ? (
          <Text style={[styles.empty, { color: theme.textMuted }]}>Nenhum dado cadastrado ainda.</Text>
        ) : null}
        {chamados.slice(0, 5).map((chamado) => (
          <ListRow
            key={chamado.id}
            title={`${chamado.codigo ?? 'CH'} - ${chamado.titulo}`}
            subtitle={`${chamado.sala_nome ?? chamado.bloco_nome ?? 'Local não informado'} - ${chamado.prioridade}`}
            badge={chamado.status}
            badgeVariant={chamado.status === 'concluido' ? 'success' : chamado.prioridade === 'urgente' ? 'danger' : 'warning'}
            initials="CH"
            accent={chamado.prioridade === 'urgente' ? colors.red : colors.orange}
          />
        ))}
      </SurfaceCard>

      <ChartCard
        title="Chamados por prioridade"
        subtitle="Distribuição real dos chamados"
        empty={chamados.length === 0}
        summary={`${chamados.length} chamados analisados por prioridade`}
      >
        <InteractiveBarChart data={prioridades} />
      </ChartCard>

      <ChartCard
        title="Chamados por status"
        subtitle="Composicao atual da fila"
        empty={chamados.length === 0}
        summary={`${chamados.length} chamados na base`}
      >
        <DonutStatusChart data={chamadosPorStatus} />
      </ChartCard>

      <ChartCard
        title="Aberturas recentes"
        subtitle="Evolucao de chamados por data"
        empty={chamadosTrend.length === 0}
        summary={`${chamadosTrend.length} pontos recentes de abertura`}
      >
        <TrendLineChart data={chamadosTrend} color={gridTheme.accent} />
      </ChartCard>

      <ChartCard
        title="Tarefas por status"
        subtitle="Distribuicao da execucao operacional"
        empty={tarefas.length === 0}
        summary={`${tarefas.length} tarefas analisadas`}
      >
        <DonutStatusChart data={tarefasPorStatus} />
      </ChartCard>

      <ChartCard
        title="Estoque por status"
        subtitle="Situacao atual dos itens"
        empty={estoque.length === 0}
        summary={`${estoque.length} itens cadastrados`}
      >
        <InteractiveBarChart data={estoquePorStatus} />
      </ChartCard>

      <ChartCard
        title="Estoque por categoria"
        subtitle="Categorias com mais itens cadastrados"
        empty={estoquePorCategoria.length === 0}
        summary={`${estoque.length} itens agrupados por categoria`}
      >
        <InteractiveBarChart data={estoquePorCategoria} />
      </ChartCard>

      <SurfaceCard title="Itens com estoque baixo" subtitle="Peças que exigem reposição">
        {itensCriticos.length === 0 ? (
          <Text style={[styles.empty, { color: theme.textMuted }]}>Nenhum dado cadastrado ainda.</Text>
        ) : null}
        {itensCriticos.slice(0, 5).map((item) => (
          <ListRow
            key={item.id}
            title={item.titulo}
            subtitle={`${item.quantidade_disponivel} ${item.unidade} disponíveis`}
            badge={item.status}
            badgeVariant="danger"
            initials={item.titulo.slice(0, 2).toUpperCase()}
            accent={colors.red}
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
  empty: { fontSize: 12, fontWeight: '700' },
});
