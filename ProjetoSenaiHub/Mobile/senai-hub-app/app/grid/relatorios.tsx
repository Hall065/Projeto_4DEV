import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  CheckCircle2,
  CircleDot,
  ClipboardList,
  PackageSearch,
  UserRoundX,
  Wrench,
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
import { colors, gridTheme } from '@/constants/colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { gridService } from '@/services/grid.service';
import type { Chamado, ItemEstoque, Tarefa } from '@/types/grid.types';
import { buildDateTrend, topGroups } from '@/utils/dashboardAnalytics';
import { useI18n } from '@/hooks/useI18n';

const GRID_PRESETS: MobileReportPreset[] = [
  {
    id: 'operations_full',
    label: 'Operacao completa',
    description: 'Indicadores, chamados, tarefas, responsaveis e estoque.',
    sections: [
      'executive_summary',
      'kpi_cards',
      'tickets_by_status_chart',
      'tickets_by_month_chart',
      'tickets_by_technician_chart',
      'tickets_table',
      'tasks_table',
      'inventory_table',
      'low_stock_table',
    ],
  },
  {
    id: 'maintenance_kpis',
    label: 'Manutencao e SLA',
    description: 'Chamados abertos, prioridades, fluxo e distribuicao da equipe.',
    sections: [
      'executive_summary',
      'kpi_cards',
      'tickets_by_status_chart',
      'tickets_by_month_chart',
      'tickets_by_technician_chart',
      'tickets_table',
      'tasks_table',
    ],
  },
  {
    id: 'inventory',
    label: 'Estoque e reposicao',
    description: 'Posicao do estoque, itens criticos e valor imobilizado.',
    sections: ['executive_summary', 'kpi_cards', 'inventory_table', 'low_stock_table'],
  },
];

