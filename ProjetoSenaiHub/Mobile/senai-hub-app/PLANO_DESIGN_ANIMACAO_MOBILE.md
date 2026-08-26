# Plano de implementacao - Design e animacao do SENAI Hub Mobile

## Escopo e decisao tecnica

Este plano se aplica somente a Mobile/senai-hub-app. Ele nao altera o portal web, Laravel, chatbot, contratos Supabase, RLS, rotas de negocio ou permissoes.

O plano recebido foi feito para uma aplicacao web e cita shadcn/ui, Radix UI, CSS, hover e sidebar. Essas tecnologias nao devem ser levadas ao aplicativo Expo/React Native:

- shadcn/ui e Radix UI dependem de DOM e nao renderizam Android/iOS;
- CSS, hover e sidebar nao sao as primitivas principais do app mobile;
- Motion para React Web nao substitui a animacao nativa.

O app ja possui a base correta: React Native Animated, react-native-reanimated, Expo Router, react-native-gesture-handler, useMotionPreference, designTokens, useThemeColors e as primitivas em src/components/common/VisualPrimitives.tsx. A modernizacao deve evoluir essa base, sem instalar uma segunda biblioteca de design.

## Estado atual confirmado

- Tema, cores e espacamentos sao centralizados em src/constants/colors.ts e src/constants/designTokens.ts.
- useThemeColors atende claro/escuro e useMotionPreference respeita a preferencia de reduzir movimento.
- AnimatedPressable, AppButton, SurfaceCard, MetricTile, SearchField, LoadingState e FeedbackMessage ja atendem grande parte das telas.
- O layout raiz usa Stack do Expo Router com transicao fade_from_bottom.
- Notificacoes ja usam modal com fade e slide; os mapas ja usam Reanimated.
- Os graficos ApexCharts ja usam reducao de movimento e possuem alternativa acessivel nativa.
- Os modulos reais sao Hub, Connect, Grid e Aluno; Safe e sidebar web nao existem neste aplicativo.

## Objetivo

Entregar uma linguagem visual corporativa e coerente para telefone, tablet e Expo Web, com transicoes discretas e uteis. A animacao deve informar mudanca de estado, navegacao, carregamento ou resultado de uma acao; ela nao deve atrasar tarefas, competir com conteudo ou ocultar erro.

## Execucao realizada

- Foram adicionados tokens de interacao e motion para pressed, disabled, stagger, reveal e modal.
- MotionPrimitives centraliza Reveal, StaggerList, CountUp e skeletons de lista/grafico; todos respeitam useMotionPreference.
- AnimatedPressable, LoadingState, ModuleScreen e MetricGrid passaram a respeitar reduzir movimento e usar a escala de motion compartilhada.
- Hub recebeu entrada escalonada para a apresentacao e os cards de aplicativos; todas as ModuleScreen passaram a revelar cabecalho e conteudo uma unica vez.
- CrudModal, FormBottomSheet, ExportModal e ConfirmDialog respeitam reduzir movimento e tratam o botao voltar do Android.
- Nenhum servico Supabase, permissao, rota de negocio ou arquivo do portal web foi alterado.

Pendencia de validacao manual: conferir em Android e iOS fisicos/simulados a preferencia de reduzir movimento, leitor de tela, fonte aumentada e navegacao por teclado no Expo Web.

## Principios obrigatorios

1. Usar somente tokens e cores semanticas. Azul e vermelho institucional para identidade/acao principal; verde para sucesso; amarelo/laranja para alerta; vermelho para erro ou acao destrutiva.
2. Nunca inserir cor, duracao, sombra ou raio novo diretamente em tela sem antes criar ou reutilizar token.
3. Preservar textos i18n, accessibilityLabel, accessibilityRole, foco, alvo minimo de toque de 44 px e suporte a leitor de tela.
4. Toda animacao deve consultar useMotionPreference. Com reducao de movimento ativa, mostrar o estado final imediatamente, sem loop, slide, escala ou stagger.
5. Usar Animated para opacidade, translate e escala simples; usar Reanimated somente para gestos, scroll, drag, layout/transformacoes executadas na UI thread e mapas.
6. Nao animar listas grandes item a item, dados Supabase chegando em tempo real, mapas 3D, WebView dos graficos ou conteudo durante digitacao.
7. Manter Android, iOS e Expo Web funcionais. Toda API nativa precisa de fallback ou validacao no Web.

