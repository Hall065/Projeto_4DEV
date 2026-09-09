import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Download, FileText, TrendingUp, Users } from 'lucide-react-native';
import { ChartCard, InteractiveBarChart } from '@/components/charts';
import { ExportModal } from '@/components/common/ExportModal';
import { AdvancedFilterPanel, FilterChoice, FilterTextField } from '@/components/common/AdvancedFilters';
import { MetricGrid } from '@/components/common/MetricGrid';
import { FeedbackMessage, ListRow, MetricTile, ProgressBar, SurfaceCard } from '@/components/common/VisualPrimitives';
import { ModuleScreen } from '@/components/screens/ModuleScreen';
import { colors, connectTheme } from '@/constants/colors';
import { FREQUENCIA_STATUS_OPTIONS } from '@/constants/form-options';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';
import { listFrequenciasByEmpresaId } from '@/services/empresa.service';
import { connectService } from '@/services/connect.service';
import { exportService } from '@/services/export.service';
import { useAuthStore } from '@/stores/auth.store';
import type { FrequenciaRegistro } from '@/types/connect.types';
import { normalizeDateToIso } from '@/utils/formatters';
import { useI18n } from '@/hooks/useI18n';

function normalizeAttendanceStatus(status: FrequenciaRegistro['status']) {
  if (status === 'P') return 'presente';
  if (status === 'FJ') return 'falta_justificada';
  if (status === 'FI') return 'falta_injustificada';
  return status;
}

function validIsoDate(value: string) {
  const normalized = normalizeDateToIso(value);
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(normalized)) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10) === normalized ? normalized : null;
}

