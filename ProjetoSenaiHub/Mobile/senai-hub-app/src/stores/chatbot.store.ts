import { useChatbotContextStore } from '@/stores/chatbot-context.store';
import { create } from 'zustand';
import { chatbotService, type ChatConversation, type ChatMessage } from '@/services/chatbot.service';
import { useAuthStore } from '@/stores/auth.store';
import { isStudentRole } from '@/lib/permissions';

interface ChatbotState {
  isOpen: boolean;
  conversations: ChatConversation[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  loadingConversations: boolean;
  loadingMessages: boolean;
  isSending: boolean;
  archivingConversationId: string | null;
  error: string | null;
  success: string | null;
  open: () => void;
  close: () => void;
  loadConversations: () => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  createConversation: () => Promise<boolean>;
  archiveActiveConversation: () => Promise<boolean>;
  savePlan: (messageId: string, saved: boolean, note: string, status: string) => Promise<boolean>;
  sendMessage: (message: string) => Promise<boolean>;
  clearError: () => void;
  clearSuccess: () => void;
  reset: () => void;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'O assistente esta temporariamente indisponivel.';
}

let messageLoadSequence = 0;
let sessionGeneration = 0;
function authorized() {
  const session = useAuthStore.getState().session;
  return Boolean(session && !isStudentRole(session.perfil?.tipo));
}

export const useChatbotStore = create<ChatbotState>((set, get) => ({
  isOpen: false,
  conversations: [],
  activeConversationId: null,
  messages: [],
  loadingConversations: false,
  loadingMessages: false,
  isSending: false,
  archivingConversationId: null,
  error: null,
  success: null,

  open: () => {
    const session = useAuthStore.getState().session;
    if (!session || isStudentRole(session.perfil?.tipo)) {
      get().reset();
      return;
    }
    set({ isOpen: true, error: null, success: null });
    void get().loadConversations();
  },

  close: () => set({ isOpen: false }),

  loadConversations: async () => {
    if (!authorized()) { get().reset(); return; }
    const generation = sessionGeneration;
    set({ loadingConversations: true, error: null });
    try {
      const conversations = (await chatbotService.listConversations()).filter(
        (conversation) => conversation.status !== 'arquivada'
      );
      if (generation !== sessionGeneration) return;
      const currentId = get().activeConversationId;
      const currentStillExists = Boolean(
        currentId && conversations.some((conversation) => conversation.id === currentId)
      );
      set({
        conversations,
        loadingConversations: false,
        activeConversationId: currentStillExists ? currentId : null,
        messages: currentStillExists ? get().messages : [],
      });

      if (!currentStillExists && conversations[0]) {
        await get().selectConversation(conversations[0].id);
      }
    } catch (error) {
      if (generation !== sessionGeneration) return;
      set({ loadingConversations: false, error: getErrorMessage(error) });
    }
  },

  selectConversation: async (conversationId: string) => {
    if (!authorized()) { get().reset(); return; }
    const generation = sessionGeneration;
    if (get().archivingConversationId || get().isSending) return;
    const requestSequence = ++messageLoadSequence;
    set({ activeConversationId: conversationId, messages: [], loadingMessages: true, error: null });
    try {
      const messages = await chatbotService.listMessages(conversationId);
      if (generation !== sessionGeneration || requestSequence !== messageLoadSequence || get().activeConversationId !== conversationId) return;
      set({ messages, loadingMessages: false });
    } catch (error) {
      if (generation !== sessionGeneration) return;
      if (generation !== sessionGeneration || requestSequence !== messageLoadSequence || get().activeConversationId !== conversationId) return;
      set({ loadingMessages: false, error: getErrorMessage(error) });
    }
  },

  createConversation: async () => {
    if (!authorized()) { get().reset(); return false; }
    const generation = sessionGeneration;
    if (get().archivingConversationId || get().isSending) return false;
    messageLoadSequence += 1;
    set({ loadingMessages: true, error: null });
    try {
      const conversation = await chatbotService.createConversation();
      if (generation !== sessionGeneration) return false;
      set((state) => ({
        conversations: [conversation, ...state.conversations],
        activeConversationId: conversation.id,
        messages: [],
        loadingMessages: false,
      }));
      return true;
    } catch (error) {
      if (generation !== sessionGeneration) return false;
      set({ loadingMessages: false, error: getErrorMessage(error) });
      return false;
    }
  },

  archiveActiveConversation: async () => {
    if (!authorized()) { get().reset(); return false; }
    const generation = sessionGeneration;
    const conversationId = get().activeConversationId;
    if (!conversationId || get().archivingConversationId || get().isSending) return false;

    let archived = false;
    messageLoadSequence += 1;
    set({ archivingConversationId: conversationId, error: null, success: null });
    try {
      await chatbotService.archiveConversation(conversationId);
      if (generation !== sessionGeneration) return false;
      archived = true;
      set((state) => ({
        conversations: state.conversations.filter((item) => item.id !== conversationId),
        activeConversationId: null,
        messages: [],
      }));
      const conversation = await chatbotService.createConversation();
      if (generation !== sessionGeneration) return false;
      set((state) => ({
        conversations: [
          conversation,
          ...state.conversations.filter((item) => item.id !== conversationId),
        ],
        activeConversationId: conversation.id,
        messages: [],
        loadingMessages: false,
        archivingConversationId: null,
        success: 'Conversa arquivada. Uma nova conversa esta pronta para uso.',
      }));
      return true;
    } catch (error) {
      if (generation !== sessionGeneration) return false;
      set({
        archivingConversationId: null,
        error: archived
          ? 'A conversa foi arquivada, mas nao foi possivel abrir uma nova. Use o botao de nova conversa.'
          : getErrorMessage(error),
        success: archived ? 'Conversa arquivada com sucesso.' : null,
      });
      return archived;
    }
  },

  sendMessage: async (message: string) => {
    if (!authorized()) { get().reset(); return false; }
    const generation = sessionGeneration;
    const context = useChatbotContextStore.getState().context;
    if (!context || context.loading) { set({ error: 'Aguarde os dados da página antes de analisar.' }); return false; }
    const trimmed = message.trim();
    if (!trimmed || get().isSending || get().archivingConversationId) return false;

    const activeConversationId = get().activeConversationId;
    const optimisticMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      metadata: { page_context: context },
      role: 'user',
      conteudo: trimmed,
      created_at: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, optimisticMessage],
      isSending: true,
      error: null,
    }));

