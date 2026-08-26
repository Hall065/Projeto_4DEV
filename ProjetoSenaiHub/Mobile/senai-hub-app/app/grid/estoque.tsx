import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, DollarSign, Package, Warehouse } from 'lucide-react-native';
import { CrudModal, type CrudField, type CrudOption } from '@/components/common/CrudModal';
import { AdvancedFilterPanel, FilterChoice, FilterTextField } from '@/components/common/AdvancedFilters';
import { FeedbackMessage, ListRow, MetricTile, SearchField, SurfaceCard } from '@/components/common/VisualPrimitives';
import { ModuleScreen } from '@/components/screens/ModuleScreen';
import { colors, gridTheme } from '@/constants/colors';
import { ESTOQUE_STATUS_OPTIONS } from '@/constants/form-options';
import { useCrudResource } from '@/hooks/useCrudResource';
import { useSelectOptions } from '@/hooks/useSelectOptions';
import { useThemeColors } from '@/hooks/useThemeColors';
import { gridService } from '@/services/grid.service';
import type { ItemEstoque } from '@/types/grid.types';
import { normalizeDecimalInput } from '@/utils/formatters';

const EMPTY_FILTERS = {
  categoriaId: '',
  fornecedorId: '',
  status: '',
  distribuidora: '',
  localizacao: '',
  custoMin: '',
  custoMax: '',
  quantidadeMin: '',
  quantidadeMax: '',
  estoqueBaixo: '',
};

function normalizeNonNegative(value: string, integer = false) {
  if (!value.trim()) return '';
  const normalized = integer ? value.replace(/\\D/g, '') : normalizeDecimalInput(value);
  const parsed = Number(normalized);
  return normalized && Number.isFinite(parsed) && parsed >= 0 && (!integer || Number.isInteger(parsed))
    ? String(parsed)
    : null;
}

const estoqueOptionLoaders = {
  categorias: gridService.listCategoriaOptions,
  fornecedores: gridService.listFornecedorOptions,
};

type EstoqueOptionKey = keyof typeof estoqueOptionLoaders;
type EstoqueOptions = Record<EstoqueOptionKey, CrudOption[]>;

function getFields(options: Partial<EstoqueOptions>): CrudField[] {
  return [
  { name: 'titulo', label: 'Nome do item', required: true },
  { name: 'descricao', label: 'Descrição', multiline: true, required: true },
  { name: 'categoria_id', label: 'Categoria', options: options.categorias ?? [], emptyOptionLabel: 'Sem categoria' },
  { name: 'fornecedor_id', label: 'Fornecedor', options: options.fornecedores ?? [], emptyOptionLabel: 'Sem fornecedor' },
  { name: 'quantidade_disponivel', label: 'Quantidade disponível', keyboardType: 'numeric', mask: 'integer', required: true },
  { name: 'quantidade_minima', label: 'Quantidade mínima', keyboardType: 'numeric', mask: 'integer' },
  { name: 'unidade', label: 'Unidade (ex: un, m, kg)', placeholder: 'un' },
  { name: 'localizacao', label: 'Localização (Sala/Prateleira)', required: true },
  { name: 'empresa_distribuidora', label: 'Distribuidora' },
  { name: 'custo', label: 'Custo', placeholder: '120,00', keyboardType: 'decimal-pad', mask: 'currency' },
  { name: 'status', label: 'Status', required: true, options: ESTOQUE_STATUS_OPTIONS },
  ];
}

function formValues(item: ItemEstoque): Record<string, string> {
  return {
    titulo: item.titulo ?? '',
    descricao: item.descricao ?? '',
    categoria_id: item.categoria_id ?? '',
    fornecedor_id: item.fornecedor_id ?? '',
    quantidade_disponivel: String(item.quantidade_disponivel ?? 0),
    quantidade_minima: String(item.quantidade_minima ?? 0),
    unidade: item.unidade ?? 'un',
    localizacao: item.localizacao ?? '',
    empresa_distribuidora: item.empresa_distribuidora ?? '',
    custo: item.custo ? String(item.custo) : '0',
    status: item.status ?? 'disponivel',
  };
}

