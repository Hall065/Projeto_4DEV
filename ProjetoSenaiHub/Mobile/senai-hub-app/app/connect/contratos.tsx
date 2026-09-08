import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BriefcaseBusiness, FileCheck2, FileText } from 'lucide-react-native';
import { CrudModal, type CrudField, type CrudOption } from '@/components/common/CrudModal';
import { AnimatedPressable, FeedbackMessage, ListRow, MetricTile, SearchField, SurfaceCard } from '@/components/common/VisualPrimitives';
import { ModuleScreen } from '@/components/screens/ModuleScreen';
import { colors, connectTheme } from '@/constants/colors';
import { CONTRATO_STATUS_OPTIONS } from '@/constants/form-options';
import { useCrudResource } from '@/hooks/useCrudResource';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';
import { useSelectOptions } from '@/hooks/useSelectOptions';
import { canManageConnectData } from '@/lib/permissions';
import { listContratosByEmpresaId } from '@/services/empresa.service';
import { connectService } from '@/services/connect.service';
import { useAuthStore } from '@/stores/auth.store';
import type { ContratoAluno } from '@/types/connect.types';
import { useI18n } from '@/hooks/useI18n';

const contratoOptionLoaders = {
  alunos: connectService.listAlunoOptions,
  empresas: connectService.listEmpresaOptions,
};

type ContratoOptionKey = keyof typeof contratoOptionLoaders;
type ContratoOptions = Record<ContratoOptionKey, CrudOption[]>;

function getFields(options: Partial<ContratoOptions>): CrudField[] {
  return [
    { name: 'aluno_id', label: 'Aluno', required: true, options: options.alunos ?? [] },
    { name: 'empresa_id', label: 'Empresa', options: options.empresas ?? [], emptyOptionLabel: 'Sem empresa' },
    { name: 'monthly_value', label: 'Bolsa mensal', placeholder: '1518,00', keyboardType: 'decimal-pad', mask: 'currency' },
    { name: 'carteira_trabalho', label: 'Carteira de trabalho' },
    { name: 'conta_bancaria', label: 'Conta bancária' },
    { name: 'carga_horaria', label: 'Carga horária', placeholder: '4h, 6h ou 8h', required: true },
    { name: 'localizacao_empresa', label: 'Localização da empresa' },
    { name: 'email_empresa', label: 'E-mail da empresa', keyboardType: 'email-address' },
    { name: 'data_inicio', label: 'Data de início', placeholder: 'DD/MM/AAAA', mask: 'date' },
    { name: 'data_termino', label: 'Data de término', placeholder: 'DD/MM/AAAA', mask: 'date' },
    { name: 'status', label: 'Status', required: true, options: CONTRATO_STATUS_OPTIONS },
  ];
}

function formValues(contrato: ContratoAluno): Record<string, string> {
  return {
    aluno_id: contrato.aluno_id ?? '',
    empresa_id: contrato.empresa_id ?? '',
    monthly_value: contrato.monthly_value ? String(contrato.monthly_value) : '',
    carteira_trabalho: contrato.carteira_trabalho ?? '',
    conta_bancaria: contrato.conta_bancaria ?? '',
    carga_horaria: contrato.carga_horaria ?? '6h',
    localizacao_empresa: contrato.localizacao_empresa ?? '',
    email_empresa: contrato.email_empresa ?? '',
    data_inicio: contrato.data_inicio ?? '',
    data_termino: contrato.data_termino ?? '',
    status: contrato.status ?? 'ativo',
  };
}

