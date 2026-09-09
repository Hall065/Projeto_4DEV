import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  MapPin,
  Wrench,
} from 'lucide-react-native';
import {
  AppButton,
  CampusMap,
  FeedbackMessage,
  ListRow,
  MetricTile,
  SearchField,
  SurfaceCard,
} from '@/components/common/VisualPrimitives';
import { AdvancedFilterPanel, FilterChoice, FilterTextField } from '@/components/common/AdvancedFilters';
import { CampusMap3DContainer } from '@/components/maps/CampusMap3D';
import { ModuleScreen } from '@/components/screens/ModuleScreen';
import { colors, gridTheme } from '@/constants/colors';
import { CHAMADO_PRIORIDADE_OPTIONS } from '@/constants/form-options';
import { ROUTES } from '@/constants/routes';
import { useThemeColors } from '@/hooks/useThemeColors';
import { supabase } from '@/lib/supabase';
import { gridService } from '@/services/grid.service';
import type {
  CampusTicketMarker,
  CampusTicketMarkerStatus,
} from '@/types/campusTickets';
import {
  CAMPUS_TICKET_KIND_LABELS,
  CAMPUS_TICKET_STATUS_LABELS,
} from '@/types/campusTickets';
import type { Chamado, Tarefa } from '@/types/grid.types';
import {
  buildCampusTicketMarkers,
  countTicketsByKind,
  countTicketsByStatus,
  countUnmappedGridRecords,
  ticketMarkerColor,
} from '@/utils/campusTicketMarkers';
import { normalizeDateToIso } from '@/utils/formatters';
import { useI18n } from '@/hooks/useI18n';

const EMPTY_FILTERS = { kind: '', status: '', priority: '', blockId: '', assigneeId: '', categoryId: '', from: '', to: '' };

