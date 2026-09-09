import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { BookOpen, Clock3, Layers } from 'lucide-react-native';
import { ChartCard, InteractiveBarChart } from '@/components/charts';
import { CrudModal, type CrudField } from '@/components/common/CrudModal';
import { AdvancedFilterPanel, FilterChoice } from '@/components/common/AdvancedFilters';
import { MetricGrid } from '@/components/common/MetricGrid';
import { FeedbackMessage, ListRow, MetricTile, SurfaceCard } from '@/components/common/VisualPrimitives';
import { ModuleScreen } from '@/components/screens/ModuleScreen';
import { colors, connectTheme } from '@/constants/colors';
import { CURSO_MODALIDADE_OPTIONS, PERIODO_OPTIONS, USER_STATUS_OPTIONS } from '@/constants/form-options';
import { useCrudResource } from '@/hooks/useCrudResource';
import { connectService } from '@/services/connect.service';
import type { Curso } from '@/types/connect.types';
import { useI18n } from '@/hooks/useI18n';

const fields: CrudField[] = [
  { name: 'nome', label: 'Nome do curso', required: true },
  { name: 'descricao', label: 'Descricao', multiline: true },
  { name: 'modalidade', label: 'Modalidade', required: true, options: CURSO_MODALIDADE_OPTIONS },
  { name: 'periodo', label: 'Periodo', required: true, options: PERIODO_OPTIONS },
  { name: 'carga_horaria', label: 'Carga horaria', keyboardType: 'numeric', mask: 'integer' },
  { name: 'data_inicio', label: 'Data de inicio', placeholder: 'DD/MM/AAAA', mask: 'date' },
  { name: 'data_termino', label: 'Data de termino', placeholder: 'DD/MM/AAAA', mask: 'date' },
  { name: 'status', label: 'Status', required: true, options: USER_STATUS_OPTIONS },
];

function formValues(curso: Curso): Record<string, string> {
  return {
    nome: curso.nome ?? '',
    descricao: curso.descricao ?? '',
    modalidade: curso.modalidade ?? 'tecnico',
    periodo: curso.periodo ?? 'manha',
    carga_horaria: curso.carga_horaria ? String(curso.carga_horaria) : '',
    data_inicio: curso.data_inicio ?? '',
    data_termino: curso.data_termino ?? '',
    status: curso.status ?? 'ativo',
  };
}

export default function CursosScreen() {
  const { t } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Curso | null>(null);
  const [draftFilters, setDraftFilters] = useState({ status: '', modalidade: '', periodo: '' });
  const [appliedFilters, setAppliedFilters] = useState(draftFilters);
  const { items, loading, submitting, error, createItem, updateItem, deleteItem } =
    useCrudResource<Curso, Record<string, string>>({
      load: connectService.listCursos,
      create: connectService.createCurso,
      update: connectService.updateCurso,
      remove: connectService.deleteCurso,
    });
  const filteredItems = items.filter((curso) =>
    (!appliedFilters.status || curso.status === appliedFilters.status) &&
    (!appliedFilters.modalidade || curso.modalidade === appliedFilters.modalidade) &&
    (!appliedFilters.periodo || curso.periodo === appliedFilters.periodo)
  );
  const cursosPorPeriodo = [
    { label: 'Manha', value: filteredItems.filter((c) => c.periodo === 'manha').length, color: colors.blue },
    { label: 'Tarde', value: filteredItems.filter((c) => c.periodo === 'tarde').length, color: connectTheme.accent },
    { label: 'Noite', value: filteredItems.filter((c) => c.periodo === 'noite').length, color: colors.orange },
    { label: 'Integral', value: filteredItems.filter((c) => c.periodo === 'integral').length, color: colors.green },
  ];

  return (
    <>
      <ModuleScreen
      analysis={{ datasets: { cursos: filteredItems }, filters: { ...appliedFilters }, error }}
        kicker="SENAI Connect"
        title="Cursos"
        description="Catalogo de cursos, carga horaria e turmas vinculadas."
        isLoading={loading}
        actionLabel="+ Novo curso"
        onActionPress={() => {
          setEditing(null);
          setModalOpen(true);
        }}
      >
        <MetricGrid>
          <MetricTile label="Cursos ativos" value={items.filter((c) => c.status === 'ativo').length} accent={connectTheme.accent} icon={<BookOpen size={16} color={connectTheme.accent} />} />
          <MetricTile label="Periodos" value={new Set(items.map((c) => c.periodo).filter(Boolean)).size} accent={colors.blue} icon={<Layers size={16} color={colors.blue} />} />
          <MetricTile label="Carga media" value={items.length ? Math.round(items.reduce((sum, c) => sum + (c.carga_horaria ?? 0), 0) / items.length) : 0} accent={colors.orange} icon={<Clock3 size={16} color={colors.orange} />} />
        </MetricGrid>

        <AdvancedFilterPanel
          resultCount={filteredItems.length}
          activeCount={Object.values(appliedFilters).filter(Boolean).length}
          onApply={() => setAppliedFilters(draftFilters)}
          onClear={() => {
            const cleared = { status: '', modalidade: '', periodo: '' };
            setDraftFilters(cleared);
            setAppliedFilters(cleared);
          }}
        >
          <FilterChoice label="Status" value={draftFilters.status} options={USER_STATUS_OPTIONS} onChange={(status) => setDraftFilters((current) => ({ ...current, status }))} />
          <FilterChoice label="Modalidade" value={draftFilters.modalidade} options={CURSO_MODALIDADE_OPTIONS} onChange={(modalidade) => setDraftFilters((current) => ({ ...current, modalidade }))} />
          <FilterChoice label="Periodo" value={draftFilters.periodo} options={PERIODO_OPTIONS} onChange={(periodo) => setDraftFilters((current) => ({ ...current, periodo }))} />
        </AdvancedFilterPanel>

        <ChartCard
          title="Cursos por periodo"
          subtitle="Distribuicao do catalogo atual"
          empty={filteredItems.length === 0}
          summary={`${filteredItems.length} cursos nos filtros atuais`}
        >
          <InteractiveBarChart data={cursosPorPeriodo} />
        </ChartCard>

        <SurfaceCard title="Catalogo" subtitle="Cursos cadastrados">
          {error ? <FeedbackMessage variant="danger" message={error} /> : null}
          {filteredItems.length === 0 ? <Text style={styles.empty}>{t("Nenhum curso encontrado.")}</Text> : null}
          {filteredItems.map((curso) => (
            <ListRow
              key={curso.id}
              title={curso.nome}
              subtitle={`${curso.periodo ?? 'periodo nao informado'} - ${curso.carga_horaria ?? 0}h`}
              badge={curso.status}
              badgeVariant={curso.status === 'ativo' ? 'success' : 'neutral'}
              initials={curso.nome.slice(0, 2).toUpperCase()}
              accent={colors.blue}
              onEdit={() => {
                setEditing(curso);
                setModalOpen(true);
              }}
              onDelete={() => deleteItem(curso.id, curso.nome)}
            />
          ))}
        </SurfaceCard>
      </ModuleScreen>

      <CrudModal
        visible={modalOpen}
        title={editing ? 'Editar curso' : 'Novo curso'}
        fields={fields}
        initialValues={editing ? formValues(editing) : { modalidade: 'tecnico', periodo: 'manha', status: 'ativo' }}
        isSubmitting={submitting}
        submitLabel={editing ? 'Salvar alteracoes' : 'Criar curso'}
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
  empty: { color: colors.grayText, fontSize: 12, fontWeight: '700' },
});
