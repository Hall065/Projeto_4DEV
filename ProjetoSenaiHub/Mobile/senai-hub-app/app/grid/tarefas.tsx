import { useCallback, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  Link2,
  MapPin,
  Package,
  Play,
  RotateCcw,
  UserRound,
  UserX,
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
  WorkflowSheet,
  WorkflowTabs,
  type WorkflowTab,
} from '@/components/grid/GridWorkflowUI';
import { ModuleScreen } from '@/components/screens/ModuleScreen';
import { colors, gridTheme } from '@/constants/colors';
import { CHAMADO_PRIORIDADE_OPTIONS, TAREFA_STATUS_OPTIONS } from '@/constants/form-options';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useCrudResource } from '@/hooks/useCrudResource';
import { useSelectOptions } from '@/hooks/useSelectOptions';
import { useThemeColors } from '@/hooks/useThemeColors';
import { gridService } from '@/services/grid.service';
import { useAuthStore } from '@/stores/auth.store';
import type { ChamadoPrioridade, Tarefa, TarefaStatus } from '@/types/grid.types';
import { useI18n } from '@/hooks/useI18n';

const tarefaOptionLoaders = {
  chamados: gridService.listChamadoOptions,
  chamadosAbertos: gridService.listOpenChamadoOptions,
  responsaveis: gridService.listMaintenanceUsuarioOptions,
  estoque: gridService.listEstoqueOptions,
};

type TarefaOptionKey = keyof typeof tarefaOptionLoaders;
type TarefaOptions = Record<TarefaOptionKey, CrudOption[]>;
type TaskBucket = 'todas' | 'a_fazer' | 'em_andamento' | 'concluida';
type FormMode = 'regular' | 'from-ticket';

function getFields(
  options: Partial<TarefaOptions>,
  limited = false,
  mode: FormMode = 'regular'
): CrudField[] {
  if (limited) {
    return [
      { name: 'status', label: 'Etapa', required: true, options: TAREFA_STATUS_OPTIONS },
      {
        name: 'observacao',
        label: 'Atualizacao do atendimento',
        placeholder: 'Descreva o que foi realizado ou o proximo passo',
        multiline: true,
      },
    ];
  }

  if (mode === 'from-ticket') {
    return [
      {
        name: 'chamado_id',
        label: 'Chamado aberto',
        required: true,
        options: options.chamadosAbertos ?? [],
      },
      {
        name: 'responsavel_id',
        label: 'Responsavel',
        required: true,
        options: options.responsaveis ?? [],
      },
      {
        name: 'descricao',
        label: 'Orientacoes para o atendimento',
        placeholder: 'Detalhes adicionais para o tecnico',
        multiline: true,
      },
      {
        name: 'item_id',
        label: 'Material principal',
        options: options.estoque ?? [],
        emptyOptionLabel: 'Sem material vinculado',
      },
      { name: 'prioridade', label: 'Prioridade', required: true, options: CHAMADO_PRIORIDADE_OPTIONS },
      { name: 'status', label: 'Etapa inicial', required: true, options: TAREFA_STATUS_OPTIONS },
    ];
  }

  return [
    { name: 'titulo', label: 'Titulo da tarefa', required: true },
    { name: 'descricao', label: 'Descricao', multiline: true },
    {
      name: 'chamado_id',
      label: 'Chamado existente',
      options: options.chamados ?? [],
      emptyOptionLabel: 'Criar chamado junto com a tarefa',
    },
    {
      name: 'responsavel_id',
      label: 'Responsavel',
      options: options.responsaveis ?? [],
      emptyOptionLabel: 'Sem responsavel',
    },
    {
      name: 'item_id',
      label: 'Material principal',
      options: options.estoque ?? [],
      emptyOptionLabel: 'Sem material vinculado',
    },
    { name: 'prioridade', label: 'Prioridade', required: true, options: CHAMADO_PRIORIDADE_OPTIONS },
    { name: 'status', label: 'Etapa', required: true, options: TAREFA_STATUS_OPTIONS },
    { name: 'observacao', label: 'Observacao', multiline: true },
  ];
}

