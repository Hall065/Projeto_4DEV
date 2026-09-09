import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ShieldCheck, UserCheck, UserPlus, Users } from 'lucide-react-native';
import { CrudModal, type CrudField } from '@/components/common/CrudModal';
import { AdvancedFilterPanel, FilterChoice, FilterTextField } from '@/components/common/AdvancedFilters';
import { FeedbackMessage, ListRow, MetricTile, SearchField, SurfaceCard } from '@/components/common/VisualPrimitives';
import { ModuleScreen } from '@/components/screens/ModuleScreen';
import { colors, gridTheme } from '@/constants/colors';
import { USER_ROLE_OPTIONS, USER_STATUS_OPTIONS } from '@/constants/form-options';
import { useCrudResource } from '@/hooks/useCrudResource';
import { useThemeColors } from '@/hooks/useThemeColors';
import { isMaintenanceRole } from '@/lib/permissions';
import { gridService } from '@/services/grid.service';
import { useAuthStore } from '@/stores/auth.store';
import type { HubUsuario } from '@/types/auth.types';
import { normalizeDateToIso } from '@/utils/formatters';
import { useI18n } from '@/hooks/useI18n';

const EMPTY_FILTERS = { role: '', status: '', createdFrom: '', createdTo: '', updatedFrom: '', updatedTo: '' };

function validIsoDate(value: string) {
  const normalized = normalizeDateToIso(value);
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(normalized)) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10) === normalized ? normalized : null;
}

const GRID_USER_ROLE_OPTIONS = USER_ROLE_OPTIONS.filter((option) =>
  ['grid_funcionario', 'grid_chefe', 'manutencao', 'gerente_manutencao'].includes(option.value)
);

function getFields(managerOnly: boolean): CrudField[] {
  return [
  { name: 'foto_uri', label: 'Foto de perfil', type: 'image' },
  { name: 'nome', label: 'Nome completo', required: true },
  { name: 'email_institucional', label: 'E-mail institucional', required: true, keyboardType: 'email-address' },
  { name: 'senha', label: 'Senha inicial', placeholder: 'Senai@123456', secureTextEntry: true },
  {
    name: 'tipo',
    label: 'Perfil',
    required: true,
    options: managerOnly ? GRID_USER_ROLE_OPTIONS.filter((option) => option.value === 'grid_funcionario') : GRID_USER_ROLE_OPTIONS,
  },
  { name: 'telefone', label: 'Telefone', placeholder: '(19) 98999-9999', mask: 'phone' },
  { name: 'cpf', label: 'CPF', placeholder: '111.111.111-11', mask: 'cpf' },
  { name: 'status', label: 'Status', required: true, options: USER_STATUS_OPTIONS },
  ];
}

function initials(nome: string) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function formValues(usuario: HubUsuario): Record<string, string> {
  return {
    nome: usuario.nome ?? '',
    foto_uri: usuario.foto_url ?? '',
    email_institucional: usuario.email_institucional ?? '',
    senha: '',
    tipo: usuario.tipo ?? 'grid_funcionario',
    telefone: usuario.telefone ?? '',
    cpf: usuario.cpf ?? '',
    status: usuario.status ?? 'ativo',
  };
}

