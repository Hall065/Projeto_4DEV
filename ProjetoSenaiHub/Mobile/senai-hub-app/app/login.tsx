import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import { AnimatedPressable, AppButton, FeedbackMessage } from '@/components/common/VisualPrimitives';
import { DEV_TEST_ACCOUNT } from '@/constants/dev-test-account';
import { colors } from '@/constants/colors';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { getPostLoginRoute as resolvePostLoginRoute } from '@/lib/permissions';
import { useI18n } from '@/hooks/useI18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/auth.store';
import { loginSchema, type LoginFormData } from '@/utils/validators';

const circuitBg = require('../assets/brand/senai-circuit-bg.png');
const hubLoginLogo = require('../assets/brand/logo_slogan_branco_hub.png');

function getLoginRedirectRoute() {
  const session = useAuthStore.getState().session;
  return resolvePostLoginRoute(session);
}

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const theme = useThemeColors();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleBypass = async () => {
    setError(null);
    if (!DEV_TEST_ACCOUNT?.email || !DEV_TEST_ACCOUNT.password) {
      setError('Configure EXPO_PUBLIC_DEV_TEST_EMAIL e EXPO_PUBLIC_DEV_TEST_PASSWORD no .env para usar o acesso rápido.');
      return;
    }

    const err = await login(DEV_TEST_ACCOUNT.email, DEV_TEST_ACCOUNT.password);
    if (err) {
      setError(`Não foi possível autenticar a conta de demonstração: ${err}`);
      return;
    }
    router.replace(getLoginRedirectRoute() as never);
  };

  const onSubmit = async (data: LoginFormData) => {
    console.log('[Login] Iniciando tentativa para:', data.email);
    setError(null);
    try {
      const err = await login(data.email, data.password);
      if (err) {
        console.warn('[Login] Falha:', err);
        setError(err);
        return;
      }
      console.log('[Login] Sucesso! Redirecionando para a area correta');
      router.replace(getLoginRedirectRoute() as never);
    } catch (e: any) {
      console.error('[Login] Erro inesperado:', e);
      setError('Ocorreu um erro inesperado ao tentar entrar.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.isDark ? theme.appBackground : colors.white }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { backgroundColor: theme.isDark ? theme.appBackground : colors.white }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ImageBackground
          source={circuitBg}
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          <Image source={hubLoginLogo} style={styles.logo} resizeMode="contain" />
        </ImageBackground>

        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <Text style={[styles.title, { color: theme.text }]}>{t('Acesse sua conta')}</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>{t('Informe seu e-mail e senha para continuar.')}</Text>

          {__DEV__ && !isSupabaseConfigured ? (
            <FeedbackMessage
              variant="warning"
              message="Supabase não configurado. Verifique o .env e reinicie o Expo com -c."
            />
          ) : null}
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value }, fieldState: { error: fieldError } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>{t('E-mail')}</Text>
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
                {fieldError ? <Text style={styles.fieldError}>{fieldError.message}</Text> : null}
              </View>
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value }, fieldState: { error: fieldError } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>{t('Senha')}</Text>
                <View style={[styles.inputWrap, { backgroundColor: theme.input, borderColor: theme.line }]}>
                  <Lock size={17} color={theme.textMuted} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder={t("••••••••")}
                    placeholderTextColor={theme.textSubtle}
                    secureTextEntry={!showPassword}
                    value={value}
                    onChangeText={onChange}
                  />
                  <AnimatedPressable style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff size={17} color={theme.textMuted} />
                    ) : (
                      <Eye size={17} color={theme.textMuted} />
                    )}
                  </AnimatedPressable>
                </View>
                {fieldError ? <Text style={styles.fieldError}>{fieldError.message}</Text> : null}
              </View>
            )}
          />

          <View style={styles.forgotRow}>
            <Link href="/recuperar-senha" style={styles.link}>
              {t('Recuperar senha')}
            </Link>
          </View>

          {error ? <FeedbackMessage variant="danger" message={error} /> : null}

          <AppButton label="Entrar" accent={colors.red} onPress={handleSubmit(onSubmit)} loading={isLoading} />

          <AnimatedPressable style={styles.testAccess} onPress={handleBypass} disabled={isLoading}>
            <Text style={[styles.testAccessText, { color: theme.text }]}>{t('Acesso rápido para demonstração')}</Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { flexGrow: 1, backgroundColor: colors.white },
  hero: {
    minHeight: 300,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
    paddingTop: 30,
  },
  heroImage: { resizeMode: 'cover' },
  logo: { width: '92%', height: 110 },
  sheet: {
    flex: 1,
    marginTop: -34,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
  },
  title: { color: colors.navy, fontSize: 25, fontWeight: '900' },
  subtitle: { color: colors.grayText, fontSize: 13, marginTop: 6, marginBottom: 24 },
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
  input: {
    flex: 1,
    color: colors.navy,
    fontSize: 14,
    paddingVertical: 12,
  },
  eyeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldError: { color: colors.red, fontSize: 11, marginTop: 5 },
  forgotRow: { alignItems: 'flex-start', marginTop: -2, marginBottom: 12 },
  link: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: '800',
  },
  testAccess: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  testAccessText: { color: colors.navy, fontSize: 12, fontWeight: '800' },
  devButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    backgroundColor: colors.panelSoft,
  },
  devButtonText: { color: colors.navy, fontWeight: '800', fontSize: 13 },
  devHint: { marginTop: 4, fontSize: 11, color: colors.grayText },
});
