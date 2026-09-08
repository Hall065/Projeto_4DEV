import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Eye, Lock } from 'lucide-react-native';
import { AppButton, FeedbackMessage } from '@/components/common/VisualPrimitives';
import { getBrandAsset } from '@/constants/brandAssets';
import { colors } from '@/constants/colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { updatePassword } from '@/lib/auth';
import { redefinirSenhaSchema, type RedefinirSenhaFormData } from '@/utils/validators';
import { useI18n } from '@/hooks/useI18n';

const circuitBg = require('../assets/brand/senai-circuit-bg.png');

export default function RedefinirSenhaScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useThemeColors();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit } = useForm<RedefinirSenhaFormData>({
    resolver: zodResolver(redefinirSenhaSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: RedefinirSenhaFormData) => {
    setLoading(true);
    setError(null);
    const { error: err } = await updatePassword(data.password);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    router.replace('/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.appBackground }]}>
      <ImageBackground
        source={circuitBg}
        style={[styles.hero, { backgroundColor: theme.isDark ? colors.navy : colors.white }]}
        imageStyle={[styles.heroImage, { opacity: theme.isDark ? 0.42 : 0.08 }]}
      >
        <Image source={getBrandAsset('hub', 'slogan', theme.isDark)} style={styles.logo} resizeMode="contain" />
      </ImageBackground>
      <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
        <Text style={[styles.title, { color: theme.text }]}>{t("Redefinir senha")}</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>{t("Digite uma nova senha para continuar usando o SENAI Hub.")}</Text>

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value }, fieldState: { error: fieldError } }) => (
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.text }]}>{t("Nova senha")}</Text>
              <View style={[styles.inputWrap, { backgroundColor: theme.input, borderColor: theme.line }]}>
                <Lock size={17} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder={t("••••••••")}
                  placeholderTextColor={theme.textSubtle}
                  secureTextEntry
                  value={value}
                  onChangeText={onChange}
                />
                <Eye size={17} color={theme.textMuted} />
              </View>
              {fieldError ? <Text style={styles.error}>{fieldError.message}</Text> : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, value }, fieldState: { error: fieldError } }) => (
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.text }]}>{t("Confirmar senha")}</Text>
              <View style={[styles.inputWrap, { backgroundColor: theme.input, borderColor: theme.line }]}>
                <Lock size={17} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder={t("••••••••")}
                  placeholderTextColor={theme.textSubtle}
                  secureTextEntry
                  value={value}
                  onChangeText={onChange}
                />
                <Eye size={17} color={theme.textMuted} />
              </View>
              {fieldError ? <Text style={styles.error}>{fieldError.message}</Text> : null}
            </View>
          )}
        />

        {error ? <FeedbackMessage variant="danger" message={error} /> : null}

        <AppButton label="Salvar nova senha" accent={colors.red} onPress={handleSubmit(onSubmit)} loading={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  hero: {
    minHeight: 230,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 52,
  },
  heroImage: { resizeMode: 'cover' },
  logo: { width: '92%', height: 90 },
  sheet: {
    flex: 1,
    marginTop: -28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
    padding: 28,
  },
  title: { color: colors.navy, fontSize: 25, fontWeight: '900' },
  subtitle: { color: colors.grayText, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 24 },
  field: { marginBottom: 14 },
  label: { color: colors.navy, fontSize: 13, fontWeight: '800', marginBottom: 7 },
  inputWrap: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
  },
  input: { flex: 1, color: colors.navy, fontSize: 14, paddingVertical: 12 },
  error: { color: colors.red, fontSize: 12, marginTop: 6 },
});
