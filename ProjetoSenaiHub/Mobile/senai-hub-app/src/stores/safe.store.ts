import { create } from 'zustand';
import { safeService } from '@/services/safe.service';
import type {
  SafeAuthorization,
  SafeAuthorizationInput,
  SafeAuthorizationStatus,
  SafeDashboard,
  SafeStudent,
} from '@/types/safe.types';

interface SafeState {
  dashboard: SafeDashboard | null;
  authorizations: SafeAuthorization[];
  students: SafeStudent[];
  loading: boolean;
  submittingId: string | null;
  error: string | null;
  loadDashboard: () => Promise<void>;
  loadAuthorizations: (filters?: { status?: SafeAuthorizationStatus; search?: string }) => Promise<void>;
  loadStudents: (search?: string) => Promise<void>;
  createAuthorization: (input: SafeAuthorizationInput) => Promise<void>;
  decideAsProfessor: (id: string, approve: boolean) => Promise<void>;
  decideAsPortaria: (id: string, approve: boolean) => Promise<void>;
  clearError: () => void;
}

function message(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message?: unknown }).message ?? '');
  return 'Nao foi possivel concluir a operacao do Safe.';
}

export const useSafeStore = create<SafeState>((set, get) => ({
  dashboard: null,
  authorizations: [],
  students: [],
  loading: false,
  submittingId: null,
  error: null,

  loadDashboard: async () => {
    set({ loading: true, error: null });
    try {
      set({ dashboard: await safeService.getDashboard() });
    } catch (error) {
      set({ error: message(error) });
    } finally {
      set({ loading: false });
    }
  },

  loadAuthorizations: async (filters) => {
    set({ loading: true, error: null });
    try {
      set({ authorizations: await safeService.listAuthorizations(filters) });
    } catch (error) {
      set({ error: message(error) });
    } finally {
      set({ loading: false });
    }
  },

  loadStudents: async (search) => {
    try {
      set({ students: await safeService.listStudents(search) });
    } catch (error) {
      set({ error: message(error) });
    }
  },

  createAuthorization: async (input) => {
    set({ submittingId: 'create', error: null });
    try {
      await safeService.createAuthorization(input);
      await Promise.all([get().loadDashboard(), get().loadAuthorizations()]);
    } catch (error) {
      set({ error: message(error) });
      throw error;
    } finally {
      set({ submittingId: null });
    }
  },

  decideAsProfessor: async (id, approve) => {
    set({ submittingId: id, error: null });
    try {
      await safeService.decideAsProfessor(id, approve);
      await Promise.all([get().loadDashboard(), get().loadAuthorizations({ status: 'aguardando_professor' })]);
    } catch (error) {
      set({ error: message(error) });
      throw error;
    } finally {
      set({ submittingId: null });
    }
  },

  decideAsPortaria: async (id, approve) => {
    set({ submittingId: id, error: null });
    try {
      await safeService.decideAsPortaria(id, approve);
      await Promise.all([get().loadDashboard(), get().loadAuthorizations({ status: 'liberado_portaria' })]);
    } catch (error) {
      set({ error: message(error) });
      throw error;
    } finally {
      set({ submittingId: null });
    }
  },

  clearError: () => set({ error: null }),
}));
