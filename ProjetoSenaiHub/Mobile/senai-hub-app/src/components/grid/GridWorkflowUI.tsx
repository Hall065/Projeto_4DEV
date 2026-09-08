import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Check, X } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/common/VisualPrimitives';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { useThemeColors } from '@/hooks/useThemeColors';

export interface WorkflowTab {
  id: string;
  label: string;
  count: number;
  color: string;
}

export function WorkflowTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: WorkflowTab[];
  active: string;
  onChange: (id: string) => void;
}) {
  const theme = useThemeColors();
  const { t } = useI18n();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabsContent}
      style={styles.tabs}
    >
      {tabs.map((tab) => {
        const selected = active === tab.id;
        return (
          <AnimatedPressable
            key={tab.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.tab,
              {
                backgroundColor: selected ? tab.color : theme.surface,
                borderColor: selected ? tab.color : theme.line,
              },
            ]}
            onPress={() => onChange(tab.id)}
          >
            <Text style={[styles.tabLabel, { color: selected ? colors.white : theme.text }]}>
              {t(tab.label)}
            </Text>
            <View
              style={[
                styles.tabCount,
                { backgroundColor: selected ? 'rgba(255,255,255,0.2)' : theme.surfaceSoft },
              ]}
            >
              <Text style={[styles.tabCountText, { color: selected ? colors.white : theme.textMuted }]}>
                {tab.count}
              </Text>
            </View>
          </AnimatedPressable>
        );
      })}
    </ScrollView>
  );
}

export function WorkflowSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const theme = useThemeColors();
  const { t } = useI18n();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.overlay, { backgroundColor: theme.overlay }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeading}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>{title}</Text>
              {subtitle ? (
                <Text style={[styles.sheetSubtitle, { color: theme.textMuted }]}>{subtitle}</Text>
              ) : null}
            </View>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={t('Fechar')}
              style={[styles.closeButton, { backgroundColor: theme.surfaceSoft }]}
              onPress={onClose}
            >
              <X size={18} color={theme.text} />
            </AnimatedPressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function WorkflowProgress({
  steps,
  currentIndex,
}: {
  steps: { label: string; color: string }[];
  currentIndex: number;
}) {
  const theme = useThemeColors();
  const { t } = useI18n();

  return (
    <View style={styles.progress}>
      {steps.map((step, index) => {
        const complete = index < currentIndex;
        const active = index === currentIndex;
        const reached = complete || active;
        return (
          <View key={step.label} style={styles.progressItem}>
            <View style={styles.progressTrackRow}>
              {index > 0 ? (
                <View
                  style={[
                    styles.progressLine,
                    { backgroundColor: reached ? step.color : theme.line },
                  ]}
                />
              ) : (
                <View style={styles.progressLineSpacer} />
              )}
              <View
                style={[
                  styles.progressDot,
                  {
                    borderColor: reached ? step.color : theme.line,
                    backgroundColor: reached ? step.color : theme.surface,
                  },
                ]}
              >
                {complete ? <Check size={10} color={colors.white} strokeWidth={3} /> : null}
              </View>
              {index < steps.length - 1 ? (
                <View
                  style={[
                    styles.progressLine,
                    { backgroundColor: complete ? steps[index + 1].color : theme.line },
                  ]}
                />
              ) : (
                <View style={styles.progressLineSpacer} />
              )}
            </View>
            <Text
              numberOfLines={2}
              style={[
                styles.progressLabel,
                { color: reached ? theme.text : theme.textSubtle },
                active && styles.progressLabelActive,
              ]}
            >
              {t(step.label)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon?: ReactNode;
}) {
  const theme = useThemeColors();
  const { t } = useI18n();

  return (
    <View style={[styles.infoRow, { borderBottomColor: theme.line }]}>
      <View style={styles.infoLabelWrap}>
        {icon}
        <Text style={[styles.infoLabel, { color: theme.textMuted }]}>{t(label)}</Text>
      </View>
      <Text style={[styles.infoValue, { color: theme.text }]}>
        {value?.trim() || t('Nao informado')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { marginHorizontal: -2 },
  tabsContent: { gap: 8, paddingHorizontal: 2, paddingVertical: 2 },
  tab: {
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  tabLabel: { fontSize: 12, fontWeight: '800' },
  tabCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountText: { fontSize: 10, fontWeight: '900' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    width: '100%',
    maxHeight: '90%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  sheetHeading: { flex: 1, minWidth: 0 },
  sheetTitle: { fontSize: 18, fontWeight: '900' },
  sheetSubtitle: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetContent: { paddingBottom: 28 },
  progress: { flexDirection: 'row', marginVertical: 10 },
  progressItem: { flex: 1, minWidth: 0, alignItems: 'center' },
  progressTrackRow: { width: '100%', flexDirection: 'row', alignItems: 'center' },
  progressLine: { flex: 1, height: 2 },
  progressLineSpacer: { flex: 1, height: 2 },
  progressDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressLabel: {
    minHeight: 28,
    marginTop: 5,
    paddingHorizontal: 2,
    textAlign: 'center',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
  },
  progressLabelActive: { fontWeight: '900' },
  infoRow: {
    minHeight: 46,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoLabelWrap: {
    width: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: { flex: 1, fontSize: 11, fontWeight: '700' },
  infoValue: { flex: 1, textAlign: 'right', fontSize: 12, lineHeight: 17, fontWeight: '800' },
});
