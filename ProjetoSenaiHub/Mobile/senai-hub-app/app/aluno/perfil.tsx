import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { AppButton, ListRow, LoadingState, Pill, SurfaceCard } from '@/components/common/VisualPrimitives';
import { colors } from '@/constants/colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { studentService, type StudentDashboardData } from '@/services/student.service';
import { useAuthStore } from '@/stores/auth.store';

export default function AlunoPerfilScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeColors();
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.userId) {
      setLoading(false);
      setError('Sessao do aluno indisponivel.');
      return;
    }
    studentService
      .getDashboard(session.userId)
      .then(setData)
      .catch(() => setError('Nao foi possivel carregar o perfil do aluno.'))
      .finally(() => setLoading(false));
  }, [session?.userId]);

  if (loading) return <LoadingState />;

  const aluno = data?.aluno;
  const contrato = data?.contratos.find((item) => item.status === 'ativo') ?? data?.contratos[0];
  const studentName = aluno?.nome ?? session?.perfil?.nome ?? 'Aluno';
  const initials = studentName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/login' as never);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.appBackground }]} contentContainerStyle={styles.content}>
      <SurfaceCard>
        <View style={[styles.profileHero, { backgroundColor: theme.isDark ? theme.surfaceSoft : colors.primary }]}>
          <View style={[styles.avatar, { borderColor: colors.white, backgroundColor: colors.primaryDark }]}>
            {aluno?.foto_url ?? session?.perfil?.foto_url ? (
              <Image source={{ uri: aluno?.foto_url ?? session?.perfil?.foto_url ?? '' }} style={styles.avatarImage} accessibilityLabel="Foto do aluno" />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroName}>{studentName}</Text>
            <Text style={styles.heroEmail}>{session?.email}</Text>
            <Pill label={aluno?.status ?? 'Aluno'} variant={aluno?.status === 'ativo' ? 'success' : 'neutral'} tone="dark" />
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard title="Dados pessoais" subtitle="Informacoes somente leitura">
        {error ? <Text style={[styles.empty, { color: colors.red }]}>{error}</Text> : null}
        <Info label="RM" value={aluno?.rm} />
        <Info label="CPF" value={aluno?.cpf} />
        <Info label="Data de nascimento" value={aluno?.data_nascimento} />
        <Info label="Responsavel" value={aluno?.nome_responsavel} />
      </SurfaceCard>

      <SurfaceCard title="Dados academicos" subtitle="Curso, turma e empresa">
        <Info label="Curso" value={aluno?.curso_nome} />
        <Info label="Turma" value={aluno?.turma_nome} />
        <Info label="Empresa" value={aluno?.empresa_nome ?? contrato?.empresa_nome} />
      </SurfaceCard>

      <SurfaceCard title="Contrato" subtitle="Vinculo com empresa">
        {contrato ? (
          <>
            <Info label="Empresa" value={contrato.empresa_nome} />
            <Info label="Carga horaria" value={contrato.carga_horaria} />
            <Info label="Inicio" value={contrato.data_inicio} />
            <Info label="Termino" value={contrato.data_termino} />
          </>
        ) : (
          <Text style={[styles.empty, { color: theme.textMuted }]}>Nenhum contrato encontrado.</Text>
        )}
      </SurfaceCard>

      <SurfaceCard title="Conta" subtitle="Sessao atual">
        <AppButton
          label="Sair"
          variant="secondary"
          accent={colors.red}
          icon={<LogOut size={16} color={colors.red} />}
          onPress={handleLogout}
          loading={loggingOut}
        />
      </SurfaceCard>
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <ListRow
      title={label}
      meta={value ?? 'Nao informado'}
      initials={label.slice(0, 2).toUpperCase()}
      accent={colors.blue}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 14, paddingBottom: 24 },
  empty: { color: colors.grayText, fontSize: 12, fontWeight: '700' },
  profileHero: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 12, padding: 16 },
  avatar: { width: 76, height: 76, borderRadius: 38, borderWidth: 3, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: colors.white, fontSize: 22, fontWeight: '900' },
  heroCopy: { flex: 1, minWidth: 0, gap: 6 },
  heroName: { color: colors.white, fontSize: 19, fontWeight: '900' },
  heroEmail: { color: 'rgba(255,255,255,0.78)', fontSize: 11, fontWeight: '700' },
});
