# Prompts de evolução — uso exclusivo no aplicativo mobile

Este é o documento definitivo para os prompts. Todos devem alterar **somente** `Mobile/senai-hub-app` e, no caso específico do chatbot, `chatbot/python.py` quando houver mudança necessária na API. Não alterar `Senai HUB/frontend`, `Senai HUB/backend` nem qualquer arquivo da versão web.

## Instrução obrigatória para anexar a todos os prompts

> Trabalhe exclusivamente no aplicativo mobile `Mobile/senai-hub-app`. Não modifique arquivos do portal web (`Senai HUB/frontend`), backend Laravel (`Senai HUB/backend`) ou qualquer outro projeto. Antes de editar, inspecione os componentes React Native, serviços Supabase, tipos, migrations, RLS, stores Zustand, rotas Expo Router e permissões relacionados. Preserve i18n, acessibilidade, suporte Android/iOS/web, tema claro/escuro e regras de papel existentes. Não invente tabelas, campos, rotas, permissões ou dados. Quando um dado inexistente for indispensável, implemente o contrato mínimo completo e seguro no mobile/Supabase; caso contrário, registre a limitação sem dados fictícios. Aplique o código no repositório, execute `npm run lint` no diretório mobile e entregue resumo, arquivos modificados, decisões e resultado da validação, sem colar arquivos inteiros no chat.

## Ordem de envio

1. Design system mobile
2. Perfil mobile
3. Gráficos mobile
4. Chatbot mobile
5. Notificações mobile
6. Restrição do chatbot para aluno
7. Filtros SENAI Connect mobile
8. Filtros SENAI Grid mobile
9. Filtros dos mapas mobile

## 1. Design system mobile

> No aplicativo mobile, evolua o design system existente sem reescrever todas as telas ou usar CSS/Tailwind. Centralize cores, espaçamentos, raios, sombras e tipografia nos tokens e hooks React Native já existentes (`designTokens`, `colors`, `useThemeColors`). Aplique uma aparência corporativa com azul institucional, vermelho SENAI, superfícies claras, bordas discretas e feedbacks semânticos, preservando contraste nos temas claro e escuro.
>
> Atualize primeiro componentes compartilhados de botão, card/superfície, campo, modal, badge, listas e cabeçalho. Preserve as APIs dos componentes, estados de toque, foco, carregamento, desabilitado e acessibilidade. Não introduza gradientes ou efeitos pesados, não modifique rotas, Supabase, permissões ou regras de negócio. Migre somente telas de amostra neste passo e entregue uma lista objetiva das próximas telas a migrar.

## 2. Perfil do usuário mobile

> Redesenhe as telas reais de perfil do aplicativo (`app/perfil.tsx` e, somente quando fizer sentido para o perfil aluno, `app/aluno/perfil.tsx`) usando o design system atualizado. Preserve as operações já existentes, incluindo edição permitida, troca de foto, preferências, alteração de senha, logout e os dados acadêmicos do aluno em modo somente leitura.
>
> Organize em cabeçalho com avatar, nome e tipo; cards de dados pessoais, acesso, segurança e preferências. Use apenas dados existentes na sessão/Supabase. Não crie autenticação em dois fatores, sessões ativas, linha do tempo, CPF adicional, último acesso ou data de cadastro se não houver um contrato seguro e visível. Não exponha dados sensíveis em locais inadequados e mantenha a navegação responsiva para telefone e tablet.

## 3. Gráficos mobile

> Melhore os gráficos mobile existentes em `src/components/charts` e nas telas Connect, Grid e Aluno. O app já usa `react-native-svg` e componentes próprios (`ChartCard`, `DonutStatusChart`, `InteractiveBarChart`, `TrendLineChart`); reutilize e evolua essa base. Não instale Recharts ou Chart.js.
>
> Padronize paleta, legenda, seleção/toque, rótulos, estado vazio, loading e acessibilidade. Preserve os dados reais vindos dos serviços Supabase. Só adicione gráficos quando as métricas e campos existirem; não use mocks em produção. Para métricas ausentes (por exemplo custo histórico ou séries mensais não persistidas), informe o schema/consulta necessários antes de implementá-las. Valide a renderização em telas pequenas, modo escuro e web do Expo.

## 4. Chatbot mobile

> Melhore exclusivamente o chatbot mobile persistido. Ele usa `src/stores/chatbot.store.ts`, `src/services/chatbot.service.ts`, componentes em `src/components/chatbot` e API em `chatbot/python.py`. Preserve isolamento por usuário e autenticação Bearer/Supabase.
>
> Inclua uma ação de excluir a conversa ativa com confirmação nativa acessível. Verifique primeiro o contrato atual: `DELETE /conversations/{id}` arquiva a conversa. Se a regra de negócio exigir apagar mensagens definitivamente, implemente uma operação explícita e segura com política de retenção; não apresente arquivamento como exclusão. Após sucesso, sincronize conversas, conversa selecionada e mensagens, crie/abra uma conversa vazia utilizável e exiba feedback de sucesso/erro.
>
> Preserve `TextInput multiline` e o botão de envio. Em Android/iOS, Return deve inserir nova linha; não force Enter para enviar em teclado nativo. Na execução Expo Web, use Enter para enviar e Shift+Enter para nova linha apenas se isso puder ser feito sem falhar com IME e sem quebrar o mobile. Após envio bem-sucedido, limpe o texto e preserve foco quando a plataforma permitir. Não altere a lógica/respostas do assistente fora do necessário.

