import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ShieldCheck, UserCheck, UserPlus, Users } from 'lucide-react-native';
import { CrudModal, type CrudField } from '@/components/common/CrudModal';
import { AdvancedFilterPanel, FilterChoice } from '@/components/common/AdvancedFilters';
import { FeedbackMessage, ListRow, MetricTile, SearchField, SurfaceCard } from '@/components/common/VisualPrimitives';
import { ModuleScreen } from '@/components/screens/ModuleScreen';
import { colors, connectTheme } from '@/constants/colors';
import { USER_ROLE_OPTIONS, USER_STATUS_OPTIONS } from '@/constants/form-options';
import { useCrudResource } from '@/hooks/useCrudResource';
import { gridService } from '@/services/grid.service';
import type { HubUsuario } from '@/types/auth.types';
import { useI18n } from '@/hooks/useI18n';

const CONNECT_ADMIN_ROLES = ['secretaria', 'connect_secretaria', 'connect_aqv', 'direcao', 'admin'] as const;

const fields: CrudField[] = [
  { name: 'foto_uri', label: 'Foto de perfil', type: 'image' },
  { name: 'nome', label: 'Nome completo', required: true },
  { name: 'email_institucional', label: 'E-mail institucional', required: true, keyboardType: 'email-address' },
  { name: 'senha', label: 'Senha inicial', placeholder: 'Senai@123456', secureTextEntry: true },
  {
    name: 'tipo',
    label: 'Perfil',
    required: true,
    options: USER_ROLE_OPTIONS.filter((option) => CONNECT_ADMIN_ROLES.includes(option.value as typeof CONNECT_ADMIN_ROLES[number])),
  },
  { name: 'telefone', label: 'Telefone', placeholder: '(19) 98999-9999', mask: 'phone' },
  { name: 'cpf', label: 'CPF', placeholder: '111.111.111-11', mask: 'cpf' },
  { name: 'status', label: 'Status', required: true, options: USER_STATUS_OPTIONS },
];

function initials(nome: string) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function formValues(usuario: HubUsuario): Record<string, string> {
  return {
    nome: usuario.nome ?? '',
    foto_uri: usuario.foto_url ?? '',
    email_institucional: usuario.email_institucional ?? '',
    senha: '',
    tipo: usuario.tipo ?? 'connect_secretaria',
    telefone: usuario.telefone ?? '',
    cpf: usuario.cpf ?? '',
    status: usuario.status ?? 'ativo',
  };
}

function isConnectAdminUser(usuario: HubUsuario) {
  return CONNECT_ADMIN_ROLES.includes(usuario.tipo as typeof CONNECT_ADMIN_ROLES[number]);
}

export default function UsuariosConnectScreen() {
  const { t } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HubUsuario | null>(null);
  const [search, setSearch] = useState('');
  const [draftFilters, setDraftFilters] = useState({ role: '', status: '' });
  const [appliedFilters, setAppliedFilters] = useState(draftFilters);
  const { items, loading, submitting, error, createItem, updateItem, deleteItem } =
    useCrudResource<HubUsuario, Record<string, string>>({
      load: gridService.listUsuarios,
      create: gridService.createUsuario,
      update: gridService.updateUsuario,
      remove: gridService.deleteUsuario,
    });

  const connectUsers = items.filter(isConnectAdminUser);
  const connectRoleOptions = USER_ROLE_OPTIONS.filter((option) =>
    CONNECT_ADMIN_ROLES.includes(option.value as typeof CONNECT_ADMIN_ROLES[number])
  );
  const filtered = connectUsers.filter((usuario) =>
    `${usuario.nome} ${usuario.email_institucional} ${usuario.tipo}`.toLowerCase().includes(search.toLowerCase()) &&
    (!appliedFilters.role || usuario.tipo === appliedFilters.role) &&
    (!appliedFilters.status || usuario.status === appliedFilters.status)
  );

  return (
    <>
      <ModuleScreen
      analysis={{ datasets: { usuarios: filtered }, filters: { search, ...appliedFilters }, error }}
        kicker="SENAI Connect"
        title="Usuários Connect"
        description="Cadastro de secretaria, direção e administradores do Connect."
        isLoading={loading}
        actionLabel="+ Novo usuário"
        onActionPress={() => {
          setEditing(null);
          setModalOpen(true);
        }}
      >
        <View style={styles.metricGrid}>
          <MetricTile label="Ativos" value={connectUsers.filter((u) => u.status === 'ativo').length} accent={connectTheme.accent} icon={<Users size={16} color={connectTheme.accent} />} style={styles.metric} />
          <MetricTile label="Secretaria" value={connectUsers.filter((u) => u.tipo === 'secretaria').length} accent={colors.blue} icon={<UserCheck size={16} color={colors.blue} />} style={styles.metric} />
          <MetricTile label="Admin" value={connectUsers.filter((u) => u.tipo === 'admin').length} accent={colors.red} icon={<ShieldCheck size={16} color={colors.red} />} style={styles.metric} />
          <MetricTile label="Total" value={connectUsers.length} accent={colors.orange} icon={<UserPlus size={16} color={colors.orange} />} style={styles.metric} />
        </View>

        <SearchField placeholder={t("Buscar usuário, e-mail ou perfil...")} value={search} onChangeText={setSearch} />

        <AdvancedFilterPanel
          resultCount={filtered.length}
          activeCount={Object.values(appliedFilters).filter(Boolean).length}
          onApply={() => setAppliedFilters(draftFilters)}
          onClear={() => {
            const cleared = { role: '', status: '' };
            setDraftFilters(cleared);
            setAppliedFilters(cleared);
          }}
        >
          <FilterChoice label="Papel" value={draftFilters.role} options={connectRoleOptions} onChange={(role) => setDraftFilters((current) => ({ ...current, role }))} />
          <FilterChoice label="Status" value={draftFilters.status} options={USER_STATUS_OPTIONS} onChange={(status) => setDraftFilters((current) => ({ ...current, status }))} />
        </AdvancedFilterPanel>

        <SurfaceCard title="Equipe administrativa" subtitle="Usuários com acesso ao SENAI Connect">
          {error ? <FeedbackMessage variant="danger" message={error} /> : null}
          {filtered.length === 0 ? <Text style={styles.empty}>{t("Nenhum usuário administrativo encontrado.")}</Text> : null}
          {filtered.map((usuario) => (
            <ListRow
              key={usuario.id}
              title={usuario.nome}
              subtitle={`${usuario.tipo} - ${usuario.email_institucional}`}
              badge={usuario.status}
              badgeVariant={usuario.status === 'ativo' ? 'success' : 'neutral'}
              initials={initials(usuario.nome)}
              imageUri={usuario.foto_url}
              accent={usuario.tipo === 'admin' ? colors.red : connectTheme.accent}
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
        initialValues={editing ? formValues(editing) : { tipo: 'connect_secretaria', status: 'ativo' }}
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
  empty: { color: colors.grayText, fontSize: 12, fontWeight: '700' },
});
