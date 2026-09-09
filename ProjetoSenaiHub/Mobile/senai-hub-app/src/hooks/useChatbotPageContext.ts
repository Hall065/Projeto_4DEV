import { useAuthStore } from '@/stores/auth.store';
import { useCallback } from 'react';
import { useFocusEffect, usePathname } from 'expo-router';
import { buildAnalysisContext, type PageAnalysis } from '@/lib/chatbotContext';
import { useChatbotContextStore } from '@/stores/chatbot-context.store';

export function useChatbotPageContext(title: string, analysis: PageAnalysis | undefined, loading = false) {
  const route = usePathname();
  const identity = useAuthStore((state) => `${state.session?.userId}:${state.session?.perfil?.tipo}`);
  // Serialize the small identifier snapshot, never the full records, to stabilize filter updates.
  const snapshot = buildAnalysisContext(route, title, analysis, loading);
  const serialized = JSON.stringify({ identity, snapshot: { ...snapshot, captured_at: '' } });
  useFocusEffect(useCallback(() => {
    const context = { ...JSON.parse(serialized).snapshot, captured_at: new Date().toISOString() };
    useChatbotContextStore.getState().setContext(context);
    return () => useChatbotContextStore.getState().clear(context.fingerprint);
  }, [serialized]));
}
