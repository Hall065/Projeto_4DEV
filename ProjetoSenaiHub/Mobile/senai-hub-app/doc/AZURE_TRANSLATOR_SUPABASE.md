# Azure Translator seguro no Supabase — configuração passo a passo

## O que mudou no aplicativo

A chave do Azure não é mais lida por `EXPO_PUBLIC_AZURE_API` e não é mais incluída no bundle do Expo. O aplicativo chama a Edge Function autenticada `translate-ui`; somente essa função lê a chave privada e se comunica com o Azure Translator.

Fluxo atual:

```text
usuário autenticado no app
        ↓ JWT Supabase
supabase.functions.invoke('translate-ui')
        ↓ segredo privado
Azure Translator
        ↓
cache local somente de frases de interface aprovadas
```

Importante: a chave não deve ser salva em uma tabela PostgreSQL. Ela deve ser cadastrada em **Supabase Edge Function Secrets**, que é o cofre de variáveis privadas do projeto. A URL e a chave pública/anon do Supabase continuam como `EXPO_PUBLIC_*`, pois são identificadores públicos protegidos por Auth e RLS. A chave Azure é diferente: ela autoriza consumo pago e precisa permanecer privada.

## Pré-requisitos

Você precisa ter:

1. acesso ao recurso Translator no portal do Azure;
2. acesso de proprietário ou função equivalente ao projeto Supabase;
3. Node.js e npm funcionando;
4. uma sessão válida no aplicativo, porque `translate-ui` rejeita usuário não autenticado;
5. o terminal aberto em `Mobile/senai-hub-app`.

O identificador do projeto usado atualmente é `nmaftnueudtwizccenrm`. Confirme no Supabase Dashboard, em **Project Settings**, antes de executar comandos em produção.

## Etapa 1 — trocar a chave que já foi exposta ao Expo

Se a chave antiga já esteve em uma variável `EXPO_PUBLIC_*`, considere-a exposta, mesmo que o repositório seja privado. O Expo substitui essas variáveis no JavaScript entregue ao navegador/aparelho.

No portal do Azure:

1. abra o recurso do **Azure AI Translator** usado pelo SENAI Hub;
2. abra **Resource Management → Keys and Endpoint**;
3. copie a região exatamente como aparece no portal, por exemplo `brazilsouth`;
4. use temporariamente a chave que ainda não estava no aplicativo, normalmente **KEY 2**;
5. depois que a Edge Function estiver testada, regenere a chave antiga (**KEY 1**);
6. se KEY 2 também já tiver sido exposta, regenere-a depois de concluir a troca para uma chave nova.

Não envie a chave por chat, commit, captura de tela ou issue.

## Etapa 2 — configurar pelo Supabase Dashboard (forma mais simples)

1. Entre em <https://supabase.com/dashboard>.
2. Abra o projeto `nmaftnueudtwizccenrm`.
3. Acesse a área de **Edge Functions** e abra **Secrets / Manage secrets**.
4. Cadastre estes nomes, sem o prefixo `EXPO_PUBLIC_`:

```dotenv
AZURE_TRANSLATOR_KEY=cole_a_nova_chave_do_azure
AZURE_TRANSLATOR_REGION=brazilsouth
AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com
```

5. Em `AZURE_TRANSLATOR_REGION`, use a região mostrada pelo seu recurso Azure; não copie `brazilsouth` se o portal mostrar outra.
6. O endpoint acima é o endpoint global padrão. Se o Azure exibir um endpoint personalizado para seu recurso, cadastre exatamente o endpoint HTTPS exibido pelo portal.
7. Salve. Alterações de secrets ficam disponíveis para as Functions sem precisar gravar nada no PostgreSQL.

## Etapa 3 — configurar pela CLI (alternativa reproduzível)

Confira se a CLI está disponível:

```powershell
npx supabase --version
```

Faça login e vincule o diretório ao projeto correto:

```powershell
npx supabase login
npx supabase link --project-ref nmaftnueudtwizccenrm
```

Se a CLI disser que este diretório ainda não é um projeto Supabase porque falta `supabase/config.toml`, execute uma única vez:

```powershell
npx supabase init
npx supabase link --project-ref nmaftnueudtwizccenrm
```

Crie manualmente um arquivo local chamado `supabase/functions/.env.azure.local` com:

```dotenv
AZURE_TRANSLATOR_KEY=cole_a_nova_chave_do_azure
AZURE_TRANSLATOR_REGION=brazilsouth
AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com
```

Esse padrão já está no `.gitignore`. Mesmo assim, confirme antes de qualquer commit:

```powershell
git status --short
```

Envie os valores ao cofre do projeto:

```powershell
npx supabase secrets set --env-file supabase/functions/.env.azure.local --project-ref nmaftnueudtwizccenrm
npx supabase secrets list --project-ref nmaftnueudtwizccenrm
```

`secrets list` mostra os nomes/digests, não deve imprimir a chave completa. Depois do envio, você pode apagar o arquivo `.env.azure.local`; os valores continuarão no Supabase.

## Etapa 4 — publicar a Edge Function

A função implementada está em `supabase/functions/translate-ui/index.ts`. Publique somente ela:

```powershell
npx supabase functions deploy translate-ui --project-ref nmaftnueudtwizccenrm
```

Não use `--no-verify-jwt`. A tradução é uma função interna do app e deve exigir o JWT do usuário autenticado. O cliente Supabase já envia a sessão quando chama `supabase.functions.invoke`.

