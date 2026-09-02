import { supabase } from '@/lib/supabase';
import type {
  SafeAuthorization,
  SafeAuthorizationInput,
  SafeAuthorizationStatus,
  SafeDashboard,
  SafeStudent,
} from '@/types/safe.types';

type Row = Record<string, unknown>;

function toAuthorization(row: Row): SafeAuthorization {
  return row as unknown as SafeAuthorization;
}

function toStudent(row: Row): SafeStudent {
  const turma = Array.isArray(row.turmas) ? row.turmas[0] : row.turmas;
  return {
    id: String(row.id),
    nome: String(row.nome ?? ''),
    turma_id: typeof row.turma_id === 'string' ? row.turma_id : null,
    turma_nome: turma && typeof turma === 'object' ? String((turma as Row).nome ?? '') : null,
  };
}

function startOfToday() {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value.toISOString();
}

export const safeService = {
  async listAuthorizations(filters?: { status?: SafeAuthorizationStatus; search?: string }) {
    let query = supabase
      .schema('safe')
      .from('autorizacoes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.search?.trim()) {
      const search = filters.search.trim().replace(/[,()]/g, ' ');
      query = query.or('protocolo.ilike.%' + search + '%,aluno_nome.ilike.%' + search + '%,turma_nome.ilike.%' + search + '%');
    }

    const { data, error } = await query;
    if (error) throw error;
    return ((data ?? []) as Row[]).map(toAuthorization);
  },

  async listStudents(search = '') {
    let query = supabase
      .schema('connect')
      .from('alunos')
      .select('id,nome,turma_id,turmas(nome)')
      .order('nome', { ascending: true })
      .limit(100);

    if (search.trim()) query = query.ilike('nome', '%' + search.trim() + '%');
    const { data, error } = await query;
    if (error) throw error;
    return ((data ?? []) as Row[]).map(toStudent);
  },

  async createAuthorization(input: SafeAuthorizationInput) {
    const { data, error } = await supabase.schema('safe').rpc('criar_autorizacao', {
      p_aluno_id: input.alunoId,
      p_tipo: input.tipo,
      p_motivo: input.motivo.trim(),
      p_agendada_em: input.agendadaEm,
      p_quantidade_faltas: input.quantidadeFaltas ?? null,
      p_observacoes: input.observacoes?.trim() || null,
    });
    if (error) throw error;
    return toAuthorization(data as Row);
  },

  async decideAsProfessor(id: string, approve: boolean) {
    const { data, error } = await supabase.schema('safe').rpc('decidir_professor', {
      p_id: id,
      p_aprovar: approve,
    });
    if (error) throw error;
    return toAuthorization(data as Row);
  },

  async decideAsPortaria(id: string, approve: boolean) {
    const { data, error } = await supabase.schema('safe').rpc('decidir_portaria', {
      p_id: id,
      p_aprovar: approve,
    });
    if (error) throw error;
    return toAuthorization(data as Row);
  },

  async getDashboard(): Promise<SafeDashboard> {
    const items = await this.listAuthorizations();
    const today = startOfToday();
    return {
      total: items.length,
      aguardandoProfessor: items.filter((item) => item.status === 'aguardando_professor').length,
      liberadoPortaria: items.filter((item) => item.status === 'liberado_portaria').length,
      finalizadosHoje: items.filter((item) => item.status === 'finalizado' && item.finalizada_em && item.finalizada_em >= today).length,
      negados: items.filter((item) => item.status === 'negado').length,
      recentes: items.slice(0, 8),
    };
  },
};
