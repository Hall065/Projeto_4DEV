import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { UserCheck, UserPlus, Users } from 'lucide-react-native';
import { CrudModal, type CrudField, type CrudOption } from '@/components/common/CrudModal';
import { AdvancedFilterPanel, FilterChoice } from '@/components/common/AdvancedFilters';
import {
  FeedbackMessage,
  ListRow,
  MetricTile,
  SearchField,
  SurfaceCard,
} from '@/components/common/VisualPrimitives';
import { ModuleScreen } from '@/components/screens/ModuleScreen';
import { colors, connectTheme } from '@/constants/colors';
import { USER_STATUS_OPTIONS } from '@/constants/form-options';
import { useCrudResource } from '@/hooks/useCrudResource';
import { useSelectOptions } from '@/hooks/useSelectOptions';
import { connectService } from '@/services/connect.service';
import { useAuthStore } from '@/stores/auth.store';
import { useFilterStore } from '@/stores/filter.store';
import type { Aluno } from '@/types/connect.types';

const alunoOptionLoaders = {
  cursos: connectService.listCursoOptions,
  turmas: connectService.listTurmaOptions,
  empresas: connectService.listActiveEmpresaOptions,
};

type AlunoOptionKey = keyof typeof alunoOptionLoaders;
type AlunoOptions = Record<AlunoOptionKey, CrudOption[]>;

function getFields(options: Partial<AlunoOptions>): CrudField[] {
  return [
  { name: 'nome', label: 'Nome completo', required: true },
  { name: 'email', label: 'E-mail institucional', required: true, keyboardType: 'email-address' },
  { name: 'senha', label: 'Senha inicial', placeholder: 'Senai@123456', secureTextEntry: true },
  { name: 'email_pessoal', label: 'E-mail pessoal', keyboardType: 'email-address' },
  { name: 'rm', label: 'RM', required: true, mask: 'integer', keyboardType: 'numeric' },
  { name: 'cpf', label: 'CPF', placeholder: '111.111.111-11', mask: 'cpf' },
  { name: 'telefone', label: 'Telefone/Celular', placeholder: '(19) 98999-9999', mask: 'phone' },
  { name: 'foto_uri', label: 'Foto do aluno', type: 'image' },
  { name: 'curso_id', label: 'Curso', options: options.cursos ?? [], emptyOptionLabel: 'Sem curso' },
  { name: 'turma_id', label: 'Turma', options: options.turmas ?? [], emptyOptionLabel: 'Sem turma' },
  { name: 'data_nascimento', label: 'Data de nascimento', placeholder: 'DD/MM/AAAA', mask: 'date' },
  { name: 'nome_responsavel', label: 'Responsável' },
  {
    name: 'empresa_id',
    label: 'Empresa',
    required: true,
    options: options.empresas ?? [],
    emptyOptionLabel: 'Selecione uma empresa',
    placeholder: 'Selecione uma empresa',
  },
  { name: 'status', label: 'Status', required: true, options: USER_STATUS_OPTIONS },
  ];
}

function initials(nome: string) {
  return nome
    ? nome
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : '??';
}

function formValues(aluno: Aluno): Record<string, string> {
  return {
    nome: aluno.nome ?? '',
    email: aluno.email_institucional ?? aluno.email ?? '',
    senha: '',
    email_pessoal: aluno.email_pessoal ?? '',
    rm: aluno.rm ?? '',
    cpf: aluno.cpf ?? '',
    telefone: aluno.telefone ?? '',
    foto_uri: aluno.foto_url ?? '',
    curso_id: aluno.curso_id ?? '',
    turma_id: aluno.turma_id ?? '',
    data_nascimento: aluno.data_nascimento ?? '',
    nome_responsavel: aluno.nome_responsavel ?? '',
    empresa_id: aluno.empresa_id ?? '',
    status: aluno.status ?? 'ativo',
  };
}

