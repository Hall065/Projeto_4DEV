# SENAI Safe - Analise de migracao e implementacao mobile

## Status

Analise concluida em 02/09/2026. A implementacao mobile e a migration local foram criadas; nenhuma migration, policy ou alteracao remota foi aplicada por esta tarefa.

Autorizacao registrada: o responsavel autorizou que usuarios com o papel safe_aqv consultem os alunos e turmas necessarios do Connect para operar o Safe. A policy correspondente esta na migration 00011_senai_safe.sql. Ela concede somente SELECT; nao concede alteracao ou exclusao de registros Connect.

## Fontes analisadas

- Senai HUB/GUIA_APRESENTACAO_SITE_SENAI_HUB.md.
- Frontend: paginas SafeDashboardPage, SafeAuthorizationsPage, SafeAuthorizationDetailPage, SafeApprovalsPage, SafePortariaPage e SafeStudentsPage; tipos safe e safeService.
- Backend: migration 2026_06_09_100000_create_safe_tables, controllers, enums, models, resources, SafeWorkflowService e SafeConnectStudentBridge.
- Banco: Mobile/ideia/ideia/senai_hub_supabase_definitivo.sql e migrations do aplicativo.
- Mobile: Expo Router, servicos Supabase, auth store, hub.service, permissoes, Hub, Connect, Grid e design system.

## Visao geral e regras confirmadas

O SENAI Safe controla autorizacoes de entrada e saida de alunos. A AQV cria a solicitacao, o professor responsavel aprova ou nega e a portaria confirma ou recusa somente solicitacoes de saida.

Estados identificados: pendente_aqv, aguardando_professor, liberado_portaria, finalizado e negado.

1. Uma criacao segue para aguardando_professor.
2. Professor so decide uma solicitacao de aluno da propria turma.
3. Aprovacao de entrada finaliza o fluxo.
4. Aprovacao de saida libera a portaria.
5. Portaria so decide saida liberado_portaria.
6. Negado e finalizado nao podem ser editados.
7. Alunos sao fonte do Connect; o backend bloqueia cadastro, edicao e exclusao local de aluno Safe.

## Funcionalidades site para mobile

| Funcionalidade | Origem web | Destino mobile | Perfil |
| --- | --- | --- | --- |
| Dashboard contextual | SafeDashboardPage | app/safe/index.tsx | AQV, professor, portaria |
| Consulta de alunos Connect | SafeStudentsPage | seletor de aluno | AQV |
| Criar autorizacao e consultar lista | SafeAuthorizationsPage | app/safe/autorizacoes.tsx | AQV |
| Lista e filtro local por aluno, turma e protocolo | autorizacoes e detalhe | app/safe/autorizacoes.tsx | AQV |
| Historico detalhado e edicao de solicitacao | detalhe de autorizacao | proxima entrega, apos regra de reenvio aprovada | AQV |
| Aprovar ou negar | SafeApprovalsPage | app/safe/aprovacoes.tsx | professor |
| Confirmar ou recusar saida | SafePortariaPage | app/safe/portaria.tsx | portaria |

## Endpoints Laravel existentes

| Metodo | Rota | Permissao |
| --- | --- | --- |
| GET | /safe/dashboard | safe.dashboard |
| GET | /safe/students | safe.students.manage |
| GET, POST | /safe/authorizations | safe.authorizations.manage |
| GET, PUT | /safe/authorizations/{id} | safe.authorizations.manage |
| GET | /safe/authorizations/{id}/history | safe.authorizations.manage |
| GET, POST | /safe/teacher/authorizations e decisoes | safe.approve |
| GET, POST | /safe/portaria/authorizations e decisoes | safe.portaria |

## Comparacao com Supabase

| Recurso | Laravel local | Supabase atual | Acao |
| --- | --- | --- | --- |
| Usuarios | users | hub.usuarios e auth.users | Reutilizar |
| Alunos e turmas | Connect | connect.alunos e connect.turmas | Reutilizar |
| Aplicacao Safe | slug safe | hub.aplicacoes nao aceita senai_safe | Alterar somente apos aprovacao |
| Papeis Safe | safe_aqv, safe_professor, safe_portaria | Nao identificados em hub.tipo_usuario | Decidir mapeamento |
| Autorizacoes e logs | Tabelas locais | Nao existem | Criar no schema safe |
| Notificacoes | SafeNotificationTriggers | hub.notificacoes existe | Mapear destinatarios |
| Storage e realtime | Nao identificados | Disponiveis, mas sem necessidade atual | Nao criar no primeiro ciclo |

## Estrutura proposta

Criar schema safe com:

- safe.autorizacoes: aluno Connect opcional, snapshot de nome/turma, tipo, motivo, faltas, horario, status, solicitante, aprovadores e auditoria.
- safe.logs_autorizacao: historico append-only.
- tipo_autorizacao: entrada e saida.
- status_autorizacao: os cinco estados confirmados acima.

