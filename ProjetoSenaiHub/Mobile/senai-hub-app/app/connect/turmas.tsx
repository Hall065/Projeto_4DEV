import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BookOpen, CalendarDays, GraduationCap, Users } from 'lucide-react-native';
import { CrudModal, type CrudField, type CrudOption } from '@/components/common/CrudModal';
import { AdvancedFilterPanel, FilterChoice } from '@/components/common/AdvancedFilters';
import { FeedbackMessage, ListRow, MetricTile, SearchField, SurfaceCard } from '@/components/common/VisualPrimitives';
import { ModuleScreen } from '@/components/screens/ModuleScreen';
import { colors, connectTheme } from '@/constants/colors';
import { PERIODO_OPTIONS, TURMA_STATUS_OPTIONS } from '@/constants/form-options';
import { useCrudResource } from '@/hooks/useCrudResource';
import { useSelectOptions } from '@/hooks/useSelectOptions';
import { connectService } from '@/services/connect.service';
import { useAuthStore } from '@/stores/auth.store';
import type { Aluno, Turma } from '@/types/connect.types';
import { useI18n } from '@/hooks/useI18n';

const turmaOptionLoaders = {
  cursos: connectService.listCursoOptions,
  professores: connectService.listProfessorOptions,
};

type TurmaOptionKey = keyof typeof turmaOptionLoaders;
type TurmaOptions = Record<TurmaOptionKey, CrudOption[]>;

function getFields(options: Partial<TurmaOptions>): CrudField[] {
  return [
  { name: 'nome', label: 'Nome da turma', required: true },
  { name: 'curso_id', label: 'Curso', options: options.cursos ?? [], emptyOptionLabel: 'Sem curso' },
  { name: 'professor_responsavel_id', label: 'Professor responsavel', options: options.professores ?? [], emptyOptionLabel: 'Sem professor' },
  { name: 'periodo', label: 'Periodo', required: true, options: PERIODO_OPTIONS },
  { name: 'data_inicio', label: 'Data de início', placeholder: 'DD/MM/AAAA', mask: 'date' },
  { name: 'data_termino', label: 'Data de término', placeholder: 'DD/MM/AAAA', mask: 'date' },
  { name: 'horario_inicio', label: 'Horário início', placeholder: '08:00', mask: 'time' },
  { name: 'horario_fim', label: 'Horário fim', placeholder: '12:00', mask: 'time' },
  { name: 'status', label: 'Status', required: true, options: TURMA_STATUS_OPTIONS },
  ];
}

function formValues(turma: Turma): Record<string, string> {
  return {
    nome: turma.nome ?? '',
    curso_id: turma.curso_id ?? '',
    professor_responsavel_id: turma.professor_responsavel_id ?? '',
    periodo: turma.periodo ?? 'manha',
    data_inicio: turma.data_inicio ?? '',
    data_termino: turma.data_termino ?? '',
    horario_inicio: turma.horario_inicio ?? '',
    horario_fim: turma.horario_fim ?? '',
    status: turma.status ?? 'ativa',
  };
}

