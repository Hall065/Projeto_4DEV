import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  ImageIcon,
  MapPin,
  Play,
  UserCheck,
  UserRound,
  Wrench,
} from 'lucide-react-native';
import { CrudModal, type CrudField, type CrudOption } from '@/components/common/CrudModal';
import {
  AnimatedPressable,
  AppButton,
  FeedbackMessage,
  MetricTile,
  Pill,
  SearchField,
  SurfaceCard,
} from '@/components/common/VisualPrimitives';
import {
  InfoRow,
  WorkflowProgress,
  WorkflowSheet,
  WorkflowTabs,
  type WorkflowTab,
} from '@/components/grid/GridWorkflowUI';
import { ModuleScreen } from '@/components/screens/ModuleScreen';
import { colors, gridTheme } from '@/constants/colors';
import { CHAMADO_PRIORIDADE_OPTIONS } from '@/constants/form-options';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useCrudResource } from '@/hooks/useCrudResource';
import { useI18n } from '@/hooks/useI18n';
import { useSelectOptions } from '@/hooks/useSelectOptions';
import { useThemeColors } from '@/hooks/useThemeColors';
import { gridService } from '@/services/grid.service';
import { useAuthStore } from '@/stores/auth.store';
import { formatAppDateTime, formatAppNumber } from '@/utils/locale';
import type {
  Chamado,
  ChamadoPrioridade,
  Tarefa,
  TarefaStatus,
} from '@/types/grid.types';

const chamadoOptionLoaders = {
  categorias: gridService.listCategoriaOptions,
  blocos: gridService.listBlocoOptions,
  salas: gridService.listSalaOptions,
  responsaveis: () => gridService.listMaintenanceUsuarioOptions().catch(() => []),
};

type ChamadoOptionKey = keyof typeof chamadoOptionLoaders;
type ChamadoOptions = Record<ChamadoOptionKey, CrudOption[]>;
type TicketStage =
  | 'todos'
  | 'aberto'
  | 'pendente'
  | 'em_atendimento'
  | 'validacao'
  | 'concluido';

const workflowSteps = [
  { label: 'Aberto', color: colors.blue },
  { label: 'Atribuido', color: colors.purple },
  { label: 'Em atendimento', color: colors.orange },
  { label: 'Validacao', color: colors.yellow },
  { label: 'Concluido', color: colors.green },
];

function getFields(options: Partial<ChamadoOptions>, requesterOnly = false): CrudField[] {
  const baseFields: CrudField[] = [
    { name: 'titulo', label: 'Titulo', required: true },
    { name: 'descricao', label: 'Descricao', required: true, multiline: true },
    { name: 'prioridade', label: 'Prioridade', required: true, options: CHAMADO_PRIORIDADE_OPTIONS },
    {
      name: 'categoria_id',
      label: 'Categoria',
      options: options.categorias ?? [],
      emptyOptionLabel: 'Sem categoria',
    },
    { name: 'bloco_id', label: 'Bloco', options: options.blocos ?? [], emptyOptionLabel: 'Sem bloco' },
    { name: 'sala_id', label: 'Sala', options: options.salas ?? [], emptyOptionLabel: 'Sem sala' },
    { name: 'anexo_uri', label: 'Imagem do problema', type: 'image' },
  ];

  if (requesterOnly) return baseFields;

  return [
    ...baseFields.slice(0, 3),
    {
      name: 'responsavel_id',
      label: 'Responsavel',
      options: options.responsaveis ?? [],
      emptyOptionLabel: 'Sem responsavel',
    },
    ...baseFields.slice(3),
    { name: 'resumo_resolucao', label: 'Resumo da resolucao', multiline: true },
    { name: 'consideracoes', label: 'Consideracoes internas', multiline: true },
    { name: 'evidencia_uri', label: 'Evidencia de conclusao', type: 'image' },
  ];
}

function formValues(chamado: Chamado): Record<string, string> {
  return {
    titulo: chamado.titulo ?? '',
    descricao: chamado.descricao ?? '',
    prioridade: chamado.prioridade ?? 'media',
    status: normalizeTicketStatus(chamado.status),
    responsavel_id: chamado.responsavel_id ?? '',
    categoria_id: chamado.categoria_id ?? '',
    bloco_id: chamado.bloco_id ?? '',
    sala_id: chamado.sala_id ?? '',
    resumo_resolucao: chamado.resumo_resolucao ?? '',
    consideracoes: chamado.consideracoes ?? '',
    anexo_uri: chamado.imagem_url ?? '',
    evidencia_uri: chamado.evidencia_url ?? '',
  };
}