export default function GerenciarFrequenciaScreen() {
  const { t } = useI18n();
  const session = useAuthStore((s) => s.session);
  const { isEmpresa, empresa, empresaId, loading: empresaLoading } = useEmpresaContext();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FrequenciaRegistro[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const emptyFilters = { alunoId: '', status: '', turmaId: '', from: '', to: '' };
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [filterError, setFilterError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!session?.userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        if (isEmpresa && empresaId) {
          setItems(await listFrequenciasByEmpresaId(empresaId));
          return;
        }

        const frequencias = await connectService.listFrequencias();
        if (session.perfil?.tipo !== 'professor') {
          setItems(frequencias);
          return;
        }
        const turmas = await connectService.listTurmasForProfessorUser(session.userId);
        const turmaIds = new Set(turmas.map((turma) => turma.id));
        setItems(frequencias.filter((item) => item.turma_id && turmaIds.has(item.turma_id)));
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [empresaId, isEmpresa, session?.perfil?.tipo, session?.userId]);

  const alunoOptions = useMemo(() => {
    const unique = new Map<string, string>();
    items.forEach((item) => {
      if (item.aluno_id) unique.set(item.aluno_id, item.aluno_nome ?? item.aluno_id);
    });
    return Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
  }, [items]);

  const turmaOptions = useMemo(() => {
    const unique = new Map<string, string>();
    items.forEach((item) => {
      if (item.turma_id) unique.set(item.turma_id, item.turma_nome ?? item.turma_id);
    });
    return Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
  }, [items]);

  const filteredItems = items.filter((item) => {
    const itemDate = normalizeDateToIso(item.data_aula ?? item.data ?? '').slice(0, 10);
    return (!appliedFilters.alunoId || item.aluno_id === appliedFilters.alunoId) &&
      (!appliedFilters.status || normalizeAttendanceStatus(item.status) === appliedFilters.status) &&
      (!appliedFilters.turmaId || item.turma_id === appliedFilters.turmaId) &&
      (!appliedFilters.from || itemDate >= appliedFilters.from) &&
      (!appliedFilters.to || itemDate <= appliedFilters.to);
  });
  const presentes = filteredItems.filter((item) => normalizeAttendanceStatus(item.status) === 'presente').length;
  const faltas = filteredItems.length - presentes;
  const presenca = filteredItems.length ? Math.round((presentes / filteredItems.length) * 100) : 0;
  const screenLoading = loading || (isEmpresa && empresaLoading);
  const applyFilters = () => {
    const from = draftFilters.from ? validIsoDate(draftFilters.from) : '';
    const to = draftFilters.to ? validIsoDate(draftFilters.to) : '';
    if ((draftFilters.from && !from) || (draftFilters.to && !to)) {
      setFilterError('Use uma data valida em DD/MM/AAAA ou AAAA-MM-DD.');
      return;
    }
    if (from && to && from > to) {
      setFilterError('A data inicial deve ser anterior ou igual a data final.');
      return;
    }
    setFilterError(null);
    setAppliedFilters({ ...draftFilters, from: from ?? '', to: to ?? '' });
  };

  return (
    <ModuleScreen
      analysis={{ datasets: { frequencias: filteredItems }, filters: { ...appliedFilters } }}
      kicker="SENAI Connect"
      title={isEmpresa ? 'Frequencia dos aprendizes' : 'Gerenciar frequencia'}
      description={
        isEmpresa
          ? `Registros de presenca dos aprendizes de ${empresa?.nome ?? 'sua empresa'}.`
          : 'Visualizacao, calculo e exportacao de relatorios.'
      }
      isLoading={screenLoading}
      actionLabel="Exportar"
      onActionPress={() => setExportOpen(true)}
    >
      {isEmpresa && !empresa && !screenLoading ? (
        <FeedbackMessage
          variant="warning"
          message="Nao foi possivel identificar a empresa vinculada ao seu usuario."
        />
      ) : null}

      <MetricGrid>
        <MetricTile label="Registros" value={filteredItems.length} accent={connectTheme.accent} icon={<FileText size={16} color={connectTheme.accent} />} />
        <MetricTile label="Presenca geral" value={`${presenca}%`} accent={colors.green} icon={<TrendingUp size={16} color={colors.green} />} />
        <MetricTile label="Alunos monitorados" value={new Set(filteredItems.map((i) => i.aluno_id)).size} accent={colors.blue} icon={<Users size={16} color={colors.blue} />} />
        <MetricTile label="Faltas" value={faltas} accent={colors.orange} icon={<Download size={16} color={colors.orange} />} />
      </MetricGrid>

      <AdvancedFilterPanel
        resultCount={filteredItems.length}
        activeCount={Object.values(appliedFilters).filter(Boolean).length}
        error={filterError}
        onApply={applyFilters}
        onClear={() => {
          setDraftFilters(emptyFilters);
          setAppliedFilters(emptyFilters);
          setFilterError(null);
        }}
      >
        <FilterChoice label="Aprendiz" value={draftFilters.alunoId} options={alunoOptions} onChange={(alunoId) => setDraftFilters((current) => ({ ...current, alunoId }))} />
        <FilterChoice label="Status" value={draftFilters.status} options={FREQUENCIA_STATUS_OPTIONS} onChange={(status) => setDraftFilters((current) => ({ ...current, status }))} />
        <FilterChoice label="Turma" value={draftFilters.turmaId} options={turmaOptions} onChange={(turmaId) => setDraftFilters((current) => ({ ...current, turmaId }))} />
        <FilterTextField label="Data inicial" value={draftFilters.from} placeholder={t("DD/MM/AAAA")} onChangeText={(from) => setDraftFilters((current) => ({ ...current, from }))} keyboardType="numeric" />
        <FilterTextField label="Data final" value={draftFilters.to} placeholder={t("DD/MM/AAAA")} onChangeText={(to) => setDraftFilters((current) => ({ ...current, to }))} keyboardType="numeric" />
      </AdvancedFilterPanel>

      <ChartCard
        title="Evolucao da frequencia"
        subtitle="Comparativo dos registros reais"
        empty={filteredItems.length === 0}
        summary={`${presenca}% de presenca nos filtros atuais`}
      >
        <InteractiveBarChart
          data={[
            { label: 'Presencas', value: presentes, color: colors.green },
            { label: 'Faltas', value: faltas, color: colors.red },
            { label: 'Total', value: filteredItems.length, color: colors.blue },
          ]}
        />
      </ChartCard>

      <SurfaceCard title="Registros recentes" subtitle="Status de calculo e fechamento">
        {filteredItems.slice(0, 8).map((item) => (
          <ListRow
            key={item.id}
            title={item.aluno_nome ?? item.aluno_id}
            subtitle={`${item.turma_nome ?? 'Turma nao vinculada'} - ${item.data_aula ?? item.data ?? 'sem data'}`}
            badge={item.status}
            badgeVariant={item.status === 'presente' ? 'success' : 'warning'}
            initials="FR"
            accent={item.status === 'presente' ? colors.green : colors.orange}
          />
        ))}
        {filteredItems.length === 0 ? (
          <FeedbackMessage variant="info" message="Nenhum registro de frequencia encontrado para os filtros selecionados." />
        ) : null}
      </SurfaceCard>

      <SurfaceCard title="Indicadores de ausencia" subtitle="Faltas justificadas e injustificadas">
        <View style={styles.progressStack}>
          <ProgressBar value={presenca} accent={colors.green} />
          <ProgressBar value={filteredItems.length ? Math.round((faltas / filteredItems.length) * 100) : 0} accent={colors.red} />
        </View>
      </SurfaceCard>

      <ExportModal
        visible={exportOpen}
        title="Exportar frequencia"
        onClose={() => setExportOpen(false)}
        onPDF={async () => {
          await exportService.exportarPDF(toRows(filteredItems), 'Relatorio de frequencia');
          setExportOpen(false);
        }}
        onExcel={async () => {
          await exportService.exportarExcel(toRows(filteredItems), 'relatorio-frequencia');
          setExportOpen(false);
        }}
      />
    </ModuleScreen>
  );
}

function toRows(items: FrequenciaRegistro[]) {
  return items.map((item) => ({
    aluno: item.aluno_nome ?? item.aluno_id,
    turma: item.turma_nome,
    data: item.data_aula ?? item.data,
    status: item.status,
    aulas_faltadas: item.quantidade_aulas_faltadas ?? 0,
  }));
}

const styles = StyleSheet.create({
  progressStack: { gap: 14, paddingVertical: 8 },
});
