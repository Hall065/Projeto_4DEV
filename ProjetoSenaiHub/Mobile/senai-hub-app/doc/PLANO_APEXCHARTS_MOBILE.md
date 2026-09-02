# Plano de implementação — ApexCharts no SENAI Hub Mobile

## Decisão técnica

Este plano é exclusivo de Mobile/senai-hub-app.

O plano recebido não pode ser aplicado diretamente: react-apexcharts é um wrapper React para DOM e sua própria documentação usa elementos HTML como div. O SENAI Hub é um aplicativo Expo/React Native para Android, iOS e Web; portanto, importar esse pacote em uma tela .tsx compartilhada falharia no runtime nativo.

A migração viável é uma única API de gráficos com implementações por plataforma:

    Telas React Native
            |
    Componentes de gráficos do SENAI Hub
            |
            +-- Web: react-apexcharts + apexcharts
            |
            +-- Android/iOS: react-native-webview com ApexCharts local

Não usar CDN em produção. O JavaScript do ApexCharts precisa ser versionado junto ao aplicativo, para que os gráficos funcionem offline e sem transferir dados dos alunos/chamados para um domínio externo.

Antes de instalar, o responsável pelo projeto deve validar a licença aplicável do ApexCharts. A licença Community atual atende uso educacional, sem fins lucrativos e organizações abaixo do limite de receita publicado; cenários acima desse limite exigem licença comercial.

## Execução realizada

- Dependências instaladas: apexcharts, react-apexcharts e react-native-webview.
- Os renderizadores compartilhados de donut, barra horizontal e linha/área foram migrados. As telas e relatórios existentes continuam consumindo as mesmas APIs públicas e os mesmos dados Supabase.
- A versão web importa react-apexcharts apenas no bundle web. Android e iOS usam uma WebView com o script do ApexCharts empacotado localmente em src/vendor/apexcharts.ts; não há CDN, token ou chamada externa no gráfico.
- Foram mantidos resumo e controles React Native acessíveis para seleção de categorias, além dos estados de carregamento, erro e vazio de ChartCard.
- Validações concluídas: npm run lint, npx tsc --noEmit e npx expo export --platform web.
- A confirmação visual em Android e iOS ainda requer teste manual em aparelho ou simulador, pois a exportação web não executa a WebView nativa.

## Estado atual do app

- Expo SDK 54, React Native 0.81 e Expo Router.
- Dados vêm dos serviços Supabase em src/services; não há Laravel no escopo mobile.
- react-native-svg já está instalado e é a base dos gráficos atuais.
- Não há apexcharts, react-apexcharts nem react-native-webview no package.json.
- Há três componentes reutilizáveis: DonutStatusChart, InteractiveBarChart e TrendLineChart.
- ChartCard já centraliza loading, erro, vazio, resumo e tema. Ele deve ser preservado.
- Os dados usam ChartDatum e TimeSeriesDatum; dashboardAnalytics.ts monta agregações locais a partir dos serviços existentes.

## Inventário de substituição

| Área | Arquivo | Gráficos atuais | Migração proposta |
| --- | --- | --- | --- |
| Dashboard do aluno | app/aluno/dashboard.tsx | frequência, presenças por data, componentes salariais | donut, área, barra horizontal |
| Dashboard Connect | app/connect/index.tsx | contratos, frequência, cursos, lançamentos, turmas, salários | donut, área, barra horizontal |
| Cursos Connect | app/connect/cursos.tsx | cursos por período | barra horizontal |
| Gerenciar frequência | app/connect/gerenciar-frequencia.tsx | faltas por aluno | barra horizontal |
| Relatórios Connect | app/connect/relatorios.tsx | frequência, alunos por curso, tendência | donut, barra horizontal, área |
| Dashboard Grid | app/grid/index.tsx | prioridade, status, tendência, tarefas, estoque | donut, área, barra horizontal |
| Relatórios Grid | app/grid/relatorios.tsx | status, tendência, técnico | donut, área, barra horizontal |
| Gerador de relatórios | src/components/reports/MobileReportBuilder.tsx | seções dinâmicas de gráfico | adaptador único por tipo |
| Placeholders | src/components/charts/ChartPlaceholder.tsx | barras de exemplo | trocar ou remover somente depois da migração |

## Componentes finais

Manter as APIs públicas atuais para reduzir mudanças nas telas:

    src/components/charts/
      ChartCard.tsx                    # manter
      types.ts                         # manter ChartDatum e TimeSeriesDatum
      DonutStatusChart.tsx             # passa a delegar ao Apex
      InteractiveBarChart.tsx          # passa a delegar ao Apex
      TrendLineChart.tsx               # passa a delegar ao Apex
      ApexChart.web.tsx                # react-apexcharts, somente Web
      ApexChart.native.tsx             # WebView, somente Android/iOS
      apex/
        adapters.ts                    # ChartDatum -> series/options
        options.ts                     # tema, formatação e acessibilidade
        bridge.ts                      # mensagens WebView -> React Native
        html.ts                        # HTML restrito para a WebView

As telas continuarão enviando data, formatValue e tone. Não colocar consultas Supabase, regras de papel ou filtros dentro de componentes de gráfico.

## Fase 0 — prova técnica obrigatória

Objetivo: confirmar que o ApexCharts atende Android, iOS e Web antes de iniciar uma substituição ampla.

1. Criar uma branch de migração.
2. Validar a licença com a instituição/projeto.
3. Instalar dependências compatíveis:

       npx expo install react-native-webview
       npm install apexcharts react-apexcharts