## Etapa 5 — limpar o `.env` do Expo

Abra `Mobile/senai-hub-app/.env` e remova, se existirem, estas linhas:

```dotenv
EXPO_PUBLIC_AZURE_API=...
EXPO_PUBLIC_AZURE_REGION=...
EXPO_PUBLIC_AZURE_ENDPOINT=...
EXPO_PUBLIC_AZURE_TRANSLATOR_ENDPOINT=...
```

Não substitua por `AZURE_TRANSLATOR_KEY` no mesmo `.env` do Expo. A chave privada deve existir somente nos secrets da Edge Function.

Mantenha estas duas variáveis públicas do Supabase:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://nmaftnueudtwizccenrm.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

Nunca use `service_role` ou `sb_secret_...` no aplicativo.

## Etapa 6 — limpar cache e testar

Pare o servidor Expo e reinicie limpando o cache:

```powershell
npx expo start -c
```

Teste nesta ordem:

1. faça login no aplicativo;
2. abra **Perfil → Preferências → Idioma**;
3. selecione espanhol, francês ou outro idioma remoto;
4. aguarde a pré-carga terminar;
5. abra Grid → Chamados, notificações, relatórios e chatbot;
6. confirme que menus, filtros, botões e textos auxiliares mudam de idioma;
7. confirme que nomes de pessoas, títulos/descrições de chamados, mensagens do chatbot e textos de notificações permanecem como foram cadastrados;
8. feche e abra o app para confirmar o cache local.

Inglês possui catálogo local e deve funcionar mesmo se o Azure estiver temporariamente indisponível. Os demais idiomas dependem da Function na primeira tradução e usam cache nas próximas aberturas.

## Como interpretar erros

| Situação | Causa provável | Correção |
| --- | --- | --- |
| `401 Unauthorized` | usuário sem sessão ou Function publicada sem a configuração esperada | faça login novamente e publique sem `--no-verify-jwt` |
| `503 Azure Translator nao configurado` | `AZURE_TRANSLATOR_KEY` ausente nos secrets | cadastre o secret e confirme com `secrets list` |
| `502 Credencial ou regiao ... invalida` | chave regenerada, valor incorreto ou região errada | copie novamente Key e Region no portal Azure |
| `429` | cota/limite do Azure atingido | verifique métricas, pricing tier e quota no Azure |
| tradução antiga após corrigir o Azure | cache local do app | mude temporariamente para português, reinicie com `expo start -c`; a versão do cache já foi atualizada para `v2` |
| somente alguns textos traduzidos | texto ainda direto em uma tela ou frase não cadastrada no catálogo | execute `npm run i18n:audit` e migre a frase para `useI18n` |

## Regras de privacidade adotadas

- Apenas frases presentes no catálogo de interface de `src/hooks/useI18n.ts` entram na fila remota.
- Conteúdo vindo do Supabase não é enviado automaticamente ao Azure.
- Títulos e mensagens de notificações, texto de chat, nomes, e-mails, descrições e observações permanecem no idioma original.
- A Edge Function aceita no máximo 25 textos e 5.000 caracteres por chamada.
- O app restaura a fila quando ocorre falha; não perde traduções pendentes silenciosamente.
- O cache `v2` descarta entradas que não pertencem ao catálogo aprovado.

## Como adicionar uma nova frase de interface

1. Escreva a frase-base em português no componente.
2. Adicione a frase e sua tradução inglesa ao objeto `en` em `src/hooks/useI18n.ts`. Isso também a inclui na lista permitida para tradução remota.
3. No componente, obtenha `t`:

```tsx
const { t } = useI18n();
```

4. Renderize a frase com `t`:

```tsx
<Text>{t('Minha nova frase')}</Text>
```

5. Para dado do banco ou texto digitado por usuário, não use `t`:

```tsx
<Text>{chamado.descricao}</Text>
```

6. Para datas e números, use `formatAppDateTime`/`formatAppNumber` de `src/utils/locale.ts`.
7. Execute:

```powershell
npm run i18n:audit
npx tsc --noEmit
npm run lint
```

`npm run i18n:audit` gera o inventário completo. O inventário legado foi zerado; `npm run i18n:check` falha se encontrar um novo texto direto ou uma chamada `t('...')` sem entrada no catálogo inglês.

## Arquivos principais da implementação

- `supabase/functions/translate-ui/index.ts`: proxy autenticado e segredo privado;
- `src/services/azure-translator.service.ts`: chamada da Function pelo cliente Supabase;
- `src/hooks/useI18n.ts`: catálogo aprovado, fila, lotes, retry e cache;
- `src/utils/locale.ts`: formatação conforme o idioma do app;
- `scripts/audit-mobile-i18n.mjs`: auditoria de texto direto;
- `.env.example` e `app.config.js`: não expõem mais a credencial Azure.

## Referências oficiais

- Supabase — secrets em Edge Functions: <https://supabase.com/docs/guides/functions/secrets>
- Supabase — deploy de Edge Functions: <https://supabase.com/docs/guides/functions/deploy>
- Supabase — autenticação de Edge Functions: <https://supabase.com/docs/guides/functions/auth>
- Azure Translator — operação Translate e limites: <https://learn.microsoft.com/en-us/rest/api/translator/translator/translate?view=rest-translator-v3.0>
- Azure Translator — autenticação: <https://learn.microsoft.com/en-us/azure/ai-services/translator/text-translation/reference/authentication>
