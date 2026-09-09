-- Executar após 00009_chatbot_history.sql. A API utiliza o JWT do usuário.
-- Somente metadados das próprias respostas podem ser atualizados.
grant update (metadata) on hub.chatbot_mensagens to authenticated;
drop policy if exists "chatbot plan update own" on hub.chatbot_mensagens;
create policy "chatbot plan update own" on hub.chatbot_mensagens
for update to authenticated
using (usuario_id = auth.uid() and role = 'assistant' and exists (
  select 1 from hub.chatbot_conversas c where c.id = conversa_id and c.usuario_id = auth.uid() and c.status = 'ativa'
))
with check (usuario_id = auth.uid() and role = 'assistant' and exists (
  select 1 from hub.chatbot_conversas c where c.id = conversa_id and c.usuario_id = auth.uid() and c.status = 'ativa'
));
