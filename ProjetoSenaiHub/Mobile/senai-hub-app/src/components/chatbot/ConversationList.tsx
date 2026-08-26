import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MessageSquarePlus } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/common/VisualPrimitives';
import { colors } from '@/constants/colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { ChatConversation } from '@/services/chatbot.service';

interface ConversationListProps {
  conversations: ChatConversation[];
  activeConversationId: string | null;
  loading?: boolean;
  disabled?: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

function formatDate(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function ConversationList({
  conversations,
  activeConversationId,
  loading,
  disabled,
  onSelect,
  onCreate,
}: ConversationListProps) {
  const theme = useThemeColors();

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Text style={[styles.label, { color: theme.textMuted }]}>Conversas</Text>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Criar nova conversa"
          style={[styles.newButton, { backgroundColor: theme.surfaceSoft, borderColor: theme.line }]}
          disabled={disabled}
          onPress={onCreate}
        >
          <MessageSquarePlus size={16} color={theme.text} />
        </AnimatedPressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {loading ? <ActivityIndicator color={theme.textMuted} /> : null}
        {!loading && conversations.length === 0 ? (
          <Text style={[styles.empty, { color: theme.textMuted }]}>Nenhuma conversa ainda</Text>
        ) : null}
        {conversations.map((conversation) => {
          const active = conversation.id === activeConversationId;
          return (
            <AnimatedPressable
              key={conversation.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled }}
              disabled={disabled}
              style={[
                styles.item,
                {
                  backgroundColor: active ? colors.navy : theme.surfaceSoft,
                  borderColor: active ? colors.navy : theme.line,
                },
              ]}
              onPress={() => onSelect(conversation.id)}
            >
              <Text numberOfLines={1} style={[styles.itemTitle, { color: active ? colors.white : theme.text }]}>
                {conversation.titulo || 'Nova conversa'}
              </Text>
              <Text style={[styles.itemDate, { color: active ? 'rgba(255,255,255,0.76)' : theme.textMuted }]}>
                {formatDate(conversation.updated_at ?? conversation.created_at)}
              </Text>
            </AnimatedPressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginBottom: 12 },
  top: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  newButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { gap: 8, alignItems: 'center', paddingRight: 2 },
  empty: { fontSize: 12, fontWeight: '700' },
  item: {
    width: 150,
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  itemTitle: { fontSize: 12, fontWeight: '900' },
  itemDate: { fontSize: 10, fontWeight: '700', marginTop: 4 },
});