## Arquitetura alvo

    src/
      constants/
        designTokens.ts                 # espaco, raio, tipografia, sombra e motion
      hooks/
        useThemeColors.ts
        useMotionPreference.ts
      components/
        common/
          VisualPrimitives.tsx          # base existente
          MotionPrimitives.tsx          # novas primitivas reutilizaveis
          SkeletonCard.tsx
        layout/
          AppHeader.tsx
        forms/
          FormBottomSheet.tsx

MotionPrimitives nao deve receber regras de negocio, consultas Supabase ou permissao. Ele deve expor somente composicao visual:

- Reveal: fade mais subida curta ao montar bloco de conteudo;
- StaggerList: revela no maximo 6 filhos visiveis;
- PressScale: a evolucao compatível de AnimatedPressable;
- ModalTransition: fade do fundo e slide curto do conteudo;
- SkeletonPulse: placeholder sem texto enganoso;
- CountUp: opcional para KPI que mudou por acao confirmada, nunca para dado ainda carregando.

## Fase 0 - auditoria e linha de base

1. Catalogar telas por Hub, Connect, Grid, Aluno, autenticacao e perfil.
2. Localizar valores literais de cor, radius, spacing, elevation, duracao e Animated.timing.
3. Registrar tres capturas por tela critica: claro, escuro e fonte aumentada.
4. Medir abertura de Hub, dashboard Connect, dashboard Grid, lista de alunos e modal de notificacoes em aparelho de referencia.
5. Confirmar que as preferencias de reduzir movimento e tema sao aplicadas antes de qualquer animacao.

Saida: matriz tela -> componente usado -> inconsistencia -> token/primitiva necessaria. Nao alterar telas nesta fase.

## Fase 1 - consolidar design system

Evoluir designTokens.ts e useThemeColors.ts de forma aditiva:

- surface, surfaceSoft, appBackground, line, text e textMuted continuam sendo a fonte de tema;
- adicionar somente tokens semanticos ausentes, como focusRing, overlay, pressedOpacity e estados desabilitados;
- manter a escala atual de espacamento, raio, tipografia e sombras;
- formalizar motion.fast, motion.base e motion.slow como 140, 220 e 320 ms, sem valores soltos;
- criar variantes padronizadas de sucesso, aviso, perigo, informacao e neutro para claro e escuro.

Atualizar primeiro as primitivas existentes, sem quebrar API:

- AnimatedPressable: escala de toque sutil, estado desabilitado e cancelamento seguro;
- AppButton: primary, secondary, ghost e destructive, incluindo loading;
- SurfaceCard e MetricTile: superficies, borda, elevacao e foco coerentes;
- SearchField, ListRow, Pill, ProgressBar e RingMetric: contraste e estados de interacao;
- LoadingState e FeedbackMessage: feedback claro e sem loop quando reduzir movimento estiver ativo.

## Fase 2 - primitivas de animacao

Criar src/components/common/MotionPrimitives.tsx com Reanimated ou Animated conforme a necessidade. Todas as primitivas devem receber enabled opcional e internamente considerar useMotionPreference.

Tabela de comportamento:

| Primitiva | Uso | Movimento normal | Reduzir movimento |
| --- | --- | --- | --- |
| Reveal | cabecalho, bloco e card | opacidade + 8 px vertical, 220 ms | estado final |
| StaggerList | no maximo 6 cards iniciais | intervalo de 40 ms | estado final |
| PressScale | botoes/cards acionaveis | escala 0,97 | sem escala |
| ModalTransition | modal e bottom sheet | fade + 16/24 px | fade imediato |
| SkeletonPulse | loading de conteudo | opacidade suave | opacidade fixa |
| CountUp | KPI confirmado | 220 ms, maximo 1 vez | valor final |

Regras:

- nao iniciar uma animacao por renderizacao de dados repetida;
- interromper animacoes ao desmontar;
- usar useNativeDriver quando Animated permitir;
- limitar springs para que nao haja salto excessivo;
- nao alterar a navegacao Stack existente nesta fase.

## Fase 3 - navegacao e sobreposicoes