const makeChannelName = () =>
  `grid-campus-map-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function MapaTarefasScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useThemeColors();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tickets, setTickets] = useState<Chamado[]>([]);
  const [tasks, setTasks] = useState<Tarefa[]>([]);
  const [search, setSearch] = useState('');
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError('');
      const [ticketData, taskData] = await Promise.all([
        gridService.listChamados(),
        gridService.listTarefas(),
      ]);
      setTickets(ticketData);
      setTasks(taskData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Nao foi possivel carregar a localizacao dos chamados.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const channel = supabase.channel(makeChannelName());
    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'grid', table: 'chamados' },
        () => void reload()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'grid', table: 'tarefas' },
        () => void reload()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [reload]);

  const allMarkers = useMemo(
    () => buildCampusTicketMarkers(tasks, tickets),
    [tasks, tickets]
  );

  const filteredMarkers = useMemo(() => {
    const query = normalize(search);
    return allMarkers.filter((marker) => {
      const markerDate = normalizeDateToIso(marker.createdAt ?? '').slice(0, 10);
      const matchesKind = !appliedFilters.kind || marker.kind === appliedFilters.kind;
      const matchesStatus = !appliedFilters.status || marker.rawStatus === appliedFilters.status;
      const matchesSearch =
        !query ||
        normalize(
          [
            marker.code,
            marker.title,
            marker.room,
            marker.assignee,
            marker.blockId,
            marker.detail,
          ]
            .filter(Boolean)
            .join(' ')
        ).includes(query);
      return matchesKind && matchesStatus && matchesSearch &&
        (!appliedFilters.priority || marker.priority === appliedFilters.priority) &&
        (!appliedFilters.blockId || marker.blockId === appliedFilters.blockId) &&
        (!appliedFilters.assigneeId || marker.assigneeId === appliedFilters.assigneeId) &&
        (!appliedFilters.categoryId || marker.categoryId === appliedFilters.categoryId) &&
        (!appliedFilters.from || (markerDate && markerDate >= appliedFilters.from)) &&
        (!appliedFilters.to || (markerDate && markerDate <= appliedFilters.to));
    });
  }, [allMarkers, appliedFilters, search]);

  useEffect(() => {
    if (
      selectedMarkerId &&
      !filteredMarkers.some((marker) => marker.id === selectedMarkerId)
    ) {
      setSelectedMarkerId(null);
    }
  }, [filteredMarkers, selectedMarkerId]);

  const selectedMarker =
    allMarkers.find((marker) => marker.id === selectedMarkerId) ?? null;
  const statusTotals = countTicketsByStatus(filteredMarkers);
  const kindTotals = countTicketsByKind(filteredMarkers);
  const unmappedCount = countUnmappedGridRecords(tasks, tickets);
  const kindOptions = [
    { value: 'ticket', label: 'Chamados' },
    { value: 'task', label: 'Tarefas' },
  ];
  const statusOptions = Array.from(new Map(allMarkers.map((marker) => [marker.rawStatus, marker.statusLabel])).entries())
    .map(([value, label]) => ({ value, label }));
  const blockOptions = Array.from(new Set(allMarkers.map((marker) => marker.blockId))).sort()
    .map((value) => ({ value, label: `Bloco ${value}` }));
  const assigneeOptions = Array.from(
    new Map(allMarkers.filter((marker) => marker.assigneeId).map((marker) => [marker.assigneeId as string, marker.assignee ?? 'Responsavel'])).entries()
  ).map(([value, label]) => ({ value, label }));
  const categoryOptions = Array.from(
    new Map(allMarkers.filter((marker) => marker.categoryId).map((marker) => [marker.categoryId as string, marker.categoryLabel ?? 'Categoria'])).entries()
  ).map(([value, label]) => ({ value, label }));
  const applyFilters = () => {
    const from = draftFilters.from ? validIsoDate(draftFilters.from) : '';
    const to = draftFilters.to ? validIsoDate(draftFilters.to) : '';
    if ((draftFilters.from && !from) || (draftFilters.to && !to)) {
      setFilterError('Use datas validas em DD/MM/AAAA ou AAAA-MM-DD.');
      return;
    }
    if (from && to && from > to) {
      setFilterError('A data inicial deve ser anterior ou igual a data final.');
      return;
    }
    setFilterError(null);
    setAppliedFilters({ ...draftFilters, from: from ?? '', to: to ?? '' });
  };

  return (
    <ModuleScreen analysis={{ datasets: { chamados: filteredMarkers.filter((marker) => marker.kind === 'ticket' && (!selectedMarkerId || marker.id === selectedMarkerId)).map((marker) => ({ id: marker.sourceId })), tarefas: filteredMarkers.filter((marker) => marker.kind === 'task' && (!selectedMarkerId || marker.id === selectedMarkerId)).map((marker) => ({ id: marker.sourceId })) }, filters: { search, ...appliedFilters, selectedMarkerId }, error }}
      kicker="SENAI Grid"
      title="Localizacao de chamados"
      description="Encontre chamados e tarefas por bloco no mapa 3D do campus."
      isLoading={loading}
      actionLabel="Atualizar"
      onActionPress={reload}
    >
      {error ? <FeedbackMessage variant="danger" message={error} /> : null}
      {unmappedCount > 0 ? (
        <FeedbackMessage
          variant="warning"
          message={`${unmappedCount} registro(s) nao aparecem no mapa porque nao possuem Bloco A, B, C ou D informado.`}
        />
      ) : null}

      <View style={styles.metricGrid}>
        <MetricTile
          label="No mapa"
          value={filteredMarkers.length}
          hint={`${kindTotals.ticket} chamados | ${kindTotals.task} tarefas`}
          accent={gridTheme.accent}
          icon={<MapPin size={16} color={gridTheme.accent} />}
          style={styles.metric}
        />
        <MetricTile
          label="Abertos"
          value={statusTotals.open}
          accent={colors.red}
          icon={<AlertTriangle size={16} color={colors.red} />}
          style={styles.metric}
        />
        <MetricTile
          label="Em andamento"
          value={statusTotals.in_progress}
          accent={colors.blue}
          icon={<Clock3 size={16} color={colors.blue} />}
          style={styles.metric}
        />
        <MetricTile
          label="Concluidos"
          value={statusTotals.completed}
          accent={colors.green}
          icon={<CheckCircle2 size={16} color={colors.green} />}
          style={styles.metric}
        />
      </View>

      <SurfaceCard
        title="Mapa 3D do campus"
        subtitle={`${filteredMarkers.length} atendimento(s) visiveis com os filtros atuais`}
      >
        <CampusMap3DContainer
          ticketMarkers={filteredMarkers}
          highlightTicketId={selectedMarkerId}
          onSelectTicket={setSelectedMarkerId}
          moduleLabel="SENAI Grid"
          minHeight={520}
          fallback={<CampusMap />}
        />
      </SurfaceCard>

      <SurfaceCard title="Filtrar atendimentos" subtitle="Refine os marcadores exibidos no mapa">
        <SearchField
          placeholder={t("Buscar codigo, titulo, sala ou responsavel...")}
          value={search}
          onChangeText={setSearch}
        />
      </SurfaceCard>

      <AdvancedFilterPanel
        resultCount={filteredMarkers.length}
        activeCount={Object.values(appliedFilters).filter(Boolean).length}
        error={filterError}
        onApply={applyFilters}
        onClear={() => {
          setDraftFilters(EMPTY_FILTERS);
          setAppliedFilters(EMPTY_FILTERS);
          setFilterError(null);
        }}
      >
        <FilterChoice label="Tipo" value={draftFilters.kind} options={kindOptions} onChange={(kind) => setDraftFilters((current) => ({ ...current, kind }))} />
        <FilterChoice label="Status ou etapa" value={draftFilters.status} options={statusOptions} onChange={(status) => setDraftFilters((current) => ({ ...current, status }))} />
        <FilterChoice label="Prioridade" value={draftFilters.priority} options={CHAMADO_PRIORIDADE_OPTIONS} onChange={(priority) => setDraftFilters((current) => ({ ...current, priority }))} />
        <FilterChoice label="Bloco" value={draftFilters.blockId} options={blockOptions} onChange={(blockId) => setDraftFilters((current) => ({ ...current, blockId }))} />
        <FilterChoice label="Responsavel" value={draftFilters.assigneeId} options={assigneeOptions} onChange={(assigneeId) => setDraftFilters((current) => ({ ...current, assigneeId }))} />
        <FilterChoice label="Categoria do chamado" value={draftFilters.categoryId} options={categoryOptions} onChange={(categoryId) => setDraftFilters((current) => ({ ...current, categoryId }))} />
        <FilterTextField label="Periodo inicial" value={draftFilters.from} placeholder={t("DD/MM/AAAA")} keyboardType="numeric" onChangeText={(from) => setDraftFilters((current) => ({ ...current, from }))} />
        <FilterTextField label="Periodo final" value={draftFilters.to} placeholder={t("DD/MM/AAAA")} keyboardType="numeric" onChangeText={(to) => setDraftFilters((current) => ({ ...current, to }))} />
      </AdvancedFilterPanel>

      {selectedMarker ? (
        <SelectedMarkerCard
          marker={selectedMarker}
          onOpen={() =>
            router.push(
              (selectedMarker.kind === 'ticket'
                ? ROUTES.grid.chamados
                : ROUTES.grid.tarefas) as never
            )
          }
        />
      ) : null}

      <SurfaceCard
        title="Atendimentos no campus"
        subtitle="Toque em um registro para destaca-lo no mapa"
      >
        {filteredMarkers.length ? (
          filteredMarkers.map((marker) => (
            <ListRow
              key={marker.id}
              title={`${marker.code} - ${marker.title}`}
              subtitle={`${CAMPUS_TICKET_KIND_LABELS[marker.kind]} | Bloco ${marker.blockId}${marker.room ? ` | Sala ${marker.room}` : ''}`}
              badge={CAMPUS_TICKET_STATUS_LABELS[marker.status]}
              badgeVariant={statusVariant(marker.status)}
              meta={marker.assignee ?? 'Sem responsavel'}
              initials={marker.kind === 'ticket' ? 'CH' : 'TF'}
              accent={ticketMarkerColor(marker)}
              onPress={() => setSelectedMarkerId(marker.id)}
            />
          ))
        ) : (
          <Text style={[styles.empty, { color: theme.textMuted }]}>
            {t("Nenhum chamado ou tarefa corresponde aos filtros atuais.")}</Text>
        )}
      </SurfaceCard>
    </ModuleScreen>
  );
}

function SelectedMarkerCard({
  marker,
  onOpen,
}: {
  marker: CampusTicketMarker;
  onOpen: () => void;
}) {
  const { t } = useI18n();
  const theme = useThemeColors();
  return (
    <SurfaceCard
      title="Atendimento selecionado"
      subtitle={`${CAMPUS_TICKET_KIND_LABELS[marker.kind]} localizado no Bloco ${marker.blockId}`}
    >
      <View style={styles.selectedHeader}>
        <View style={[styles.selectedIcon, { backgroundColor: `${ticketMarkerColor(marker)}18` }]}>
          {marker.kind === 'ticket' ? (
            <ClipboardList size={20} color={ticketMarkerColor(marker)} />
          ) : (
            <Wrench size={20} color={ticketMarkerColor(marker)} />
          )}
        </View>
        <View style={styles.selectedBody}>
          <Text style={[styles.selectedCode, { color: ticketMarkerColor(marker) }]}>
            {marker.code}
          </Text>
          <Text style={[styles.selectedTitle, { color: theme.text }]}>{marker.title}</Text>
        </View>
      </View>
      <Text style={[styles.selectedMeta, { color: theme.textMuted }]}>
        {t("Bloco")}{' '}{marker.blockId}
        {marker.room ? ` | Sala ${marker.room}` : ''}
        {` | ${CAMPUS_TICKET_STATUS_LABELS[marker.status]}`}
      </Text>
      <Text style={[styles.selectedMeta, { color: theme.textMuted }]}>
        {t("Responsavel:")}{' '}{marker.assignee ?? t("Nao atribuido")}
      </Text>
      {marker.detail ? (
        <Text numberOfLines={3} style={[styles.selectedDetail, { color: theme.textMuted }]}>
          {marker.detail}
        </Text>
      ) : null}
      <AppButton
        label={`Abrir ${CAMPUS_TICKET_KIND_LABELS[marker.kind].toLowerCase()}`}
        accent={gridTheme.accent}
        onPress={onOpen}
        wrapperStyle={styles.openButton}
      />
    </SurfaceCard>
  );
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function validIsoDate(value: string) {
  const normalized = normalizeDateToIso(value);
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(normalized)) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10) === normalized ? normalized : null;
}

function statusVariant(status: CampusTicketMarkerStatus) {
  if (status === 'completed') return 'success' as const;
  if (status === 'in_progress') return 'info' as const;
  return 'danger' as const;
}

const styles = StyleSheet.create({
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  metric: {
    width: '48%',
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  filterButton: {
    flex: 1,
    minWidth: 96,
  },
  statusFilters: {
    gap: 8,
    paddingRight: 12,
  },
  statusButton: {
    minWidth: 105,
  },
  compactButton: {
    minHeight: 40,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBody: {
    flex: 1,
    minWidth: 0,
  },
  selectedCode: {
    fontSize: 10,
    fontWeight: '900',
  },
  selectedTitle: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '900',
  },
  selectedMeta: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
  },
  selectedDetail: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 16,
  },
  openButton: {
    marginTop: 12,
  },
  empty: {
    fontSize: 12,
    fontWeight: '700',
  },
});