    try {
      const response = await chatbotService.sendMessage({
        conversationId: activeConversationId,
        message: trimmed,
        context,
      });

      if (generation !== sessionGeneration) return false;
      set((state) => ({
        activeConversationId: response.conversation_id,
        messages: [...state.messages, response.message],
        isSending: false,
      }));

      await get().loadConversations();
      return true;
    } catch (error) {
      if (generation !== sessionGeneration) return false;
      set((state) => ({
        messages: state.messages.filter((item) => item.id !== optimisticMessage.id),
        isSending: false,
        error: getErrorMessage(error),
      }));
      return false;
    }
  },

  savePlan: async (messageId, saved, note, status) => {
    if (!authorized()) return false;
    const generation = sessionGeneration;
    try {
      const updated = await chatbotService.savePlan(messageId, saved, note, status);
      if (generation !== sessionGeneration) return false;
      set((state) => ({ messages: state.messages.map((message) => message.id === messageId ? updated : message), success: saved ? 'Plano salvo no histórico.' : 'Plano removido dos salvos.' }));
      return true;
    } catch (error) {
      if (generation === sessionGeneration) set({ error: getErrorMessage(error) });
      return false;
    }
  },

  clearError: () => set({ error: null }),
  clearSuccess: () => set({ success: null }),
  reset: () => {
    sessionGeneration += 1;
    messageLoadSequence += 1;
    set({
      isOpen: false,
      conversations: [],
      activeConversationId: null,
      messages: [],
      loadingConversations: false,
      loadingMessages: false,
      isSending: false,
      archivingConversationId: null,
      error: null,
      success: null,
    });
  },
}));

useAuthStore.subscribe((state, previous) => {
  if (state.session?.userId !== previous.session?.userId || state.session?.perfil?.tipo !== previous.session?.perfil?.tipo) {
    useChatbotStore.getState().reset();
    useChatbotContextStore.getState().clear();
  }
});
