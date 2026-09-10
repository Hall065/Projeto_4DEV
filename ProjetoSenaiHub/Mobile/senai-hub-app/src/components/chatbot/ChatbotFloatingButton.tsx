import { StyleSheet, View } from 'react-native';
import { BotMessageSquare } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimataPressable } from '@/components/common/AnimataPrimitives';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { useThemeColors } from '@/hooks/useThemeColors';

interface ChatbotFloatingButtonProps {
  onPress: () => void;
}

export function ChatbotFloatingButton({ onPress }: ChatbotFloatingButtonProps) {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const { t } = useI18n();

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <AnimataPressable
        accessibilityRole="button"
        accessibilityLabel={t('Abrir assistente SENAI Hub')}
        wrapperStyle={[
          styles.buttonPosition,
          {
            bottom: Math.max(insets.bottom + 72, 84),
          },
        ]}
        style={[
          styles.button,
          {
            backgroundColor: theme.isDark ? colors.red : colors.navy,
            borderColor: theme.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.7)',
          },
        ]}
        onPress={onPress}
      >
        <BotMessageSquare size={24} color={colors.white} />
      </AnimataPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonPosition: {
    position: 'absolute',
    right: 18,
    width: 52,
    height: 52,
    zIndex: 999,
    elevation: 30,
  },
  button: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 30,
  },
});
