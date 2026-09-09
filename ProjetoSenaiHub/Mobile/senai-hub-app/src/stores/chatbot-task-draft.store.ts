import { create } from 'zustand';
import { useAuthStore } from '@/stores/auth.store';
export type ChatTaskDraft = { titulo: string; descricao: string; prioridade: string; chamado_id?: string; observacao: string };
export const useChatbotTaskDraftStore = create<{ draft: ChatTaskDraft | null; setDraft: (draft: ChatTaskDraft | null) => void }>((set) => ({
  draft: null, setDraft: (draft) => set({ draft }),
}));
useAuthStore.subscribe((state, previous) => {
  if (state.session?.userId !== previous.session?.userId || state.session?.perfil?.tipo !== previous.session?.perfil?.tipo) useChatbotTaskDraftStore.getState().setDraft(null);
});
