# Guia de Setup - SENAI Hub Mobile

Este guia explica como fazer o projeto funcionar depois de clonar a pasta `Mobile` em outro computador.

O app principal fica em:

```text
senai-hub-app/
```

O banco corrigido para Supabase Auth fica em:

```text
Ideia/ideia/estrutura_banco_senai_hub_supabase_auth_corrigido.sql
```

## 1. Pre-requisitos

Instale no computador:

- Node.js 20 ou superior
- Git
- Expo via `npx`, nao precisa instalar global
- Conta no Supabase
- App Expo Go no celular, se for testar pelo celular

Verifique:

```powershell
node -v
npm -v
git --version
```

## 2. Clonar o Projeto

```powershell
git clone URL_DO_REPOSITORIO
cd Mobile\senai-hub-app
```

Instale as dependencias:

```powershell
npm install
```

## 3. Criar o `.env`

Dentro de `senai-hub-app`, copie o exemplo:

```powershell
copy .env.example .env
```

Edite o arquivo `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=SUA_PUBLISHABLE_KEY

EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=SEU_CLOUD_NAME
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=SEU_UPLOAD_PRESET

EXPO_PUBLIC_SENAI_LATITUDE=-22.5648
EXPO_PUBLIC_SENAI_LONGITUDE=-47.4014
EXPO_PUBLIC_SENAI_RAIO_METROS=150

EXPO_PUBLIC_DEV_TEST_EMAIL=email_de_teste
EXPO_PUBLIC_DEV_TEST_PASSWORD=senha_de_teste
EXPO_PUBLIC_DEV_TEST_LABEL=Conta de teste
```

Importante:

- A URL do Supabase deve ser apenas `https://xxx.supabase.co`.
- Nao coloque `/rest/v1` no final.
- Use a `publishable key` ou a `anon key`.
- Nunca coloque `service_role` no `.env` do app.

## 4. Configurar o Banco no Supabase

No Supabase Dashboard, crie um projeto novo ou use um banco resetado.

Depois va em:

```text
SQL Editor
```

Rode o arquivo:

```text
Ideia/ideia/estrutura_banco_senai_hub_supabase_auth_corrigido.sql
```

Esse SQL cria:

- schemas `hub`, `connect`, `grid`
- tabelas do app
- enums
- triggers
- views
- RLS
- funcoes alinhadas com `auth.uid()`
- relacionamento `hub.usuarios.id = auth.users.id`

## 5. Expor Schemas na API do Supabase

No Supabase Dashboard, va em:

```text
Settings > API
```

Procure por `Exposed schemas` e adicione:

```text
hub
connect
grid
```

Salve.

Sem isso, o app pode logar, mas falhar ao buscar ou inserir dados nos schemas.

## 6. Criar Usuario Secretaria/Admin

No Supabase Dashboard, va em:

```text
Authentication > Users
```

Crie um usuario, por exemplo:

```text
email: secretaria@senai.br
senha: Senai@123456
```

Depois copie o UUID desse usuario.

Abra o arquivo:

```text
Ideia/ideia/insert_secretaria_supabase_auth.sql
```

Troque:

```sql
COLE_AQUI_O_UUID_DO_AUTH_USER
```

pelo UUID copiado.

Depois rode esse SQL no `SQL Editor`.

Esse passo transforma o usuario criado no Auth em uma secretaria ativa dentro de `hub.usuarios`.

Para conferir:

```sql
select id, nome, email, tipo_usuario, status
from hub.usuarios
where email = 'secretaria@senai.br';
```

O resultado deve ter:

```text
tipo_usuario = secretaria
status = ativo
```

## 7. Deploy da Edge Function

O app usa a Edge Function `create-user-profile` para criar alunos, professores e usuarios.

No terminal, dentro de `senai-hub-app`, rode:

```powershell
npx supabase login
```

Depois linke o projeto:

```powershell
npx supabase link --project-ref SEU_PROJECT_REF
```

O `project-ref` e a parte da URL antes de `.supabase.co`.

Exemplo:

```text
https://nmaftnueudtwizccenrm.supabase.co
```

Project ref:

```text
nmaftnueudtwizccenrm
```

Deploy:

```powershell
npx supabase functions deploy create-user-profile
```

Se aparecer:

```text
WARNING: Docker is not running
```

mas tambem aparecer:

```text
Deployed Functions on project ...
```

entao o deploy deu certo.

## 8. Configurar Variaveis da Edge Function

Normalmente o Supabase ja fornece:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

para Edge Functions.

Se a function falhar por variavel ausente, configure no Dashboard:

```text
Project Settings > Edge Functions > Secrets
```

ou via CLI:

```powershell
npx supabase secrets set SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
```

Atencao:

- `SUPABASE_SERVICE_ROLE_KEY` fica somente no Supabase/servidor.
- Nunca coloque essa chave no `.env` do Expo.

## 9. Rodar o App

Dentro de `senai-hub-app`:

```powershell
npx expo start -c
```

Depois escolha:

- `w` para web
- ler o QR Code com Expo Go
- ou rodar em emulador Android/iOS

## 10. Testar Fluxo Principal

1. Abra o app.
2. Faça login com a secretaria/admin criada no Supabase Auth.
3. Entre no Hub.
4. Acesse `SENAI Connect`.
5. Tente criar um aluno.
6. Informe pelo menos:
   - nome
   - e-mail institucional
   - RM
   - senha inicial, ou deixe vazio para usar `Senai@123456`

O app deve:

1. criar usuario em `auth.users`
2. criar perfil em `hub.usuarios`
3. criar registro em `connect.alunos`

## 11. Comandos de Validacao

Rodar lint:

```powershell
npm run lint
```

Rodar checagem TypeScript:

```powershell
npx tsc --noEmit
```

Se os dois passarem, o codigo esta consistente.

## 12. Erros Comuns

### `supabase nao e reconhecido`

Use `npx`:

```powershell
npx supabase --version
```

Depois:

```powershell
npx supabase login
```

### Login funciona, mas tabelas nao carregam

Confira:

- `.env` tem URL e anon/publishable key corretas
- schemas `hub`, `connect`, `grid` estao expostos em `Settings > API`
- usuario existe em `hub.usuarios`
- usuario esta com `status = ativo`

### Erro ao criar aluno: `usuario_id null`

Isso indica que a Edge Function nao criou o usuario no Auth ou nao retornou o `userId`.

Confira:

```powershell
npx supabase functions deploy create-user-profile
```

E veja se o usuario logado tem permissao:

```sql
select id, email, tipo_usuario, status
from hub.usuarios
where email = 'EMAIL_LOGADO';
```

Precisa ser:

```text
tipo_usuario = secretaria, admin ou direcao
status = ativo
```

### Erro `Sem permissao para criar usuarios`

O usuario logado nao tem perfil permitido.

Atualize no SQL Editor:

```sql
update hub.usuarios
set tipo_usuario = 'secretaria',
    status = 'ativo'
where email = 'EMAIL_LOGADO';
```

### Erro de RLS

Confira se o usuario logado existe em `hub.usuarios` com o mesmo UUID de `auth.users`.

```sql
select au.id as auth_id, u.id as profile_id, au.email, u.tipo_usuario, u.status
from auth.users au
left join hub.usuarios u on u.id = au.id
where au.email = 'EMAIL_LOGADO';
```

`auth_id` e `profile_id` precisam ser iguais.

## 13. O Que Nao Subir Para o GitHub

Nao suba:

- `node_modules/`
- `.env`
- chaves privadas
- `service_role`
- senhas reais

Pode subir:

- `.env.example`
- SQLs de estrutura
- codigo do app
- Edge Functions

## 14. Checklist Rapido em Outro PC

```powershell
git clone URL_DO_REPOSITORIO
cd Mobile\senai-hub-app
npm install
copy .env.example .env
```

Editar `.env`.

No Supabase:

1. rodar `estrutura_banco_senai_hub_supabase_auth_corrigido.sql`
2. expor schemas `hub`, `connect`, `grid`
3. criar usuario secretaria em Auth
4. rodar `insert_secretaria_supabase_auth.sql`

No terminal:

```powershell
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase functions deploy create-user-profile
npm run lint
npx tsc --noEmit
npx expo start -c
```

Pronto: o app deve estar funcionando.