export default function AlunosScreen() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Aluno | null>(null);
  const [draftFilters, setDraftFilters] = useState({ status: '', cursoId: '', turmaId: '', empresaId: '' });
  const [appliedFilters, setAppliedFilters] = useState(draftFilters);
  const { search, setSearch } = useFilterStore();
  const session = useAuthStore((s) => s.session);
  const { options, error: optionsError } = useSelectOptions(alunoOptionLoaders);
  const fields = getFields(options);
  const { items, loading, submitting, error, createItem, updateItem, deleteItem } =
    useCrudResource<Aluno, Record<string, string>>({
      load: connectService.listAlunos,
      create: (values) => connectService.createAluno(values, session?.userId),
      update: (id, values) => connectService.updateAluno(id, values, session?.userId),
      remove: connectService.deleteAluno,
    });

  const filtered = items.filter((aluno) => {
    const matchesSearch = `${aluno.nome} ${aluno.rm ?? ''} ${aluno.email ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesSearch &&
      (!appliedFilters.status || aluno.status === appliedFilters.status) &&
      (!appliedFilters.cursoId || aluno.curso_id === appliedFilters.cursoId) &&
      (!appliedFilters.turmaId || aluno.turma_id === appliedFilters.turmaId) &&
      (!appliedFilters.empresaId || aluno.empresa_id === appliedFilters.empresaId);
  });
  const activeFilterCount = Object.values(appliedFilters).filter(Boolean).length;
  const activeCount = items.filter((aluno) => aluno.status === 'ativo').length;

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (aluno: Aluno) => {
    setEditing(aluno);
    setModalOpen(true);
  };

  return (
    <>
      <ModuleScreen
        kicker="SENAI Connect"
        title="Gerenciamento de alunos"
        description="Cadastro, busca e atualização de alunos."
        isLoading={loading}
        actionLabel="+ Novo aluno"
        onActionPress={openCreate}
      >
        <View style={styles.metricGrid}>
          <MetricTile
            label="Alunos encontrados"
            value={items.length}
            accent={connectTheme.accent}
            icon={<Users size={16} color={connectTheme.accent} />}
            style={styles.metric}
          />
          <MetricTile
            label="Ativos"
            value={activeCount}
            accent={colors.green}
            icon={<UserCheck size={16} color={colors.green} />}
            style={styles.metric}
          />
          <MetricTile
            label="Novos no mês"
            value={items.length}
            accent={colors.blue}
            icon={<UserPlus size={16} color={colors.blue} />}
            style={styles.metric}
          />
        </View>

        <SearchField
          placeholder="Pesquisar aluno, matrícula, turma ou responsável..."
          value={search}
          onChangeText={setSearch}
        />

        <AdvancedFilterPanel
          resultCount={filtered.length}
          activeCount={activeFilterCount}
          onApply={() => setAppliedFilters(draftFilters)}
          onClear={() => {
            const cleared = { status: '', cursoId: '', turmaId: '', empresaId: '' };
            setDraftFilters(cleared);
            setAppliedFilters(cleared);
          }}
        >
          <FilterChoice label="Status" value={draftFilters.status} options={USER_STATUS_OPTIONS} onChange={(status) => setDraftFilters((current) => ({ ...current, status }))} />
          <FilterChoice label="Curso" value={draftFilters.cursoId} options={options.cursos ?? []} onChange={(cursoId) => setDraftFilters((current) => ({ ...current, cursoId }))} />
          <FilterChoice label="Turma" value={draftFilters.turmaId} options={options.turmas ?? []} onChange={(turmaId) => setDraftFilters((current) => ({ ...current, turmaId }))} />
          <FilterChoice label="Empresa" value={draftFilters.empresaId} options={options.empresas ?? []} onChange={(empresaId) => setDraftFilters((current) => ({ ...current, empresaId }))} />
        </AdvancedFilterPanel>

        <SurfaceCard title="Lista de alunos" subtitle="Dados principais e situação acadêmica">
          {error || optionsError ? <FeedbackMessage variant="danger" message={error ?? optionsError ?? ''} /> : null}
          {filtered.length === 0 ? <Text style={styles.empty}>Nenhum aluno encontrado.</Text> : null}
          {filtered.map((aluno) => (
            <ListRow
              key={aluno.id}
              title={aluno.nome}
              subtitle={`RM ${aluno.rm ?? 'sem RM'} • ${aluno.turma_nome ?? aluno.email ?? 'Sem vínculo'}`}
              badge={aluno.status === 'ativo' ? 'Ativo' : 'Inativo'}
              badgeVariant={aluno.status === 'ativo' ? 'success' : 'neutral'}
              meta="BD"
              initials={initials(aluno.nome)}
              imageUri={aluno.foto_url}
              accent={connectTheme.accent}
              onEdit={() => openEdit(aluno)}
              onDelete={() => deleteItem(aluno.id, aluno.nome)}
            />
          ))}
        </SurfaceCard>
      </ModuleScreen>

      <CrudModal
        visible={modalOpen}
        title={editing ? 'Editar aluno' : 'Novo aluno'}
        fields={fields}
        initialValues={editing ? formValues(editing) : { status: 'ativo' }}
        isSubmitting={submitting}
        submitLabel={editing ? 'Salvar alterações' : 'Criar aluno'}
        onClose={() => setModalOpen(false)}
        onSubmit={async (values) => {
          if (editing) {
            await updateItem(editing.id, values);
          } else {
            await createItem(values);
          }
          setModalOpen(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  metric: { width: '48%' },
  empty: { color: colors.grayText, fontSize: 12, fontWeight: '700' },
  error: { color: colors.red, fontSize: 12, fontWeight: '700', marginBottom: 8 },
});