Nao criar tabela Safe de alunos. Isso duplicaria Connect e contraria o bridge do backend.

Relacao:

    auth.users -> hub.usuarios -> hub.usuario_aplicacoes
    connect.alunos -> safe.autorizacoes -> safe.logs_autorizacao

## RLS obrigatoria e matriz aprovada

O cliente nao deve ter INSERT, UPDATE ou DELETE direto em autorizacoes. Criacao e transicoes devem ocorrer por RPC, validando papel, estado e turma do professor.

- AQV: criar/listar e editar somente itens nao encerrados.
- Professor: ver e decidir somente alunos de turmas vinculadas.
- Portaria: ver e decidir somente saidas liberado_portaria.
- Logs: apenas quando a autorizacao-pai estiver visivel.

| Papel | Alunos e turmas Connect | Autorizacoes Safe | Acoes permitidas |
| --- | --- | --- | --- |
| safe_aqv | SELECT para montar solicitacao | SELECT | Criar autorizacao via RPC |
| safe_professor, professor ou connect_professor com app Safe | Apenas aluno de turma vinculada | SELECT da propria fila | Aprovar ou negar via RPC |
| safe_portaria | Nao necessario | SELECT de saida liberada | Confirmar ou recusar via RPC |
| admin e direcao | Mesmo escopo AQV | SELECT | Operacao AQV |
| aluno e usuario sem papel | Nenhum acesso adicional | Nenhum acesso | Nenhuma |

A policy aprovada e limitada a SELECT em connect.alunos e connect.turmas, condicionada a safe.is_aqv(). INSERT, UPDATE e DELETE do Connect continuam protegidos pelas policies atuais.

## 12. Incremento PostgreSQL aprovado

O script consolidado, pronto para revisao e aplicacao no Supabase SQL Editor, esta em Mobile/senai-hub-app/supabase/migrations/00011_senai_safe.sql. Esta e a fonte canonica do SQL para evitar divergencia entre documento e migration.

Ele executa esta ordem:

1. Cria o schema safe.
2. Adiciona safe_aqv, safe_professor e safe_portaria ao enum hub.tipo_usuario.
3. Registra senai_safe em hub.aplicacoes.
4. Cria enums, tabelas, chaves estrangeiras, checks, indices e trigger de updated_at.
5. Cria helpers de permissao e a verificacao de professor responsavel pela turma.
6. Cria a policy aprovada de leitura AQV em connect.alunos e connect.turmas.
7. Habilita RLS no Safe e restringe leitura por papel/estado.
8. Cria RPCs de criar autorizacao, decidir como professor e decidir como portaria.
9. Revoga escrita direta do cliente e concede somente SELECT e EXECUTE das RPCs.

Nao ha DROP TABLE, DROP SCHEMA, TRUNCATE, seed, Storage ou Realtime no script.

### Operacoes RPC do mobile

| RPC | Entrada | Regra aplicada |
| --- | --- | --- |
| safe.criar_autorizacao | aluno, tipo, motivo, horario, faltas, observacoes | Apenas AQV; snapshot do aluno/turma Connect; cria protocolo e log |
| safe.decidir_professor | autorizacao, aprovar | Apenas professor responsavel; valida aguardando_professor |
| safe.decidir_portaria | autorizacao, aprovar | Apenas portaria; valida saida liberado_portaria |

## 13. Requisitos de implementacao mobile

1. Adicionar os papeis e a aplicacao Safe aos tipos e guards do mobile.
2. Criar tipos Safe com UUIDs, estados e payload das RPCs.
3. Criar safe.service.ts usando exclusivamente o cliente Supabase existente e schema safe.
4. Criar safe.store.ts com loading, erro, refresh, filas e acao em andamento.
5. Criar layout Safe com guard de sessao, aplicacao senai_safe e permissao de rota.
6. Criar dashboard, autorizacoes AQV, aprovacoes e portaria usando componentes atuais.
7. Usar FeedbackMessage, LoadingState, EmptyState, ConfirmDialog e ListRow; nao usar mocks.
8. Integrar card Safe no Hub somente para usuario com aplicacao e permissao.
9. Adicionar testes de acesso direto, RLS, estado invalido, aluno fora da turma, professor correto e portaria.

## 14. Implementacao mobile realizada

Os arquivos abaixo foram implementados exclusivamente em `Mobile/senai-hub-app`; os arquivos do portal web foram somente consultados como referencia.

