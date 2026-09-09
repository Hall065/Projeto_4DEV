import { AnalysisDetails } from '@/components/chatbot/AnalysisDetails';
import { StyleSheet, Text, View } from 'react-native';
import { Bot, UserRound } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { ChatMessage } from '@/services/chatbot.service';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const theme = useThemeColors();
  const isUser = message.role === 'user';
  const bubbleColor = isUser ? colors.navy : theme.surfaceSoft;
  const textColor = isUser ? colors.white : theme.text;

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {!isUser ? (
        <View style={[styles.avatar, { backgroundColor: theme.isDark ? theme.surface : '#E8F1FF' }]}>
          <Bot size={15} color={theme.isDark ? colors.white : colors.blue} />
        </View>
      ) : null}
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: bubbleColor,
            borderColor: isUser ? colors.navy : theme.line,
          },
        ]}
      >
        <Text selectable style={[styles.text, { color: textColor }]}>{message.conteudo}</Text>
        {!isUser ? <AnalysisDetails message={message} /> : null}
      </View>
      {isUser ? (
        <View style={[styles.avatar, { backgroundColor: theme.isDark ? theme.surface : '#FFE7E9' }]}>
          <UserRound size={15} color={theme.isDark ? colors.white : colors.red} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 10,
  },
  rowUser: { justifyContent: 'flex-end' },
  rowAssistant: { justifyContent: 'flex-start' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '92%',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  text: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
});
