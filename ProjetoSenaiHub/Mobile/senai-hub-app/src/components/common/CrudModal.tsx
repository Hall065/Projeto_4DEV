import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import type { KeyboardTypeOptions } from 'react-native';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Camera, Check, ChevronDown, X } from 'lucide-react-native';
import { AnimatedPressable, AppButton, FeedbackMessage } from '@/components/common/VisualPrimitives';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { useMotionPreference } from '@/hooks/useMotionPreference';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  applyInputMask,
  formatInitialFormValues,
  getKeyboardTypeForMask,
  isMaskedValueComplete,
  normalizeFormValues,
  resolveInputMask,
  type InputMask,
} from '@/utils/formatters';

export interface CrudOption {
  value: string;
  label: string;
  description?: string;
}

export interface CrudField {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  mask?: InputMask;
  options?: CrudOption[];
  emptyOptionLabel?: string;
  type?: 'text' | 'image';
}

interface CrudModalProps {
  visible: boolean;
  title: string;
  fields: CrudField[];
  initialValues?: Record<string, string>;
  isSubmitting?: boolean;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => Promise<void> | void;
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const message = String((err as { message?: unknown }).message ?? '').trim();
    if (message) return message;
  }
  return 'Não foi possível salvar o registro. Tente novamente.';
}

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function optionMatches(option: CrudOption, query: string) {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return true;
  return normalizeSearch(`${option.label} ${option.description ?? ''}`).includes(normalizedQuery);
}

