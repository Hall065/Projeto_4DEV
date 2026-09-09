import { create } from 'zustand';
import type { AnalysisContext } from '@/lib/chatbotContext';

export const useChatbotContextStore = create<{
  context: AnalysisContext | null;
  setContext: (context: AnalysisContext) => void;
  clear: (fingerprint?: string) => void;
}>((set) => ({
  context: null,
  setContext: (context) => set((state) => state.context?.fingerprint === context.fingerprint ? state : { context }),
  clear: (fingerprint) => set((state) => !fingerprint || state.context?.fingerprint === fingerprint ? { context: null } : state),
}));