4. Criar um gráfico piloto de Cursos por período em app/connect/index.tsx.
5. Implementar as duas versões do adaptador:

   - ApexChart.web.tsx: importa react-apexcharts somente no bundle web.
   - ApexChart.native.tsx: usa WebView com HTML local e o script ApexCharts empacotado no app.

6. Implementar uma ponte de eventos mínima:

       toque/clique no ponto
            -> window.ReactNativeWebView.postMessage(...)
            -> validação do payload
            -> callback React Native + feedback tátil existente

7. Testar um conjunto sem dados, um conjunto com valores zero e um conjunto com quatro categorias reais.

Critérios de aprovação:

- abre no Expo Go Android e iOS;
- abre em expo start --web e no expo export --platform web;
- não requer internet para desenhar;
- troca claro/escuro sem manter cores antigas;
- não ocorre crash ao alternar abas, filtros ou orientação;
- o bundle não cresce além do limite aprovado pela equipe.

Se qualquer critério falhar, interromper a migração e manter react-native-svg; não instalar uma biblioteca web em telas nativas compartilhadas.

## Fase 1 — fundação e segurança

1. Criar apex/options.ts a partir de colors, chartPalette, designTokens e useThemeColors.
2. Criar adaptadores puros:

   - toApexDonut(data: ChartDatum[]);
   - toApexHorizontalBar(data: ChartDatum[]);
   - toApexArea(data: TimeSeriesDatum[]).

3. Normalizar dados não numéricos, negativos e vazios antes de enviá-los para a WebView.
4. Empacotar uma versão fixa de apexcharts.min.js como recurso local; registrar a versão e o hash no processo de build.
5. Bloquear navegação da WebView e permitir somente o HTML local. Não usar URL remota, token Supabase, cabeçalho Bearer ou dados brutos dentro da WebView.
6. Usar onMessage apenas para eventos esperados (select, ready, error) e validar JSON/tipos antes de chamar callbacks.

## Fase 2 — comportamento e acessibilidade

Os gráficos atuais oferecem botões e linhas de legenda acessíveis. Uma WebView não fornece a mesma semântica ao leitor de tela nativo, portanto cada gráfico Apex deve manter uma alternativa React Native abaixo dele:

- resumo textual já fornecido por ChartCard;
- lista/legenda nativa com rótulo, valor e porcentagem;
- botão nativo por categoria para selecionar o mesmo ponto;
- accessibilityLabel no contêiner com título, período e total;
- estado vazio, loading e erro do ChartCard;
- respeitar redução de movimento e desativar/anular animações quando necessário.

O tooltip visual não será a única forma de ler o valor.

## Fase 3 — ordem de migração

Migrar por tipo, validando cada um antes de seguir:

1. InteractiveBarChart -> barra horizontal Apex.
   - Piloto: Cursos por período no dashboard Connect.
   - Depois: turmas por curso, salários, estoque, prioridades, faltas e gráficos de relatório.
2. DonutStatusChart -> donut Apex.
   - Piloto: Frequência geral do Connect.
   - Depois: contratos, chamados, tarefas e frequência do aluno.
3. TrendLineChart -> área/linha Apex.
   - Piloto: Lançamentos por data do Connect.
   - Depois: tendência de chamados, frequência do aluno e relatórios.
4. MobileReportBuilder e ChartPlaceholder.
   - Só migrar depois dos três adaptadores estáveis.
   - Usar os mesmos adaptadores; não criar opções Apex diretamente no gerador de relatório.

Após cada item, comparar total, categorias, pontos de data, cor semântica e filtros com a versão SVG atual.

## Fase 4 — dados e serviços

Não criar endpoints Laravel. O mobile já usa Supabase e serviços como connectService, gridService e studentService.

No primeiro ciclo, preservar as agregações atuais em src/utils/dashboardAnalytics.ts:

- countByStatus;
- buildDateTrend;
- buildMonthTotals;
- topGroups.

Só mover agregações para view/RPC Supabase após medir lentidão ou volume alto. Se isso for necessário, a mudança deve incluir contrato tipado, RLS, filtro por usuário/empresa/professor e testes de isolamento; não buscar dados globais para agregar no cliente.

## Fase 5 — testes e validação

Para cada tipo de gráfico:

- adaptador com lista vazia, zeros, um item, muitos itens e valores monetários;
- toque no gráfico e na alternativa nativa;
- claro, escuro e redução de movimento;
- Android, iOS, Web estreito e tablet;
- alternância de usuário/empresa e filtros de relatório;
- nenhum dado de outro usuário/empresa aparece no resumo ou na WebView.

Validação mínima de cada PR:

       npm run lint
       npx tsc --noEmit
       npx expo export --platform web

Executar também teste manual em Android e iOS físicos/simulados. A exportação Web não valida a WebView nativa.

## Fase 6 — remoção segura

Somente depois de todos os consumidores estarem migrados:

1. usar rg para confirmar que não há import dos renderizadores SVG antigos;
2. remover ChartLegend e helpers exclusivos que não tenham outro consumidor;
3. manter ChartCard, types.ts, dashboardAnalytics.ts e as fontes Supabase;
4. remover dependências ou recursos antigos apenas quando não houver referência;
5. registrar tamanho do bundle antes/depois e a versão/licença do ApexCharts.

## Resultado esperado

O aplicativo terá gráficos ApexCharts com a mesma aparência e dados no Android, iOS e Web, sem alterar serviços, permissões, rotas ou o portal web. A migração preserva os estados e a acessibilidade já existentes, e só avança além do piloto se a ponte WebView atender aos critérios de performance, segurança e offline.
