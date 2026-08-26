import { Modal, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/common/VisualPrimitives';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { useMotionPreference } from '@/hooks/useMotionPreference';
import { useThemeColors } from '@/hooks/useThemeColors';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const theme = useThemeColors();
  const { t } = useI18n();
  const { shouldAnimate } = useMotionPreference();
  return (
    <Modal visible={visible} transparent animationType={shouldAnimate ? 'fade' : 'none'} onRequestClose={onCancel}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text style={[styles.title, { color: theme.text }]}>{t(title)}</Text>
          <Text style={[styles.message, { color: theme.textMuted }]}>{t(message)}</Text>
          <View style={styles.actions}>
            <AppButton
              label={cancelLabel}
              variant="secondary"
              accent={colors.navy}
              onPress={onCancel}
              wrapperStyle={styles.actionButton}
            />
            <AppButton
              label={confirmLabel}
              accent={colors.red}
              onPress={onConfirm}
              wrapperStyle={styles.actionButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy,
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    color: colors.grayText,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  actionButton: { flex: 1 },
});