function normalizeTicketStatus(status?: string | null) {
  if (status === 'em_atendimento') return 'em_andamento';
  if (status === 'concluida') return 'concluido';
  if (status === 'cancelado') return 'concluido';
  if (status === 'aguardando') return 'aguardando';
  if (status === 'em_andamento') return 'em_andamento';
  if (status === 'concluido') return 'concluido';
  return 'aberto';
}

function normalizeTaskStatus(status?: TarefaStatus | null) {
  if (status === 'concluida' || status === 'concluido') return 'concluida';
  if (status === 'em_andamento') return 'em_andamento';
  return 'a_fazer';
}

function getTicketStage(chamado: Chamado, tarefas: Tarefa[]): Exclude<TicketStage, 'todos'> {
  if (['concluido', 'concluida', 'cancelado'].includes(chamado.status)) return 'concluido';

  const linkedTasks = tarefas.filter((tarefa) => tarefa.chamado_id === chamado.id);
  if (linkedTasks.some((tarefa) => normalizeTaskStatus(tarefa.status) === 'concluida')) {
    return 'validacao';
  }
  if (
    linkedTasks.some((tarefa) => normalizeTaskStatus(tarefa.status) === 'em_andamento') ||
    ['em_andamento', 'em_atendimento'].includes(chamado.status)
  ) {
    return 'em_atendimento';
  }
  if (linkedTasks.length > 0 || chamado.responsavel_id || chamado.status === 'aguardando') {
    return 'pendente';
  }
  return 'aberto';
}

function stageLabel(stage: Exclude<TicketStage, 'todos'>) {
  if (stage === 'pendente') return 'Atribuido';
  if (stage === 'em_atendimento') return 'Em atendimento';
  if (stage === 'validacao') return 'Aguardando validacao';
  if (stage === 'concluido') return 'Concluido';
  return 'Aberto';
}

function stageVariant(stage: Exclude<TicketStage, 'todos'>) {
  if (stage === 'concluido') return 'success' as const;
  if (stage === 'em_atendimento') return 'warning' as const;
  if (stage === 'validacao') return 'info' as const;
  if (stage === 'pendente') return 'neutral' as const;
  return 'info' as const;
}

function priorityLabel(priority?: ChamadoPrioridade) {
  if (priority === 'urgente') return 'Urgente';
  if (priority === 'alta') return 'Alta';
  if (priority === 'baixa') return 'Baixa';
  return 'Media';
}

function priorityVariant(priority?: ChamadoPrioridade) {
  if (priority === 'urgente' || priority === 'alta') return 'danger' as const;
  if (priority === 'baixa') return 'success' as const;
  return 'warning' as const;
}

function stageIndex(stage: Exclude<TicketStage, 'todos'>) {
  const order: Exclude<TicketStage, 'todos'>[] = [
    'aberto',
    'pendente',
    'em_atendimento',
    'validacao',
    'concluido',
  ];
  return Math.max(0, order.indexOf(stage));
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '').trim();
    if (message) return message;
  }
  return fallback;
}