function formValues(tarefa: Tarefa): Record<string, string> {
  return {
    titulo: tarefa.titulo ?? '',
    descricao: tarefa.descricao ?? '',
    chamado_id: tarefa.chamado_id ?? '',
    responsavel_id: tarefa.responsavel_id ?? '',
    item_id: tarefa.item_id ?? '',
    prioridade: tarefa.prioridade ?? 'media',
    status: normalizeTaskStatus(tarefa.status),
    observacao: tarefa.observacao ?? tarefa.observacoes ?? '',
  };
}

function normalizeTaskStatus(status?: TarefaStatus | null): 'a_fazer' | 'em_andamento' | 'concluida' {
  if (status === 'concluida' || status === 'concluido') return 'concluida';
  if (status === 'em_andamento') return 'em_andamento';
  return 'a_fazer';
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

function statusLabel(status?: TarefaStatus | null) {
  const normalized = normalizeTaskStatus(status);
  if (normalized === 'em_andamento') return 'Em andamento';
  if (normalized === 'concluida') return 'Concluida';
  return 'A fazer';
}

function statusVariant(status?: TarefaStatus | null) {
  const normalized = normalizeTaskStatus(status);
  if (normalized === 'concluida') return 'success' as const;
  if (normalized === 'em_andamento') return 'info' as const;
  return 'warning' as const;
}

function formatDate(value?: string | null) {
  if (!value) return 'Nao informado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '').trim();
    if (message) return message;
  }
  return fallback;
}