export default function EstoqueScreen() {
  const theme = useThemeColors();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ItemEstoque | null>(null);
  const [search, setSearch] = useState('');
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [filterError, setFilterError] = useState<string | null>(null);
  const { options, error: optionsError } = useSelectOptions(estoqueOptionLoaders);
  const fields = getFields(options);
  const { items, loading, submitting, error, createItem, updateItem, deleteItem } =
    useCrudResource<ItemEstoque, Record<string, string>>({
      load: gridService.listEstoque,
      create: gridService.createEstoque,
      update: gridService.updateEstoque,
      remove: gridService.deleteEstoque,
    });

  const distribuidoraOptions = Array.from(
    new Set(items.map((item) => item.empresa_distribuidora).filter((value): value is string => Boolean(value)))
  ).sort().map((value) => ({ value, label: value }));
  const filtered = items.filter((item) => {
    const lowStock = item.quantidade_disponivel <= item.quantidade_minima;
    const cost = item.custo ?? 0;
    return `${item.titulo} ${item.descricao ?? ''} ${item.categoria_nome ?? ''}`.toLowerCase().includes(search.toLowerCase()) &&
      (!appliedFilters.categoriaId || item.categoria_id === appliedFilters.categoriaId) &&
      (!appliedFilters.fornecedorId || item.fornecedor_id === appliedFilters.fornecedorId) &&
      (!appliedFilters.status || item.status === appliedFilters.status) &&
      (!appliedFilters.distribuidora || item.empresa_distribuidora === appliedFilters.distribuidora) &&
      (!appliedFilters.localizacao || item.localizacao.toLowerCase().includes(appliedFilters.localizacao.toLowerCase())) &&
      (!appliedFilters.custoMin || cost >= Number(appliedFilters.custoMin)) &&
      (!appliedFilters.custoMax || cost <= Number(appliedFilters.custoMax)) &&
      (!appliedFilters.quantidadeMin || item.quantidade_disponivel >= Number(appliedFilters.quantidadeMin)) &&
      (!appliedFilters.quantidadeMax || item.quantidade_disponivel <= Number(appliedFilters.quantidadeMax)) &&
      (!appliedFilters.estoqueBaixo || (appliedFilters.estoqueBaixo === 'sim' ? lowStock : !lowStock));
  });
  const totalValue = items.reduce((sum, item) => sum + item.quantidade_disponivel * (item.custo ?? 0), 0);
  const applyFilters = () => {
    const custoMin = normalizeNonNegative(draftFilters.custoMin);
    const custoMax = normalizeNonNegative(draftFilters.custoMax);
    const quantidadeMin = normalizeNonNegative(draftFilters.quantidadeMin, true);
    const quantidadeMax = normalizeNonNegative(draftFilters.quantidadeMax, true);
    if ([custoMin, custoMax, quantidadeMin, quantidadeMax].some((value) => value === null)) {
      setFilterError('Informe custos e quantidades com valores numericos nao negativos.');
      return;
    }
    if ((custoMin && custoMax && Number(custoMin) > Number(custoMax)) ||
        (quantidadeMin && quantidadeMax && Number(quantidadeMin) > Number(quantidadeMax))) {
      setFilterError('O valor minimo deve ser menor ou igual ao valor maximo.');
      return;
    }
    setFilterError(null);
    setAppliedFilters({
      ...draftFilters,
      custoMin: custoMin ?? '',
      custoMax: custoMax ?? '',
      quantidadeMin: quantidadeMin ?? '',
      quantidadeMax: quantidadeMax ?? '',
    });
  };

  return (
    <>
      <ModuleScreen
        kicker="SENAI Grid"
        title="Estoque"
        description="Controle de itens, reservas e movimentações."
        isLoading={loading}
        actionLabel="+ Adicionar item"
        onActionPress={() => {
          setEditing(null);
          setModalOpen(true);
        }}
      >
        <View style={styles.metricGrid}>
          <MetricTile label="Total de itens" value={items.length} accent={gridTheme.accent} icon={<Package size={16} color={gridTheme.accent} />} style={styles.metric} />
          <MetricTile label="Valor em estoque" value={`R$ ${Math.round(totalValue).toLocaleString('pt-BR')}`} accent={colors.blue} icon={<DollarSign size={16} color={colors.blue} />} style={styles.metric} />
          <MetricTile label="Indisponiveis" value={items.filter((i) => i.status === 'indisponivel').length} accent={colors.red} icon={<AlertTriangle size={16} color={colors.red} />} style={styles.metric} />
          <MetricTile label="Distribuidoras" value={new Set(items.map(i => i.empresa_distribuidora).filter(Boolean)).size} accent={colors.purple} icon={<Warehouse size={16} color={colors.purple} />} style={styles.metric} />
        </View>

        <SearchField placeholder="Buscar por item, código ou categoria..." value={search} onChangeText={setSearch} />

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
          <FilterChoice label="Categoria" value={draftFilters.categoriaId} options={options.categorias ?? []} onChange={(categoriaId) => setDraftFilters((current) => ({ ...current, categoriaId }))} />
          <FilterChoice label="Fornecedor" value={draftFilters.fornecedorId} options={options.fornecedores ?? []} onChange={(fornecedorId) => setDraftFilters((current) => ({ ...current, fornecedorId }))} />
          <FilterChoice label="Status" value={draftFilters.status} options={ESTOQUE_STATUS_OPTIONS} onChange={(status) => setDraftFilters((current) => ({ ...current, status }))} />
          <FilterChoice label="Distribuidora" value={draftFilters.distribuidora} options={distribuidoraOptions} onChange={(distribuidora) => setDraftFilters((current) => ({ ...current, distribuidora }))} />
          <FilterChoice label="Estoque baixo" value={draftFilters.estoqueBaixo} options={[{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Nao' }]} onChange={(estoqueBaixo) => setDraftFilters((current) => ({ ...current, estoqueBaixo }))} />
          <FilterTextField label="Localizacao contem" value={draftFilters.localizacao} placeholder="Sala ou prateleira" onChangeText={(localizacao) => setDraftFilters((current) => ({ ...current, localizacao }))} />
          <FilterTextField label="Custo minimo" value={draftFilters.custoMin} placeholder="0,00" keyboardType="decimal-pad" onChangeText={(custoMin) => setDraftFilters((current) => ({ ...current, custoMin }))} />
          <FilterTextField label="Custo maximo" value={draftFilters.custoMax} placeholder="0,00" keyboardType="decimal-pad" onChangeText={(custoMax) => setDraftFilters((current) => ({ ...current, custoMax }))} />
          <FilterTextField label="Quantidade minima" value={draftFilters.quantidadeMin} placeholder="0" keyboardType="numeric" onChangeText={(quantidadeMin) => setDraftFilters((current) => ({ ...current, quantidadeMin }))} />
          <FilterTextField label="Quantidade maxima" value={draftFilters.quantidadeMax} placeholder="0" keyboardType="numeric" onChangeText={(quantidadeMax) => setDraftFilters((current) => ({ ...current, quantidadeMax }))} />
        </AdvancedFilterPanel>

        <SurfaceCard title="Itens cadastrados" subtitle="Lista de materiais de manutenção">
          {error || optionsError ? <FeedbackMessage variant="danger" message={error ?? optionsError ?? ''} /> : null}
          {filtered.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textMuted }]}>Nenhum item encontrado.</Text>
          ) : null}
          {filtered.map((item) => (
            <ListRow
              key={item.id}
              title={item.titulo}
              subtitle={`${item.categoria_nome ?? 'Sem categoria'} • ${item.quantidade_disponivel} ${item.unidade} em ${item.localizacao}`}
              badge={item.status}
              badgeVariant={item.status === 'indisponivel' ? 'danger' : 'success'}
              meta={item.custo ? `R$ ${item.custo.toLocaleString('pt-BR')}` : undefined}
              initials={item.titulo.slice(0, 2).toUpperCase()}
              accent={item.status === 'indisponivel' ? colors.red : colors.green}
              onEdit={() => {
                setEditing(item);
                setModalOpen(true);
              }}
              onDelete={() => deleteItem(item.id, item.titulo)}
            />
          ))}
        </SurfaceCard>
      </ModuleScreen>

      <CrudModal
        visible={modalOpen}
        title={editing ? 'Editar item' : 'Adicionar item'}
        fields={fields}
        initialValues={editing ? formValues(editing) : { quantidade_disponivel: '0', quantidade_minima: '0', status: 'disponivel' }}
        isSubmitting={submitting}
        submitLabel={editing ? 'Salvar alterações' : 'Salvar item'}
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
