import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
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
import { Mail } from 'lucide-react-native';
import { AppButton, FeedbackMessage } from '@/components/common/VisualPrimitives';
import { AtmosphericGlow } from '@/components/common/AnimataPrimitives';
import { getBrandAsset } from '@/constants/brandAssets';
import { colors } from '@/constants/colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { resetPasswordForEmail } from '@/lib/auth';
import { recuperarSenhaSchema, type RecuperarSenhaFormData } from '@/utils/validators';
import { useI18n } from '@/hooks/useI18n';

const circuitBg = require('../assets/brand/senai-circuit-bg.png');

export default function RecuperarSenhaScreen() {
  const { t } = useI18n();
  const theme = useThemeColors();
  const [message, setMessage] = useState<{ text: string; variant: 'success' | 'danger' } | null>(null);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit } = useForm<RecuperarSenhaFormData>({
    resolver: zodResolver(recuperarSenhaSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: RecuperarSenhaFormData) => {
    setLoading(true);
    setMessage(null);
    const { error } = await resetPasswordForEmail(data.email);
    setLoading(false);
    if (error) {
      setMessage({ text: error, variant: 'danger' });
      return;
    }
    setMessage({ text: 'Enviamos um link de recuperação para o seu e-mail.', variant: 'success' });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.appBackground }]}>
      <ImageBackground
        source={circuitBg}
        style={styles.hero}
        imageStyle={[styles.heroImage, { opacity: 0.36 }]}
      >
        <AtmosphericGlow />
        <Image source={getBrandAsset('hub', 'slogan', true)} style={styles.logo} resizeMode="contain" />
      </ImageBackground>
      <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
        <Text style={[styles.title, { color: theme.text }]}>{t("Recuperar senha")}</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          {t("Informe o e-mail institucional para receber as instruções de redefinição.")}</Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.text }]}>{t("E-mail")}</Text>
              <View style={[styles.inputWrap, { backgroundColor: theme.input, borderColor: theme.line }]}>
                <Mail size={17} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder={t("seu@email.com")}
                  placeholderTextColor={theme.textSubtle}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={value}
                  onChangeText={onChange}
                />
              </View>
              {error ? <Text style={styles.error}>{error.message}</Text> : null}
            </View>
          )}
        />

        {message ? <FeedbackMessage variant={message.variant} message={message.text} /> : null}

        <AppButton label="Enviar link" accent={colors.red} onPress={handleSubmit(onSubmit)} loading={loading} />

        <Link href="/login" style={styles.link}>
          Voltar ao login
        </Link>
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
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
  },
  input: { flex: 1, color: colors.navy, fontSize: 14, paddingVertical: 12 },
  error: { color: colors.red, fontSize: 12, marginTop: 6 },
  link: { marginTop: 20, color: colors.blue, fontWeight: '800', textAlign: 'center' },
});
