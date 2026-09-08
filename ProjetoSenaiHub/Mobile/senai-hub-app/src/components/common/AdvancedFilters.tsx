import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react-native';
import { AnimatedPressable, AppButton, FeedbackMessage, SurfaceCard } from '@/components/common/VisualPrimitives';
import { colors } from '@/constants/colors';
import { radius, spacing, touchTarget } from '@/constants/designTokens';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useI18n } from '@/hooks/useI18n';

export interface FilterOption {
  value: string;
  label: string;
}

interface AdvancedFilterPanelProps {
  children: ReactNode;
  resultCount: number;
  activeCount: number;
  onApply: () => void;
  onClear: () => void;
  error?: string | null;
}

export function AdvancedFilterPanel({
  children,
  resultCount,
  activeCount,
  onApply,
  onClear,
  error,
}: AdvancedFilterPanelProps) {
  const { t } = useI18n();
  const theme = useThemeColors();
  const [expanded, setExpanded] = useState(false);

  return (
    <SurfaceCard>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={t("Filtros avancados")}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={styles.header}
      >
        <View style={styles.headerCopy}>
          <SlidersHorizontal size={18} color={colors.primary} />
          <View>
            <Text style={[styles.title, { color: theme.text }]}>{t("Filtros avancados")}</Text>
            <Text style={[styles.summary, { color: theme.textMuted }]}>
              {resultCount} {' '}{t("resultado(s)")}{activeCount ? ` - ${activeCount} ativo(s)` : ''}
            </Text>
          </View>
        </View>
        {expanded ? <ChevronUp size={18} color={theme.text} /> : <ChevronDown size={18} color={theme.text} />}
      </AnimatedPressable>

      {expanded ? (
        <View style={[styles.body, { borderTopColor: theme.line }]}>
          {error ? <FeedbackMessage variant="warning" message={error} /> : null}
          {children}
          <View style={styles.actions}>
            <AppButton label="Limpar filtros" variant="secondary" onPress={onClear} wrapperStyle={styles.action} />
            <AppButton label="Aplicar" onPress={onApply} wrapperStyle={styles.action} />
          </View>
        </View>
      ) : null}
    </SurfaceCard>
  );
}

interface FilterChoiceProps {
  label: string;
  value: string;
  options: readonly FilterOption[];
  onChange: (value: string) => void;
  allLabel?: string;
}

export function FilterChoice({ label, value, options, onChange, allLabel = 'Todos' }: FilterChoiceProps) {
  const theme = useThemeColors();
  const choices = [{ value: '', label: allLabel }, ...options];

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.text }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>
        {choices.map((option) => {
          const selected = value === option.value;
          return (
            <AnimatedPressable
              key={`${label}-${option.value || 'all'}`}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label}: ${option.label}`}
              onPress={() => onChange(option.value)}
              style={[
                styles.choice,
                {
                  backgroundColor: selected ? colors.primary : theme.surfaceSoft,
                  borderColor: selected ? colors.primary : theme.line,
                },
              ]}
            >
              <Text style={[styles.choiceText, { color: selected ? colors.white : theme.text }]}>
                {option.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface FilterTextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps['keyboardType'];
}

export function FilterTextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: FilterTextFieldProps) {
  const theme = useThemeColors();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.text }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSubtle}
        keyboardType={keyboardType}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.surfaceSoft, borderColor: focused ? theme.inputFocused : theme.line },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 14, fontWeight: '900' },
  summary: { marginTop: 2, fontSize: 11, fontWeight: '700' },
  body: { borderTopWidth: 1, marginTop: spacing.md, paddingTop: spacing.md, gap: spacing.md },
  field: { gap: spacing.xs },
  fieldLabel: { fontSize: 12, fontWeight: '900' },
  choices: { gap: spacing.xs, paddingRight: spacing.sm },
  choice: {
    minHeight: 38,
    borderWidth: 1,
    borderRadius: radius.pill,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  choiceText: { fontSize: 11, fontWeight: '800' },
  input: {
    minHeight: touchTarget.min,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 12,
    fontWeight: '700',
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