export function CrudModal({
  visible,
  title,
  fields,
  initialValues,
  isSubmitting,
  submitLabel = 'Salvar',
  onClose,
  onSubmit,
}: CrudModalProps) {
  const theme = useThemeColors();
  const { t } = useI18n();
  const { shouldAnimate } = useMotionPreference();
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [openSelect, setOpenSelect] = useState<string | null>(null);
  const [selectQueries, setSelectQueries] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      setValues(formatInitialFormValues(initialValues, fields));
      setError(null);
      setOpenSelect(null);
      setSelectQueries({});
    }
  }, [fields, initialValues, visible]);

  const handleSubmit = async () => {
    const missing = fields.find((field) => field.required && !values[field.name]?.trim());
    if (missing) {
      setError(
        missing.options
          ? `Selecione uma opcao no campo ${missing.label}.`
          : `Preencha o campo ${missing.label}.`
      );
      return;
    }
    const incomplete = fields.find((field) => !isMaskedValueComplete(field, values[field.name] ?? ''));
    if (incomplete) {
      setError(`Preencha o campo ${incomplete.label} no formato correto.`);
      return;
    }
    setError(null);
    try {
      await onSubmit(normalizeFormValues(values, fields));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const pickImage = async (fieldName: string) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Permita acesso Ã galeria para selecionar uma imagem.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
      base64: Platform.OS === 'web',
    });

    const asset = result.canceled ? null : result.assets[0];
    if (asset?.uri) {
      const imageUri =
        Platform.OS === 'web' && asset.base64
          ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`
          : asset.uri;
      setValues((current) => ({ ...current, [fieldName]: imageUri }));
    }
  };

  return (
    <Modal visible={visible} animationType={shouldAnimate ? 'slide' : 'none'} transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.overlay, { backgroundColor: theme.overlay }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>{t(title)}</Text>
            <AnimatedPressable style={[styles.closeButton, { backgroundColor: theme.surfaceSoft }]} onPress={onClose}>
              <X size={18} color={theme.text} />
            </AnimatedPressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {fields.map((field) => {
              const mask = resolveInputMask(field);
              const fieldValue = values[field.name] ?? '';
              const selectOptions = field.options
                ? field.emptyOptionLabel
                  ? [{ value: '', label: field.emptyOptionLabel }, ...field.options]
                  : field.required
                    ? field.options
                    : [{ value: '', label: 'Sem vinculo' }, ...field.options]
                : [];
              const selectedOption = selectOptions.find((option) => option.value === fieldValue);
              const query = selectQueries[field.name] ?? '';
              const selectOpen = openSelect === field.name;
              const filteredOptions = selectOptions.filter((option) => optionMatches(option, query));
              const visibleOptions = filteredOptions.slice(0, 30);
              return (
                <View key={field.name} style={styles.field}>
                  <Text style={[styles.label, { color: theme.text }]}>
                    {t(field.label)}
                    {field.required ? <Text style={styles.required}> *</Text> : null}
                  </Text>
                  {field.type === 'image' ? (
                    <View style={styles.imageField}>
                      {fieldValue ? (
                        <Image source={{ uri: fieldValue }} style={styles.imagePreview} />
                      ) : (
                        <View style={[styles.imagePlaceholder, { backgroundColor: theme.surfaceSoft, borderColor: theme.line }]}>
                          <Camera size={22} color={theme.textMuted} />
                        </View>
                      )}
                      <AppButton
                        label={fieldValue ? 'Trocar imagem' : 'Selecionar imagem'}
                        variant="secondary"
                        accent={colors.navy}
                          icon={<Camera size={16} color={theme.isDark ? theme.text : colors.navy} />}
                          onPress={() => pickImage(field.name)}
                        />
                    </View>
                  ) : field.options ? (
                    <View style={styles.selectWrap}>
                      <View
                        style={[
                          styles.selectInputWrap,
                          {
                            backgroundColor: theme.input,
                            borderColor: selectOpen ? colors.red : theme.line,
                          },
                        ]}
                      >
                        <TextInput
                          accessibilityLabel={field.name}
                          style={[styles.selectInput, { color: theme.text }]}
                          placeholder={t(field.placeholder ?? `Selecione ${field.label}`)}
                          placeholderTextColor={theme.textSubtle}
                          value={selectOpen ? query : selectedOption ? t(selectedOption.label) : ''}
                          onFocus={() => {
                            setOpenSelect(field.name);
                            setSelectQueries((current) => ({ ...current, [field.name]: '' }));
                          }}
                          onChangeText={(value) => {
                            setOpenSelect(field.name);
                            setSelectQueries((current) => ({ ...current, [field.name]: value }));
                          }}
                        />
                        <AnimatedPressable
                          accessibilityLabel={`Abrir opções de ${field.label}`}
                          accessibilityRole="button"
                          style={styles.selectIconButton}
                          onPress={() => {
                            setOpenSelect((current) => (current === field.name ? null : field.name));
                            setSelectQueries((current) => ({ ...current, [field.name]: '' }));
                          }}
                          hitSlop={8}
                        >
                          <ChevronDown size={18} color={theme.textMuted} />
                        </AnimatedPressable>
                      </View>

                      {selectOpen ? (
                        <View style={[styles.selectDropdown, { backgroundColor: theme.surface, borderColor: theme.line }]}>
                          {selectOptions.length === 0 ? (
                            <Text style={[styles.emptyOptions, { color: theme.textMuted }]}>{t('Nenhum dado cadastrado ainda.')}</Text>
                          ) : visibleOptions.length === 0 ? (
                            <Text style={[styles.emptyOptions, { color: theme.textMuted }]}>{t('Nenhuma opção encontrada.')}</Text>
                          ) : (
                            <>
                              <ScrollView
                                nestedScrollEnabled
                                keyboardShouldPersistTaps="handled"
                                style={styles.selectOptionsScroll}
                              >
                                {visibleOptions.map((option) => {
                                  const selected = fieldValue === option.value;
                                  return (
                                    <AnimatedPressable
                                      key={`${field.name}-${option.value || 'empty'}`}
                                      accessibilityRole="button"
                                      style={[
                                        styles.selectOption,
                                        selected && { backgroundColor: theme.surfaceSoft },
                                      ]}
                                      onPress={() => {
                                        setValues((current) => ({ ...current, [field.name]: option.value }));
                                        setSelectQueries((current) => ({ ...current, [field.name]: '' }));
                                        setOpenSelect(null);
                                      }}
                                    >
                                      <View style={styles.selectOptionTextWrap}>
                                        <Text
                                          numberOfLines={1}
                                          style={[
                                            styles.selectOptionLabel,
                                            { color: selected ? colors.red : theme.text },
                                          ]}
                                        >
                                          {t(option.label)}
                                        </Text>
                                        {option.description ? (
                                          <Text numberOfLines={1} style={[styles.selectOptionDescription, { color: theme.textMuted }]}>
                                            {t(option.description)}
                                          </Text>
                                        ) : null}
                                      </View>
                                      {selected ? <Check size={16} color={colors.red} /> : null}
                                    </AnimatedPressable>
                                  );
                                })}
                              </ScrollView>
                              {filteredOptions.length > visibleOptions.length ? (
                                <Text style={[styles.moreOptionsHint, { color: theme.textMuted }]}>
                                  {t('Continue digitando para refinar a busca.')}
                                </Text>
                              ) : null}
                            </>
                          )}
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <TextInput
                      accessibilityLabel={field.name}
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.input,
                          borderColor: theme.line,
                          color: theme.text,
                        },
                        field.multiline && styles.inputMultiline,
                      ]}
                      placeholder={t(field.placeholder ?? field.label)}
                      placeholderTextColor={theme.textSubtle}
                      value={fieldValue}
                      onChangeText={(value) =>
                        setValues((current) => ({ ...current, [field.name]: applyInputMask(field, value) }))
                      }
                      multiline={field.multiline}
                      secureTextEntry={field.secureTextEntry}
                      keyboardType={field.keyboardType ?? getKeyboardTypeForMask(mask)}
                    />
                  )}
                </View>
              );
            })}

            {error ? <FeedbackMessage variant="danger" message={error} /> : null}

            <View style={styles.actions}>
              <AppButton
                label="Cancelar"
                variant="secondary"
                accent={colors.navy}
                onPress={onClose}
                disabled={isSubmitting}
                wrapperStyle={styles.actionButtonWrap}
              />
              <AppButton
                label={submitLabel}
                accent={colors.red}
                onPress={handleSubmit}
                loading={isSubmitting}
                wrapperStyle={styles.actionButtonWrap}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: colors.white,
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  title: { flex: 1, color: colors.navy, fontSize: 18, fontWeight: '900' },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.panelSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingBottom: 8 },
  field: { marginBottom: 12 },
  label: { color: colors.navy, fontSize: 12, fontWeight: '800', marginBottom: 6 },
  required: { color: colors.red },
  input: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    color: colors.navy,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputMultiline: { minHeight: 86, textAlignVertical: 'top' },
  selectWrap: { position: 'relative' },
  selectInputWrap: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectInput: {
    flex: 1,
    minHeight: 42,
    color: colors.navy,
    fontSize: 14,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 10,
  },
  selectIconButton: {
    width: 40,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectDropdown: {
    maxHeight: 220,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginTop: 6,
    overflow: 'hidden',
  },
  selectOptionsScroll: { maxHeight: 180 },
  selectOption: {
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectOptionTextWrap: { flex: 1, minWidth: 0 },
  selectOptionLabel: { color: colors.navy, fontSize: 13, fontWeight: '800' },
  selectOptionDescription: { color: colors.grayText, fontSize: 11, fontWeight: '700', marginTop: 2 },
  emptyOptions: { color: colors.grayText, fontSize: 12, fontWeight: '700', padding: 12 },
  moreOptionsHint: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    color: colors.grayText,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  imageField: { gap: 10 },
  imagePreview: {
    width: 92,
    height: 92,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
  },
  imagePlaceholder: {
    width: 92,
    height: 92,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionButtonWrap: { flex: 1 },
});
