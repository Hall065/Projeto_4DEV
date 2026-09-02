export type SafeAuthorizationType = 'entrada' | 'saida';
export type SafeAuthorizationStatus =
  | 'pendente_aqv'
  | 'aguardando_professor'
  | 'liberado_portaria'
  | 'finalizado'
  | 'negado';

export interface SafeStudent {
  id: string;
  nome: string;
  turma_id?: string | null;
  turma_nome?: string | null;
}

export interface SafeAuthorization {
  id: string;
  protocolo: string;
  aluno_id: string | null;
  aluno_nome: string;
  turma_nome: string;
  tipo: SafeAuthorizationType;
  motivo: string;
  quantidade_faltas: number | null;
  agendada_em: string;
  observacoes: string | null;
  status: SafeAuthorizationStatus;
  solicitada_por: string;
  aprovada_por_professor: string | null;
  aprovada_por_portaria: string | null;
  aprovada_professor_em: string | null;
  confirmada_portaria_em: string | null;
  finalizada_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface SafeAuthorizationLog {
  id: string;
  autorizacao_id: string;
  acao: string;
  usuario_id: string | null;
  created_at: string;
}

export interface SafeAuthorizationInput {
  alunoId: string;
  tipo: SafeAuthorizationType;
  motivo: string;
  agendadaEm: string;
  quantidadeFaltas?: number | null;
  observacoes?: string | null;
}

export interface SafeDashboard {
  total: number;
  aguardandoProfessor: number;
  liberadoPortaria: number;
  finalizadosHoje: number;
  negados: number;
  recentes: SafeAuthorization[];
}
