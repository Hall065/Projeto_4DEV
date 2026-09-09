import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MapPin, Navigation, Search, Users } from 'lucide-react-native';
import { AppButton, FeedbackMessage, ListRow, LoadingState, MetricTile, SearchField, SurfaceCard } from '@/components/common/VisualPrimitives';
import { AdvancedFilterPanel, FilterChoice } from '@/components/common/AdvancedFilters';
import { CampusMap3DContainer } from '@/components/maps/CampusMap3D';
import { ModuleScreen } from '@/components/screens/ModuleScreen';
import { colors, connectTheme } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { isProfessorRole } from '@/lib/permissions';
import { connectService } from '@/services/connect.service';
import { useAuthStore } from '@/stores/auth.store';
import type { CampusPersonLegendItem, CampusPersonLocation } from '@/types/campusPeople';
import type { Aluno, LocalizacaoAluno, Turma } from '@/types/connect.types';
import { useI18n } from '@/hooks/useI18n';

type Tab = 'turmas' | 'alunos';
const EMPTY_FILTERS = { alunoId: '', turmaId: '', cursoId: '', emAula: '', perimetro: '' };
const LOCATION_LEGEND: CampusPersonLegendItem[] = [
  { label: 'Em aula', color: colors.blue },
  { label: 'No campus', color: colors.green },
  { label: 'Fora do perimetro', color: colors.red },
  { label: 'Sem informacao', color: colors.orange },
];

