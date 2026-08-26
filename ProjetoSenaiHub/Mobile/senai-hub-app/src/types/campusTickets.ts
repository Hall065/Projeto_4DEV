import type { CampusBlockId } from '@/constants/campusBlocks';
import type { ChamadoPrioridade } from '@/types/grid.types';

export type CampusTicketMarkerKind = 'ticket' | 'task';
export type CampusTicketMarkerStatus = 'open' | 'in_progress' | 'completed';

export interface CampusTicketMarker {
  id: string;
  sourceId: string;
  kind: CampusTicketMarkerKind;
  code: string;
  title: string;
  blockId: CampusBlockId;
  room?: string;
  priority: ChamadoPrioridade;
  status: CampusTicketMarkerStatus;
  statusLabel: string;
  rawStatus: string;
  assignee?: string;
  assigneeId?: string;
  categoryId?: string;
  categoryLabel?: string;
  createdAt?: string;
  detail?: string;
}

export const CAMPUS_TICKET_STATUS_LABELS: Record<CampusTicketMarkerStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  completed: 'Concluido',
};

export const CAMPUS_TICKET_STATUS_COLORS: Record<CampusTicketMarkerStatus, string> = {
  open: '#DC2626',
  in_progress: '#2563EB',
  completed: '#16A34A',
};

export const CAMPUS_TICKET_KIND_LABELS: Record<CampusTicketMarkerKind, string> = {
  ticket: 'Chamado',
  task: 'Tarefa',
};