export default function TurmasScreen() {
  const { t } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Turma | null>(null);
  const [search, setSearch] = useState('');
  const [draftFilters, setDraftFilters] = useState({ status: '', periodo: '', cursoId: '', professorId: '' });
  const [appliedFilters, setAppliedFilters] = useState(draftFilters);
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [alunoSearch, setAlunoSearch] = useState('');
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const session = useAuthStore((s) => s.session);
  const isProfessor = session?.perfil?.tipo === 'professor';
  const { options, error: optionsError } = useSelectOptions(turmaOptionLoaders);
  const fields = getFields(options);
  const loadTurmas = useCallback(async () => {
    if (isProfessor && session?.userId) {
      return connectService.listTurmasForProfessorUser(session.userId);
    }
    return connectService.listTurmas();
  }, [isProfessor, session?.userId]);
  const { items, loading, submitting, error, createItem, updateItem, deleteItem } =
    useCrudResource<Turma, Record<string, string>>({
      load: loadTurmas,
      create: connectService.createTurma,
      update: connectService.updateTurma,
      remove: connectService.deleteTurma,
    });

  useEffect(() => {
    if (selectedTurma && items.some((turma) => turma.id === selectedTurma.id)) return;
    setSelectedTurma(isProfessor ? items[0] ?? null : null);
  }, [isProfessor, items, selectedTurma]);

  useEffect(() => {
    if (!selectedTurma?.id) {
      setAlunos([]);
      return;
    }
    setLoadingAlunos(true);
    connectService
      .listAlunosByTurma(selectedTurma.id)
      .then(setAlunos)
      .catch(() => setAlunos([]))
      .finally(() => setLoadingAlunos(false));
  }, [selectedTurma?.id]);

  const visibleCourseIds = new Set(items.map((item) => item.curso_id).filter(Boolean));
  const visibleProfessorIds = new Set(items.map((item) => item.professor_responsavel_id).filter(Boolean));
  const courseFilterOptions = (options.cursos ?? []).filter((option) => visibleCourseIds.has(option.value));
  const professorFilterOptions = (options.professores ?? []).filter((option) => visibleProfessorIds.has(option.value));
  const filtered = items.filter((turma) =>
    `${turma.nome} ${turma.curso_nome ?? ''} ${turma.professor_nome ?? ''} ${turma.periodo ?? ''}`.toLowerCase().includes(search.toLowerCase()) &&
    (!appliedFilters.status || turma.status === appliedFilters.status) &&
    (!appliedFilters.periodo || turma.periodo === appliedFilters.periodo) &&
    (!appliedFilters.cursoId || turma.curso_id === appliedFilters.cursoId) &&
    (!appliedFilters.professorId || turma.professor_responsavel_id === appliedFilters.professorId)
  );
  const filteredAlunos = alunos.filter((aluno) =>
    `${aluno.nome} ${aluno.rm ?? ''} ${aluno.email_institucional ?? aluno.email ?? ''}`.toLowerCase().includes(alunoSearch.toLowerCase())
  );

  return (
    <>
      <ModuleScreen
        kicker="SENAI Connect"
        title="Turmas e Cursos"
        description={isProfessor ? 'Consulte suas turmas e os alunos vinculados.' : 'Gerencie turmas, cursos e vínculos acadêmicos.'}
        isLoading={loading}
        actionLabel={isProfessor ? undefined : '+ Criar turma'}
        onActionPress={isProfessor ? undefined : () => {
          setEditing(null);
          setModalOpen(true);
        }}
      >
        <View style={styles.metricGrid}>
          <MetricTile label="Turmas ativas" value={items.filter((t) => t.status === 'ativa').length} accent={connectTheme.accent} icon={<Users size={16} color={connectTheme.accent} />} style={styles.metric} />
          <MetricTile label="Cursos vinculados" value={new Set(items.map((t) => t.curso_id).filter(Boolean)).size} accent={colors.blue} icon={<BookOpen size={16} color={colors.blue} />} style={styles.metric} />
          <MetricTile label="Períodos" value={new Set(items.map((t) => t.periodo).filter(Boolean)).size} accent={colors.orange} icon={<CalendarDays size={16} color={colors.orange} />} style={styles.metric} />
          <MetricTile label="Professores" value={new Set(items.map((t) => t.professor_responsavel_id).filter(Boolean)).size} accent={colors.green} icon={<GraduationCap size={16} color={colors.green} />} style={styles.metric} />
        </View>

        <SearchField placeholder={t("Pesquisar turma, curso, professor ou período...")} value={search} onChangeText={setSearch} />

        <AdvancedFilterPanel
          resultCount={filtered.length}
          activeCount={Object.values(appliedFilters).filter(Boolean).length}
          onApply={() => setAppliedFilters(draftFilters)}
          onClear={() => {
            const cleared = { status: '', periodo: '', cursoId: '', professorId: '' };
            setDraftFilters(cleared);
            setAppliedFilters(cleared);
          }}
        >
          <FilterChoice label="Status" value={draftFilters.status} options={TURMA_STATUS_OPTIONS} onChange={(status) => setDraftFilters((current) => ({ ...current, status }))} />
          <FilterChoice label="Periodo" value={draftFilters.periodo} options={PERIODO_OPTIONS} onChange={(periodo) => setDraftFilters((current) => ({ ...current, periodo }))} />
          <FilterChoice label="Curso" value={draftFilters.cursoId} options={courseFilterOptions} onChange={(cursoId) => setDraftFilters((current) => ({ ...current, cursoId }))} />
          <FilterChoice label="Professor responsavel" value={draftFilters.professorId} options={professorFilterOptions} onChange={(professorId) => setDraftFilters((current) => ({ ...current, professorId }))} />
        </AdvancedFilterPanel>

        <SurfaceCard title="Turmas" subtitle="Turmas ativas e período de aulas">
          {error || optionsError ? <FeedbackMessage variant="danger" message={error ?? optionsError ?? ''} /> : null}
          {filtered.length === 0 ? <Text style={styles.empty}>{t("Nenhuma turma encontrada.")}</Text> : null}
          {filtered.map((turma) => (
            <ListRow
              key={turma.id}
              title={turma.nome}
              subtitle={`${turma.curso_nome ?? turma.curso_id ?? 'Curso não vinculado'} • ${turma.periodo ?? 'sem período'}`}
              badge={turma.status}
              badgeVariant={turma.status === 'ativa' ? 'success' : 'neutral'}
              initials={turma.nome.slice(0, 2).toUpperCase()}
              accent={colors.green}
              onPress={() => setSelectedTurma(turma)}
              onEdit={isProfessor ? undefined : () => {
                setEditing(turma);
                setModalOpen(true);
              }}
              onDelete={isProfessor ? undefined : () => deleteItem(turma.id, turma.nome)}
            />
          ))}
        </SurfaceCard>

        {selectedTurma ? (
          <SurfaceCard title="Alunos da turma" subtitle={`${selectedTurma.nome} - ${selectedTurma.curso_nome ?? 'Curso não vinculado'}`}>
            <SearchField placeholder={t("Pesquisar aluno por nome, RM ou e-mail...")} value={alunoSearch} onChangeText={setAlunoSearch} />
            {loadingAlunos ? <Text style={styles.empty}>{t("Carregando alunos...")}</Text> : null}
            {!loadingAlunos && filteredAlunos.length === 0 ? <Text style={styles.empty}>{t("Nenhum aluno encontrado nesta turma.")}</Text> : null}
            {!loadingAlunos && filteredAlunos.map((aluno) => (
              <ListRow
                key={aluno.id}
                title={aluno.nome}
                subtitle={`RM ${aluno.rm ?? 'sem RM'} - ${aluno.email_institucional ?? aluno.email ?? 'Sem e-mail'}`}
                badge={aluno.status === 'ativo' ? 'Ativo' : aluno.status}
                badgeVariant={aluno.status === 'ativo' ? 'success' : 'neutral'}
                initials={aluno.nome.slice(0, 2).toUpperCase()}
                imageUri={aluno.foto_url}
                accent={connectTheme.accent}
              />
            ))}
          </SurfaceCard>
        ) : null}
      </ModuleScreen>

      <CrudModal
        visible={modalOpen}
        title={editing ? 'Editar turma' : 'Nova turma'}
        fields={fields}
        initialValues={editing ? formValues(editing) : { periodo: 'manha', status: 'ativa' }}
        isSubmitting={submitting}
        submitLabel={editing ? 'Salvar alterações' : 'Criar turma'}
        onClose={() => setModalOpen(false)}
        onSubmit={async (values) => {
          if (editing) await updateItem(editing.id, values);
          else await createItem(values);
          setModalOpen(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  metric: { width: '48%' },
  empty: { color: colors.grayText, fontSize: 12, fontWeight: '700' },
  error: { color: colors.red, fontSize: 12, fontWeight: '700', marginBottom: 8 },
});