const makeChannelName = (prefix: string, id: string) =>
  `${prefix}-${id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function locationMarkerColor(location: LocalizacaoAluno) {
  const perimeter = location.dentro_do_senai ?? location.dentro_perimetro;
  if (perimeter === false) return colors.red;
  if (perimeter == null) return colors.orange;
  return location.em_aula === true ? colors.blue : colors.green;
}

export default function LocalizacaoScreen() {
  const { t } = useI18n();
  const session = useAuthStore((s) => s.session);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('turmas');
  const [search, setSearch] = useState('');
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [localizacoes, setLocalizacoes] = useState<LocalizacaoAluno[]>([]);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string | null>(null);
  const [selectedAlunoId, setSelectedAlunoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    const isProfessor = isProfessorRole(session?.perfil?.tipo);
    const turmasData = isProfessor && session?.userId
      ? await connectService.listTurmasForProfessorUser(session.userId)
      : await connectService.listTurmas();
    const alunosData = isProfessor
      ? (await Promise.all(turmasData.map((turma) => connectService.listAlunosByTurma(turma.id)))).flat()
      : await connectService.listAlunos();
    const localizacoesData = await connectService.listLocalizacoes();
    const alunoIds = new Set(alunosData.map((aluno) => aluno.id));
    setTurmas(turmasData);
    setAlunos(alunosData);
    setLocalizacoes(isProfessor ? localizacoesData.filter((item) => alunoIds.has(item.aluno_id)) : localizacoesData);
  }, [session?.perfil?.tipo, session?.userId]);

  useEffect(() => {
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : 'Nao foi possivel carregar localizacoes.'))
      .finally(() => setLoading(false));
  }, [reload]);

  useEffect(() => {
    if (!selectedAlunoId) return undefined;
    const channel = supabase.channel(makeChannelName('connect-localizacao', selectedAlunoId));

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'connect',
        table: 'localizacoes_alunos',
        filter: `aluno_id=eq.${selectedAlunoId}`,
      },
      () => reload().catch(() => undefined)
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload, selectedAlunoId]);

  const realLocations = useMemo(
    () => localizacoes.filter((item) =>
      item.latitude != null && item.longitude != null &&
      Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude))
    ),
    [localizacoes]
  );
  const filteredLocations = useMemo(
    () => realLocations.filter((item) => {
      const perimeter = item.dentro_do_senai ?? item.dentro_perimetro;
      return (!appliedFilters.alunoId || item.aluno_id === appliedFilters.alunoId) &&
        (!appliedFilters.turmaId || item.turma_id === appliedFilters.turmaId) &&
        (!appliedFilters.cursoId || item.curso_id === appliedFilters.cursoId) &&
        (!appliedFilters.emAula || (appliedFilters.emAula === 'sim' ? item.em_aula === true : appliedFilters.emAula === 'nao' ? item.em_aula === false : item.em_aula == null)) &&
        (!appliedFilters.perimetro || (appliedFilters.perimetro === 'dentro' ? perimeter === true : appliedFilters.perimetro === 'fora' ? perimeter === false : perimeter == null));
    }),
    [appliedFilters, realLocations]
  );
  const locationByAluno = useMemo(
    () => new Map(realLocations.map((item) => [item.aluno_id, item])),
    [realLocations]
  );
  const filteredLocationIds = useMemo(
    () => new Set(filteredLocations.map((item) => item.aluno_id)),
    [filteredLocations]
  );
  const filteredTurmas = turmas.filter((turma) =>
    `${turma.nome} ${turma.curso_nome ?? ''} ${turma.periodo ?? ''}`.toLowerCase().includes(search.toLowerCase()) &&
    (!appliedFilters.turmaId || turma.id === appliedFilters.turmaId) &&
    (!appliedFilters.cursoId || turma.curso_id === appliedFilters.cursoId)
  );
  const filteredAlunos = alunos.filter((aluno) => {
    const requiresLocation = Boolean(appliedFilters.emAula || appliedFilters.perimetro);
    const inTurma = selectedTurmaId ? aluno.turma_id === selectedTurmaId : true;
    return inTurma &&
      (!appliedFilters.alunoId || aluno.id === appliedFilters.alunoId) &&
      (!appliedFilters.turmaId || aluno.turma_id === appliedFilters.turmaId) &&
      (!appliedFilters.cursoId || aluno.curso_id === appliedFilters.cursoId) &&
      (!requiresLocation || filteredLocationIds.has(aluno.id)) &&
      `${aluno.nome} ${aluno.email ?? ''} ${aluno.turma_nome ?? ''}`.toLowerCase().includes(search.toLowerCase());
  });
  const selectedLocation = filteredLocations.find((item) => item.aluno_id === selectedAlunoId) ?? null;
  const noCampus = filteredLocations.filter((item) => (item.dentro_do_senai ?? item.dentro_perimetro) === true).length;
  const outsideCampus = filteredLocations.filter((item) => (item.dentro_do_senai ?? item.dentro_perimetro) === false).length;
  const alunoOptions = Array.from(new Map(realLocations.map((item) => [item.aluno_id, item.aluno_nome ?? item.aluno_id])).entries()).map(([value, label]) => ({ value, label }));
  const turmaOptions = Array.from(new Map(realLocations.filter((item) => item.turma_id).map((item) => [item.turma_id as string, item.turma_nome ?? item.turma_id as string])).entries()).map(([value, label]) => ({ value, label }));
  const cursoOptions = Array.from(new Map(realLocations.filter((item) => item.curso_id).map((item) => [item.curso_id as string, item.curso_nome ?? item.curso_id as string])).entries()).map(([value, label]) => ({ value, label }));
  const campusPeople = useMemo<CampusPersonLocation[]>(
    () => filteredLocations.map((location) => ({
      id: `student-${location.aluno_id}`,
      name: location.aluno_nome ?? location.aluno_id,
      role: 'aluno',
      geo: {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        accuracyMeters: location.precisao_metros,
      },
      markerColor: locationMarkerColor(location),
      detail: [
        location.turma_nome,
        location.curso_nome,
        location.em_aula === true
          ? 'Em aula'
          : location.em_aula === false
            ? 'Fora de aula'
            : 'Status de aula desconhecido',
      ].filter(Boolean).join(' - '),
    })),
    [filteredLocations]
  );

  const handleMapPersonSelect = useCallback((personId: string | null) => {
    if (!personId?.startsWith('student-')) {
      setSelectedAlunoId(null);
      return;
    }
    setSelectedAlunoId(personId.slice('student-'.length));
  }, []);

  useEffect(() => {
    if (selectedAlunoId && !filteredLocationIds.has(selectedAlunoId)) setSelectedAlunoId(null);
  }, [filteredLocationIds, selectedAlunoId]);

  if (loading) return <LoadingState />;

  return (
    <ModuleScreen
      analysis={{ datasets: { alunos: selectedAlunoId ? filteredAlunos.filter((item) => item.id === selectedAlunoId) : filteredAlunos, turmas: selectedTurmaId ? filteredTurmas.filter((item) => item.id === selectedTurmaId) : filteredTurmas }, filters: { search, ...appliedFilters, tab, selectedAlunoId, selectedTurmaId }, limitations: ['Coordenadas e presença em tempo real não são enviadas nem validadas por esta análise.'], error }}
      kicker="SENAI Connect"
      title="Localizacao"
      description="Monitoramento por turma, aluno e geofence."
      isLoading={false}
    >
      <View style={styles.metricGrid}>
        <MetricTile label="Alunos localizados" value={filteredLocations.length} accent={connectTheme.accent} icon={<Users size={16} color={connectTheme.accent} />} style={styles.metric} />
        <MetricTile label="No campus" value={noCampus} accent={colors.green} icon={<Navigation size={16} color={colors.green} />} style={styles.metric} />
        <MetricTile label="Fora" value={outsideCampus} accent={colors.red} icon={<MapPin size={16} color={colors.red} />} style={styles.metric} />
      </View>

      {error ? <FeedbackMessage variant="danger" message={error} /> : null}
      {localizacoes.length > realLocations.length ? (
        <FeedbackMessage variant="warning" message={`${localizacoes.length - realLocations.length} registro(s) sem coordenadas reais nao foram exibidos no mapa.`} />
      ) : null}

      <AdvancedFilterPanel
        resultCount={filteredLocations.length}
        activeCount={Object.values(appliedFilters).filter(Boolean).length}
        onApply={() => setAppliedFilters(draftFilters)}
        onClear={() => {
          setDraftFilters(EMPTY_FILTERS);
          setAppliedFilters(EMPTY_FILTERS);
          setSelectedTurmaId(null);
        }}
      >
        <FilterChoice label="Aluno" value={draftFilters.alunoId} options={alunoOptions} onChange={(alunoId) => setDraftFilters((current) => ({ ...current, alunoId }))} />
        <FilterChoice label="Turma" value={draftFilters.turmaId} options={turmaOptions} onChange={(turmaId) => setDraftFilters((current) => ({ ...current, turmaId }))} />
        <FilterChoice label="Curso" value={draftFilters.cursoId} options={cursoOptions} onChange={(cursoId) => setDraftFilters((current) => ({ ...current, cursoId }))} />
        <FilterChoice label="Status em aula" value={draftFilters.emAula} options={[{ value: 'sim', label: 'Em aula' }, { value: 'nao', label: 'Fora de aula' }, { value: 'sem_info', label: 'Sem informacao' }]} onChange={(emAula) => setDraftFilters((current) => ({ ...current, emAula }))} />
        <FilterChoice label="Perimetro" value={draftFilters.perimetro} options={[{ value: 'dentro', label: 'Dentro' }, { value: 'fora', label: 'Fora' }, { value: 'sem_info', label: 'Sem informacao' }]} onChange={(perimetro) => setDraftFilters((current) => ({ ...current, perimetro }))} />
      </AdvancedFilterPanel>

      <View style={styles.layout}>
        <SurfaceCard title="Lista" subtitle="Turmas e alunos">
          <View style={styles.tabs}>
            <AppButton label="Turmas" variant={tab === 'turmas' ? 'primary' : 'secondary'} accent={connectTheme.accent} onPress={() => setTab('turmas')} wrapperStyle={styles.tab} />
            <AppButton label="Alunos" variant={tab === 'alunos' ? 'primary' : 'secondary'} accent={connectTheme.accent} onPress={() => setTab('alunos')} wrapperStyle={styles.tab} />
          </View>
          <SearchField placeholder={t("Buscar turmas ou alunos...")} value={search} onChangeText={setSearch} />

          <ScrollView style={styles.listPanel} nestedScrollEnabled>
            {tab === 'turmas'
              ? filteredTurmas.map((turma) => (
                  <ListRow
                    key={turma.id}
                    title={turma.nome}
                    subtitle={`${alunos.filter((aluno) => aluno.turma_id === turma.id).length} alunos vinculados - ${turma.curso_nome ?? 'Curso não vinculado'}`}
                    badge={selectedTurmaId === turma.id ? 'Selecionada' : turma.status}
                    badgeVariant={selectedTurmaId === turma.id ? 'info' : turma.status === 'ativa' ? 'success' : 'neutral'}
                    initials={turma.nome.slice(0, 2).toUpperCase()}
                    accent={colors.blue}
                    onPress={() => {
                      setSelectedTurmaId((current) => (current === turma.id ? null : turma.id));
                      setTab('alunos');
                    }}
                  />
                ))
              : filteredAlunos.map((aluno) => {
                  const loc = locationByAluno.get(aluno.id);
                  const perimeter = loc?.dentro_do_senai ?? loc?.dentro_perimetro;
                  const inside = perimeter === true;
                  return (
                    <View key={aluno.id} style={styles.alunoBlock}>
                      <ListRow
                        title={aluno.nome}
                        subtitle={`${aluno.email_institucional ?? aluno.email ?? 'Sem e-mail'} - ${loc?.em_aula === true ? 'Em aula' : loc?.em_aula === false ? 'Fora de aula' : 'Status de aula desconhecido'}`}
                        badge={perimeter === true ? 'Dentro' : perimeter === false ? 'Fora' : 'Sem localizacao'}
                        badgeVariant={perimeter === true ? 'success' : perimeter === false ? 'danger' : 'neutral'}
                        initials={aluno.nome.slice(0, 2).toUpperCase()}
                        imageUri={aluno.foto_url}
                        accent={inside ? colors.green : colors.red}
                      />
                      <AppButton
                        label="Ver localizacao"
                        variant="secondary"
                        accent={inside ? connectTheme.accent : colors.grayText}
                        icon={<Search size={15} color={inside ? connectTheme.accent : colors.grayText} />}
                        disabled={!loc}
                        onPress={() => setSelectedAlunoId(aluno.id)}
                      />
                    </View>
                  );
                })}
          </ScrollView>
        </SurfaceCard>

        <SurfaceCard title="Mapa 3D do campus" subtitle="Blocos GLB A, B, C e D montados com localizacoes reais filtradas">
          <CampusMap3DContainer
            people={campusPeople}
            personLegend={LOCATION_LEGEND}
            highlightPersonId={selectedAlunoId ? `student-${selectedAlunoId}` : null}
            onSelectPerson={handleMapPersonSelect}
            moduleLabel="SENAI Connect - localizacoes reais"
            minHeight={520}
            fallback={(
              <FeedbackMessage
                variant="danger"
                message="O dispositivo nao conseguiu iniciar o renderizador 3D. Nenhuma imagem ou localizacao simulada foi usada como substituta."
              />
            )}
          />
          <FeedbackMessage
            variant="info"
            message="Os pontos usam latitude e longitude reais. A projecao no modelo e aproximada pelo centro e raio configurados do campus, pois os GLBs ainda nao possuem pontos de georreferenciamento calibrados."
          />
          {selectedLocation ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>{selectedLocation.aluno_nome ?? selectedLocation.aluno_id}</Text>
              <Text style={styles.infoText}>{selectedLocation.turma_nome ?? t("Turma nao vinculada")}</Text>
              <Text style={styles.infoText}>
                {(selectedLocation.dentro_do_senai ?? selectedLocation.dentro_perimetro) === true
                  ? t("Dentro do perimetro")
                  : (selectedLocation.dentro_do_senai ?? selectedLocation.dentro_perimetro) === false
                    ? t("Fora do perimetro")
                    : t("Perimetro sem informacao")}
              </Text>
              <Text style={styles.infoText}>
                {t("Latitude")}{' '}{Number(selectedLocation.latitude).toFixed(6)} {' '}{t("- Longitude")}{' '}{Number(selectedLocation.longitude).toFixed(6)}
              </Text>
              {selectedLocation.precisao_metros != null ? (
                <Text style={styles.infoText}>{t("Precisao informada:")}{' '}{selectedLocation.precisao_metros} m</Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.empty}>{t("Selecione no mapa ou na lista um aluno com coordenadas reais.")}</Text>
          )}
        </SurfaceCard>
      </View>
    </ModuleScreen>
  );
}

const styles = StyleSheet.create({
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  metric: { width: '48%' },
  layout: { gap: 12 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tab: { flex: 1 },
  listPanel: { maxHeight: 440 },
  alunoBlock: { marginBottom: 10 },
  infoCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 12,
  },
  infoTitle: { color: colors.navy, fontSize: 14, fontWeight: '900' },
  infoText: { color: colors.grayText, fontSize: 12, fontWeight: '700', marginTop: 4 },
  empty: { color: colors.grayText, fontSize: 12, fontWeight: '700' },
});