function TicketCard({
  chamado,
  stage,
  linkedTask,
  canManage,
  busy,
  onOpen,
  onEdit,
  onAssign,
  onStart,
  onValidate,
  onDelete,
}: {
  chamado: Chamado;
  stage: Exclude<TicketStage, 'todos'>;
  linkedTask?: Tarefa;
  canManage: boolean;
  busy: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onAssign: () => void;
  onStart: () => void;
  onValidate: () => void;
  onDelete: () => void;
}) {
  const theme = useThemeColors();
  const { language, t } = useI18n();
  const accent =
    chamado.prioridade === 'urgente' || chamado.prioridade === 'alta'
      ? colors.red
      : stage === 'concluido'
        ? colors.green
        : stage === 'em_atendimento'
          ? colors.orange
          : colors.blue;

  return (
    <View
      style={[
        styles.ticketCard,
        {
          backgroundColor: theme.surface,
          borderColor: theme.line,
          borderLeftColor: accent,
        },
      ]}
    >
      <AnimatedPressable onPress={onOpen} style={styles.ticketCardMain}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeading}>
            <Text style={styles.code}>{chamado.codigo ?? t("CHAMADO")}</Text>
            <Text numberOfLines={2} style={[styles.cardTitle, { color: theme.text }]}>
              {chamado.titulo}
            </Text>
          </View>
          <Pill label={stageLabel(stage)} variant={stageVariant(stage)} />
        </View>

        {chamado.descricao ? (
          <Text numberOfLines={2} style={[styles.cardDescription, { color: theme.textMuted }]}>
            {chamado.descricao}
          </Text>
        ) : null}

        <View style={styles.cardMetaGrid}>
          <View style={styles.cardMeta}>
            <UserRound size={14} color={theme.textMuted} />
            <Text numberOfLines={1} style={[styles.cardMetaText, { color: theme.textMuted }]}>
              {chamado.solicitante_nome ?? t('Solicitante nao identificado')}
            </Text>
          </View>
          <View style={styles.cardMeta}>
            <MapPin size={14} color={theme.textMuted} />
            <Text numberOfLines={1} style={[styles.cardMetaText, { color: theme.textMuted }]}>
              {[chamado.bloco_nome, chamado.sala_nome].filter(Boolean).join(' / ') ||
                t('Local nao informado')}
            </Text>
          </View>
          <View style={styles.cardMeta}>
            <Wrench size={14} color={theme.textMuted} />
            <Text numberOfLines={1} style={[styles.cardMetaText, { color: theme.textMuted }]}>
              {chamado.responsavel_nome ?? t('Sem responsavel')}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.cardBadges}>
            <Pill
              label={priorityLabel(chamado.prioridade)}
              variant={priorityVariant(chamado.prioridade)}
            />
            {chamado.categoria_nome ? (
              <Pill label={chamado.categoria_nome} variant="neutral" />
            ) : null}
          </View>
          <Text style={[styles.cardDate, { color: theme.textSubtle }]}>
            {formatAppDateTime(
              chamado.data_abertura ?? chamado.created_at ?? chamado.criado_em,
              language,
              t('Nao informado')
            )}
          </Text>
        </View>

        {linkedTask ? (
          <View style={[styles.linkedTask, { backgroundColor: theme.surfaceSoft }]}>
            <ClipboardCheck size={14} color={colors.blue} />
            <Text numberOfLines={1} style={[styles.linkedTaskText, { color: theme.text }]}>
              {linkedTask.codigo ?? t('Tarefa vinculada')} - {t(statusTaskLabel(linkedTask.status))}
            </Text>
          </View>
        ) : null}
      </AnimatedPressable>

      <View style={[styles.cardActions, { borderTopColor: theme.line }]}>
        <AppButton
          label="Detalhes"
          variant="ghost"
          accent={colors.navy}
          onPress={onOpen}
          wrapperStyle={styles.cardAction}
          style={styles.compactButton}
        />
        {canManage ? (
          <>
            <AppButton
              label="Editar"
              variant="secondary"
              accent={colors.navy}
              onPress={onEdit}
              wrapperStyle={styles.cardAction}
              style={styles.compactButton}
            />
            {stage === 'aberto' ? (
              <AppButton
                label="Atribuir"
                accent={colors.purple}
                icon={<UserCheck size={14} color={colors.white} />}
                onPress={onAssign}
                wrapperStyle={styles.cardAction}
                style={styles.compactButton}
              />
            ) : stage === 'pendente' ? (
              <AppButton
                label="Iniciar"
                accent={colors.orange}
                icon={<Play size={14} color={colors.white} />}
                loading={busy}
                onPress={onStart}
                wrapperStyle={styles.cardAction}
                style={styles.compactButton}
              />
            ) : stage === 'validacao' ? (
              <AppButton
                label="Validar"
                accent={colors.green}
                icon={<CheckCircle2 size={14} color={colors.white} />}
                onPress={onValidate}
                wrapperStyle={styles.cardAction}
                style={styles.compactButton}
              />
            ) : null}
          </>
        ) : null}
      </View>

      {canManage ? (
        <AnimatedPressable onPress={onDelete} style={styles.deleteLink}>
          <Text style={styles.deleteLinkText}>{t('Excluir chamado')}</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

function statusTaskLabel(status?: TarefaStatus | null) {
  const normalized = normalizeTaskStatus(status);
  if (normalized === 'concluida') return 'Concluida';
  if (normalized === 'em_andamento') return 'Em andamento';
  return 'A fazer';
}

export default function ChamadosScreen() {
  const theme = useThemeColors();
  const { language, t } = useI18n();
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Chamado | null>(null);
  const [assigning, setAssigning] = useState<Chamado | null>(null);
  const [closing, setClosing] = useState<Chamado | null>(null);
  const [selected, setSelected] = useState<Chamado | null>(null);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [search, setSearch] = useState('');
  const [activeStage, setActiveStage] = useState<TicketStage>('todos');
  const [priority, setPriority] = useState<'todas' | ChamadoPrioridade>('todas');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const session = useAuthStore((state) => state.session);
  const role = session?.perfil?.tipo;
  const requesterOnly = role === 'professor';
  const canManage = ['admin', 'direcao', 'gerente_manutencao', 'grid_chefe'].includes(role ?? '');
  const { options, error: optionsError } = useSelectOptions(chamadoOptionLoaders);
  const fields = getFields(options, requesterOnly);

  const loadChamados = useCallback(async () => {
    const [chamados, taskRows] = await Promise.all([
      gridService.listChamados(),
      gridService.listTarefas(),
    ]);
    setTarefas(taskRows);
    if (!requesterOnly || !session?.userId) return chamados;
    return chamados.filter(
      (chamado) =>
        chamado.aberto_por === session.userId || chamado.solicitante_id === session.userId
    );
  }, [requesterOnly, session?.userId]);

  const {
    items,
    loading,
    submitting,
    error,
    reload,
    createItem,
    updateItem,
    deleteItem,
  } = useCrudResource<Chamado, Record<string, string>>({
    load: loadChamados,
    create: (values) => gridService.createChamado(values, session?.userId),
    update: gridService.updateChamado,
    remove: gridService.deleteChamado,
  });

  const searched = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((chamado) => {
      if (priority !== 'todas' && chamado.prioridade !== priority) return false;
      if (!query) return true;
      return [
        chamado.codigo,
        chamado.titulo,
        chamado.descricao,
        chamado.solicitante_nome,
        chamado.responsavel_nome,
        chamado.sala_nome,
        chamado.bloco_nome,
        chamado.categoria_nome,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [items, priority, search]);

  const stagesById = useMemo(
    () =>
      new Map(
        searched.map((chamado) => [chamado.id, getTicketStage(chamado, tarefas)] as const)
      ),
    [searched, tarefas]
  );

  const stageCounts = useMemo(
    () => ({
      todos: searched.length,
      aberto: searched.filter((item) => stagesById.get(item.id) === 'aberto').length,
      pendente: searched.filter((item) => stagesById.get(item.id) === 'pendente').length,
      em_atendimento: searched.filter((item) => stagesById.get(item.id) === 'em_atendimento').length,
      validacao: searched.filter((item) => stagesById.get(item.id) === 'validacao').length,
      concluido: searched.filter((item) => stagesById.get(item.id) === 'concluido').length,
    }),
    [searched, stagesById]
  );

  const tabs: WorkflowTab[] = [
    { id: 'todos', label: 'Todos', count: stageCounts.todos, color: colors.navy },
    { id: 'aberto', label: 'Abertos', count: stageCounts.aberto, color: colors.blue },
    { id: 'pendente', label: 'Atribuidos', count: stageCounts.pendente, color: colors.purple },
    {
      id: 'em_atendimento',
      label: 'Em atendimento',
      count: stageCounts.em_atendimento,
      color: colors.orange,
    },
    { id: 'validacao', label: 'Validacao', count: stageCounts.validacao, color: '#CA8A04' },
    { id: 'concluido', label: 'Concluidos', count: stageCounts.concluido, color: colors.green },
  ];

  const visibleTickets = useMemo(
    () =>
      searched
        .filter(
          (chamado) => activeStage === 'todos' || stagesById.get(chamado.id) === activeStage
        )
        .sort((a, b) => {
          const priorityOrder: Record<string, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 };
          const priorityDiff =
            (priorityOrder[a.prioridade] ?? 2) - (priorityOrder[b.prioridade] ?? 2);
          if (priorityDiff !== 0) return priorityDiff;
          return String(b.created_at ?? b.criado_em ?? '').localeCompare(
            String(a.created_at ?? a.criado_em ?? '')
          );
        }),
    [activeStage, searched, stagesById]
  );

  const relatedTask = (chamadoId: string) =>
    tarefas.find((tarefa) => tarefa.chamado_id === chamadoId);

  const assignTicket = async (values: Record<string, string>) => {
    if (!assigning) return;
    await gridService.assignChamado(assigning.id, values.responsavel_id);
    setAssigning(null);
    setSuccess('Responsavel atribuido ao chamado.');
    await reload();
  };

  const startTicket = async (chamado: Chamado) => {
    const confirmed = await confirm({
      title: 'Iniciar atendimento',
      message: `Iniciar "${chamado.titulo}" e mover a tarefa vinculada para em andamento?`,
      confirmLabel: 'Iniciar',
    });
    if (!confirmed) return;

    setBusyId(chamado.id);
    setSuccess(null);
    setActionError(null);
    try {
      await gridService.startChamado(chamado.id);
      setSelected(null);
      setSuccess('Atendimento iniciado e tarefa atualizada.');
      await reload();
    } catch (startError) {
      setActionError(getErrorMessage(startError, 'Nao foi possivel iniciar o atendimento.'));
    } finally {
      setBusyId(null);
    }
  };

  const validateTicket = async (values: Record<string, string>) => {
    if (!closing) return;
    await updateItem(closing.id, {
      ...formValues(closing),
      ...values,
      status: 'concluido',
    });
    setClosing(null);
    setSelected(null);
    setSuccess('Servico validado e chamado concluido.');
  };

  return (
    <>
      <ModuleScreen
        kicker="SENAI Grid"
        title="Chamados"
        description={
          requesterOnly
            ? 'Abra uma solicitacao e acompanhe cada etapa do atendimento.'
            : 'Triagem visual para atribuir, iniciar e validar os servicos de manutencao.'
        }
        isLoading={loading}
        actionLabel="+ Abrir chamado"
        onActionPress={() => {
          setEditing(null);
          setModalOpen(true);
        }}
      >
        <View style={styles.metricGrid}>
          <MetricTile
            label="Abertos"
            value={items.filter((item) => getTicketStage(item, tarefas) === 'aberto').length}
            accent={colors.blue}
            icon={<ClipboardList size={16} color={colors.blue} />}
            style={styles.metric}
          />
          <MetricTile
            label="Alta prioridade"
            value={items.filter((item) => item.prioridade === 'alta' || item.prioridade === 'urgente').length}
            accent={colors.red}
            icon={<AlertCircle size={16} color={colors.red} />}
            style={styles.metric}
          />
          <MetricTile
            label="Em atendimento"
            value={items.filter((item) => getTicketStage(item, tarefas) === 'em_atendimento').length}
            accent={colors.orange}
            icon={<Clock3 size={16} color={colors.orange} />}
            style={styles.metric}
          />
          <MetricTile
            label="Aguardando validacao"
            value={items.filter((item) => getTicketStage(item, tarefas) === 'validacao').length}
            accent={gridTheme.accent}
            icon={<CheckCircle2 size={16} color={gridTheme.accent} />}
            style={styles.metric}
          />
        </View>

        <SearchField
          placeholder={t("Buscar codigo, titulo, local ou responsavel...")}
          value={search}
          onChangeText={setSearch}
        />

        <SurfaceCard style={styles.filterPanel}>
          <WorkflowTabs
            tabs={tabs}
            active={activeStage}
            onChange={(id) => setActiveStage(id as TicketStage)}
          />
          <View style={styles.priorityFilters}>
            {(['todas', 'urgente', 'alta', 'media', 'baixa'] as const).map((item) => {
              const selectedPriority = priority === item;
              return (
                <AnimatedPressable
                  key={item}
                  style={[
                    styles.priorityChip,
                    {
                      backgroundColor: selectedPriority ? colors.red : theme.surfaceSoft,
                      borderColor: selectedPriority ? colors.red : theme.line,
                    },
                  ]}
                  onPress={() => setPriority(item)}
                >
                  <Text
                    style={[
                      styles.priorityChipText,
                      { color: selectedPriority ? colors.white : theme.textMuted },
                    ]}
                  >
                    {t(item === 'todas' ? 'Todas prioridades' : priorityLabel(item))}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </SurfaceCard>

        {error || optionsError || actionError ? (
          <FeedbackMessage
            variant="danger"
            message={error ?? optionsError ?? actionError ?? ''}
          />
        ) : null}
        {success ? <FeedbackMessage variant="success" message={success} /> : null}

        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: theme.text }]}>
            {activeStage === 'todos'
              ? t('Fila completa')
              : t(tabs.find((tab) => tab.id === activeStage)?.label)}
          </Text>
          <Text style={[styles.listSubtitle, { color: theme.textMuted }]}>
            {formatAppNumber(visibleTickets.length, language)}{' '}
            {t(visibleTickets.length === 1 ? 'chamado' : 'chamados')}
          </Text>
        </View>

        <View style={styles.ticketList}>
          {visibleTickets.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.line }]}>
              <Wrench size={28} color={theme.textSubtle} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {t('Nenhum chamado nesta etapa')}
              </Text>
              <Text style={[styles.emptyDescription, { color: theme.textMuted }]}>
                {t('Ajuste os filtros ou abra uma nova solicitacao.')}
              </Text>
            </View>
          ) : (
            visibleTickets.map((chamado) => {
              const stage = stagesById.get(chamado.id) ?? 'aberto';
              return (
                <TicketCard
                  key={chamado.id}
                  chamado={chamado}
                  stage={stage}
                  linkedTask={relatedTask(chamado.id)}
                  canManage={canManage}
                  busy={busyId === chamado.id}
                  onOpen={() => setSelected(chamado)}
                  onEdit={() => {
                    setEditing(chamado);
                    setModalOpen(true);
                  }}
                  onAssign={() => setAssigning(chamado)}
                  onStart={() => void startTicket(chamado)}
                  onValidate={() => setClosing(chamado)}
                  onDelete={() => deleteItem(chamado.id, chamado.titulo)}
                />
              );
            })
          )}
        </View>
      </ModuleScreen>

      <CrudModal
        visible={modalOpen}
        title={editing ? 'Editar chamado' : 'Abrir chamado'}
        fields={fields}
        initialValues={editing ? formValues(editing) : { prioridade: 'media', status: 'aberto' }}
        isSubmitting={submitting}
        submitLabel={editing ? 'Salvar alteracoes' : 'Abrir chamado'}
        onClose={() => setModalOpen(false)}
        onSubmit={async (values) => {
          if (editing) {
            await updateItem(editing.id, {
              ...values,
              status: normalizeTicketStatus(editing.status),
            });
          } else {
            await createItem(values);
          }
          setModalOpen(false);
          setSuccess(editing ? 'Chamado atualizado com sucesso.' : 'Chamado aberto com sucesso.');
        }}
      />

      <CrudModal
        visible={assigning !== null}
        title="Atribuir responsavel"
        fields={[
          {
            name: 'responsavel_id',
            label: 'Tecnico de manutencao',
            required: true,
            options: options.responsaveis ?? [],
          },
        ]}
        initialValues={{ responsavel_id: assigning?.responsavel_id ?? '' }}
        isSubmitting={submitting}
        submitLabel="Atribuir"
        onClose={() => setAssigning(null)}
        onSubmit={assignTicket}
      />

      <CrudModal
        visible={closing !== null}
        title="Validar e concluir chamado"
        fields={[
          {
            name: 'evidencia_uri',
            label: 'Foto de evidencia',
            required: true,
            type: 'image',
          },
          {
            name: 'resumo_resolucao',
            label: 'Resumo da solucao',
            required: true,
            multiline: true,
          },
          { name: 'consideracoes', label: 'Consideracoes finais', multiline: true },
        ]}
        initialValues={{
          evidencia_uri: closing?.evidencia_url ?? '',
          resumo_resolucao: closing?.resumo_resolucao ?? '',
          consideracoes: closing?.consideracoes ?? '',
        }}
        isSubmitting={submitting}
        submitLabel="Concluir chamado"
        onClose={() => setClosing(null)}
        onSubmit={validateTicket}
      />

      <WorkflowSheet
        visible={selected !== null}
        title={selected?.titulo ?? 'Detalhes do chamado'}
        subtitle={selected?.codigo}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <>
            {(() => {
              const stage = getTicketStage(selected, tarefas);
              const task = relatedTask(selected.id);
              return (
                <>
                  <View style={styles.detailBadges}>
                    <Pill label={stageLabel(stage)} variant={stageVariant(stage)} />
                    <Pill
                      label={priorityLabel(selected.prioridade)}
                      variant={priorityVariant(selected.prioridade)}
                    />
                    {selected.categoria_nome ? (
                      <Pill label={selected.categoria_nome} variant="neutral" />
                    ) : null}
                  </View>

                  <WorkflowProgress steps={workflowSteps} currentIndex={stageIndex(stage)} />

                  <Text style={[styles.detailDescription, { color: theme.textMuted }]}>
                    {selected.descricao || t('Sem descricao informada.')}
                  </Text>

                  {selected.imagem_url ? (
                    <View style={styles.evidenceBlock}>
                      <Text style={[styles.evidenceLabel, { color: theme.textMuted }]}>
                        {t('Imagem da abertura')}
                      </Text>
                      <Image source={{ uri: selected.imagem_url }} style={styles.evidenceImage} />
                    </View>
                  ) : null}

                  <InfoRow
                    label="Solicitante"
                    value={selected.solicitante_nome}
                    icon={<UserRound size={14} color={theme.textMuted} />}
                  />
                  <InfoRow
                    label="Responsavel"
                    value={selected.responsavel_nome}
                    icon={<Wrench size={14} color={theme.textMuted} />}
                  />
                  <InfoRow
                    label="Local"
                    value={
                      [selected.bloco_nome, selected.sala_nome].filter(Boolean).join(' / ') ||
                      t('Local nao informado')
                    }
                    icon={<MapPin size={14} color={theme.textMuted} />}
                  />
                  <InfoRow
                    label="Categoria"
                    value={selected.categoria_nome}
                    icon={<Building2 size={14} color={theme.textMuted} />}
                  />
                  <InfoRow
                    label="Aberto em"
                    value={formatAppDateTime(
                      selected.data_abertura ?? selected.created_at ?? selected.criado_em,
                      language,
                      t('Nao informado')
                    )}
                  />
                  <InfoRow
                    label="Iniciado em"
                    value={formatAppDateTime(selected.iniciado_em, language, t('Nao informado'))}
                  />
                  <InfoRow
                    label="Concluido em"
                    value={formatAppDateTime(
                      selected.data_fechamento ?? selected.concluido_em,
                      language,
                      t('Nao informado')
                    )}
                  />

                  {task ? (
                    <View style={[styles.taskSummary, { backgroundColor: theme.surfaceSoft }]}>
                      <View style={styles.taskSummaryHeader}>
                        <ClipboardCheck size={17} color={colors.blue} />
                        <View style={styles.taskSummaryText}>
                          <Text style={[styles.taskSummaryTitle, { color: theme.text }]}>
                            {task.codigo ?? t('Tarefa vinculada')}
                          </Text>
                          <Text style={[styles.taskSummarySubtitle, { color: theme.textMuted }]}>
                            {t(statusTaskLabel(task.status))} -{' '}
                            {task.responsavel_nome ?? t('Sem responsavel')}
                          </Text>
                        </View>
                      </View>
                      <AppButton
                        label="Abrir fila de tarefas"
                        variant="secondary"
                        accent={colors.blue}
                        onPress={() => {
                          setSelected(null);
                          router.push(`/grid/tarefas?chamado_id=${selected.id}`);
                        }}
                      />
                    </View>
                  ) : null}

                  {selected.evidencia_url ? (
                    <View style={styles.evidenceBlock}>
                      <Text style={[styles.evidenceLabel, { color: theme.textMuted }]}>
                        {t('Evidencia da conclusao')}
                      </Text>
                      <Image source={{ uri: selected.evidencia_url }} style={styles.evidenceImage} />
                    </View>
                  ) : null}

                  {selected.resumo_resolucao ? (
                    <View style={[styles.noteBox, { backgroundColor: theme.surfaceSoft }]}>
                      <Text style={[styles.noteLabel, { color: theme.textMuted }]}>
                        {t('Resumo da resolucao')}
                      </Text>
                      <Text style={[styles.noteText, { color: theme.text }]}>
                        {selected.resumo_resolucao}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.detailActions}>
                    {canManage ? (
                      <AppButton
                        label="Editar"
                        variant="secondary"
                        accent={colors.navy}
                        onPress={() => {
                          const chamado = selected;
                          setSelected(null);
                          setEditing(chamado);
                          setModalOpen(true);
                        }}
                        wrapperStyle={styles.detailAction}
                      />
                    ) : null}
                    {canManage && stage === 'aberto' ? (
                      <AppButton
                        label="Atribuir tecnico"
                        accent={colors.purple}
                        onPress={() => {
                          const chamado = selected;
                          setSelected(null);
                          setAssigning(chamado);
                        }}
                        wrapperStyle={styles.detailAction}
                      />
                    ) : null}
                    {canManage && stage === 'pendente' ? (
                      <AppButton
                        label="Iniciar atendimento"
                        accent={colors.orange}
                        loading={busyId === selected.id}
                        onPress={() => void startTicket(selected)}
                        wrapperStyle={styles.detailAction}
                      />
                    ) : null}
                    {canManage && stage === 'validacao' ? (
                      <AppButton
                        label="Validar servico"
                        accent={colors.green}
                        icon={<ImageIcon size={15} color={colors.white} />}
                        onPress={() => {
                          const chamado = selected;
                          setSelected(null);
                          setClosing(chamado);
                        }}
                        wrapperStyle={styles.detailAction}
                      />
                    ) : null}
                  </View>
                </>
              );
            })()}
          </>
        ) : null}
      </WorkflowSheet>
    </>
  );
}

