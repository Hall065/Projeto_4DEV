import { Modal, StyleSheet, Text, View } from 'react-native';
import { FileSpreadsheet, FileText, X } from 'lucide-react-native';
import { AnimatedPressable, AppButton } from '@/components/common/VisualPrimitives';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { useMotionPreference } from '@/hooks/useMotionPreference';
import { useThemeColors } from '@/hooks/useThemeColors';

interface ExportModalProps {
  visible: boolean;
  title?: string;
  loading?: boolean;
  onClose: () => void;
  onPDF: () => void | Promise<void>;
  onExcel: () => void | Promise<void>;
}

export function ExportModal({
  visible,
  title = 'Exportar dados',
  loading,
  onClose,
  onPDF,
  onExcel,
}: ExportModalProps) {
  const theme = useThemeColors();
  const { t } = useI18n();
  const { shouldAnimate } = useMotionPreference();
  return (
    <Modal visible={visible} transparent animationType={shouldAnimate ? 'fade' : 'none'} onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.dialog, { backgroundColor: theme.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>{t(title)}</Text>
            <AnimatedPressable style={[styles.closeButton, { backgroundColor: theme.surfaceSoft }]} onPress={onClose}>
              <X size={18} color={theme.text} />
            </AnimatedPressable>
          </View>

          <View style={styles.actions}>
            <AppButton
              label="PDF"
              accent={colors.red}
              icon={<FileText size={17} color={colors.white} />}
              onPress={onPDF}
              loading={loading}
            />
            <AppButton
              label="Excel"
              variant="secondary"
              accent={colors.green}
              icon={<FileSpreadsheet size={17} color={colors.green} />}
              onPress={onExcel}
              disabled={loading}
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.42)',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 8,
    backgroundColor: colors.white,
    padding: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  title: { flex: 1, color: colors.navy, fontSize: 17, fontWeight: '900' },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.panelSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { gap: 10 },
});
