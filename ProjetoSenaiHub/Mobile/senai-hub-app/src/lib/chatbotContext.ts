export type AnalysisSource = 'alunos' | 'professores' | 'turmas' | 'cursos' | 'empresas' | 'frequencias' | 'contratos' | 'salarios' | 'chamados' | 'tarefas' | 'estoque' | 'usuarios' | 'autorizacoes';
export type PageAnalysis = {
  datasets?: Partial<Record<AnalysisSource, readonly { id: string }[]>>;
  filters?: Record<string, string | number | boolean | null | undefined>;
  limitations?: string[];
  error?: string | null;
};
export type AnalysisContext = {
  version: 1;
  route: string;
  title: string;
  captured_at: string;
  loading: boolean;
  filters: Record<string, string | number | boolean | null>;
  datasets: { source: AnalysisSource; ids: string[]; loaded_count: number; truncated: boolean; revision: string }[];
  limitations: string[];
  fingerprint: string;
};

export function contextFingerprint(value: unknown) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16);
}

// Only identifiers cross the network. Values are retrieved again by the authenticated backend.
export function buildAnalysisContext(route: string, title: string, analysis: PageAnalysis = {}, loading = false): AnalysisContext {
  const filters = Object.fromEntries(Object.entries(analysis.filters ?? {}).filter(([, value]) => value !== undefined));
  const datasets = Object.entries(analysis.datasets ?? {}).map(([source, rows]) => {
    const ids = [...new Set((rows ?? []).map((row) => row.id).filter(Boolean))].sort();
    return { revision: contextFingerprint(rows), source: source as AnalysisSource, ids: ids.slice(0, 300), loaded_count: ids.length, truncated: ids.length > 300 };
  });
  const limitations = [
    'Recorte dos registros carregados na tela; não representa necessariamente todo o banco.',
    ...(analysis.limitations ?? []),
    ...(analysis.error ? ['A tela informou falha de carregamento; os dados podem estar incompletos.'] : []),
  ];
  const body = { route, title, filters: filters as AnalysisContext['filters'], datasets, loading, limitations };
  return { version: 1, ...body, captured_at: new Date().toISOString(), fingerprint: contextFingerprint(body) };
}

export function getAnalysisSuggestions(context: AnalysisContext | null): string[] {
  if (!context || context.loading || !context.datasets.some((dataset) => dataset.ids.length)) return [];
  return ['Analisar esta página com evidências', 'Identificar gargalos e oportunidades', 'Criar plano de melhoria priorizado'];
}
