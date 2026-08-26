import { CAMPUS_BLOCKS, type CampusBlockId } from '@/constants/campusBlocks';
import type {
  CampusTicketMarker,
  CampusTicketMarkerKind,
  CampusTicketMarkerStatus,
} from '@/types/campusTickets';
import { CAMPUS_TICKET_STATUS_COLORS } from '@/types/campusTickets';
import type { Chamado, ChamadoStatus, Tarefa, TarefaStatus } from '@/types/grid.types';

const BLOCK_IDS = CAMPUS_BLOCKS.map((block) => block.id);

export function normalizeCampusBlockId(value?: string | null): CampusBlockId | null {
  if (!value?.trim()) return null;
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

  if (normalized === 'A' || normalized === 'B' || normalized === 'C' || normalized === 'D') {
    return normalized;
  }

  const match =
    normalized.match(/BLOCO[\s_-]*([ABCD])/) ??
    normalized.match(/\b([ABCD])\b/);
  return match ? (match[1] as CampusBlockId) : null;
}

function ticketStatus(status: ChamadoStatus): CampusTicketMarkerStatus {
  if (status === 'concluido' || status === 'concluida') return 'completed';
  if (status === 'em_andamento' || status === 'em_atendimento') return 'in_progress';
  return 'open';
}

function taskStatus(status: TarefaStatus): CampusTicketMarkerStatus {
  if (status === 'concluida' || status === 'concluido') return 'completed';
  if (status === 'em_andamento') return 'in_progress';
  return 'open';
}

function statusLabel(value?: string | null) {
  if (!value) return 'Sem status';
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function buildCampusTicketMarkers(
  tasks: Tarefa[],
  tickets: Chamado[]
): CampusTicketMarker[] {
  const markers: CampusTicketMarker[] = [];
  const seen = new Set<string>();
  const ticketsById = new Map(tickets.map((ticket) => [ticket.id, ticket]));

  for (const ticket of tickets) {
    if (ticket.status === 'cancelado') continue;
    const blockId = normalizeCampusBlockId(
      ticket.bloco_nome ?? ticket.bloco_texto
    );
    if (!blockId) continue;

    const id = `ticket-${ticket.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    markers.push({
      id,
      sourceId: ticket.id,
      kind: 'ticket',
      code: ticket.codigo || 'Chamado',
      title: ticket.titulo,
      blockId,
      room: ticket.sala_nome ?? ticket.sala_texto ?? undefined,
      priority: ticket.prioridade,
      status: ticketStatus(ticket.status),
      statusLabel: statusLabel(ticket.status),
      rawStatus: ticket.status,
      assignee: ticket.responsavel_nome ?? undefined,
      assigneeId: ticket.responsavel_id ?? undefined,
      categoryId: ticket.categoria_id ?? undefined,
      categoryLabel: ticket.categoria_nome ?? undefined,
      createdAt: ticket.criado_em ?? ticket.created_at ?? ticket.data_abertura ?? undefined,
      detail: ticket.categoria_nome ?? ticket.descricao,
    });
  }

  for (const task of tasks) {
    if (task.status === 'cancelado') continue;
    const blockId = normalizeCampusBlockId(task.bloco_nome);
    if (!blockId) continue;

    const id = `task-${task.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const linkedTicket = ticketsById.get(task.chamado_id);
    markers.push({
      id,
      sourceId: task.id,
      kind: 'task',
      code: task.codigo ?? task.chamado_codigo ?? 'Tarefa',
      title: task.titulo,
      blockId,
      room: task.sala_nome ?? undefined,
      priority: task.prioridade ?? 'media',
      status: taskStatus(task.status),
      statusLabel: task.status_label ?? statusLabel(task.status),
      rawStatus: task.status,
      assignee: task.responsavel_nome ?? undefined,
      assigneeId: task.responsavel_id ?? undefined,
      categoryId: linkedTicket?.categoria_id ?? undefined,
      categoryLabel: linkedTicket?.categoria_nome ?? undefined,
      createdAt: task.criado_em ?? task.created_at ?? task.aberto_em ?? linkedTicket?.criado_em ?? linkedTicket?.created_at,
      detail: task.item_nome ?? task.descricao,
    });
  }

  return markers;
}

export function ticketMarkerColor(marker: CampusTicketMarker): string {
  if (marker.priority === 'urgente' && marker.status !== 'completed') return '#B91C1C';
  if (marker.priority === 'alta' && marker.status === 'in_progress') return '#1D4ED8';
  return CAMPUS_TICKET_STATUS_COLORS[marker.status];
}

export function countTicketsByStatus(
  markers: CampusTicketMarker[]
): Record<CampusTicketMarkerStatus, number> {
  return markers.reduce(
    (accumulator, marker) => {
      accumulator[marker.status] += 1;
      return accumulator;
    },
    { open: 0, in_progress: 0, completed: 0 }
  );
}

export function countTicketsByKind(
  markers: CampusTicketMarker[]
): Record<CampusTicketMarkerKind, number> {
  return markers.reduce(
    (accumulator, marker) => {
      accumulator[marker.kind] += 1;
      return accumulator;
    },
    { ticket: 0, task: 0 }
  );
}

export function countUnmappedGridRecords(tasks: Tarefa[], tickets: Chamado[]) {
  const unmappedTickets = tickets.filter(
    (ticket) =>
      ticket.status !== 'cancelado' &&
      !normalizeCampusBlockId(ticket.bloco_nome ?? ticket.bloco_texto)
  ).length;
  const unmappedTasks = tasks.filter(
    (task) =>
      task.status !== 'cancelado' &&
      !normalizeCampusBlockId(task.bloco_nome)
  ).length;
  return unmappedTickets + unmappedTasks;
}

export function groupTicketsByBlock(
  markers: CampusTicketMarker[]
): Record<CampusBlockId, CampusTicketMarker[]> {
  return BLOCK_IDS.reduce(
    (accumulator, blockId) => {
      accumulator[blockId] = markers.filter((marker) => marker.blockId === blockId);
      return accumulator;
    },
    {} as Record<CampusBlockId, CampusTicketMarker[]>
  );
}