export default function ContratosScreen() {
  const { t } = useI18n();
  const session = useAuthStore((state) => state.session);
  const { isEmpresa, empresa, empresaId, loading: empresaLoading } = useEmpresaContext();
  const canManage = canManageConnectData(session?.perfil?.tipo);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContratoAluno | null>(null);
  const [search, setSearch] = useState('');
  const [alunoFilter, setAlunoFilter] = useState('all');
  const { options, error: optionsError } = useSelectOptions(contratoOptionLoaders);
  const fields = getFields(options);

  const loadContratos = useCallback(async () => {
    if (isEmpresa && empresaId) return listContratosByEmpresaId(empresaId);
    return connectService.listContratos();
  }, [empresaId, isEmpresa]);

  const { items, loading, submitting, error, createItem, updateItem, deleteItem } =
    useCrudResource<ContratoAluno, Record<string, string>>({
      load: loadContratos,
      create: connectService.createContrato,
      update: connectService.updateContrato,
      remove: connectService.deleteContrato,
    });

  const alunoOptions = useMemo(() => {
    const unique = new Map<string, string>();
    items.forEach((contrato) => {
      if (contrato.aluno_id) {
        unique.set(contrato.aluno_id, contrato.aluno_nome ?? contrato.aluno_id);
      }
    });
    return Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
  }, [items]);

  const filtered = items.filter((item) => {
    const matchesSearch = `${item.aluno_nome ?? ''} ${item.empresa_nome ?? ''} ${item.status ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesAluno = alunoFilter === 'all' || item.aluno_id === alunoFilter;
    return matchesSearch && matchesAluno;
  });

  const screenLoading = loading || (isEmpresa && empresaLoading);

  return (
    <>
      <ModuleScreen
        kicker="SENAI Connect"
        title={isEmpresa ? 'Contratos da empresa' : 'Contratos'}
        description={
          isEmpresa
            ? `Aprendizes vinculados a ${empresa?.nome ?? 'sua empresa'}.`
            : 'Contratos de aprendizagem vinculados às empresas.'
        }
        isLoading={screenLoading}
        actionLabel={canManage ? '+ Novo contrato' : undefined}
        onActionPress={
          canManage
            ? () => {
                setEditing(null);
                setModalOpen(true);
              }
            : undefined
        }
      >
        {isEmpresa && !empresa && !screenLoading ? (
          <FeedbackMessage
            variant="warning"
            message="Não foi possível identificar a empresa vinculada ao seu usuário. Verifique se o e-mail de login corresponde ao cadastro da empresa."
          />
        ) : null}

        <View style={styles.metricGrid}>
          <MetricTile label="Contratos ativos" value={items.filter((i) => i.status === 'ativo').length} accent={connectTheme.accent} icon={<FileCheck2 size={16} color={connectTheme.accent} />} style={styles.metric} />
          <MetricTile
            label={isEmpresa ? 'Aprendizes' : 'Empresas parceiras'}
            value={isEmpresa ? alunoOptions.length : new Set(items.map((i) => i.empresa_id).filter(Boolean)).size}
            accent={colors.blue}
            icon={<BriefcaseBusiness size={16} color={colors.blue} />}
            style={styles.metric}
          />
          <MetricTile label="Pendências" value={items.filter((i) => i.status === 'pendente').length} accent={colors.orange} icon={<FileText size={16} color={colors.orange} />} style={styles.metric} />
        </View>

        <SearchField placeholder={t("Buscar contrato, aluno ou empresa...")} value={search} onChangeText={setSearch} />

        {alunoOptions.length > 0 ? (
          <SurfaceCard title="Filtrar por aprendiz" subtitle="Alunos com contrato ativo na empresa">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              <FilterChip label="Todos" active={alunoFilter === 'all'} onPress={() => setAlunoFilter('all')} />
              {alunoOptions.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  active={alunoFilter === option.value}
                  onPress={() => setAlunoFilter(option.value)}
                />
              ))}
            </ScrollView>
          </SurfaceCard>
        ) : null}

        <SurfaceCard title="Contratos vigentes" subtitle={isEmpresa ? 'Somente leitura' : 'Contratos de aprendizagem'}>
          {error || optionsError ? <FeedbackMessage variant="danger" message={error ?? optionsError ?? ''} /> : null}
          {filtered.length === 0 ? <Text style={styles.empty}>{t("Nenhum contrato encontrado.")}</Text> : null}
          {filtered.map((contrato) => (
            <ListRow
              key={contrato.id}
              title={contrato.aluno_nome ?? contrato.aluno_id ?? 'Aluno não vinculado'}
              subtitle={`${contrato.empresa_nome ?? 'Empresa'} • ${contrato.carga_horaria ?? 'carga não informada'}`}
              badge={contrato.status ?? 'ativo'}
              badgeVariant={contrato.status === 'ativo' ? 'success' : contrato.status === 'pendente' ? 'warning' : 'neutral'}
              meta={contrato.data_termino ?? undefined}
              initials="CT"
              accent={colors.green}
              onEdit={
                canManage
                  ? () => {
                      setEditing(contrato);
                      setModalOpen(true);
                    }
                  : undefined
              }
              onDelete={canManage ? () => deleteItem(contrato.id, contrato.aluno_nome ?? 'contrato') : undefined}
            />
          ))}
        </SurfaceCard>
      </ModuleScreen>

      {canManage ? (
        <CrudModal
          visible={modalOpen}
          title={editing ? 'Editar contrato' : 'Novo contrato'}
          fields={fields}
          initialValues={editing ? formValues(editing) : { carga_horaria: '6h', status: 'ativo' }}
          isSubmitting={submitting}
          submitLabel={editing ? 'Salvar alterações' : 'Salvar contrato'}
          onClose={() => setModalOpen(false)}
          onSubmit={async (values) => {
            if (editing) await updateItem(editing.id, values);
            else await createItem(values);
            setModalOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.filterChip, active ? styles.filterChipActive : null]}
    >
      <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  metric: { width: '48%' },
  filterRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    borderColor: connectTheme.accent,
    backgroundColor: 'rgba(227,6,19,0.08)',
  },
  filterChipText: { color: colors.grayText, fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: connectTheme.accent },
  empty: { color: colors.grayText, fontSize: 12, fontWeight: '700' },
});
