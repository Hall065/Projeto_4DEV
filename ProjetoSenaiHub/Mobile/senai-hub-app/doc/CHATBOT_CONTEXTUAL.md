# Chatbot contextual do SENAIHUB mobile

## Implementação

O app envia a página atual, filtros, IDs dos registros carregados, indicação de truncamento e versão do recorte. A API relê os valores usando o JWT autenticado do usuário, aplica restrições por módulo e vínculo, calcula indicadores e envia um contexto limitado ao Groq já utilizado pelo projeto.

Foram integradas 24 telas de Connect, Grid e Safe. O mapa envia os marcadores filtrados; seleção de chamado/tarefa/turma considera o detalhe aberto. A rota de contrato-alunos reutiliza seu fluxo existente. A versão web e o backend Laravel não foram alterados.

As respostas podem trazer evidências consultáveis, fatos/hipóteses, recomendações e até seis ações com prioridade, justificativa, função sugerida, prazo, dependências, indicador, critério de sucesso e reavaliação. Planos podem ser salvos com notas e andamento no histórico da conversa. Gestores de Grid podem abrir uma ação no formulário de nova tarefa, que exige revisão e confirmação para gravar.

## Problemas identificados e corrigidos

- O mobile enviava somente texto e identificador de conversa: contexto integrado às telas.
- A API escolhia ferramentas somente por palavras-chave e impunha respostas curtas de até 700 tokens: caminho contextual com configuração por módulo e resposta estruturada de até 3.200 tokens.
- O histórico buscava as primeiras mensagens: agora busca as recentes e as ordena cronologicamente. O modelo só reutiliza mensagens do mesmo recorte e escopo de acesso.
- Consultas usavam um cliente global potencialmente privilegiado: passam a usar cliente autenticado por requisição, com RLS e restrições adicionais de vínculo.
- Falhas de consulta eram frequentemente convertidas em zero: no caminho contextual são explicitadas como indisponibilidade.
- Respostas tardias podiam repor dados após logout: estado protegido por geração de sessão e assinatura de identidade.
- Salário final zero poderia ser substituído por salário base: cálculos contextuais distinguem zero de valor ausente.

## Ativação

1. Aplicar no Supabase a migração `Mobile/senai-hub-app/supabase/migrations/00012_chatbot_plan_updates.sql`, após a migração 00009 existente. Ela permite atualização apenas de metadados de respostas próprias em conversas ativas. Sem essa política, a análise funciona, mas salvar acompanhamento pode ser negado pelo banco.
2. Recarregar/reiniciar a API em `chatbot/python.py` e atualizar o app Expo. O contrato original de `/chat` sem contexto permanece disponível; o mobile usa `page_context`.
3. Confirmar no ambiente real que a conta consegue ler suas tabelas sob RLS. Perfis sem vínculo com empresa ou turma nunca recebem escopo ampliado.

Nenhuma migração ou publicação remota foi executada nesta tarefa. Nenhuma credencial foi alterada. A API local foi verificada com as novas rotas ativas.

## Limites explícitos

- Até 300 IDs por fonte, oito fontes por pergunta. A análise descreve o recorte carregado; não presume que ele represente todo o banco.
- As evidências individuais são uma amostra limitada; os agregados usam todos os registros autorizados efetivamente recuperados.
- Frequência é enriquecida com a aula para calcular taxas por registro e, quando os dados permitem, ponderadas por aulas.
- Chamados podem consultar tarefas relacionadas de forma controlada. Não há SQL gerado pelo modelo.
- Contagens mensais descrevem os registros selecionados, não reconstrução de status histórico. Comparações causais e períodos incompletos não são apresentados como fatos.
- Painel Safe analisa os oito itens recentes; seu total geral não é inferido dessa amostra.
- Marcação de chamada ainda não salva, coordenadas de localização e filtros internos do construtor de relatórios não são tratados como dados confirmados. A limitação acompanha a pergunta.
- A consulta ao banco tem tempo por operação limitado; o coletor interrompe novas fontes ao atingir seu orçamento. O provedor tem timeout e a resposta passa por validação de estrutura e referências.
- A validação de referências reduz citações inventadas; a qualidade semântica da interpretação ainda deve ser avaliada com usuários e dados reais.

## Validação

- Checagem TypeScript sem erros.
- 21 testes Python: contrato HTTP, autenticação ausente, papéis, escopo de empresa/manutenção, seleção, ausência de dados, cálculos, referências, limites e tarefas relacionadas.
- 10 testes Node: contexto, truncamento, ausência de atalhos sem dados, respostas tardias, troca de sessão e regressões dos papéis de aluno/Safe.
- Testes de API usam banco e provedor simulados; não comprovam políticas instaladas nem respostas do modelo no ambiente real.
- Revisão ESLint dos arquivos alterados: sem erros ou avisos.
- Teste com o provedor Groq real usando somente dados fictícios: formato JSON e evidências validados, incluindo uma ação. Nenhum dado real de usuário foi enviado nesse teste.
- Exportação Android/Hermes concluída com sucesso (bundle de 13,6 MB).
- A revisão de interface em aparelho físico e a validação de ponta a ponta autenticada dependem do ambiente conectado.

## Ajuste necessário para compilar Android

A versão instalada `@supabase/supabase-js@2.106.1` incluía uma importação dinâmica opcional incompatível com Hermes. Atualizei somente a família Supabase para `2.112.0`, fixada no package.json e no lockfile. A compilação Android passou após a alteração. Essa versão requer Node.js 22 ou superior para desenvolvimento; a máquina validada usa Node 24.

Referências oficiais: [problema de compilação](https://github.com/supabase/supabase-js/issues/2380) e [mudança a partir da versão 2.112.0](https://supabase.com/docs/guides/observability/client-side-tracing).