export default function RelatoriosGridScreen() {
  const { t } = useI18n();
  const theme = useThemeColors();
  const [mode, setMode] = useState<'summary' | 'builder'>('summary');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [estoque, setEstoque] = useState<ItemEstoque[]>([]);
  const [ticketStatus, setTicketStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [block, setBlock] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [ticketData, taskData, stockData] = await Promise.all([
        gridService.listChamados(),
        gridService.listTarefas(),
        gridService.listEstoque(),
      ]);
      setChamados(ticketData);
      setTarefas(taskData);
      setEstoque(stockData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Nao foi possivel carregar os dados operacionais.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredTickets = useMemo(
    () =>
      chamados.filter(
        (ticket) =>
          (ticketStatus === 'all' || normalizeTicketStatus(ticket.status) === ticketStatus) &&
          (priority === 'all' || normalize(ticket.prioridade) === priority) &&
          (block === 'all' || ticketBlock(ticket) === block) &&
          inDateRange(ticketDate(ticket), fromDate, toDate)
      ),
    [block, chamados, fromDate, priority, ticketStatus, toDate]
  );

  const filteredTicketIds = useMemo(
    () => new Set(filteredTickets.map((ticket) => ticket.id)),
    [filteredTickets]
  );

  const filteredTasks = useMemo(
    () =>
      tarefas.filter(
        (task) =>
          filteredTicketIds.has(task.chamado_id) &&
          inDateRange(taskDate(task), fromDate, toDate, true)
      ),
    [filteredTicketIds, fromDate, tarefas, toDate]
  );

  const openTickets = filteredTickets.filter((ticket) =>
    ['aberto', 'aguardando'].includes(normalizeTicketStatus(ticket.status))
  ).length;
  const inProgressTickets = filteredTickets.filter(
    (ticket) => normalizeTicketStatus(ticket.status) === 'em_andamento'
  ).length;
  const finishedTickets = filteredTickets.filter(
    (ticket) => normalizeTicketStatus(ticket.status) === 'concluido'
  ).length;
  const urgentTickets = filteredTickets.filter(
    (ticket) => normalize(ticket.prioridade) === 'urgente'
  ).length;
  const withoutTechnician = filteredTickets.filter(
    (ticket) =>
      !ticket.responsavel_id &&
      !ticket.responsavel_nome &&
      normalizeTicketStatus(ticket.status) !== 'concluido'
  ).length;
  const awaitingEvaluation = filteredTickets.filter(
    (ticket) =>
      normalizeTicketStatus(ticket.status) === 'concluido' &&
      !ticket.avaliado_em &&
      ticket.avaliacao_nota == null
  ).length;
  const completedTasks = filteredTasks.filter((task) => isTaskCompleted(task.status)).length;
  const lowStock = estoque.filter(isLowStock);
  const inventoryValue = estoque.reduce(
    (sum, item) => sum + item.quantidade_disponivel * (item.custo ?? 0),
    0
  );

  const ticketStatusChart = useMemo(
    () => [
      { label: 'Abertos', value: filteredTickets.filter((ticket) => normalizeTicketStatus(ticket.status) === 'aberto').length, color: colors.orange },
      { label: 'Aguardando', value: filteredTickets.filter((ticket) => normalizeTicketStatus(ticket.status) === 'aguardando').length, color: colors.purple },
      { label: 'Em andamento', value: inProgressTickets, color: colors.blue },
      { label: 'Concluidos', value: finishedTickets, color: colors.green },
      { label: 'Cancelados', value: filteredTickets.filter((ticket) => normalizeTicketStatus(ticket.status) === 'cancelado').length, color: colors.grayText },
    ],
    [filteredTickets, finishedTickets, inProgressTickets]
  );
  const ticketTrend = buildDateTrend(
    filteredTickets,
    ['criado_em', 'created_at', 'data_abertura'],
    { limit: 10 }
  );
  const ticketsByTechnician = topGroups(
    filteredTickets,
    (ticket) => ticket.responsavel_nome,
    { limit: 8, fallbackLabel: 'Sem responsavel' }
  );

  const reportSections = useMemo<MobileReportSection[]>(
    () => [
      {
        id: 'executive_summary',
        label: 'Resumo executivo',
        description: 'Leitura objetiva da operacao no periodo.',
        kind: 'summary',
        paragraphs: [
          `${filteredTickets.length} chamados foram analisados; ${openTickets} seguem abertos e ${inProgressTickets} estao em andamento.`,
          `${withoutTechnician} chamados ainda nao possuem responsavel e ${urgentTickets} estao marcados como urgentes.`,
          `O estoque possui ${lowStock.length} itens criticos e valor estimado de ${formatCurrency(inventoryValue)}.`,
        ],
      },
      {
        id: 'kpi_cards',
        label: 'Indicadores operacionais',
        description: 'Situacao dos chamados, tarefas e estoque.',
        kind: 'metrics',
        items: [
          { label: 'Criados', value: filteredTickets.length, color: colors.red },
          { label: 'Pendentes', value: openTickets, color: colors.orange },
          { label: 'Sem tecnico', value: withoutTechnician, color: colors.purple },
          { label: 'Em andamento', value: inProgressTickets, color: colors.blue },
          { label: 'Aguardando avaliacao', value: awaitingEvaluation, color: colors.cyan },
          { label: 'Finalizados', value: finishedTickets, color: colors.green },
          { label: 'Urgentes', value: urgentTickets, color: colors.red },
          { label: 'Estoque critico', value: lowStock.length, color: colors.orange },
        ],
      },
      {
        id: 'tickets_by_status_chart',
        label: 'Chamados por status',
        description: 'Distribuicao do fluxo operacional.',
        kind: 'donut',
        items: ticketStatusChart,
      },
      {
        id: 'tickets_by_month_chart',
        label: 'Chamados ao longo do periodo',
        description: 'Evolucao do volume de solicitacoes.',
        kind: 'trend',
        items: ticketTrend,
      },
      {
        id: 'tickets_by_technician_chart',
        label: 'Chamados por responsavel',
        description: 'Distribuicao da demanda entre a equipe.',
        kind: 'bar',
        items: ticketsByTechnician,
      },
      {
        id: 'tickets_table',
        label: 'Chamados',
        description: 'Detalhamento das solicitacoes filtradas.',
        kind: 'table',
        columns: [
          { key: 'codigo', label: 'Codigo' },
          { key: 'titulo', label: 'Titulo' },
          { key: 'status', label: 'Status' },
          { key: 'prioridade', label: 'Prioridade' },
          { key: 'bloco', label: 'Bloco' },
          { key: 'sala', label: 'Sala' },
          { key: 'categoria', label: 'Categoria' },
          { key: 'solicitante', label: 'Solicitante' },
          { key: 'responsavel', label: 'Responsavel' },
          { key: 'abertura', label: 'Abertura' },
          { key: 'conclusao', label: 'Conclusao' },
          { key: 'avaliacao', label: 'Avaliacao' },
        ],
        rows: filteredTickets.map((ticket) => ({
          codigo: ticket.codigo,
          titulo: ticket.titulo,
          status: statusLabel(ticket.status),
          prioridade: statusLabel(ticket.prioridade),
          bloco: ticket.bloco_nome ?? ticket.bloco_texto,
          sala: ticket.sala_nome ?? ticket.sala_texto,
          categoria: ticket.categoria_nome,
          solicitante: ticket.solicitante_nome,
          responsavel: ticket.responsavel_nome ?? 'Sem responsavel',
          abertura: formatDateTime(ticketDate(ticket)),
          conclusao: formatDateTime(ticket.concluido_em ?? ticket.data_fechamento),
          avaliacao: ticket.avaliacao_nota == null ? '-' : `${ticket.avaliacao_nota}/5`,
        })),
      },
      {
        id: 'tasks_table',
        label: 'Tarefas',
        description: 'Execucao das atividades ligadas aos chamados.',
        kind: 'table',
        columns: [
          { key: 'chamado', label: 'Chamado' },
          { key: 'titulo', label: 'Titulo' },
          { key: 'status', label: 'Status' },
          { key: 'prioridade', label: 'Prioridade' },
          { key: 'responsavel', label: 'Responsavel' },
          { key: 'local', label: 'Local' },
          { key: 'abertura', label: 'Abertura' },
          { key: 'inicio', label: 'Inicio' },
          { key: 'conclusao', label: 'Conclusao' },
        ],
        rows: filteredTasks.map((task) => ({
          chamado: task.chamado_codigo ?? task.codigo,
          titulo: task.titulo,
          status: statusLabel(task.status),
          prioridade: statusLabel(task.prioridade),
          responsavel: task.responsavel_nome ?? 'Sem responsavel',
          local: [task.bloco_nome, task.sala_nome].filter(Boolean).join(' - '),
          abertura: formatDateTime(task.aberto_em ?? task.criado_em ?? task.created_at),
          inicio: formatDateTime(task.inicio_reparo ?? task.data_inicio_reparo),
          conclusao: formatDateTime(task.concluido_em ?? task.fim_reparo ?? task.data_termino_reparo),
        })),
      },
      {
        id: 'inventory_table',
        label: 'Estoque',
        description: 'Posicao atual dos materiais e equipamentos.',
        kind: 'table',
        columns: [
          { key: 'item', label: 'Item' },
          { key: 'categoria', label: 'Categoria' },
          { key: 'quantidade', label: 'Quantidade' },
          { key: 'minimo', label: 'Minimo' },
          { key: 'unidade', label: 'Unidade' },
          { key: 'localizacao', label: 'Localizacao' },
          { key: 'fornecedor', label: 'Fornecedor' },
          { key: 'custo', label: 'Custo unitario' },
          { key: 'valor_total', label: 'Valor total' },
          { key: 'status', label: 'Status' },
        ],
        rows: estoque.map(inventoryRow),
      },
      {
        id: 'low_stock_table',
        label: 'Itens com estoque baixo',
        description: 'Materiais que precisam de reposicao.',
        kind: 'table',
        columns: [
          { key: 'item', label: 'Item' },
          { key: 'categoria', label: 'Categoria' },
          { key: 'quantidade', label: 'Quantidade' },
          { key: 'minimo', label: 'Minimo' },
          { key: 'localizacao', label: 'Localizacao' },
          { key: 'fornecedor', label: 'Fornecedor' },
          { key: 'status', label: 'Status' },
        ],
        rows: lowStock.map(inventoryRow),
      },
    ],
    [
      awaitingEvaluation,
      filteredTasks,
      filteredTickets,
      finishedTickets,
      inProgressTickets,
      inventoryValue,
      lowStock,
      openTickets,
      estoque,
      ticketStatusChart,
      ticketTrend,
      ticketsByTechnician,
      urgentTickets,
      withoutTechnician,
    ]
  );

  const blocks = Array.from(
    new Set(chamados.map(ticketBlock).filter((value): value is string => Boolean(value)))
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const filterSummary = [
    ticketStatus === 'all' ? 'Todos os status' : statusLabel(ticketStatus),
    priority === 'all' ? 'Todas as prioridades' : statusLabel(priority),
    block === 'all' ? 'Todos os blocos' : block,
    fromDate || toDate ? `${fromDate || 'inicio'} a ${toDate || 'hoje'}` : 'Todo o periodo',
  ];

  return (
    <ModuleScreen
      analysis={{ datasets: { chamados: filteredTickets, tarefas: filteredTasks, estoque }, filters: { ticketStatus, priority, block, fromDate, toDate, mode }, limitations: ['Estoque representa o estado atual, sem filtro histórico.', ...(mode === 'builder' ? ['Análise do resumo filtrado; seleções internas do construtor não estão incluídas.'] : [])], error }}
      kicker="SENAI Grid"
      title="Relatorios operacionais"
      description="Acompanhe chamados, tarefas, equipe e estoque em um unico fluxo."
      isLoading={loading}
      actionLabel="Atualizar"
      onActionPress={loadData}
    >
      {error ? <FeedbackMessage message={error} variant="danger" /> : null}
      <ReportTabs value={mode} onChange={setMode} accent={gridTheme.accent} />

      {mode === 'summary' ? (
        <View>
          <MetricGrid>
            <MetricTile
              label="Chamados abertos"
              value={openTickets}
              hint={`${urgentTickets} urgentes`}
              accent={colors.orange}
              icon={<CircleDot size={16} color={colors.orange} />}
            />
            <MetricTile
              label="Em andamento"
              value={inProgressTickets}
              accent={colors.blue}
              icon={<Wrench size={16} color={colors.blue} />}
            />
            <MetricTile
              label="Sem responsavel"
              value={withoutTechnician}
              accent={colors.purple}
              icon={<UserRoundX size={16} color={colors.purple} />}
            />
            <MetricTile
              label="Finalizados"
              value={finishedTickets}
              accent={colors.green}
              icon={<CheckCircle2 size={16} color={colors.green} />}
            />
            <MetricTile
              label="Tarefas concluidas"
              value={completedTasks}
              hint={`${filteredTasks.length} tarefas`}
              accent={colors.cyan}
              icon={<ClipboardList size={16} color={colors.cyan} />}
            />
            <MetricTile
              label="Estoque critico"
              value={lowStock.length}
              accent={colors.red}
              icon={<PackageSearch size={16} color={colors.red} />}
            />
          </MetricGrid>

          <ChartCard
            title="Chamados por status"
            subtitle="Toque em uma categoria para detalhar"
            empty={!filteredTickets.length}
            summary={`${filteredTickets.length} chamados analisados`}
          >
            <DonutStatusChart data={ticketStatusChart} />
          </ChartCard>

          <ChartCard
            title="Volume de chamados"
            subtitle="Evolucao das solicitacoes no periodo"
            empty={!ticketTrend.length}
          >
            <TrendLineChart data={ticketTrend} color={gridTheme.accent} />
          </ChartCard>

          <ChartCard
            title="Distribuicao por responsavel"
            subtitle="Carga atual da equipe de manutencao"
            empty={!ticketsByTechnician.length}
          >
            <InteractiveBarChart data={ticketsByTechnician} />
          </ChartCard>

          <SurfaceCard title="Chamados recentes" subtitle="Prioridades para acompanhamento">
            {filteredTickets.length ? (
              filteredTickets
                .slice()
                .sort((a, b) => (ticketDate(b) ?? '').localeCompare(ticketDate(a) ?? ''))
                .slice(0, 6)
                .map((ticket) => (
                  <View
                    key={ticket.id}
                    style={[styles.ticketRow, { borderBottomColor: theme.line }]}
                  >
                    <View
                      style={[
                        styles.priorityMark,
                        { backgroundColor: priorityColor(ticket.prioridade) },
                      ]}
                    />
                    <View style={styles.ticketBody}>
                      <Text numberOfLines={1} style={[styles.ticketTitle, { color: theme.text }]}>
                        {ticket.codigo} | {ticket.titulo}
                      </Text>
                      <Text numberOfLines={1} style={[styles.ticketMeta, { color: theme.textMuted }]}>
                        {ticket.responsavel_nome ?? t("Sem responsavel")} | {ticket.bloco_nome ?? ticket.bloco_texto ?? t("Local nao informado")}
                      </Text>
                    </View>
                    <Text style={[styles.ticketStatus, { color: priorityColor(ticket.prioridade) }]}>
                      {statusLabel(ticket.status)}
                    </Text>
                  </View>
                ))
            ) : (
              <Text style={[styles.empty, { color: theme.textMuted }]}>
                {t("Nenhum chamado encontrado.")}</Text>
            )}
          </SurfaceCard>

          {lowStock.length ? (
            <FeedbackMessage
              variant="warning"
              message={`${lowStock.length} itens estao no nivel minimo ou abaixo dele.`}
            />
          ) : null}
        </View>
      ) : (
        <MobileReportBuilder
          moduleKey="grid"
          defaultTitle="Relatorio operacional"
          defaultSubtitle="Chamados, tarefas, equipe tecnica e estoque"
          accent={gridTheme.accent}
          presets={GRID_PRESETS}
          sections={reportSections}
          filterSummary={filterSummary}
          revisionKey={[ticketStatus, priority, block, fromDate, toDate].join('|')}
          filterControls={
            <View>
              <ChoiceChips
                label="Status do chamado"
                value={ticketStatus}
                options={[
                  { label: 'Todos', value: 'all' },
                  { label: 'Abertos', value: 'aberto' },
                  { label: 'Aguardando', value: 'aguardando' },
                  { label: 'Em andamento', value: 'em_andamento' },
                  { label: 'Concluidos', value: 'concluido' },
                  { label: 'Cancelados', value: 'cancelado' },
                ]}
                onChange={setTicketStatus}
                accent={gridTheme.accent}
              />
              <ChoiceChips
                label="Prioridade"
                value={priority}
                options={[
                  { label: 'Todas', value: 'all' },
                  { label: 'Baixa', value: 'baixa' },
                  { label: 'Media', value: 'media' },
                  { label: 'Alta', value: 'alta' },
                  { label: 'Urgente', value: 'urgente' },
                ]}
                onChange={setPriority}
                accent={gridTheme.accent}
              />
              <ChoiceChips
                label="Bloco"
                value={block}
                options={[
                  { label: 'Todos', value: 'all' },
                  ...blocks.map((item) => ({ label: item, value: item })),
                ]}
                onChange={setBlock}
                accent={gridTheme.accent}
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

function inventoryRow(item: ItemEstoque) {
  return {
    item: item.titulo,
    categoria: item.categoria_nome,
    quantidade: item.quantidade_disponivel,
    minimo: item.quantidade_minima,
    unidade: item.unidade,
    localizacao: item.localizacao,
    fornecedor: item.fornecedor_nome ?? item.empresa_distribuidora,
    custo: formatCurrency(item.custo),
    valor_total: formatCurrency(item.quantidade_disponivel * (item.custo ?? 0)),
    status: statusLabel(item.status),
  };
}

function ticketDate(ticket: Chamado) {
  return ticket.criado_em ?? ticket.created_at ?? ticket.data_abertura;
}

function taskDate(task: Tarefa) {
  return task.aberto_em ?? task.criado_em ?? task.created_at;
}

function ticketBlock(ticket: Chamado) {
  return ticket.bloco_nome ?? ticket.bloco_texto ?? ticket.bloco_id ?? '';
}

function normalize(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function normalizeTicketStatus(value?: string | null) {
  const status = normalize(value);
  if (status === 'em_atendimento') return 'em_andamento';
  if (status === 'concluida') return 'concluido';
  return status;
}

function isTaskCompleted(value?: string | null) {
  return ['concluida', 'concluido'].includes(normalize(value));
}

function isLowStock(item: ItemEstoque) {
  return (
    item.status === 'estoque_baixo' ||
    item.status === 'esgotado' ||
    item.quantidade_disponivel <= item.quantidade_minima
  );
}

function inDateRange(value?: string | null, fromDate?: string, toDate?: string, allowMissing = false) {
  if (!fromDate && !toDate) return true;
  if (!value) return allowMissing;
  const date = value.slice(0, 10);
  if (fromDate && date < fromDate) return false;
  if (toDate && date > toDate) return false;
  return true;
}

function statusLabel(value?: string | null) {
  if (!value) return '-';
  return normalize(value)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function formatCurrency(value?: number | null) {
  if (value == null) return '-';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function priorityColor(value?: string | null) {
  const priority = normalize(value);
  if (priority === 'urgente') return colors.red;
  if (priority === 'alta') return colors.orange;
  if (priority === 'media') return colors.blue;
  return colors.green;
}

const styles = StyleSheet.create({
  ticketRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderBottomWidth: 1,
    paddingVertical: 9,
  },
  priorityMark: {
    width: 5,
    alignSelf: 'stretch',
    borderRadius: 3,
  },
  ticketBody: {
    flex: 1,
    minWidth: 0,
  },
  ticketTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  ticketMeta: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
  },
  ticketStatus: {
    maxWidth: 82,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'right',
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