## 5. Notificações mobile

> Melhore o modal de notificações mobile utilizando exclusivamente `useNotifications`, `notificationService` e a tabela Supabase `hub.notificacoes`. Preserve autenticação, RLS e assinatura realtime; não altere sistemas externos de notificação.
>
> Redesenhe o modal aberto pelo sino com animação nativa sutil (fade + slide, respeitando redução de movimento), cabeçalho, ação “Marcar todas como lidas”, cards com título, mensagem, tempo relativo, indicador de não lida, feedback de toque e rolagem. Agrupe “Hoje” e “Anteriores” por `created_at`. Exiba ícones por tipo somente se houver um campo de tipo real no schema. O badge deve sumir em zero e exibir `99+` acima de 99 em todos os cabeçalhos compartilhados.
>
> Não marque notificações automaticamente ao abrir. Marcar uma/todas deve tratar erro e manter hook, estado local e realtime consistentes. Antes de adicionar exclusão individual ou “Limpar todas”, confirme migrations, RLS e política segura de deleção; não realize exclusões em massa no cliente sem confirmação e política no Supabase.

## 6. Restringir chatbot para alunos

> Restrinja o chatbot global do mobile aos usuários que não sejam alunos. Considere os dois nomes de papel existentes: `aluno` e `connect_aluno`. O ponto global é `ChatbotPortal` no layout raiz; não há rota exclusiva de chatbot.
>
> Use a sessão e `isStudentRole` já existente para não renderizar botão flutuante nem modal para os dois papéis, limpar/fechar o estado do chatbot em logout ou troca de sessão e impedir abertura programática para aluno. Preserve o chatbot para todos os demais papéis autorizados. Não modifique permissões acadêmicas, rotas do aluno, geofence ou a versão web. Inclua testes focados nos dois aliases de aluno e em ao menos um papel autorizado.

## 7. Filtros SENAI Connect mobile

> Adicione filtros ao módulo SENAI Connect mobile usando somente campos e opções que existirem nas telas, tipos e serviços Supabase. Primeiro produza uma matriz “tela → filtros existentes → filtros possíveis com schema atual → requisito pendente”. Preserve busca atual, `useFilterStore`, permissões e comportamento de listas.
>
> Use painel ou modal de filtros adequado a mobile, com Aplicar, Limpar, contador de resultados e controles acessíveis. Opções relacionais (turmas, cursos, empresas e professores) devem vir dos loaders/serviços existentes. Priorize as telas reais: alunos, professores, usuários, turmas, cursos, empresas e gerenciar frequência. Idade, etnia, último acesso, tipo de contrato, intervalo de contratação e outros campos só podem entrar depois de confirmar schema, RLS e consulta; não crie selects fictícios.

## 8. Filtros SENAI Grid mobile

> Melhore filtros exclusivamente nas telas mobile `app/grid/estoque.tsx` e `app/grid/usuarios.tsx`, usando campos reais de seus tipos e serviços Supabase. Use um painel/modal mobile colapsável ou bottom sheet, Aplicar, Limpar, contador de resultados e filtros persistentes enquanto a tela estiver aberta.
>
> Em Estoque, valide categoria, status, empresa distribuidora, bloco/sala, custo, quantidade e estoque baixo conforme o schema atual. Em Usuários Grid, valide papel, status e datas existentes. Não inclua último acesso, valores de contrato, carga horária ou outros campos sem coluna e RLS/consulta adequadas. Garanta que filtros numéricos e de data sejam normalizados, que intervalos inválidos mostrem mensagem clara e que papéis de manutenção continuem com suas restrições atuais.

## 9. Filtros dos mapas mobile

> Evolua os filtros apenas dos mapas mobile existentes: `app/grid/mapa-tarefas.tsx` e a tela de localização do Connect. Antes, inspecione os serviços, tipos, subscriptions realtime, dados de geofence e permissões. Não modifique mapas ou serviços do portal web.
>
> No Grid, filtre por prioridade, status/etapa, responsável, bloco, tipo de chamado e período somente quando os respectivos dados estiverem presentes no schema. Atualize pins, legenda e contadores de forma derivada e em tempo real, sem mutar a fonte de dados ou recriar subscriptions desnecessariamente.
>
> No Connect, implemente filtros de pessoa, turma, curso, status no evento e perímetro somente se os dados já forem fornecidos pelos serviços de localização/geofence e forem autorizados pela política de privacidade. Diferencie visualmente aluno, professor e pessoa fora do perímetro, inclua contador de alunos/professores e mantenha “Limpar filtros” acessível. Não simule localização ou status de aula; para dado ausente, descreva a migration, RLS, consentimento/LGPD e consulta necessários antes de desenvolver.