export default function UsuariosGridScreen() {
  const { t } = useI18n();
  const theme = useThemeColors();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HubUsuario | null>(null);
  const [search, setSearch] = useState('');
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [filterError, setFilterError] = useState<string | null>(null);
  const role = useAuthStore((s) => s.session?.perfil?.tipo);
  const managerOnly = role === 'gerente_manutencao' || role === 'grid_chefe';
  const fields = getFields(managerOnly);
  const { items, loading, submitting, error, createItem, updateItem, deleteItem } =
    useCrudResource<HubUsuario, Record<string, string>>({
      load: gridService.listMaintenanceUsuarios,
      create: gridService.createUsuario,
      update: gridService.updateUsuario,
      remove: gridService.deleteUsuario,
    });

  const visibleItems = managerOnly
    ? items.filter((usuario) => usuario.tipo === 'manutencao' || usuario.tipo === 'grid_funcionario')
    : items;
  const visibleRoles = new Set(visibleItems.map((usuario) => usuario.tipo));
  const roleFilterOptions = GRID_USER_ROLE_OPTIONS.filter((option) => visibleRoles.has(option.value as HubUsuario['tipo']));
  const filtered = visibleItems.filter((usuario) => {
    const created = usuario.created_at?.slice(0, 10) ?? '';
    const updated = usuario.updated_at?.slice(0, 10) ?? '';
    return `${usuario.nome} ${usuario.email_institucional} ${usuario.tipo}`.toLowerCase().includes(search.toLowerCase()) &&
      (!appliedFilters.role || usuario.tipo === appliedFilters.role) &&
      (!appliedFilters.status || usuario.status === appliedFilters.status) &&
      (!appliedFilters.createdFrom || (created && created >= appliedFilters.createdFrom)) &&
      (!appliedFilters.createdTo || (created && created <= appliedFilters.createdTo)) &&
      (!appliedFilters.updatedFrom || (updated && updated >= appliedFilters.updatedFrom)) &&
      (!appliedFilters.updatedTo || (updated && updated <= appliedFilters.updatedTo));
  });
  const applyFilters = () => {
    const dateKeys = ['createdFrom', 'createdTo', 'updatedFrom', 'updatedTo'] as const;
    const normalized = { ...draftFilters };
    for (const key of dateKeys) {
      const value = draftFilters[key];
      const parsed = value ? validIsoDate(value) : '';
      if (value && !parsed) {
        setFilterError('Use datas validas em DD/MM/AAAA ou AAAA-MM-DD.');
        return;
      }
      normalized[key] = parsed ?? '';
    }
    if ((normalized.createdFrom && normalized.createdTo && normalized.createdFrom > normalized.createdTo) ||
        (normalized.updatedFrom && normalized.updatedTo && normalized.updatedFrom > normalized.updatedTo)) {
      setFilterError('A data inicial deve ser anterior ou igual a data final.');
      return;
    }
    setFilterError(null);
    setAppliedFilters(normalized);
  };

  return (
    <>
      <ModuleScreen
      analysis={{ datasets: { usuarios: filtered }, filters: { search, ...appliedFilters }, error }}
        kicker="SENAI Grid"
        title="Usuários"
        description="Controle de acesso da equipe interna do Grid."
        isLoading={loading}
        actionLabel="+ Novo usuário"
        onActionPress={() => {
          setEditing(null);
          setModalOpen(true);
        }}
      >
        <View style={styles.metricGrid}>
          <MetricTile label="Usuários ativos" value={visibleItems.filter((u) => u.status === 'ativo').length} accent={gridTheme.accent} icon={<Users size={16} color={gridTheme.accent} />} style={styles.metric} />
          <MetricTile label="Manutenção" value={visibleItems.filter((u) => `${u.tipo}`.includes('manutencao')).length} accent={colors.blue} icon={<UserCheck size={16} color={colors.blue} />} style={styles.metric} />
          <MetricTile label="Gerentes" value={visibleItems.filter((u) => u.tipo === 'gerente_manutencao').length} accent={colors.red} icon={<ShieldCheck size={16} color={colors.red} />} style={styles.metric} />
          <MetricTile label="Total" value={visibleItems.length} accent={colors.orange} icon={<UserPlus size={16} color={colors.orange} />} style={styles.metric} />
        </View>

        <SearchField placeholder={t("Buscar usuário, e-mail, cargo ou permissão...")} value={search} onChangeText={setSearch} />

        <AdvancedFilterPanel
          resultCount={filtered.length}
          activeCount={Object.values(appliedFilters).filter(Boolean).length}
          error={filterError}
          onApply={applyFilters}
          onClear={() => {
            setDraftFilters(EMPTY_FILTERS);
            setAppliedFilters(EMPTY_FILTERS);
            setFilterError(null);
          }}
        >
          <FilterChoice label="Papel" value={draftFilters.role} options={roleFilterOptions} onChange={(roleValue) => setDraftFilters((current) => ({ ...current, role: roleValue }))} />
          <FilterChoice label="Status" value={draftFilters.status} options={USER_STATUS_OPTIONS} onChange={(status) => setDraftFilters((current) => ({ ...current, status }))} />
          <FilterTextField label="Criado a partir de" value={draftFilters.createdFrom} placeholder={t("DD/MM/AAAA")} keyboardType="numeric" onChangeText={(createdFrom) => setDraftFilters((current) => ({ ...current, createdFrom }))} />
          <FilterTextField label="Criado ate" value={draftFilters.createdTo} placeholder={t("DD/MM/AAAA")} keyboardType="numeric" onChangeText={(createdTo) => setDraftFilters((current) => ({ ...current, createdTo }))} />
          <FilterTextField label="Atualizado a partir de" value={draftFilters.updatedFrom} placeholder={t("DD/MM/AAAA")} keyboardType="numeric" onChangeText={(updatedFrom) => setDraftFilters((current) => ({ ...current, updatedFrom }))} />
          <FilterTextField label="Atualizado ate" value={draftFilters.updatedTo} placeholder={t("DD/MM/AAAA")} keyboardType="numeric" onChangeText={(updatedTo) => setDraftFilters((current) => ({ ...current, updatedTo }))} />
        </AdvancedFilterPanel>

        <SurfaceCard title="Equipe cadastrada" subtitle="Usuários internos e níveis de acesso">
          {error ? <FeedbackMessage variant="danger" message={error} /> : null}
          {filtered.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textMuted }]}>{t("Nenhum usuário encontrado.")}</Text>
          ) : null}
          {filtered.map((usuario) => (
            <ListRow
              key={usuario.id}
              title={usuario.nome}
              subtitle={`${usuario.tipo} • ${usuario.email_institucional}`}
              badge={usuario.status}
              badgeVariant={usuario.status === 'ativo' ? 'success' : 'neutral'}
              meta="BD"
              initials={initials(usuario.nome)}
              imageUri={usuario.foto_url}
              accent={isMaintenanceRole(usuario.tipo) ? colors.blue : colors.red}
              onEdit={() => {
                setEditing(usuario);
                setModalOpen(true);
              }}
              onDelete={() => deleteItem(usuario.id, usuario.nome)}
            />
          ))}
        </SurfaceCard>
      </ModuleScreen>

      <CrudModal
        visible={modalOpen}
        title={editing ? 'Editar usuário' : 'Novo usuário'}
        fields={fields}
        initialValues={editing ? formValues(editing) : { tipo: 'grid_funcionario', status: 'ativo' }}
        isSubmitting={submitting}
        submitLabel={editing ? 'Salvar alterações' : 'Criar usuário'}
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
  empty: { fontSize: 12, fontWeight: '700' },
  error: { color: colors.red, fontSize: 12, fontWeight: '700', marginBottom: 8 },
});
