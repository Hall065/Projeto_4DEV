import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/common/VisualPrimitives';
import { colors } from '@/constants/colors';
import { useMotionPreference } from '@/hooks/useMotionPreference';
import { useThemeColors } from '@/hooks/useThemeColors';

interface FormBottomSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function FormBottomSheet({ visible, title, onClose, children }: FormBottomSheetProps) {
  const theme = useThemeColors();
  const { shouldAnimate } = useMotionPreference();

  return (
    <Modal visible={visible} animationType={shouldAnimate ? 'slide' : 'none'} transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <AnimatedPressable style={[styles.closeButton, { backgroundColor: theme.surfaceSoft }]} onPress={onClose}>
              <X size={18} color={theme.text} />
            </AnimatedPressable>
          </View>
          <ScrollView style={styles.content}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.navy },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.panelSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexGrow: 0 },
});
