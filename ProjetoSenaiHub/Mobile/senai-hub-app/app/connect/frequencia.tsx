import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CalendarDays, ChevronLeft, ChevronRight, Save } from 'lucide-react-native';
import {
  AnimatedPressable,
  AppButton,
  FeedbackMessage,
  LoadingState,
  Pill,
  SearchField,
  SurfaceCard,
} from '@/components/common/VisualPrimitives';
import { colors, connectTheme } from '@/constants/colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { connectService } from '@/services/connect.service';
import { useAuthStore } from '@/stores/auth.store';
import type { Aluno, Professor, Turma } from '@/types/connect.types';
import { useI18n } from '@/hooks/useI18n';

type AulaStatus = 'presente' | 'falta_justificada' | 'falta_injustificada';

interface StudentMarkState {
  status: AulaStatus;
  missedLessons: number;
}

const STATUS_OPTIONS: { value: AulaStatus; label: string; color: string }[] = [
  { value: 'presente', label: 'P', color: colors.green },
  { value: 'falta_justificada', label: 'FJ', color: colors.orange },
  { value: 'falta_injustificada', label: 'FI', color: colors.red },
];

function clampLessons(value: number) {
  return Math.min(5, Math.max(1, Math.trunc(value)));
}

function emptyMark(): StudentMarkState {
  return { status: 'presente', missedLessons: 0 };
}

function addDays(date: string, amount: number) {
  const parsed = new Date(`${date}T12:00:00`);
  parsed.setDate(parsed.getDate() + amount);
  return parsed.toISOString().slice(0, 10);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(`${date}T12:00:00`));
}