function TaskCard({
  task,
  canManage,
  onOpen,
  onEdit,
  onDelete,
  onMove,
}: {
  task: Tarefa;
  canManage: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  onMove: (status: TarefaStatus) => void;
}) {
  const { t } = useI18n();
  const theme = useThemeColors();
  const normalizedStatus = normalizeTaskStatus(task.status);
  const accent =
    normalizedStatus === 'concluida'
      ? colors.green
      : normalizedStatus === 'em_andamento'
        ? colors.orange
        : colors.blue;

  return (
    <View
      style={[
        styles.taskCard,
        {
          backgroundColor: theme.surface,
          borderColor: theme.line,
          borderLeftColor: accent,
        },
      ]}
    >
      <AnimatedPressable onPress={onOpen} style={styles.taskCardMain}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeading}>
            <Text style={[styles.code, { color: colors.blue }]}>
              {task.codigo ?? task.chamado_codigo ?? t("TAREFA")}
            </Text>
            {task.chamado_codigo ? (
              <Text style={[styles.linkedCode, { color: theme.textMuted }]}>
                {t("Chamado")}{' '}{task.chamado_codigo}
              </Text>
            ) : null}
          </View>
          <Pill label={statusLabel(task.status)} variant={statusVariant(task.status)} />
        </View>

        <Text numberOfLines={2} style={[styles.cardTitle, { color: theme.text }]}>
          {task.titulo}
        </Text>
        {task.descricao ? (
          <Text numberOfLines={2} style={[styles.cardDescription, { color: theme.textMuted }]}>
            {task.descricao}
          </Text>
        ) : null}

        <View style={styles.cardMetaGrid}>
          <View style={styles.cardMeta}>
            <UserRound size={14} color={theme.textMuted} />
            <Text numberOfLines={1} style={[styles.cardMetaText, { color: theme.textMuted }]}>
              {task.responsavel_nome ?? t("Sem responsavel")}
            </Text>
          </View>
          <View style={styles.cardMeta}>
            <MapPin size={14} color={theme.textMuted} />
            <Text numberOfLines={1} style={[styles.cardMetaText, { color: theme.textMuted }]}>
              {[task.bloco_nome, task.sala_nome].filter(Boolean).join(' / ') || t("Local nao informado")}
            </Text>
          </View>
        </View>

        <View style={styles.cardBadges}>
          <Pill label={priorityLabel(task.prioridade)} variant={priorityVariant(task.prioridade)} />
          {task.item_nome ? <Pill label={task.item_nome} variant="neutral" /> : null}
        </View>
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
        <AppButton
          label="Editar"
          variant="secondary"
          accent={colors.navy}
          onPress={onEdit}
          wrapperStyle={styles.cardAction}
          style={styles.compactButton}
        />
        {normalizedStatus === 'a_fazer' ? (
          <AppButton
            label="Iniciar"
            accent={colors.orange}
            icon={<Play size={14} color={colors.white} />}
            onPress={() => onMove('em_andamento')}
            wrapperStyle={styles.cardAction}
            style={styles.compactButton}
          />
        ) : normalizedStatus === 'em_andamento' ? (
          <AppButton
            label="Concluir"
            accent={colors.green}
            icon={<CheckCircle2 size={14} color={colors.white} />}
            onPress={() => onMove('concluida')}
            wrapperStyle={styles.cardAction}
            style={styles.compactButton}
          />
        ) : canManage ? (
          <AppButton
            label="Reabrir"
            variant="secondary"
            accent={colors.blue}
            icon={<RotateCcw size={14} color={theme.isDark ? theme.text : colors.blue} />}
            onPress={() => onMove('a_fazer')}
            wrapperStyle={styles.cardAction}
            style={styles.compactButton}
          />
        ) : null}
      </View>

      {onDelete ? (
        <AnimatedPressable onPress={onDelete} style={styles.deleteLink}>
          <Text style={styles.deleteLinkText}>{t("Excluir tarefa")}</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

export default function TarefasScreen() {
  const { t } = useI18n();
  const theme = useThemeColors();
  const { confirm } = useConfirmDialog();
  const params = useLocalSearchParams<{ chamado_id?: string }>();
  const initialChamadoFilter = Array.isArray(params.chamado_id)
    ? params.chamado_id[0]
    : params.chamado_id;

  const [modalOpen, setModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('regular');
  const [editing, setEditing] = useState<Tarefa | null>(null);
  const [selected, setSelected] = useState<Tarefa | null>(null);
  const [search, setSearch] = useState('');
  const [activeBucket, setActiveBucket] = useState<TaskBucket>('todas');
  const [priority, setPriority] = useState<'todas' | ChamadoPrioridade>('todas');
  const [movingId, setMovingId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [linkedChamadoId, setLinkedChamadoId] = useState(initialChamadoFilter ?? '');

  const session = useAuthStore((state) => state.session);
  const role = session?.perfil?.tipo;
  const isMaintenanceWorker = role === 'manutencao' || role === 'grid_funcionario';
  const canManage = ['admin', 'direcao', 'gerente_manutencao', 'grid_chefe'].includes(role ?? '');
  const { options, error: optionsError } = useSelectOptions(tarefaOptionLoaders);

  const fields = getFields(options, isMaintenanceWorker, formMode);
  const loadTarefas = useCallback(async () => {
    const tarefas = await gridService.listTarefas();
    if (!isMaintenanceWorker || !session?.userId) return tarefas;
    return tarefas.filter((tarefa) => tarefa.responsavel_id === session.userId);
  }, [isMaintenanceWorker, session?.userId]);

  const {
    items,
    loading,
    submitting,
    error,
    reload,
    createItem,
    updateItem,
    deleteItem,
  } = useCrudResource<Tarefa, Record<string, string>>({
    load: loadTarefas,
    create: (values) => gridService.createTarefa(values, session?.userId),
    update: (id, values) =>
      isMaintenanceWorker
        ? gridService.updateTarefaStatus(id, values)
        : gridService.updateTarefa(id, values),
    remove: gridService.deleteTarefa,
  });

  const searched = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (linkedChamadoId && item.chamado_id !== linkedChamadoId) return false;
      if (priority !== 'todas' && item.prioridade !== priority) return false;
      if (!query) return true;
      return [
        item.codigo,
        item.titulo,
        item.descricao,
        item.chamado_codigo,
        item.responsavel_nome,
        item.sala_nome,
        item.bloco_nome,
        item.item_nome,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [items, linkedChamadoId, priority, search]);

  const counts = useMemo(
    () => ({
      todas: searched.length,
      a_fazer: searched.filter((item) => normalizeTaskStatus(item.status) === 'a_fazer').length,
      em_andamento: searched.filter((item) => normalizeTaskStatus(item.status) === 'em_andamento').length,
      concluida: searched.filter((item) => normalizeTaskStatus(item.status) === 'concluida').length,
    }),
    [searched]
  );

  const visibleTasks = useMemo(
    () =>
      searched
        .filter(
          (item) =>
            activeBucket === 'todas' || normalizeTaskStatus(item.status) === activeBucket
        )
        .sort((a, b) => {
          const priorityOrder: Record<string, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 };
          const priorityDiff =
            (priorityOrder[a.prioridade ?? 'media'] ?? 2) -
            (priorityOrder[b.prioridade ?? 'media'] ?? 2);
          if (priorityDiff !== 0) return priorityDiff;
          return String(b.created_at ?? b.criado_em ?? '').localeCompare(
            String(a.created_at ?? a.criado_em ?? '')
          );
        }),
    [activeBucket, searched]
  );

  const tabs: WorkflowTab[] = [
    { id: 'todas', label: 'Todas', count: counts.todas, color: colors.navy },
    { id: 'a_fazer', label: 'A fazer', count: counts.a_fazer, color: colors.blue },
    {
      id: 'em_andamento',
      label: 'Em andamento',
      count: counts.em_andamento,
      color: colors.orange,
    },
    { id: 'concluida', label: 'Concluidas', count: counts.concluida, color: colors.green },
  ];

  const openCreate = (mode: FormMode) => {
    setEditing(null);
    setFormMode(mode);
    setModalOpen(true);
  };

  const openEdit = (task: Tarefa) => {
    setEditing(task);
    setFormMode('regular');
    setModalOpen(true);
  };

  const moveTask = async (task: Tarefa, status: TarefaStatus) => {
    const action =
      status === 'concluida'
        ? 'concluir'
        : status === 'em_andamento'
          ? 'iniciar'
          : 'reabrir';
    const confirmed = await confirm({
      title: `${action.charAt(0).toUpperCase()}${action.slice(1)} tarefa`,
      message: `Deseja ${action} "${task.titulo}"?`,
      confirmLabel: `${action.charAt(0).toUpperCase()}${action.slice(1)}`,
    });
    if (!confirmed) return;

    setMovingId(task.id);
    setSuccess(null);
    setActionError(null);
    try {
      await gridService.moveTarefaStatus(
        task.id,
        status,
        task.observacao ?? task.observacoes
      );
      setSuccess(`Tarefa ${statusLabel(status).toLowerCase()} com sucesso.`);
      setSelected(null);
      await reload();
    } catch (moveError) {
      setActionError(getErrorMessage(moveError, 'Nao foi possivel atualizar a tarefa.'));
    } finally {
      setMovingId(null);
    }
  };

  return (
    <>
      <ModuleScreen
        kicker="SENAI Grid"
        title="Tarefas"
        description={
          isMaintenanceWorker
            ? 'Fila pessoal para iniciar, atualizar e concluir atendimentos.'
            : 'Quadro operacional com responsaveis, prioridades e vinculo aos chamados.'
        }
        isLoading={loading}
        actionLabel={canManage ? '+ Nova tarefa' : undefined}
        onActionPress={canManage ? () => openCreate('regular') : undefined}
      >
        <View style={styles.metricGrid}>
          <MetricTile
            label="A fazer"
            value={items.filter((item) => normalizeTaskStatus(item.status) === 'a_fazer').length}
            accent={colors.blue}
            icon={<Clock3 size={16} color={colors.blue} />}
            style={styles.metric}
          />
          <MetricTile
            label="Em andamento"
            value={items.filter((item) => normalizeTaskStatus(item.status) === 'em_andamento').length}
            accent={colors.orange}
            icon={<Wrench size={16} color={colors.orange} />}
            style={styles.metric}
          />
          <MetricTile
            label="Concluidas"
            value={items.filter((item) => normalizeTaskStatus(item.status) === 'concluida').length}
            accent={gridTheme.accent}
            icon={<CheckCircle2 size={16} color={gridTheme.accent} />}
            style={styles.metric}
          />
          <MetricTile
            label="Sem responsavel"
            value={items.filter((item) => !item.responsavel_id).length}
            accent={colors.red}
            icon={<UserX size={16} color={colors.red} />}
            style={styles.metric}
          />
        </View>

        {canManage ? (
          <SurfaceCard style={styles.createPanel}>
            <View style={styles.createPanelText}>
              <Text style={[styles.createPanelTitle, { color: theme.text }]}>{t("Atalho operacional")}</Text>
              <Text style={[styles.createPanelDescription, { color: theme.textMuted }]}>
                {t("Transforme um chamado aberto em tarefa com responsavel definido.")}</Text>
            </View>
            <AppButton
              label="Criar do chamado"
              variant="secondary"
              accent={colors.blue}
              icon={<Link2 size={16} color={theme.isDark ? theme.text : colors.blue} />}
              onPress={() => openCreate('from-ticket')}
            />
          </SurfaceCard>
        ) : null}

        <SearchField
          placeholder={t("Buscar tarefa, chamado, local ou responsavel...")}
          value={search}
          onChangeText={setSearch}
        />

        <SurfaceCard style={styles.filterPanel}>
          <WorkflowTabs
            tabs={tabs}
            active={activeBucket}
            onChange={(id) => setActiveBucket(id as TaskBucket)}
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
                    {item === 'todas' ? t("Todas prioridades") : priorityLabel(item)}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </SurfaceCard>

        {linkedChamadoId ? (
          <FeedbackMessage
            message="Exibindo somente as tarefas do chamado selecionado."
            variant="info"
          />
        ) : null}
        {linkedChamadoId ? (
          <AppButton
            label="Ver todas as tarefas"
            variant="ghost"
            accent={colors.blue}
            onPress={() => setLinkedChamadoId('')}
            wrapperStyle={styles.clearLinkedFilter}
          />
        ) : null}

        {error || optionsError || actionError ? (
          <FeedbackMessage
            variant="danger"
            message={error ?? optionsError ?? actionError ?? ''}
          />
        ) : null}
        {success ? <FeedbackMessage variant="success" message={success} /> : null}

        <View style={styles.listHeader}>
          <View>
            <Text style={[styles.listTitle, { color: theme.text }]}>
              {activeBucket === 'todas'
                ? t("Fila completa")
                : tabs.find((tab) => tab.id === activeBucket)?.label}
            </Text>
            <Text style={[styles.listSubtitle, { color: theme.textMuted }]}>
              {visibleTasks.length} {' '}{t("tarefa(s), ordenadas por prioridade")}</Text>
          </View>
        </View>

        <View style={styles.taskList}>
          {visibleTasks.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.line }]}>
              <ClipboardList size={28} color={theme.textSubtle} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>{t("Nenhuma tarefa nesta etapa")}</Text>
              <Text style={[styles.emptyDescription, { color: theme.textMuted }]}>
                {t("Ajuste os filtros ou crie uma nova tarefa a partir de um chamado.")}</Text>
            </View>
          ) : (
            visibleTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                canManage={canManage}
                onOpen={() => setSelected(task)}
                onEdit={() => openEdit(task)}
                onDelete={canManage ? () => deleteItem(task.id, task.titulo) : undefined}
                onMove={(status) => void moveTask(task, status)}
              />
            ))
          )}
        </View>
      </ModuleScreen>

      <CrudModal
        visible={modalOpen}
        title={
          editing
            ? 'Editar tarefa'
            : formMode === 'from-ticket'
              ? 'Criar tarefa do chamado'
              : 'Nova tarefa'
        }
        fields={fields}
        initialValues={
          editing
            ? formValues(editing)
            : {
                prioridade: 'media',
                status: 'a_fazer',
                chamado_id: formMode === 'from-ticket' ? linkedChamadoId : '',
              }
        }
        isSubmitting={submitting}
        submitLabel={editing ? 'Salvar alteracoes' : 'Criar tarefa'}
        onClose={() => setModalOpen(false)}
        onSubmit={async (values) => {
          if (editing) await updateItem(editing.id, values);
          else await createItem(values);
          setModalOpen(false);
          setSuccess(editing ? 'Tarefa atualizada com sucesso.' : 'Tarefa criada com sucesso.');
        }}
      />

      <WorkflowSheet
        visible={selected !== null}
        title={selected?.titulo ?? 'Detalhes da tarefa'}
        subtitle={
          selected
            ? `${selected.codigo ?? 'Tarefa'}${selected.chamado_codigo ? ` - Chamado ${selected.chamado_codigo}` : ''}`
            : undefined
        }
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <>
            <View style={styles.detailBadges}>
              <Pill label={statusLabel(selected.status)} variant={statusVariant(selected.status)} />
              <Pill
                label={priorityLabel(selected.prioridade)}
                variant={priorityVariant(selected.prioridade)}
              />
            </View>
            {selected.descricao ? (
              <Text style={[styles.detailDescription, { color: theme.textMuted }]}>
                {selected.descricao}
              </Text>
            ) : null}
            <InfoRow
              label="Responsavel"
              value={selected.responsavel_nome}
              icon={<UserRound size={14} color={theme.textMuted} />}
            />
            <InfoRow
              label="Local"
              value={
                [selected.bloco_nome, selected.sala_nome].filter(Boolean).join(' / ') ||
                'Local nao informado'
              }
              icon={<MapPin size={14} color={theme.textMuted} />}
            />
            <InfoRow
              label="Material"
              value={selected.item_nome}
              icon={<Package size={14} color={theme.textMuted} />}
            />
            <InfoRow label="Criada em" value={formatDate(selected.created_at ?? selected.criado_em)} />
            <InfoRow
              label="Inicio"
              value={formatDate(selected.inicio_reparo ?? selected.data_inicio_reparo)}
            />
            <InfoRow
              label="Conclusao"
              value={formatDate(
                selected.fim_reparo ??
                  selected.data_termino_reparo ??
                  selected.concluido_em
              )}
            />
            {selected.observacao || selected.observacoes ? (
              <View style={[styles.noteBox, { backgroundColor: theme.surfaceSoft }]}>
                <Text style={[styles.noteLabel, { color: theme.textMuted }]}>{t("Ultima observacao")}</Text>
                <Text style={[styles.noteText, { color: theme.text }]}>
                  {selected.observacao ?? selected.observacoes}
                </Text>
              </View>
            ) : null}

            <View style={styles.detailActions}>
              <AppButton
                label="Editar"
                variant="secondary"
                accent={colors.navy}
                onPress={() => {
                  const task = selected;
                  setSelected(null);
                  openEdit(task);
                }}
                wrapperStyle={styles.detailAction}
              />
              {normalizeTaskStatus(selected.status) === 'a_fazer' ? (
                <AppButton
                  label={movingId === selected.id ? 'Iniciando...' : 'Iniciar atendimento'}
                  accent={colors.orange}
                  loading={movingId === selected.id}
                  onPress={() => void moveTask(selected, 'em_andamento')}
                  wrapperStyle={styles.detailAction}
                />
              ) : normalizeTaskStatus(selected.status) === 'em_andamento' ? (
                <AppButton
                  label={movingId === selected.id ? 'Concluindo...' : 'Concluir tarefa'}
                  accent={colors.green}
                  loading={movingId === selected.id}
                  onPress={() => void moveTask(selected, 'concluida')}
                  wrapperStyle={styles.detailAction}
                />
              ) : canManage ? (
                <AppButton
                  label="Reabrir tarefa"
                  accent={colors.blue}
                  onPress={() => void moveTask(selected, 'a_fazer')}
                  wrapperStyle={styles.detailAction}
                />
              ) : null}
            </View>
          </>
        ) : null}
      </WorkflowSheet>
    </>
  );
}