1. Manter Expo Router Stack e sua transicao fade_from_bottom como padrao de rota.
2. Aplicar Reveal somente ao conteudo principal depois de a rota estar pronta; nao duplicar a animacao da pilha.
3. Padronizar FormBottomSheet, CrudModal, ExportModal, ConfirmDialog e NotificationsModal com ModalTransition.
4. Garantir fechar por botao, toque no overlay quando permitido, Android back e foco acessivel.
5. No Expo Web, validar teclado, Escape e foco visivel; no Android/iOS, validar back e safe areas.
6. Nao converter AppHeader em sidebar: em telefone, cabecalho e navegacao por rotas sao a estrutura adequada. Em tablet, melhorar espacamento e grade, sem imitar o portal web.

## Fase 4 - ordem de migracao das telas

1. Hub: primeira tela de entrada. Aplicar Reveal no titulo e StaggerList nos cards Connect/Grid. Os cards mantem AnimatedPressable; nao animar imagens de marca continuamente.
2. Dashboards Connect e Grid: aplicar Reveal ao cabecalho e stagger limitado aos KPI. ChartCard entra uma vez; deixar a animacao interna para ApexCharts.
3. Aluno: dashboard, frequencia, grade e perfil. Priorizar leitura, dados academicos e estados vazios, sem animacoes decorativas.
4. Listas Connect/Grid: alunos, professores, usuarios, turmas, cursos, empresas, estoque, tarefas e chamados. Animar apenas a primeira entrada da lista; filtros, realtime e paginação atualizam sem cascata.
5. Formularios e CRUD: foco, erro, loading do botao, bottom sheet e confirmacao de sucesso.
6. Mapas e localizacao: preservar gestos, geofence e subscriptions. Animar apenas painel/legenda/filtros; jamais pins em loop ou a camera sem acao do usuario.
7. Perfil, notificacoes e chatbot: preservar as animacoes existentes, unificando duracao, overlay, pressed state e reducao de movimento.

Cada grupo deve ser entregue e validado antes do seguinte. Nenhuma tela web ou arquivo de Senai HUB deve ser modificado.

## Fase 5 - loading, erro e vazio

Substituir loaders genericos onde houver area previsivel por skeletons reutilizaveis:

- SkeletonCard para KPIs e cards;
- SkeletonListRow para cadastros;
- SkeletonChart para ChartCard;
- SkeletonMapPanel para filtros e legenda.

Regras:

- skeleton representa somente estrutura real, sem dados ficticios;
- nao trocar dados carregados por layout com dimensoes diferentes;
- erro e vazio permanecem componentes semanticamente legiveis, sem animacao repetitiva;
- feedback de sucesso, falha e acao destrutiva deve usar FeedbackMessage, dialog ou toast nativo, nunca apenas cor.

## Fase 6 - acessibilidade e desempenho

Validar em cada PR:

- tema claro/escuro e texto aumentado;
- leitor de tela com titulo, valor, estado e proxima acao compreensiveis;
- reduzir movimento em Android/iOS e preferencia equivalente no Web;
- sem atraso perceptivel de toque, scroll, digitacao, mapas ou abertura de formulario;
- listas grandes, subscriptions realtime e mudanca de filtros sem flicker;
- nenhuma animacao requer internet, permissao adicional, biblioteca web ou dado Supabase novo.

Orcamento recomendado:

- 140 ms para press;
- 220 ms para reveal e navegacao local;
- 320 ms como teto para modal e painel;
- no maximo 6 elementos em stagger;
- nenhum loop fora de loading explicitamente visivel.

## Fase 7 - testes e entrega

Para cada fase:

1. Executar npm run lint.
2. Executar npx tsc --noEmit.
3. Executar npx expo export --platform web.
4. Testar manualmente Android, iOS, telefone estreito, tablet e Expo Web.
5. Conferir com reduzir movimento ativo e nos temas claro/escuro.
6. Comparar permissoes e dados entre papeis admin, professor, empresa, manutencao e aluno.

Nao remover Animated, Reanimated, tokens ou primitivas antigas enquanto houver consumidor. Medir bundle antes/depois se uma dependencia nova for realmente indispensavel. A expectativa inicial e nao instalar dependencia alguma.

## Resultado esperado

O SENAI Hub Mobile passa a ter linguagem visual uniforme, interacoes nativas responsivas e animacoes discretas, respeitando acessibilidade e preferencias do usuario. A implementacao preserva Expo Router, Supabase, i18n, permissoes, Android, iOS e Expo Web, sem importar padroes ou bibliotecas exclusivas do portal web.
