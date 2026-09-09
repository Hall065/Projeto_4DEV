import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAnalysisContext, getAnalysisSuggestions } from '../src/lib/chatbotContext.ts';
const row = (id, status = 'aberto') => ({ id, status, descricao: 'dado privado não enviado' });
test('recorte atual muda com filtros, registros, valores e rota', () => {
  const context = buildAnalysisContext('/grid/chamados', 'Chamados', { datasets: { chamados: [row('a')] }, filters: { status: 'aberto' } });
  for (const changed of [
    buildAnalysisContext('/grid/tarefas', 'Tarefas', { datasets: { tarefas: [row('a')] } }),
    buildAnalysisContext('/grid/chamados', 'Chamados', { datasets: { chamados: [row('b')] }, filters: { status: 'aberto' } }),
    buildAnalysisContext('/grid/chamados', 'Chamados', { datasets: { chamados: [row('a', 'concluido')] }, filters: { status: 'aberto' } }),
    buildAnalysisContext('/grid/chamados', 'Chamados', { datasets: { chamados: [row('a')] }, filters: { status: 'concluido' } }),
  ]) assert.notEqual(context.fingerprint, changed.fingerprint);
  assert.equal(JSON.stringify(context).includes('dado privado'), false);
});
test('limite de seleção é explícito e seleção vazia não vira consulta geral', () => {
  const full = buildAnalysisContext('/grid/chamados', 'Chamados', { datasets: { chamados: Array.from({ length: 400 }, (_, index) => row(String(index))) } });
  assert.equal(full.datasets[0].ids.length, 300);
  assert.equal(full.datasets[0].loaded_count, 400);
  assert.equal(full.datasets[0].truncated, true);
  const empty = buildAnalysisContext('/grid/chamados', 'Chamados', { datasets: { chamados: [] } });
  assert.deepEqual(empty.datasets[0].ids, []);
  assert.equal(getAnalysisSuggestions(empty).length, 0);
});
test('carregamento desativa atalhos e erro de dados fica explícito', () => {
  const context = buildAnalysisContext('/grid', 'Painel', { datasets: { chamados: [row('a')] }, error: 'falha' }, true);
  assert.deepEqual(getAnalysisSuggestions(context), []);
  assert.ok(context.limitations.some((value) => value.includes('falha')));
});

import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const { create } = require('zustand');
function setupStore(overrides = {}) {
  const auth = create(() => ({ session: { userId: 'first', perfil: { tipo: 'admin' } } }));
  const context = create(() => ({ context: buildAnalysisContext('/grid', 'Painel', {}), clear: () => context.setState({ context: null }) }));
  const service = { listConversations: async () => [], ...overrides };
  const mocks = {
    '@/stores/auth.store': { useAuthStore: auth },
    '@/stores/chatbot-context.store': { useChatbotContextStore: context },
    '@/lib/permissions': { isStudentRole: (role) => ['aluno', 'connect_aluno'].includes(role) },
    '@/services/chatbot.service': { chatbotService: service },
    zustand: { create },
  };
  const compiled = ts.transpileModule(fs.readFileSync(new URL('../src/stores/chatbot.store.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)((name) => mocks[name], module, module.exports);
  return { store: module.exports.useChatbotStore, auth };
}
function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
test('resposta pendente não reaparece após troca de usuário', async () => {
  const pending = deferred();
  const { store, auth } = setupStore({ sendMessage: () => pending.promise });
  const sent = store.getState().sendMessage('Analisar');
  auth.setState({ session: { userId: 'second', perfil: { tipo: 'admin' } } });
  pending.resolve({ conversation_id: 'first-private', message: { role: 'assistant', conteudo: 'privado' } });
  assert.equal(await sent, false);
  assert.deepEqual(store.getState().messages, []);
  assert.equal(store.getState().activeConversationId, null);
});
test('lista pendente não repõe conversas de sessão encerrada', async () => {
  const pending = deferred();
  const { store, auth } = setupStore({ listConversations: () => pending.promise });
  const loading = store.getState().loadConversations();
  auth.setState({ session: null });
  pending.resolve([{ id: 'private', status: 'ativa' }]);
  await loading;
  assert.deepEqual(store.getState().conversations, []);
});
test('envio programático de aluno é bloqueado', async () => {
  const { store, auth } = setupStore({ sendMessage: () => { throw new Error('Não deveria chamar API'); } });
  auth.setState({ session: { userId: 'student', perfil: { tipo: 'connect_aluno' } } });
  assert.equal(await store.getState().sendMessage('Analisar'), false);
});