const styles = StyleSheet.create({
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  metric: { width: '48%' },
  createPanel: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  createPanelText: { flex: 1, minWidth: 0 },
  createPanelTitle: { fontSize: 13, fontWeight: '900' },
  createPanelDescription: { fontSize: 11, lineHeight: 16, marginTop: 2 },
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
  clearLinkedFilter: { alignSelf: 'flex-start', marginBottom: 8 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  listTitle: { fontSize: 16, fontWeight: '900' },
  listSubtitle: { fontSize: 11, marginTop: 2 },
  taskList: { gap: 10 },
  taskCard: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  taskCardMain: { padding: 13 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardHeading: { flex: 1, minWidth: 0 },
  code: { fontSize: 11, fontWeight: '900' },
  linkedCode: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  cardTitle: { fontSize: 14, lineHeight: 19, fontWeight: '900', marginTop: 7 },
  cardDescription: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  cardMetaGrid: { gap: 6, marginTop: 10 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardMetaText: { flex: 1, minWidth: 0, fontSize: 11, fontWeight: '700' },
  cardBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
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
  emptyDescription: { maxWidth: 260, textAlign: 'center', fontSize: 11, lineHeight: 16, marginTop: 4 },
  detailBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
  detailDescription: { fontSize: 13, lineHeight: 19, marginBottom: 8 },
  noteBox: { borderRadius: 8, padding: 12, marginTop: 12 },
  noteLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  noteText: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  detailActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  detailAction: { minWidth: 145, flex: 1 },
});