const styles = StyleSheet.create({
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  metric: { width: '48%' },
  filterPanel: { marginTop: 12, marginBottom: 12 },
  priorityFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  priorityChip: {
    minHeight: 32,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityChipText: { fontSize: 10, fontWeight: '800' },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  listTitle: { fontSize: 16, fontWeight: '900' },
  listSubtitle: { fontSize: 11, fontWeight: '700' },
  ticketList: { gap: 10 },
  ticketCard: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  ticketCardMain: { padding: 13 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardHeading: { flex: 1, minWidth: 0 },
  code: { color: colors.red, fontSize: 11, fontWeight: '900' },
  cardTitle: { fontSize: 14, lineHeight: 19, fontWeight: '900', marginTop: 3 },
  cardDescription: { fontSize: 11, lineHeight: 16, marginTop: 7 },
  cardMetaGrid: { gap: 6, marginTop: 10 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardMetaText: { flex: 1, minWidth: 0, fontSize: 11, fontWeight: '700' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
  },
  cardBadges: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cardDate: { fontSize: 9, fontWeight: '700' },
  linkedTask: {
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
  },
  linkedTaskText: { flex: 1, minWidth: 0, fontSize: 10, fontWeight: '800' },
  cardActions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
    padding: 8,
  },
  cardAction: { flex: 1 },
  compactButton: { minHeight: 36, paddingHorizontal: 7 },
  deleteLink: { alignSelf: 'center', paddingHorizontal: 12, paddingBottom: 9 },
  deleteLinkText: { color: colors.red, fontSize: 10, fontWeight: '800' },
  emptyState: {
    minHeight: 180,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: { fontSize: 14, fontWeight: '900', marginTop: 10 },
  emptyDescription: { textAlign: 'center', fontSize: 11, lineHeight: 16, marginTop: 4 },
  detailBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 4 },
  detailDescription: { fontSize: 13, lineHeight: 19, marginVertical: 10 },
  evidenceBlock: { marginTop: 12 },
  evidenceLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 },
  evidenceImage: { width: '100%', height: 190, borderRadius: 8, backgroundColor: colors.panelSoft },
  taskSummary: { borderRadius: 8, padding: 12, gap: 10, marginTop: 14 },
  taskSummaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  taskSummaryText: { flex: 1, minWidth: 0 },
  taskSummaryTitle: { fontSize: 12, fontWeight: '900' },
  taskSummarySubtitle: { fontSize: 10, marginTop: 2 },
  noteBox: { borderRadius: 8, padding: 12, marginTop: 12 },
  noteLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  noteText: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  detailActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  detailAction: { minWidth: 145, flex: 1 },
});
