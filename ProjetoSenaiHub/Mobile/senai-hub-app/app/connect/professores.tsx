import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GraduationCap, UserCheck, Users } from 'lucide-react-native';
import { CrudModal, type CrudField } from '@/components/common/CrudModal';
import { AdvancedFilterPanel, FilterChoice } from '@/components/common/AdvancedFilters';
import { FeedbackMessage, ListRow, MetricTile, SearchField, SurfaceCard } from '@/components/common/VisualPrimitives';
import { ModuleScreen } from '@/components/screens/ModuleScreen';
import { colors, connectTheme } from '@/constants/colors';
import { USER_STATUS_OPTIONS } from '@/constants/form-options';
import { useCrudResource } from '@/hooks/useCrudResource';
import { connectService } from '@/services/connect.service';
import type { Professor } from '@/types/connect.types';
import { useI18n } from '@/hooks/useI18n';

const fields: CrudField[] = [
  { name: 'foto_uri', label: 'Foto de perfil', type: 'image' },
  { name: 'nome', label: 'Nome completo', required: true },
  { name: 'email', label: 'E-mail institucional', required: true, keyboardType: 'email-address' },
  { name: 'senha', label: 'Senha inicial', placeholder: 'Senai@123456', secureTextEntry: true },
  { name: 'cpf', label: 'CPF', placeholder: '111.111.111-11', mask: 'cpf' },
  { name: 'celular', label: 'Celular', placeholder: '(19) 98999-9999', mask: 'phone' },
  { name: 'especialidade', label: 'Especialidade' },
  { name: 'data_contratacao', label: 'Data de contratação', placeholder: 'DD/MM/AAAA', mask: 'date' },
  { name: 'data_nascimento', label: 'Data de nascimento', placeholder: 'DD/MM/AAAA', mask: 'date' },
  { name: 'endereco', label: 'Endereco' },
  { name: 'status', label: 'Status', required: true, options: USER_STATUS_OPTIONS },
];

function initials(nome: string) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function formValues(professor: Professor): Record<string, string> {
  return {
    nome: professor.nome ?? '',
    foto_uri: professor.foto_url ?? '',
    email: professor.email ?? '',
    senha: '',
    cpf: professor.cpf ?? '',
    celular: professor.celular ?? '',
    especialidade: professor.especialidade ?? '',
    data_contratacao: professor.data_contratacao ?? '',
    data_nascimento: professor.data_nascimento ?? '',
    endereco: professor.endereco ?? '',
    status: professor.status ?? 'ativo',
  };
}

export default function ProfessoresScreen() {
  const { t } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Professor | null>(null);
  const [search, setSearch] = useState('');
  const [draftFilters, setDraftFilters] = useState({ status: '', especialidade: '' });
  const [appliedFilters, setAppliedFilters] = useState(draftFilters);
  const { items, loading, submitting, error, createItem, updateItem, deleteItem } =
    useCrudResource<Professor, Record<string, string>>({
      load: connectService.listProfessores,
      create: connectService.createProfessor,
      update: connectService.updateProfessor,
      remove: connectService.deleteProfessor,
    });

  const especialidadeOptions = Array.from(
    new Set(items.map((item) => item.especialidade).filter((value): value is string => Boolean(value)))
  ).sort().map((value) => ({ value, label: value }));
  const filtered = items.filter((item) =>
    `${item.nome} ${item.email ?? ''} ${item.especialidade ?? ''}`.toLowerCase().includes(search.toLowerCase()) &&
    (!appliedFilters.status || item.status === appliedFilters.status) &&
    (!appliedFilters.especialidade || item.especialidade === appliedFilters.especialidade)
  );

  return (
    <>
      <ModuleScreen
      analysis={{ datasets: { professores: filtered }, filters: { search, ...appliedFilters }, error }}
        kicker="SENAI Connect"
        title="Gerenciamento de professores"
        description="Cadastro, especialidades e status dos docentes."
        isLoading={loading}
        actionLabel="+ Novo professor"
        onActionPress={() => {
          setEditing(null);
          setModalOpen(true);
        }}
      >
        <View style={styles.metricGrid}>
          <MetricTile label="Professores" value={items.length} accent={connectTheme.accent} icon={<Users size={16} color={connectTheme.accent} />} style={styles.metric} />
          <MetricTile label="Ativos" value={items.filter((p) => p.status === 'ativo').length} accent={colors.green} icon={<UserCheck size={16} color={colors.green} />} style={styles.metric} />
          <MetricTile label="Especialidades" value={new Set(items.map((p) => p.especialidade).filter(Boolean)).size} accent={colors.blue} icon={<GraduationCap size={16} color={colors.blue} />} style={styles.metric} />
        </View>

        <SearchField placeholder={t("Buscar por nome, e-mail ou CPF...")} value={search} onChangeText={setSearch} />

        <AdvancedFilterPanel
          resultCount={filtered.length}
          activeCount={Object.values(appliedFilters).filter(Boolean).length}
          onApply={() => setAppliedFilters(draftFilters)}
          onClear={() => {
            const cleared = { status: '', especialidade: '' };
            setDraftFilters(cleared);
            setAppliedFilters(cleared);
          }}
        >
          <FilterChoice label="Status" value={draftFilters.status} options={USER_STATUS_OPTIONS} onChange={(status) => setDraftFilters((current) => ({ ...current, status }))} />
          <FilterChoice label="Especialidade" value={draftFilters.especialidade} options={especialidadeOptions} onChange={(especialidade) => setDraftFilters((current) => ({ ...current, especialidade }))} />
        </AdvancedFilterPanel>

        <SurfaceCard title="Professores cadastrados" subtitle="Equipe docente ativa">
          {error ? <FeedbackMessage variant="danger" message={error} /> : null}
          {filtered.length === 0 ? <Text style={styles.empty}>{t("Nenhum professor encontrado.")}</Text> : null}
          {filtered.map((professor) => (
            <ListRow
              key={professor.id}
              title={professor.nome}
              subtitle={`${professor.especialidade ?? 'Especialidade não informada'} • ${professor.email ?? 'Sem e-mail'}`}
              badge={professor.status === 'ativo' ? 'Ativo' : professor.status}
              badgeVariant={professor.status === 'ativo' ? 'success' : 'neutral'}
              meta="BD"
              initials={initials(professor.nome)}
              imageUri={professor.foto_url}
              accent={colors.green}
              onEdit={() => {
                setEditing(professor);
                setModalOpen(true);
              }}
              onDelete={() => deleteItem(professor.id, professor.nome)}
            />
          ))}
        </SurfaceCard>
      </ModuleScreen>

      <CrudModal
        visible={modalOpen}
        title={editing ? 'Editar professor' : 'Novo professor'}
        fields={fields}
        initialValues={editing ? formValues(editing) : { status: 'ativo' }}
        isSubmitting={submitting}
        submitLabel={editing ? 'Salvar alterações' : 'Criar professor'}
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
