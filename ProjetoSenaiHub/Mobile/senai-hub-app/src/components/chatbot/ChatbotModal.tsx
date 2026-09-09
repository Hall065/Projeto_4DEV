import { useEffect, useRef, useState }
from 'react';
import { usePathname } from 'expo-router';
import { useChatbotContextStore } from '@/stores/chatbot-context.store';
import { getAnalysisSuggestions } from '@/lib/chatbotContext';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Archive, BotMessageSquare, RefreshCw, X } from 'lucide-react-native';
import { AnimatedPressable, FeedbackMessage } from '@/components/common/VisualPrimitives';
import { ChatInput } from '@/components/chatbot/ChatInput';
import { ChatMessageBubble } from '@/components/chatbot/ChatMessageBubble';
import { ConversationList } from '@/components/chatbot/ConversationList';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useChatbotStore } from '@/stores/chatbot.store';


export function ChatbotModal() {
  const theme = useThemeColors();
  const pathname = usePathname();
  const storedContext = useChatbotContextStore((state) => state.context);
  const context = storedContext?.route === pathname ? storedContext : null;
  const suggestions = getAnalysisSuggestions(context);
  const [savedOnly, setSavedOnly] = useState(false);
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const { confirm } = useConfirmDialog();
  const isWide = width >= 720;
  const {
    isOpen,
    conversations,
    activeConversationId,
    messages,
    loadingConversations,
    loadingMessages,
    isSending,
    archivingConversationId,
    error,
    success,
    close,
    loadConversations,
    selectConversation,
    createConversation,
    archiveActiveConversation,
    sendMessage,
    clearError,
    clearSuccess,
  } = useChatbotStore();

  useEffect(() => {
    if (isOpen) {
      void loadConversations();
    }
  }, [isOpen, loadConversations]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [isOpen, messages.length, isSending]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(clearSuccess, 4500);
    return () => clearTimeout(timer);
  }, [clearSuccess, success]);

  const handleArchive = async () => {
    if (!activeConversationId) return;
    const confirmed = await confirm({
      title: t('Arquivar conversa'),
      message: t('A conversa saira do historico ativo, mas suas mensagens nao serao apagadas definitivamente.'),
      confirmLabel: t('Arquivar'),
    });
    if (confirmed) await archiveActiveConversation();
  };

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.overlay, { backgroundColor: theme.overlay }]}
      >
        <View
          style={[
            styles.sheet,
            {
              width: isWide ? 520 : '100%',
              maxHeight: isWide ? '86%' : '90%',
              backgroundColor: theme.surface,
              borderColor: theme.line,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <View style={[styles.titleIcon, { backgroundColor: theme.surfaceSoft, borderColor: theme.line }]}>
                <BotMessageSquare size={18} color={theme.isDark ? colors.white : colors.red} />
              </View>
              <View style={styles.titleCopy}>
                <Text style={[styles.title, { color: theme.text }]}>{t('Assistente SENAI Hub')}</Text>
                <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                  {context ? `${context.title} • ${context.loading ? t('Carregando dados') : t('Recorte da tela')}` : t('Preparando contexto da página')}
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              {activeConversationId ? (
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel={t('Arquivar conversa ativa')}
                  accessibilityState={{ disabled: Boolean(archivingConversationId || isSending) }}
                  disabled={Boolean(archivingConversationId || isSending)}
                  style={[styles.iconButton, { backgroundColor: theme.surfaceSoft, borderColor: theme.line }]}
                  onPress={() => void handleArchive()}
                >
                  {archivingConversationId ? (
                    <ActivityIndicator size="small" color={theme.textMuted} />
                  ) : (
                    <Archive size={17} color={colors.orange} />
                  )}
                </AnimatedPressable>
              ) : null}
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={t('Atualizar conversas')}
                style={[styles.iconButton, { backgroundColor: theme.surfaceSoft, borderColor: theme.line }]}
                onPress={() => {
                  clearError();
                  void loadConversations();
                }}
              >
                <RefreshCw size={17} color={theme.text} />
              </AnimatedPressable>
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={t('Fechar assistente')}
                style={[styles.iconButton, { backgroundColor: theme.surfaceSoft, borderColor: theme.line }]}
                onPress={close}
              >
                <X size={18} color={theme.text} />
              </AnimatedPressable>
            </View>
          </View>

          {context ? (
            <View style={{ paddingBottom: 8, gap: 4 }}>
              <Text style={{ color: theme.textMuted, fontSize: 11 }}>{Object.entries(context.filters).filter(([, value]) => value !== '' && value !== null).map(([key, value]) => `${key}: ${value}`).join(' • ') || t('Sem filtros adicionais')}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 11 }}>{t('Análise limitada aos registros carregados; dados relidos ao enviar.')}</Text>
            </View>
          ) : null}
          <AnimatedPressable accessibilityRole="button" accessibilityLabel={t('Alternar planos salvos')} onPress={() => setSavedOnly((value) => !value)} style={{ paddingVertical: 8 }}>
            <Text style={{ color: theme.text }}>{savedOnly ? t('Ver todas as mensagens') : t('Ver planos salvos nesta conversa')}</Text>
          </AnimatedPressable>
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            loading={loadingConversations}
            disabled={Boolean(archivingConversationId || isSending)}
            onCreate={() => void createConversation()}
            onSelect={(id) => void selectConversation(id)}
          />

          {error ? <FeedbackMessage variant="warning" message={error} /> : null}
          {success ? <FeedbackMessage variant="success" message={success} /> : null}

          <ScrollView
            ref={scrollRef}
            style={[styles.messages, { backgroundColor: theme.surfaceMuted, borderColor: theme.line }]}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
          >
            {loadingMessages ? (
              <View style={styles.loading}>
                <ActivityIndicator color={theme.textMuted} />
                <Text style={[styles.loadingText, { color: theme.textMuted }]}>
                  {t('Carregando conversa...')}
                </Text>
              </View>
            ) : null}

            {!loadingMessages && messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('Como posso ajudar?')}</Text>
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  {t('Peça uma análise do recorte atual, com evidências e próximos passos.')}
                </Text>
                <View style={styles.suggestions}>
                  {suggestions.map((suggestion) => (
                    <AnimatedPressable
                      disabled={isSending || loadingMessages || !context}
                      key={suggestion}
                      accessibilityRole="button"
                      style={[styles.suggestion, { backgroundColor: theme.surface, borderColor: theme.line }]}
                      onPress={() => void sendMessage(suggestion)}
                    >
                      <Text style={[styles.suggestionText, { color: theme.text }]}>{t(suggestion)}</Text>
                    </AnimatedPressable>
                  ))}
                </View>
              </View>
            ) : null}

            {messages.filter((message) => !savedOnly || message.metadata?.plan_saved === true).map((message, index) => (
              <ChatMessageBubble key={message.id ?? `${message.role}-${index}`} message={message} />
            ))}

            {isSending ? (
              <View style={styles.typing}>
                <ActivityIndicator size="small" color={theme.textMuted} />
                <Text style={[styles.typingText, { color: theme.textMuted }]}>
                  {t('Consultando evidências e preparando a análise...')}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <ChatInput
            disabled={Boolean(isSending || loadingMessages || archivingConversationId || !context || context.loading)}
            onSend={sendMessage}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 0,
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: 17, fontWeight: '900' },
  subtitle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messages: {
    flexGrow: 1,
    minHeight: 280,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  messagesContent: {
    padding: 12,
    paddingBottom: 16,
  },
  loading: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: { fontSize: 12, fontWeight: '800' },
  emptyState: {
    minHeight: 220,
    justifyContent: 'center',
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
  emptyText: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  suggestions: { gap: 8, marginTop: 4 },
  suggestion: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestionText: { fontSize: 12, fontWeight: '800' },
  typing: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  typingText: { fontSize: 12, fontWeight: '800' },
});