- `app/safe/_layout.tsx`: guard de sessao, aplicacao `senai_safe`, permissao por rota, cabecalho, notificacoes e navegacao inferior filtrada pelo papel.
- `app/safe/index.tsx`: resumo contextual com contadores e atividade recente visivel pela RLS.
- `app/safe/autorizacoes.tsx`: fila AQV, busca local e formulario de criacao. O seletor consulta somente `connect.alunos` e `connect.turmas` autorizados pela policy aprovada.
- `app/safe/aprovacoes.tsx`: fila de professor com confirmacao antes de aprovar ou negar; a RPC ainda valida a turma no banco.
- `app/safe/portaria.tsx`: fila de saidas liberadas, com confirmacao presencial antes de finalizar ou recusar.
- `src/types/safe.types.ts`, `src/services/safe.service.ts` e `src/stores/safe.store.ts`: contrato tipado, chamadas RPC, loading, erro e atualizacao das filas.
- `src/lib/permissions.ts`, `src/constants/roles.ts` e `src/constants/routes.ts`: papeis, aplicacao, guard de rota e rota inicial Safe.
- `app/hub.tsx`: card SENAI Safe exibido somente a quem possuir aplicacao e permissao.
- `tests/safe-role.test.mjs`: cobertura local dos papeis operacionais e isolamento do aluno.

O cliente nao recebe permissao para escrever diretamente nas tabelas Safe. As tres mudancas de estado usam apenas as RPCs da migration. Mesmo que uma tela seja adulterada, o banco confere papel, estado e, para professor, vinculo com a turma.

### Limite intencional desta entrega

O portal permite historico detalhado e possui operacao de edicao. O mobile entregue permite a criacao, consulta, decisao do professor e validacao da portaria, que sao o fluxo operacional critico. Nao foi implementada edicao sem uma regra formal de reenvio: alterar uma solicitacao enquanto o professor a analisa poderia invalidar sua decisao. A proxima entrega deve criar uma RPC especifica, com lock, registro no log e retorno para `aguardando_professor`, antes de expor a edicao no app.

## 15. Aplicacao e verificacao no Supabase

1. Revisar e aplicar `Mobile/senai-hub-app/supabase/migrations/00011_senai_safe.sql` no projeto Supabase correto.
2. Vincular a aplicacao `senai_safe` aos usuarios autorizados em `hub.usuario_aplicacoes`; criar a aplicacao no catalogo nao libera usuarios automaticamente.
3. Atribuir um dos papeis `safe_aqv`, `safe_professor` ou `safe_portaria` em `hub.usuarios`. Professor e `connect_professor` tambem podem operar a fila docente quando estiverem vinculados ao Safe e a `connect.professor_turmas`.
4. Testar, com contas diferentes: AQV consulta alunos/turmas e cria; professor de outra turma nao ve nem decide; professor responsavel aprova entrada e saida; portaria ve somente saida liberada; aluno nao ve o card nem abre a rota.
5. Confirmar no painel do Supabase que nao ha policy de INSERT, UPDATE ou DELETE direto para `authenticated` nas tabelas `safe`.

### Validacao local concluida

- `npx tsc --noEmit`: aprovado.
- `npm run lint`: aprovado.
- `npm run test:safe-access`: aprovado, 2 testes.
- `npx expo export --platform web`: aprovado apos liberar a criacao de processos do Metro; avisos de ambiente `NO_COLOR` nao alteraram o resultado.

## Estrutura mobile planejada

    app/safe/
      _layout.tsx
      index.tsx
      autorizacoes.tsx
      aprovacoes.tsx
      portaria.tsx
    src/types/safe.types.ts
    src/services/safe.service.ts
    src/stores/safe.store.ts
    src/components/safe/

Reutilizar ModuleScreen, SurfaceCard, MetricTile, ListRow, SearchField, FormBottomSheet, ConfirmDialog, FeedbackMessage e LoadingState. Sem copiar componentes do portal web.

## Ordem de implementacao

| Ordem | Entrega | Dependencia |
| --- | --- | --- |
| 1 | Aprovar matriz AQV-Connect | Privacidade e permissoes |
| 2 | Migration Safe, aplicacao e RLS | 1 |
| 3 | RPCs de criar e decidir fluxo | 2 |
| 4 | Tipos, servico e store mobile | 2 e 3 |
| 5 | Dashboard, filas e formulario | 4 |
| 6 | Notificacoes e testes RLS | 2 a 5 |

## Checklist

- [x] Safe web, backend e banco atual mapeados.
- [x] Gap de papeis, aplicacao, tabelas e RLS identificado.
- [x] Arquitetura mobile analisada.
- [x] Aprovacao para acesso AQV a alunos/turmas Connect.
- [x] Migration local e RPCs documentadas.
- [ ] Migration revisada e aplicada pelo responsavel no Supabase.
- [x] Tipos, servico, store e telas mobile.
- [x] Registro Safe no Hub e guards de rota.
- [x] Teste local de declaracao e isolamento dos papeis mobile.
- [ ] Testes de RLS no Supabase por AQV, professor, portaria, aluno e usuario sem permissao, apos aplicar a migration.