export default function FrequenciaScreen() {
  const { t } = useI18n();
  const theme = useThemeColors();
  const session = useAuthStore((state) => state.session);
  const [loading, setLoading] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [professor, setProfessor] = useState<Professor | null>(null);
  const [turmaId, setTurmaId] = useState('');
  const [dataAula, setDataAula] = useState(new Date().toISOString().slice(0, 10));
  const [quantidadeAulas, setQuantidadeAulas] = useState(4);
  const [registros, setRegistros] = useState<Record<string, StudentMarkState>>({});
  const [search, setSearch] = useState('');
  const [hasExistingAttendance, setHasExistingAttendance] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!session?.userId) return;
      setLoading(true);
      setError(null);
      try {
        const professorData = await connectService.getProfessorByUserId(session.userId);
        const turmasData =
          session.perfil?.tipo === 'professor'
            ? await connectService.listTurmasForProfessorUser(session.userId)
            : await connectService.listTurmas();

        if (!active) return;
        setProfessor(professorData);
        setTurmas(turmasData);
        setTurmaId((current) => current || turmasData[0]?.id || '');
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Nao foi possivel carregar as turmas.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [session?.perfil?.tipo, session?.userId]);

  useEffect(() => {
    let active = true;

    async function loadAttendance() {
      if (!turmaId) {
        setAlunos([]);
        setRegistros({});
        setHasExistingAttendance(false);
        return;
      }

      setLoadingAttendance(true);
      setError(null);
      try {
        const [students, attendance] = await Promise.all([
          connectService.listAlunosByTurma(turmaId),
          connectService.getChamada(turmaId, dataAula),
        ]);
        if (!active) return;

        const lessons = clampLessons(attendance?.quantidadeAulas ?? 4);
        const savedMarks = new Map(
          attendance?.registros.map((registro) => [registro.alunoId, registro]) ?? []
        );
        const nextMarks = Object.fromEntries(
          students.map((student) => {
            const saved = savedMarks.get(student.id);
            const status = saved?.status ?? 'presente';
            return [
              student.id,
              {
                status,
                missedLessons:
                  status === 'presente'
                    ? 0
                    : Math.min(lessons, Math.max(1, saved?.missedLessons ?? lessons)),
              } satisfies StudentMarkState,
            ];
          })
        );

        setAlunos(students);
        setQuantidadeAulas(lessons);
        setRegistros(nextMarks);
        setHasExistingAttendance(Boolean(attendance));
      } catch (err) {
        if (active) {
          setAlunos([]);
          setRegistros({});
          setHasExistingAttendance(false);
          setError(err instanceof Error ? err.message : 'Nao foi possivel carregar os alunos.');
        }
      } finally {
        if (active) setLoadingAttendance(false);
      }
    }

    void loadAttendance();
    return () => {
      active = false;
    };
  }, [dataAula, turmaId]);

  const selectedTurma = useMemo(
    () => turmas.find((turma) => turma.id === turmaId),
    [turmaId, turmas]
  );

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    if (!query) return alunos;
    return alunos.filter((aluno) =>
      `${aluno.nome} ${aluno.rm ?? ''}`.toLocaleLowerCase('pt-BR').includes(query)
    );
  }, [alunos, search]);

  const summary = useMemo(
    () =>
      alunos.reduce(
        (counts, aluno) => {
          const status = registros[aluno.id]?.status ?? 'presente';
          counts[status] += 1;
          return counts;
        },
        { presente: 0, falta_justificada: 0, falta_injustificada: 0 }
      ),
    [alunos, registros]
  );

  const updateLessonCount = (nextValue: number) => {
    const nextLessons = clampLessons(nextValue);
    setRegistros((current) =>
      Object.fromEntries(
        Object.entries(current).map(([studentId, mark]) => [
          studentId,
          {
            ...mark,
            missedLessons:
              mark.status === 'presente'
                ? 0
                : mark.missedLessons === quantidadeAulas
                  ? nextLessons
                  : Math.min(nextLessons, Math.max(1, mark.missedLessons)),
          },
        ])
      )
    );
    setQuantidadeAulas(nextLessons);
  };

  const setStatus = (studentId: string, status: AulaStatus) => {
    setRegistros((current) => {
      const mark = current[studentId] ?? emptyMark();
      return {
        ...current,
        [studentId]: {
          status,
          missedLessons:
            status === 'presente'
              ? 0
              : mark.status === 'presente' || mark.missedLessons === 0
                ? quantidadeAulas
                : Math.min(quantidadeAulas, mark.missedLessons),
        },
      };
    });
  };

  const setMissedLessons = (studentId: string, missedLessons: number) => {
    setRegistros((current) => ({
      ...current,
      [studentId]: {
        ...(current[studentId] ?? emptyMark()),
        missedLessons: Math.min(quantidadeAulas, Math.max(1, missedLessons)),
      },
    }));
  };

  const setAllPresent = () => {
    setRegistros(
      Object.fromEntries(alunos.map((aluno) => [aluno.id, emptyMark()]))
    );
  };

  const save = async () => {
    if (!turmaId) {
      setError('Selecione uma turma.');
      return;
    }
    if (alunos.length === 0) {
      setError('A turma selecionada nao possui alunos.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await connectService.saveChamada({
        turmaId,
        professorId: professor?.id ?? selectedTurma?.professor_responsavel_id,
        dataAula,
        quantidadeAulas,
        registradoPor: session?.userId,
        registros: alunos.map((aluno) => ({
          alunoId: aluno.id,
          ...(registros[aluno.id] ?? emptyMark()),
        })),
      });
      setHasExistingAttendance(true);
      Alert.alert(
        t("Frequencia"),
        result.created ? 'Chamada salva com sucesso!' : 'Chamada atualizada com sucesso!'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel salvar a chamada.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Carregando turmas..." />;

  return (
    <View style={[styles.container, { backgroundColor: theme.appBackground }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SurfaceCard
          title="Registrar frequencia"
          subtitle={
            hasExistingAttendance
              ? 'Chamada existente para esta turma e data'
              : 'Nova chamada'
          }
        >
          {error ? <FeedbackMessage variant="danger" message={error} /> : null}

          <Text style={[styles.label, { color: theme.text }]}>{t("Turma")}</Text>
          {turmas.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.classList}
            >
              {turmas.map((turma) => {
                const active = turma.id === turmaId;
                return (
                  <AnimatedPressable
                    key={turma.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setTurmaId(turma.id)}
                    style={[
                      styles.classChip,
                      {
                        backgroundColor: active ? connectTheme.accent : theme.surfaceSoft,
                        borderColor: active ? connectTheme.accent : theme.line,
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.classChipText,
                        { color: active ? colors.white : theme.text },
                      ]}
                    >
                      {turma.nome}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={[styles.empty, { color: theme.textMuted }]}>
              {t("Nenhuma turma disponivel.")}</Text>
          )}

          <View style={styles.configSection}>
            <Text style={[styles.label, { color: theme.text }]}>{t("Data")}</Text>
            <View
              style={[
                styles.dateControl,
                { backgroundColor: theme.surfaceSoft, borderColor: theme.line },
              ]}
            >
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={t("Dia anterior")}
                onPress={() => setDataAula((current) => addDays(current, -1))}
                style={styles.iconButton}
              >
                <ChevronLeft size={20} color={theme.text} />
              </AnimatedPressable>
              <View style={styles.dateValue}>
                <CalendarDays size={16} color={connectTheme.accent} />
                <Text style={[styles.dateText, { color: theme.text }]}>
                  {formatDate(dataAula)}
                </Text>
              </View>
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={t("Proximo dia")}
                onPress={() => setDataAula((current) => addDays(current, 1))}
                style={styles.iconButton}
              >
                <ChevronRight size={20} color={theme.text} />
              </AnimatedPressable>
            </View>
            <AppButton
              label="Hoje"
              variant="ghost"
              accent={connectTheme.accent}
              onPress={() => setDataAula(new Date().toISOString().slice(0, 10))}
              style={styles.todayButton}
            />
          </View>

          <View style={styles.configSection}>
            <Text style={[styles.label, { color: theme.text }]}>{t("Aulas no dia")}</Text>
            <View style={styles.lessonSelector}>
              {[1, 2, 3, 4, 5].map((value) => {
                const active = quantidadeAulas === value;
                return (
                  <AnimatedPressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => updateLessonCount(value)}
                    style={[
                      styles.lessonOption,
                      {
                        backgroundColor: active ? connectTheme.accent : theme.surfaceSoft,
                        borderColor: active ? connectTheme.accent : theme.line,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.lessonOptionText,
                        { color: active ? colors.white : theme.text },
                      ]}
                    >
                      {value}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard
          title="Alunos"
          subtitle={`${alunos.length} alunos na chamada`}
          actionLabel="Todos presentes"
          onActionPress={alunos.length > 0 ? setAllPresent : undefined}
        >
          <View style={styles.summaryRow}>
            <Pill label={`${summary.presente} P`} variant="success" />
            <Pill label={`${summary.falta_justificada} FJ`} variant="warning" />
            <Pill label={`${summary.falta_injustificada} FI`} variant="danger" />
          </View>

          {alunos.length > 6 ? (
            <SearchField
              placeholder={t("Buscar aluno ou RM...")}
              value={search}
              onChangeText={setSearch}
            />
          ) : null}

          {loadingAttendance ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator color={connectTheme.accent} />
              <Text style={[styles.loadingText, { color: theme.textMuted }]}>
                {t("Carregando chamada...")}</Text>
            </View>
          ) : null}

          {!loadingAttendance && alunos.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textMuted }]}>
              {t("Esta turma nao possui alunos cadastrados.")}</Text>
          ) : null}

          {!loadingAttendance && alunos.length > 0 && filteredStudents.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textMuted }]}>
              {t("Nenhum aluno encontrado.")}</Text>
          ) : null}

          {!loadingAttendance
            ? filteredStudents.map((aluno, index) => {
                const mark = registros[aluno.id] ?? emptyMark();
                const absenceColor =
                  mark.status === 'falta_justificada' ? colors.orange : colors.red;
                return (
                  <View
                    key={aluno.id}
                    style={[
                      styles.studentRow,
                      {
                        borderBottomColor: theme.line,
                        borderBottomWidth: index === filteredStudents.length - 1 ? 0 : 1,
                      },
                    ]}
                  >
                    <View style={styles.studentMain}>
                      <View
                        style={[
                          styles.studentNumber,
                          { backgroundColor: theme.surfaceSoft, borderColor: theme.line },
                        ]}
                      >
                        <Text style={[styles.studentNumberText, { color: theme.textMuted }]}>
                          {alunos.indexOf(aluno) + 1}
                        </Text>
                      </View>
                      <View style={styles.studentIdentity}>
                        <Text numberOfLines={1} style={[styles.studentName, { color: theme.text }]}>
                          {aluno.nome}
                        </Text>
                        <Text style={[styles.studentRm, { color: theme.textMuted }]}>
                          {t("RM")}{' '}{aluno.rm ?? t("nao informado")}
                        </Text>
                      </View>
                      <View
                        accessibilityRole="radiogroup"
                        style={[
                          styles.statusSelector,
                          { backgroundColor: theme.surfaceSoft, borderColor: theme.line },
                        ]}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <StatusButton
                            key={option.value}
                            label={option.label}
                            color={option.color}
                            selected={mark.status === option.value}
                            onPress={() => setStatus(aluno.id, option.value)}
                          />
                        ))}
                      </View>
                    </View>

                    {mark.status !== 'presente' ? (
                      <View style={styles.missedLessonsRow}>
                        <View style={styles.missedLessonsHeader}>
                          <Text style={[styles.missedLessonsLabel, { color: theme.textMuted }]}>
                            {t("Aulas faltadas")}</Text>
                          <Text style={[styles.missedLessonsCount, { color: absenceColor }]}>
                            {mark.missedLessons}/{quantidadeAulas}
                          </Text>
                        </View>
                        <View style={styles.missedLessonsOptions}>
                          {Array.from({ length: quantidadeAulas }, (_, lessonIndex) => {
                            const lesson = lessonIndex + 1;
                            const missed = mark.missedLessons >= lesson;
                            return (
                              <AnimatedPressable
                                key={lesson}
                                accessibilityRole="button"
                                accessibilityLabel={`Aula ${lesson}`}
                                accessibilityState={{ selected: missed }}
                                onPress={() =>
                                  setMissedLessons(
                                    aluno.id,
                                    missed ? Math.max(1, lesson - 1) : lesson
                                  )
                                }
                                style={[
                                  styles.missedLessonButton,
                                  {
                                    backgroundColor: missed ? absenceColor : theme.surfaceSoft,
                                    borderColor: missed ? absenceColor : theme.line,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.missedLessonText,
                                    { color: missed ? colors.white : theme.textMuted },
                                  ]}
                                >
                                  {missed ? t("X") : lesson}
                                </Text>
                              </AnimatedPressable>
                            );
                          })}
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })
            : null}
        </SurfaceCard>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: theme.surface, borderTopColor: theme.line },
        ]}
      >
        <AppButton
          label={hasExistingAttendance ? 'Atualizar chamada' : 'Salvar chamada'}
          accent={connectTheme.accent}
          icon={<Save size={17} color={colors.white} />}
          onPress={save}
          loading={saving}
          disabled={!turmaId || loadingAttendance || alunos.length === 0}
        />
      </View>
    </View>
  );
}

