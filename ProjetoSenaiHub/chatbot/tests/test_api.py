import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
os.environ.setdefault('GROQ_API_KEY', 'test-not-a-real-key')
os.environ.setdefault('SUPABASE_URL', 'https://example.supabase.co')
os.environ.setdefault('SUPABASE_ANON_KEY', 'test-not-a-real-key')
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
import python as api

ID = '10000000-0000-0000-0000-000000000001'
CTX = api.UserContext(auth_id=ID, usuario_id=ID, tipo='admin')
class ApiTests(unittest.TestCase):
    def setUp(self): self.client = TestClient(api.app)
    def test_unauthenticated_request_denied(self):
        response = self.client.post('/chat', json={'message': 'Analisar'})
        self.assertEqual(response.status_code, 401)
    def test_student_denied_before_data_collection(self):
        with patch.object(api, 'get_user_context', return_value=CTX.model_copy(update={'tipo': 'connect_aluno'})), patch.object(api, 'collect_page_context') as collect:
            response = self.client.post('/chat', json={'message': 'Analisar', 'page_context': {'route': '/grid'}})
            self.assertEqual(response.status_code, 403)
            collect.assert_not_called()
    def test_contextual_response_persists_verified_evidence(self):
        context = {'pagina': {'route': '/grid', 'fingerprint': 'one'}, 'evidencias': [{'id': 'chamados:resumo', 'summary': {'registros_analisados': 2}}], 'limitacoes': [], 'data_consulta': '2026-09-09', 'ferramentas_usadas': ['chamados']}
        def save(ctx, conversation, role, text, metadata=None): return {'id': ID, 'role': role, 'conteudo': text, 'metadata': metadata or {}}
        with patch.object(api, 'get_user_context', return_value=CTX), patch.object(api, 'collect_page_context', return_value=context), patch.object(api, 'ensure_conversation', return_value={'id': ID}), patch.object(api, 'save_message', side_effect=save), patch.object(api, 'maybe_update_title'), patch.object(api, 'contextual_answer', return_value={'answer': 'Dois chamados.', 'evidence_ids': ['chamados:resumo'], 'actions': []}):
            response = self.client.post('/chat', json={'message': 'Analisar', 'page_context': {'route': '/grid'}})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['message']['metadata']['evidence'][0]['id'], 'chamados:resumo')
    def test_provider_failure_does_not_expose_exception(self):
        context = {'pagina': {'route': '/grid'}}
        with patch.object(api, 'get_user_context', return_value=CTX), patch.object(api, 'collect_page_context', return_value=context), patch.object(api, 'ensure_conversation', return_value={'id': ID}), patch.object(api, 'save_message'), patch.object(api, 'maybe_update_title'), patch.object(api, 'contextual_answer', side_effect=RuntimeError('secret-provider-detail')):
            response = self.client.post('/chat', json={'message': 'Analisar', 'page_context': {'route': '/grid'}})
        self.assertEqual(response.status_code, 503)
        self.assertNotIn('secret-provider-detail', response.text)
    def test_oversized_context_rejected_before_provider(self):
        with patch.object(api, 'contextual_answer') as answer:
            response = self.client.post('/chat', json={'message': 'Analisar', 'page_context': {'route': '/grid', 'filters': {'text': 'x'*3000}}})
        self.assertEqual(response.status_code, 422)
        answer.assert_not_called()
    def test_history_uses_latest_messages_chronologically(self):
        class Query:
            def select(self, *args): return self
            def eq(self, *args): return self
            def order(self, name, desc=False): self.desc=desc; return self
            def limit(self, limit): self.limit_value=limit; return self
        query=Query()
        with patch.object(api, 'ensure_conversation'), patch.object(api, 'table', return_value=query), patch.object(api, 'execute_data', return_value=[{'conteudo': 'new'}, {'conteudo': 'old'}]):
            history=api.list_conversation_messages(CTX, ID, 8)
        self.assertTrue(query.desc)
        self.assertEqual([item['conteudo'] for item in history], ['old','new'])

if __name__ == '__main__': unittest.main()
