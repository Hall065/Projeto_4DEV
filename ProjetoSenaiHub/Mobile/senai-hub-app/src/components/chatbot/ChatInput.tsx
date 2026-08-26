import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SendHorizonal } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/common/VisualPrimitives';
import { colors } from '@/constants/colors';
import { useThemeColors } from '@/hooks/useThemeColors';

interface ChatInputProps {
  disabled?: boolean;
  onSend: (message: string) => Promise<boolean>;
}

export function ChatInput({ disabled, onSend }: ChatInputProps) {
  const theme = useThemeColors();
  const inputRef = useRef<TextInput>(null);
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const busy = Boolean(disabled || submitting);
  const canSend = value.trim().length > 0 && !busy;

  async function handleSend() {
    const message = value.trim();
    if (!message || busy) return;
    setSubmitting(true);
    try {
      const sent = await onSend(message);
      if (sent) {
        setValue('');
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyPress(event: NativeSyntheticEvent<TextInputKeyPressEventData>) {
    if (Platform.OS !== 'web') return;
    const nativeEvent = event.nativeEvent as TextInputKeyPressEventData & {
      shiftKey?: boolean;
      isComposing?: boolean;
    };
    if (nativeEvent.key !== 'Enter' || nativeEvent.shiftKey || nativeEvent.isComposing) return;
    event.preventDefault();
    void handleSend();
  }

  return (
    <View style={[styles.wrap, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: theme.text }]}
        placeholder="Pergunte sobre alunos, turmas, chamados..."
        placeholderTextColor={theme.textSubtle}
        value={value}
        onChangeText={setValue}
        multiline
        maxLength={1800}
        editable={!busy}
        returnKeyType={Platform.OS === 'web' ? 'send' : 'default'}
        onKeyPress={handleKeyPress}
      />
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel="Enviar mensagem"
        disabled={!canSend}
        style={[
          styles.sendButton,
          {
            backgroundColor: canSend ? colors.red : theme.surfaceSoft,
            borderColor: canSend ? colors.red : theme.line,
          },
        ]}
        onPress={handleSend}
      >
        {busy ? <ActivityIndicator size="small" color={theme.textMuted} /> : <SendHorizonal size={18} color={canSend ? colors.white : theme.textMuted} />}
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 54,
    maxHeight: 116,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 92,
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 8,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