function StatusButton({
  label,
  color,
  selected,
  onPress,
}: {
  label: string;
  color: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useThemeColors();
  return (
    <AnimatedPressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.statusButton,
        {
          backgroundColor: selected ? color : 'transparent',
          borderColor: selected ? color : 'transparent',
        },
      ]}
    >
      <Text
        style={[
          styles.statusButtonText,
          { color: selected ? colors.white : theme.textMuted },
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, paddingBottom: 92 },
  label: { fontSize: 11, fontWeight: '900', marginTop: 10, marginBottom: 7 },
  classList: { gap: 8, paddingRight: 4 },
  classChip: {
    minHeight: 40,
    maxWidth: 180,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  classChipText: { fontSize: 12, fontWeight: '800' },
  configSection: { marginTop: 4 },
  dateControl: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateValue: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  dateText: { fontSize: 13, fontWeight: '900', textTransform: 'capitalize' },
  todayButton: { alignSelf: 'center', minHeight: 34, marginTop: 3 },
  lessonSelector: { flexDirection: 'row', gap: 7 },
  lessonOption: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  lessonOptionText: { fontSize: 13, fontWeight: '900' },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
  inlineLoading: {
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: { fontSize: 12, fontWeight: '700' },
  empty: { paddingVertical: 20, textAlign: 'center', fontSize: 12, fontWeight: '700' },
  studentRow: { paddingVertical: 11 },
  studentMain: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  studentNumber: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
  },
  studentNumberText: { fontSize: 10, fontWeight: '900' },
  studentIdentity: { flex: 1, minWidth: 0 },
  studentName: { fontSize: 12, fontWeight: '900' },
  studentRm: { marginTop: 2, fontSize: 10, fontWeight: '700' },
  statusSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
  },
  statusButton: {
    width: 36,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
  },
  statusButtonText: { fontSize: 10, fontWeight: '900' },
  missedLessonsRow: { marginTop: 8, marginLeft: 38 },
  missedLessonsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  missedLessonsLabel: { fontSize: 10, fontWeight: '800' },
  missedLessonsCount: { fontSize: 10, fontWeight: '900' },
  missedLessonsOptions: { flexDirection: 'row', gap: 6 },
  missedLessonButton: {
    width: 34,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
  },
  missedLessonText: { fontSize: 10, fontWeight: '900' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    borderTopWidth: 1,
  },
});
