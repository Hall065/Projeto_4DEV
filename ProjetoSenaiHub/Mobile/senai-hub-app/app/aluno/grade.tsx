import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton, ListRow, LoadingState, SurfaceCard } from '@/components/common/VisualPrimitives';
import { colors } from '@/constants/colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { studentService, type StudentDashboardData } from '@/services/student.service';
import { useAuthStore } from '@/stores/auth.store';
import { useI18n } from '@/hooks/useI18n';

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

export default function AlunoGradeScreen() {
  const { t } = useI18n();
  const session = useAuthStore((s) => s.session);
  const theme = useThemeColors();
  const [activeDay, setActiveDay] = useState(DIAS[0]);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudentDashboardData | null>(null);

  useEffect(() => {
    if (!session?.userId) return;
    studentService
      .getDashboard(session.userId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [session?.userId]);

  const aulas = useMemo(() => data?.frequencias ?? [], [data?.frequencias]);

  if (loading) return <LoadingState />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.appBackground }]} contentContainerStyle={styles.content}>
      <SurfaceCard title="Curso vinculado" subtitle="Informações acadêmicas do aluno">
        <ListRow
          title={data?.aluno?.curso_nome ?? 'Curso não vinculado'}
          subtitle={`${data?.aluno?.turma_nome ?? 'Turma não vinculada'} - ${data?.aluno?.status ?? 'sem status'}`}
          badge={data?.aluno?.rm ? `RM ${data.aluno.rm}` : 'Sem RM'}
          badgeVariant={data?.aluno?.status === 'ativo' ? 'success' : 'neutral'}
          initials="CR"
          accent={colors.red}
        />
        {data?.contratos[0] ? (
          <ListRow
            title={data.contratos[0].empresa_nome ?? 'Empresa não informada'}
            subtitle={`Contrato ${data.contratos[0].status ?? 'sem status'} - ${data.contratos[0].carga_horaria ?? 'carga não informada'}`}
            initials="CT"
            accent={colors.green}
          />
        ) : null}
      </SurfaceCard>

      <SurfaceCard title="Grade de aulas" subtitle="Aulas registradas e presenca">
        <View style={styles.tabs}>
          {DIAS.map((dia) => (
            <AppButton
              key={dia}
              label={dia}
              variant={activeDay === dia ? 'primary' : 'secondary'}
              accent={colors.red}
              onPress={() => setActiveDay(dia)}
              wrapperStyle={styles.tab}
            />
          ))}
        </View>
        <Text style={[styles.hint, { color: theme.textMuted }]}>{t("Exibindo registros disponiveis para")}{' '}{activeDay}.</Text>
      </SurfaceCard>

      <SurfaceCard title="Aulas do dia" subtitle="Horario, disciplina e status">
        {aulas.map((aula) => (
          <ListRow
            key={aula.id}
            title={aula.disciplina ?? 'Aula'}
            subtitle={`${aula.data_aula ?? aula.data ?? 'Sem data'} - ${aula.turma_nome ?? data?.aluno?.turma_nome ?? 'Turma'}`}
            badge={aula.status ?? '-'}
            badgeVariant={aula.status === 'presente' ? 'success' : aula.status === 'falta_justificada' ? 'warning' : 'danger'}
            initials="AU"
            accent={colors.blue}
          />
        ))}
        {aulas.length === 0 ? <Text style={[styles.empty, { color: theme.textMuted }]}>{t("Nenhuma aula registrada ainda.")}</Text> : null}
      </SurfaceCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 14, paddingBottom: 24 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1 },
  hint: { color: colors.grayText, fontSize: 12, fontWeight: '700', marginTop: 12 },
  empty: { color: colors.grayText, fontSize: 12, fontWeight: '700' },
});
