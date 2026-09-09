import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BriefcaseBusiness, Building2, Mail, UserCheck } from 'lucide-react-native';
import { CrudModal, type CrudField } from '@/components/common/CrudModal';
import { AdvancedFilterPanel, FilterChoice } from '@/components/common/AdvancedFilters';
import { FeedbackMessage, ListRow, MetricTile, SearchField, SurfaceCard } from '@/components/common/VisualPrimitives';
import { ModuleScreen } from '@/components/screens/ModuleScreen';
import { colors, connectTheme } from '@/constants/colors';
import { EMPRESA_STATUS_OPTIONS } from '@/constants/form-options';
import { useCrudResource } from '@/hooks/useCrudResource';
import { ensureEmpresaUserAccess } from '@/services/empresa.service';
import { connectService } from '@/services/connect.service';
import type { Empresa } from '@/types/connect.types';
import { useI18n } from '@/hooks/useI18n';

const PASSWORD_MIN_LENGTH = 6;

const companyFields: CrudField[] = [
  { name: 'foto_uri', label: 'Foto de perfil do acesso', type: 'image' },
  { name: 'nome', label: 'Nome da empresa', required: true },
  { name: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0000-00', mask: 'cnpj' },
  { name: 'email', label: 'E-mail', keyboardType: 'email-address', required: true },
];

const companyExtraFields: CrudField[] = [
  { name: 'telefone', label: 'Telefone', placeholder: '(19) 99999-9999', mask: 'phone' },
  { name: 'endereco', label: 'Endereco da empresa' },
  { name: 'responsavel_nome', label: 'Responsavel' },
  { name: 'status', label: 'Status', required: true, options: EMPRESA_STATUS_OPTIONS },
];

function getFields(isEditing: boolean): CrudField[] {
  return [
    ...companyFields,
    {
      name: 'senha_acesso',
      label: isEditing ? 'Nova senha para login da empresa' : 'Senha para login da empresa',
      placeholder: isEditing ? 'Deixe em branco para manter a senha atual' : 'Minimo 6 caracteres',
      required: !isEditing,
      secureTextEntry: true,
    },
    {
      name: 'confirmar_senha',
      label: 'Confirmar senha',
      placeholder: isEditing ? 'Repita a nova senha, se informou uma' : 'Repita a senha',
      required: !isEditing,
      secureTextEntry: true,
    },
    ...companyExtraFields,
  ];
}

function formValues(empresa: Empresa): Record<string, string> {
  return {
    nome: empresa.nome ?? '',
    foto_uri: empresa.foto_url ?? '',
    cnpj: empresa.cnpj ?? '',
    email: empresa.email ?? '',
    telefone: empresa.telefone ?? '',
    endereco: empresa.endereco ?? '',
    responsavel_nome: empresa.responsavel_nome ?? '',
    status: empresa.status ?? 'ativa',
    senha_acesso: '',
    confirmar_senha: '',
  };
}

function normalizePassword(values: Record<string, string>, isEditing: boolean) {
  const senha = values.senha_acesso?.trim() ?? '';
  const confirmacao = values.confirmar_senha?.trim() ?? '';

  if (!isEditing && !senha) {
    throw new Error('Informe a senha de acesso da empresa.');
  }

  if (senha || confirmacao) {
    if (senha.length < PASSWORD_MIN_LENGTH) {
      throw new Error(`A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`);
    }
    if (senha !== confirmacao) {
      throw new Error('A confirmacao da senha nao confere.');
    }
  }

  return senha || null;
}

function getEmpresaValues(values: Record<string, string>) {
  const { senha_acesso: _senha, confirmar_senha: _confirmacao, foto_uri: _foto, ...empresaValues } = values;
  return empresaValues;
}

export default function EmpresasScreen() {
  const { t } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [search, setSearch] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');
  const fields = useMemo(() => getFields(Boolean(editing)), [editing]);
  const { items, loading, submitting, error, createItem, updateItem, deleteItem } =
    useCrudResource<Empresa, Record<string, string>>({
      load: connectService.listEmpresas,
      create: connectService.createEmpresa,
      update: connectService.updateEmpresa,
      remove: connectService.deleteEmpresa,
    });

  const filtered = items.filter((empresa) =>
    `${empresa.nome} ${empresa.cnpj ?? ''} ${empresa.responsavel_nome ?? ''}`.toLowerCase().includes(search.toLowerCase()) &&
    (!appliedStatus || empresa.status === appliedStatus)
  );

  return (
    <>
      <ModuleScreen
      analysis={{ datasets: { empresas: filtered }, filters: { search, status: appliedStatus }, error }}
        kicker="SENAI Connect"
        title="Empresas"
        description="Cadastro das empresas parceiras dos contratos de aprendizagem."
        isLoading={loading}
        actionLabel="+ Nova empresa"
        onActionPress={() => {
          setEditing(null);
          setModalOpen(true);
        }}
      >
        <View style={styles.metricGrid}>
          <MetricTile label="Empresas" value={items.length} accent={connectTheme.accent} icon={<Building2 size={16} color={connectTheme.accent} />} style={styles.metric} />
          <MetricTile label="Ativas" value={items.filter((e) => e.status === 'ativa').length} accent={colors.green} icon={<UserCheck size={16} color={colors.green} />} style={styles.metric} />
          <MetricTile label="Com e-mail" value={items.filter((e) => e.email).length} accent={colors.blue} icon={<Mail size={16} color={colors.blue} />} style={styles.metric} />
          <MetricTile label="Parceiras" value={new Set(items.map((e) => e.cnpj ?? e.nome)).size} accent={colors.orange} icon={<BriefcaseBusiness size={16} color={colors.orange} />} style={styles.metric} />
        </View>

        <SearchField placeholder={t("Buscar empresa, CNPJ ou responsavel...")} value={search} onChangeText={setSearch} />

        <AdvancedFilterPanel
          resultCount={filtered.length}
          activeCount={appliedStatus ? 1 : 0}
          onApply={() => setAppliedStatus(draftStatus)}
          onClear={() => {
            setDraftStatus('');
            setAppliedStatus('');
          }}
        >
          <FilterChoice label="Status" value={draftStatus} options={EMPRESA_STATUS_OPTIONS} onChange={setDraftStatus} />
        </AdvancedFilterPanel>

        <SurfaceCard title="Empresas cadastradas" subtitle="Dados usados nos contratos">
          {error ? <FeedbackMessage variant="danger" message={error} /> : null}
          {filtered.length === 0 ? <Text style={styles.empty}>{t("Nenhuma empresa encontrada.")}</Text> : null}
          {filtered.map((empresa) => (
            <ListRow
              key={empresa.id}
              title={empresa.nome}
              subtitle={`${empresa.cnpj ?? 'CNPJ nao informado'} - ${empresa.responsavel_nome ?? 'Sem responsavel'}`}
              badge={empresa.status ?? 'ativa'}
              badgeVariant={empresa.status === 'ativa' ? 'success' : 'neutral'}
              meta={empresa.email ?? undefined}
              initials={empresa.nome.slice(0, 2).toUpperCase()}
              accent={colors.blue}
              onEdit={() => {
                setEditing(empresa);
                setModalOpen(true);
              }}
              onDelete={() => deleteItem(empresa.id, empresa.nome)}
            />
          ))}
        </SurfaceCard>
      </ModuleScreen>

      <CrudModal
        visible={modalOpen}
        title={editing ? 'Editar empresa' : 'Nova empresa'}
        fields={fields}
        initialValues={editing ? formValues(editing) : { status: 'ativa' }}
        isSubmitting={submitting}
        submitLabel={editing ? 'Salvar alteracoes' : 'Criar empresa'}
        onClose={() => setModalOpen(false)}
        onSubmit={async (values) => {
          const senha = normalizePassword(values, Boolean(editing));
          const empresaValues = getEmpresaValues(values);

          if (editing) {
            await updateItem(editing.id, empresaValues);
            await ensureEmpresaUserAccess({
              id: editing.id,
              nome: empresaValues.nome ?? editing.nome,
              email: empresaValues.email ?? editing.email,
              responsavel_nome: empresaValues.responsavel_nome ?? editing.responsavel_nome,
              senha,
              foto_uri: values.foto_uri,
            });
          } else {
            await createItem(empresaValues);
            const empresas = await connectService.listEmpresas();
            const created = empresas.find(
              (empresa) =>
                empresa.nome === empresaValues.nome ||
                (empresaValues.email && empresa.email?.toLowerCase() === empresaValues.email.toLowerCase())
            );
            if (created) {
              await ensureEmpresaUserAccess({ ...created, senha, foto_uri: values.foto_uri });
            }
          }
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
