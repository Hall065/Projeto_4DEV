# Guia completo para apresentação do SENAI Hub

## 1. Visão geral do projeto

O **SENAI Hub** é um aplicativo multiplataforma criado para centralizar serviços acadêmicos e operacionais do SENAI em uma única interface.

O aplicativo funciona como um ponto de entrada para três experiências:

1. **SENAI Hub**: autenticação, perfil, permissões, notificações e seleção dos módulos disponíveis.
2. **SENAI Connect**: gestão acadêmica, alunos, professores, cursos, turmas, frequência, empresas, contratos e salários.
3. **SENAI Grid**: gestão de infraestrutura, chamados de manutenção, tarefas, equipe, estoque, mapas e relatórios.

Além dessas áreas, existe um **portal específico do aluno**, com informações resumidas de curso, turma, frequência, contrato e salário.

### Explicação curta para iniciar a apresentação

> O SENAI Hub é uma plataforma que reúne a gestão acadêmica e a gestão de manutenção em um único aplicativo. O sistema identifica o perfil do usuário depois do login e exibe somente os módulos e funcionalidades permitidos para aquele perfil. Os dados são persistidos no Supabase, os arquivos são armazenados no Cloudinary e o aplicativo foi desenvolvido com React Native, Expo e TypeScript.

---

## 2. Problema que o aplicativo resolve

Sem uma plataforma centralizada, informações acadêmicas, contratos, frequência, salários e solicitações de manutenção podem ficar distribuídas em sistemas, planilhas ou processos diferentes.

O SENAI Hub resolve esse problema por meio de:

- autenticação centralizada;
- controle de acesso por perfil;
- integração entre dados acadêmicos;
- acompanhamento de aprendizes por empresas;
- registro digital de frequência;
- cálculo salarial baseado em contrato e faltas;
- abertura e acompanhamento de chamados;
- organização das tarefas de manutenção;
- controle de estoque;
- visualização de pessoas e chamados no campus;
- relatórios e exportações;
- notificações em tempo real;
- interface adaptável a tema e idioma.

---

## 3. Tecnologias utilizadas

| Tecnologia | Função no projeto |
|---|---|
| React Native | Construção da interface mobile |
| Expo | Ambiente de desenvolvimento e acesso a recursos do dispositivo |
| Expo Router | Navegação baseada nos arquivos da pasta `app` |
| TypeScript | Tipagem, segurança e melhor manutenção do código |
| Supabase Auth | Login, sessão e recuperação de senha |
| Supabase PostgreSQL | Banco de dados relacional |
| Supabase Realtime | Atualização de notificações em tempo real |
| Supabase Edge Functions | Operações administrativas protegidas no backend |
| Row Level Security | Segurança dos registros diretamente no banco |
| Zustand | Estado global da autenticação, preferências e chatbot |
| React Hook Form | Controle de formulários |
| Zod | Validação dos dados dos formulários |
| Cloudinary | Armazenamento de imagens e arquivos |
| Expo Image Picker | Seleção de imagens da galeria |
| Expo Location | Localização e geofencing |
| Expo Task Manager | Tarefas de localização em segundo plano |
| Three.js, Expo GL e Expo Three | Renderização do mapa 3D |
| XLSX | Criação de planilhas Excel |
| Expo Print | Geração de PDF |
| Azure Translator | Tradução da interface |
| API externa do chatbot | Processamento das conversas do assistente |

### Por que React Native e Expo?

React Native permite reutilizar grande parte do código em Android, iOS e web. O Expo simplifica recursos como câmera, galeria, localização, impressão, compartilhamento e roteamento.

### Por que TypeScript?

O TypeScript permite definir tipos como `Aluno`, `Turma`, `Chamado` e `Tarefa`. Isso reduz erros porque o editor consegue avisar quando um dado obrigatório não existe ou possui formato incorreto.

---

## 4. Organização do código

```text
senai-hub-app/
├── app/                    # Telas e rotas
│   ├── aluno/              # Portal do aluno
│   ├── connect/            # Telas do SENAI Connect
│   ├── grid/               # Telas do SENAI Grid
│   ├── login.tsx
│   ├── hub.tsx
│   └── perfil.tsx
├── src/
│   ├── components/         # Componentes reutilizáveis
│   ├── constants/          # Rotas, perfis, cores e menus
│   ├── hooks/              # Lógicas reutilizáveis de React
│   ├── lib/                # Supabase, permissões, auth e geofence
│   ├── services/           # Comunicação com banco e APIs
│   ├── stores/             # Estados globais Zustand
│   ├── tasks/              # Tarefas em segundo plano
│   ├── types/              # Tipos TypeScript
│   └── utils/              # Validação, máscaras e cálculos auxiliares
├── supabase/
│   ├── functions/          # Edge Functions
│   └── migrations/         # Alterações SQL
└── assets/                 # Logos, imagens, mapas e modelos 3D
```

### Separação de responsabilidades

- A **tela** mostra dados e recebe ações do usuário.
- O **hook** controla estados reutilizáveis, como carregamento e CRUD.
- O **service** executa consultas e alterações no Supabase.
- O **store** mantém estados globais, como sessão e preferências.
- O **banco** valida relacionamentos e permissões.
- A **Edge Function** executa operações que não podem usar chaves administrativas no aplicativo.

### Exemplo do caminho de uma ação

Ao cadastrar um curso:

```text
Tela de cursos
    ↓
useCrudResource
    ↓
connectService.createCurso
    ↓
Supabase
    ↓
Tabela connect.cursos
    ↓
Recarregamento da lista na tela
```

---

## 5. Inicialização do aplicativo

O ponto principal é `app/_layout.tsx`.

Na inicialização, o aplicativo:

1. carrega a sessão salva do Supabase;
2. carrega tema e idioma do armazenamento local;
3. mostra uma tela de carregamento enquanto isso acontece;
4. inicia o monitoramento de geofence quando a sessão pertence a um aluno;
5. registra as rotas principais;
6. disponibiliza o diálogo global de confirmação;
7. disponibiliza o chatbot sobre todas as telas.

O arquivo `app/index.tsx` decide o primeiro redirecionamento:

- sem sessão: `/login`;
- aluno: `/aluno/dashboard`;
- demais perfis: `/hub`.

---

## 6. Autenticação e sessão

### Fluxo de login

O login começa em `app/login.tsx`.

1. O formulário recebe e-mail e senha.
2. React Hook Form controla os campos.
3. Zod valida o formato.
4. `auth.store.ts` chama `authService.login`.
5. O serviço usa `supabase.auth.signInWithPassword`.
6. Depois da autenticação, busca o perfil em `hub.usuarios`.
7. Verifica se a conta está ativa.
8. Busca os aplicativos liberados em `hub.usuario_aplicacoes`.
9. Monta a sessão usada pelo restante do aplicativo.
10. A função `getPostLoginRoute` escolhe o destino.

### O que existe na sessão?

```ts
{
  userId,
  email,
  perfil,
  aplicacoes
}
```

O `perfil` contém informações como nome, tipo e status. A lista `aplicacoes` informa se o usuário pode acessar Connect ou Grid.

### Persistência da sessão

O cliente Supabase está configurado com:

- `persistSession: true`;
- `autoRefreshToken: true`;
- armazenamento compatível com React Native;
- limpeza de tokens inválidos ou revogados.

Assim, o usuário pode fechar e abrir o aplicativo sem precisar realizar login novamente, enquanto a sessão continuar válida.

### Logout

O logout:

1. encerra o monitoramento de localização do aluno;
2. remove a sessão local do Supabase;
3. limpa a sessão do Zustand;
4. redireciona para o login.

### Recuperação de senha

A tela `recuperar-senha.tsx` utiliza `supabase.auth.resetPasswordForEmail`. O Supabase envia um link de recuperação ao e-mail. Depois que o usuário abre o link e recebe uma sessão de recuperação, `redefinir-senha.tsx` usa `supabase.auth.updateUser` para salvar a nova senha.

**Observação importante:** existem Edge Functions de recuperação por código, mas elas estão marcadas como `stub` e ainda possuem tarefas pendentes. O fluxo realmente conectado à interface atual é o fluxo padrão por link do Supabase.

---

## 7. Controle de acesso e segurança

O aplicativo não mostra as mesmas telas para todos.

### Camadas de segurança

1. **Autenticação**: confirma a identidade pelo Supabase Auth.
2. **Aplicação liberada**: confirma se Connect ou Grid está disponível.
3. **Permissões no frontend**: controla menus, botões e rotas.
4. **Proteção dos layouts**: redireciona acessos indevidos.
5. **RLS no Supabase**: protege os dados mesmo que alguém tente chamar a API diretamente.
6. **Edge Functions**: protegem ações administrativas.

### Perfis reconhecidos

O projeto suporta perfis mobile e aliases dos perfis web:

- `admin`;
- `direcao`;
- `secretaria`;
- `professor`;
- `aluno`;
- `empresa`;
- `manutencao`;
- `gerente_manutencao`;
- `connect_professor`;
- `connect_secretaria`;
- `connect_aqv`;
- `connect_empresa`;
- `connect_aluno`;
- `grid_chefe`;
- `grid_funcionario`.

### Exemplos de permissões

- Admin e direção possuem acesso total.
- Secretaria administra alunos, professores, cursos, turmas, contratos e frequência.
- Professor visualiza suas turmas e registra frequência.
- Empresa visualiza apenas contratos, frequência e salários relacionados aos seus aprendizes.
- Aluno acessa seu portal individual.
- Funcionário da manutenção acompanha chamados, tarefas e estoque.
- Chefe da manutenção também administra equipe, estoque e relatórios.

### Proteção das rotas

Os arquivos `connect/_layout.tsx` e `grid/_layout.tsx` verificam a sessão e a permissão a cada mudança de rota. Se uma rota não for permitida, o usuário é enviado para a tela padrão do seu perfil.

Isso é importante porque esconder um botão não é suficiente: a rota também precisa ser protegida.

### Row Level Security

O banco oficial ativa RLS nas tabelas dos schemas `hub`, `connect` e `grid`.

Exemplos:

- o usuário pode visualizar ou atualizar somente dados autorizados;
- o aluno acessa dados relacionados ao próprio cadastro;
- o professor acessa turmas vinculadas a ele;
- a empresa acessa aprendizes vinculados aos seus contratos;
- gestores de manutenção possuem permissões maiores no Grid.

---

## 8. SENAI Hub

O Hub é a área central exibida depois do login para usuários que não são alunos.

### Funções

- saudação com o primeiro nome do usuário;
- exibição dos aplicativos liberados;
- acesso ao Connect;
- acesso ao Grid;
- acesso às notificações;
- acesso ao perfil;
- logout.

Os cards são montados dinamicamente. O Connect só aparece quando `canAccessConnect` retorna verdadeiro. O Grid usa a mesma lógica com `canAccessGrid`.

Isso permite ter uma única aplicação e experiências diferentes para cada perfil.

---

## 9. SENAI Connect

O Connect concentra as funcionalidades acadêmicas e administrativas.

### 9.1 Dashboard acadêmico

A tela `connect/index.tsx` carrega:

- total de alunos;
- total de professores;
- total de turmas;
- total de cursos;
- cursos por período;
- frequência geral;
- lançamentos por data;
- turmas por curso;
- salários por mês;
- turmas recentes;
- atalhos para ações frequentes.

Os dados são reais e vêm dos services do Supabase. Os gráficos são derivados das listas carregadas.

### Dashboard da empresa

Quando o perfil é empresa, o dashboard muda. Ele apresenta:

- aprendizes vinculados;
- contratos por status;
- indicadores de presença;
- fechamento salarial;
- contratos recentes;
- atalhos somente para áreas permitidas.

O `useEmpresaContext` e o `empresa.service.ts` resolvem qual empresa corresponde à sessão.

---

### 9.2 Gestão de alunos

A tela `connect/alunos.tsx` permite:

- listar alunos;
- pesquisar e filtrar;
- cadastrar;
- editar;
- excluir;
- vincular curso;
- vincular turma;
- vincular empresa;
- informar RM e dados pessoais;
- selecionar foto.

### Lógica completa de cadastro de aluno

O método `connectService.createAluno` executa várias ações relacionadas:

1. valida se uma empresa ativa foi selecionada;
2. cria o usuário no Supabase Auth;
3. cria o perfil em `hub.usuarios`;
4. cria o registro em `connect.alunos`;
5. sincroniza o aluno com a turma;
6. cria ou atualiza automaticamente o contrato com a empresa;
7. envia a foto, quando fornecida;
8. relaciona a imagem ao aluno e ao perfil.

### Reversão automática

Se uma etapa importante falhar durante a criação, o serviço tenta remover os registros parciais. Isso evita deixar um usuário de autenticação sem aluno correspondente.

Esse comportamento se aproxima de uma transação de negócio no lado da aplicação.

### Foto opcional

A foto não é obrigatória. Se nenhuma imagem for escolhida, o cadastro continua normalmente.

---

### 9.3 Gestão de professores

A tela `connect/professores.tsx` permite:

- cadastrar professores;
- editar dados;
- excluir;
- registrar especialidade;
- registrar contato e endereço;
- registrar datas;
- definir status;
- adicionar foto de perfil.

O cadastro também cria um usuário de autenticação e um perfil no Hub. A tabela `connect.professores` mantém os dados específicos do professor.

---

### 9.4 Gestão de usuários Connect

A tela `connect/usuarios.tsx` administra usuários internos do Connect.

O fluxo reutiliza as funções de usuário do Grid porque a entidade central é a mesma: `hub.usuarios`. O tipo de usuário define a área e as permissões liberadas.

---

### 9.5 Cursos

A tela `connect/cursos.tsx` permite:

- criar, editar e excluir cursos;
- definir nome e descrição;
- selecionar modalidade;
- definir período;
- informar carga horária;
- definir datas de início e término;
- controlar status;
- visualizar distribuição por período.

Os dados são armazenados em `connect.cursos`.

---

### 9.6 Turmas

A tela `connect/turmas.tsx` permite:

- criar, editar e excluir turmas;
- vincular um curso;
- vincular professor responsável;
- definir período;
- definir datas;
- definir horários;
- consultar alunos da turma.

Quando o professor é vinculado, o sistema sincroniza `connect.professor_turmas`. Essa tabela é importante tanto para a regra de negócio quanto para as políticas de segurança.

Para o perfil professor, a tela lista somente as turmas ligadas ao seu usuário.

---

### 9.7 Empresas

A tela `connect/empresas.tsx` gerencia:

- nome;
- CNPJ;
- e-mail;
- telefone;
- endereço;
- responsável;
- status.

Somente empresas ativas aparecem na seleção obrigatória do cadastro de aluno.

As empresas também podem ter um usuário vinculado para acessar o seu portal.

---

### 9.8 Contratos

A tela `connect/contratos.tsx` gerencia contratos de aprendizagem.

Cada contrato pode relacionar:

- aluno;
- empresa;
- valor mensal;
- carteira de trabalho;
- conta bancária;
- carga horária;
- localização da empresa;
- e-mail da empresa;
- data de início;
- data de término;
- status.

Quando um aluno é cadastrado com uma empresa, o sistema tenta criar ou atualizar automaticamente seu contrato.

O perfil empresa possui acesso somente de leitura aos contratos dos seus aprendizes.

---

### 9.9 Registro de frequência

A tela `connect/frequencia.tsx` implementa uma chamada por turma e data.

O professor:

1. seleciona a turma;
2. seleciona a data;
3. informa a quantidade de aulas;
4. visualiza os alunos;
5. marca presença, falta justificada ou falta injustificada;
6. informa quantas aulas foram perdidas;
7. salva a chamada.

### Como a chamada é salva

O método `saveChamada`:

1. procura uma aula da turma na mesma data com disciplina `Chamada`;
2. cria a aula se ela não existir;
3. atualiza a aula se já existir;
4. monta um registro de frequência para cada aluno;
5. usa `upsert` com a combinação aula e aluno;
6. impede duplicação e permite corrigir uma chamada já registrada.

Se o status for presença, o número de aulas perdidas é zero. Em caso de falta, o valor fica limitado à quantidade total de aulas.

### Acesso do professor

O professor visualiza somente turmas vinculadas a ele. Essa filtragem existe no aplicativo e também deve ser respeitada pelo RLS.

---

### 9.10 Gerenciamento de frequência

A tela `connect/gerenciar-frequencia.tsx` apresenta:

- registros recentes;
- evolução da frequência;
- faltas justificadas;
- faltas injustificadas;
- filtro por aprendiz;
- exportação em PDF;
- exportação em Excel.

Para empresa, os dados são filtrados pelos alunos relacionados aos contratos da empresa.

---

### 9.11 Cálculo salarial

A tela `connect/salario.tsx` possui:

- seleção de mês;
- seleção de aluno;
- simulador;
- prévia antes de salvar;
- bonificações;
- descontos;
- cálculo individual;
- cálculo em lote;
- consulta dos fechamentos;
- exportação em PDF e Excel.

### Fórmula usada pela aplicação

O método principal atualmente usado é `connectService.previewSalary`.

```text
salário-base = valor mensal do contrato
```

Quando o contrato não possui valor mensal:

```text
salário-base padrão = R$ 1.518,00
```

O aplicativo considera 22 dias úteis:

```text
valor diário = salário-base / 22
desconto por faltas = valor diário × faltas injustificadas
salário líquido = salário-base + bonificações - descontos
```

Faltas justificadas são contabilizadas nos indicadores, mas não entram automaticamente no desconto. Faltas injustificadas geram o desconto padrão.

### Prévia e persistência

- `previewSalary` calcula sem salvar.
- `calculateSalary` calcula e cria ou atualiza o registro do aluno naquele mês.
- `calculateSalaryBatch` processa todos os alunos ativos.
- `calculateSalaryForAluno` produz o resumo exibido no portal do aluno.

O sistema evita duplicar o fechamento mensal: se já existir um registro para aluno e mês, ele é atualizado.

### Observação sobre a Edge Function

Existe uma Edge Function `calculate-salary`, mas a tela atual utiliza principalmente a lógica do `connect.service.ts`. A Edge Function representa uma alternativa de cálculo no backend e usa parâmetros diferentes. Em uma evolução do projeto, o ideal é manter uma única fórmula oficial no backend para evitar divergências.

---

### 9.12 Localização de alunos

A tela `connect/localizacao.tsx` reúne:

- turmas;
- alunos;
- registros de localização;
- informação de dentro ou fora do perímetro;
- informação de aula;
- mapa do campus;
- seleção de pessoas.

Para professor, são carregadas somente suas turmas e os respectivos alunos.

### Geofencing

Quando um aluno entra no aplicativo em um dispositivo compatível:

1. o sistema identifica o aluno pelo `userId`;
2. solicita permissão de localização em primeiro plano;
3. solicita permissão em segundo plano;
4. registra uma região circular ao redor do SENAI;
5. recebe eventos de entrada e saída;
6. obtém a posição atual;
7. atualiza `connect.localizacoes_alunos`.

O perímetro padrão usa:

- latitude `-22.5648`;
- longitude `-47.4014`;
- raio de 150 metros.

Esses valores podem ser alterados por variáveis de ambiente.

### Limitação técnica

O geofencing em segundo plano não funciona na web e não é executado no Expo Go. Para testar completamente, é necessário um development build ou aplicativo instalado.

---

### 9.13 Relatórios acadêmicos

A tela `connect/relatorios.tsx` oferece:

- indicadores;
- filtros;
- gráficos;
- evolução da frequência;
- alunos por curso;
- desempenho por turma;
- seleção das seções do relatório;
- seleção das colunas;
- modelos rápidos;
- título e subtítulo personalizados;
- pré-visualização;
- exportação PDF e Excel.

O componente reutilizável `MobileReportBuilder` monta o relatório a partir das seções escolhidas.

---

## 10. Portal do aluno

O aluno não entra no Hub tradicional. Depois do login, é enviado diretamente a `/aluno/dashboard`.

### 10.1 Dashboard

Exibe:

- perfil acadêmico;
- curso;
- turma;
- resumo de frequência;
- gráfico de presenças;
- composição salarial;
- aulas recentes.

### 10.2 Frequência e salário

Exibe:

- percentual de frequência;
- salário-base;
- valor por dia;
- desconto;
- salário final;
- faltas injustificadas;
- lançamentos do mês;
- exportação do holerite em PDF ou Excel.

### 10.3 Grade

Exibe:

- curso;
- turma;
- empresa;
- contrato;
- aulas registradas;
- presença em cada aula.

### 10.4 Perfil do aluno

Exibe informações pessoais, acadêmicas e contratuais em modo de leitura, além da opção de logout.

### Agregação dos dados

O `studentService.getDashboard` identifica o aluno pelo usuário autenticado e carrega em paralelo:

- frequência;
- salário calculado;
- contratos;
- localização.

Caso uma consulta secundária falhe, o serviço utiliza um valor vazio para não derrubar toda a tela.

---

## 11. SENAI Grid

O Grid concentra as operações de infraestrutura e manutenção.

### 11.1 Dashboard

A tela `grid/index.tsx` exibe:

- chamados abertos;
- chamados em andamento;
- chamados concluídos;
- itens com estoque baixo;
- chamados recentes;
- tarefas por prioridade;
- chamados por status;
- evolução das aberturas;
- tarefas por status;
- estoque por status;
- estoque por categoria;
- atalhos operacionais.

Os indicadores são calculados a partir dos dados das tabelas `grid.chamados`, `grid.tarefas` e `grid.itens_estoque`.

---

### 11.2 Chamados

A tela `grid/chamados.tsx` permite:

- abrir chamado;
- informar título e descrição;
- selecionar categoria;
- selecionar bloco e sala;
- definir prioridade;
- anexar foto;
- atribuir responsável;
- iniciar atendimento;
- editar;
- acompanhar detalhes;
- concluir com evidência;
- excluir, conforme a permissão.

### Fluxo do chamado

```text
Aberto
   ↓ atribuição
Aguardando
   ↓ início
Em andamento
   ↓ validação e evidência
Concluído
```

### Código automático

Se nenhum código for informado, o serviço gera um identificador para o chamado.

### Atribuição

Ao atribuir um responsável:

- o `responsavel_id` é salvo;
- o status passa para `aguardando`.

### Início do atendimento

Ao iniciar:

1. o sistema exige um responsável;
2. procura uma tarefa ligada ao chamado;
3. move a tarefa para `em_andamento`, se ela existir;
4. cria uma tarefa, caso ainda não exista;
5. muda o chamado para `em_andamento`;
6. registra a data de início.

### Conclusão com evidência

Para concluir um chamado, deve existir uma foto de evidência. A imagem é enviada ao Cloudinary e relacionada ao chamado na tabela `grid.anexos_chamado`.

Essa regra evita encerrar um atendimento sem comprovação visual.

---

### 11.3 Tarefas

A tela `grid/tarefas.tsx` organiza o trabalho da manutenção.

Permite:

- criar tarefa;
- vincular chamado;
- criar um chamado automaticamente quando necessário;
- definir responsável;
- definir prioridade;
- vincular item de estoque;
- editar;
- mover entre etapas;
- visualizar detalhes;
- excluir.

### Estados da tarefa

Os estados principais são:

- `a_fazer`;
- `em_andamento`;
- `concluida`;
- `cancelado`.

Ao mover uma tarefa:

- o status e a coluna são sincronizados;
- o rótulo do status é atualizado;
- o início do reparo é registrado;
- a conclusão registra o horário final;
- o chamado relacionado também pode ser atualizado.

---

### 11.4 Estoque

A tela `grid/estoque.tsx` permite:

- cadastrar itens;
- editar;
- excluir;
- selecionar categoria;
- selecionar fornecedor;
- informar quantidade disponível;
- informar quantidade mínima;
- informar unidade;
- informar localização;
- informar custo;
- acompanhar disponibilidade.

### Regra de estoque baixo

Quando:

```text
quantidade disponível <= quantidade mínima
```

o item pode ser classificado como indisponível e aparece nos alertas do dashboard.

Somente itens com quantidade disponível maior que zero aparecem nas opções de associação a tarefas.

---

### 11.5 Usuários da manutenção

A tela `grid/usuarios.tsx` gerencia usuários dos tipos:

- manutenção;
- gerente de manutenção;
- funcionário Grid;
- chefe Grid.

A criação de usuários passa pela Edge Function protegida. Um chefe de manutenção só pode criar perfis operacionais permitidos.

---

### 11.6 Mapa de chamados

A tela `grid/mapa-tarefas.tsx` posiciona chamados e tarefas no campus.

Ela permite:

- filtrar marcadores;
- selecionar bloco;
- selecionar atendimento;
- destacar o item no mapa;
- abrir detalhes;
- visualizar tipo, prioridade e status.

### Mapa 3D

O componente `CampusMap3D`:

- carrega modelos `.glb` dos blocos A, B, C e D;
- usa Three.js e WebGL;
- permite rotação;
- permite zoom;
- permite selecionar blocos e marcadores;
- altera a transparência dos prédios para melhorar a visualização;
- possui modo de tela cheia;
- usa raycasting para identificar o objeto tocado.

### Mapa 2.5D

Também existe um componente baseado em imagens de pavimentos, com:

- troca de andar;
- zoom;
- movimento por gesto;
- projeção aproximada das coordenadas;
- pinos coloridos.

Ele funciona como uma visualização alternativa para localização.

---

### 11.7 Relatórios Grid

A tela `grid/relatorios.tsx` apresenta:

- volume de chamados;
- distribuição por prioridade;
- distribuição por status;
- carga por responsável;
- tarefas;
- equipe técnica;
- estoque;
- chamados recentes;
- filtros;
- construtor de relatório;
- exportação PDF e Excel.

O Grid reutiliza o mesmo `MobileReportBuilder` utilizado pelo Connect.

---

## 12. CRUD reutilizável

CRUD significa:

- **Create**: criar;
- **Read**: ler;
- **Update**: atualizar;
- **Delete**: excluir.

O hook `useCrudResource` centraliza esse comportamento.

Ele mantém:

- lista de itens;
- estado de carregamento;
- estado de envio;
- mensagem de erro;
- função de recarregar;
- função de criar;
- função de editar;
- exclusão com confirmação.

Depois de criar ou editar, a lista é carregada novamente. Antes de excluir, o usuário recebe um diálogo de confirmação.

### CrudModal

O componente `CrudModal` cria formulários reutilizáveis com:

- campos de texto;
- campos obrigatórios;
- máscaras;
- listas pesquisáveis;
- seleção de imagem;
- validação;
- mensagens de erro;
- normalização dos valores.

Isso reduz código duplicado entre alunos, professores, cursos, empresas, estoque e usuários.

---

## 13. Upload de imagens e arquivos

O fluxo de upload possui duas etapas:

1. envio do arquivo ao Cloudinary;
2. gravação dos metadados no Supabase.

### Dados salvos em `hub.arquivos`

- URL segura;
- `public_id` do Cloudinary;
- tipo do arquivo;
- tamanho em bytes;
- usuário que enviou;
- tipo do relacionamento;
- ID do registro relacionado.

### Foto de perfil

Depois do upload:

- o ID do arquivo é salvo em `foto_arquivo_id`;
- a URL pública é salva em `foto_url`;
- a sessão é atualizada para mostrar a nova imagem.

### Imagens de chamados

Os anexos são relacionados ao chamado como:

- imagem de abertura;
- evidência de conclusão.

### Segurança das chaves

O aplicativo usa apenas configurações públicas permitidas, como preset unsigned. Segredos administrativos, `service_role` e `CLOUDINARY_API_SECRET` devem ficar somente em Edge Functions ou backend seguro.

---

## 14. Perfil e preferências

A tela `perfil.tsx` permite:

- visualizar informações da conta;
- trocar foto;
- editar nome, e-mail, telefone e CPF;
- alternar tema claro e escuro;
- selecionar idioma;
- abrir recuperação de senha;
- consultar perfil de acesso e versão;
- sair da conta.

### Confirmação por senha

Antes de salvar alterações pessoais, o aplicativo autentica novamente o usuário com a senha atual. Se a senha estiver errada, nenhuma alteração é salva.

### Preferências locais

Tema e idioma são armazenados no AsyncStorage. Na próxima abertura, `hydratePreferences` recupera essas configurações.

### Idiomas

O aplicativo oferece:

- português;
- inglês;
- espanhol;
- francês;
- alemão;
- italiano;
- japonês;
- chinês simplificado.

O português usa traduções locais. Outros idiomas podem usar o Azure Translator, com cache para evitar traduções repetidas.

---

## 15. Notificações em tempo real

As notificações ficam em `hub.notificacoes`.

O aplicativo permite:

- listar notificações;
- contar não lidas;
- marcar uma como lida;
- marcar todas como lidas.

O hook `useNotifications` abre um canal do Supabase Realtime. Quando ocorre inserção ou atualização na tabela para aquele usuário, a lista é recarregada automaticamente.

Essa é a diferença entre atualização em tempo real e uma tela que só atualiza quando é aberta novamente.

---

## 16. Chatbot

O chatbot aparece globalmente por meio de `ChatbotPortal`.

### Funções

- abrir e fechar o assistente;
- listar conversas;
- criar conversa;
- carregar mensagens;
- enviar mensagem;
- manter histórico;
- arquivar conversa;
- mostrar resposta de forma otimista na interface.

### Arquitetura

```text
Aplicativo
    ↓ token JWT do Supabase
Backend externo do chatbot
    ↓
Modelo de IA
    ↓
Resposta para o aplicativo
```

O token do Supabase é enviado no cabeçalho `Authorization`. O backend pode identificar o usuário e impedir acesso ao histórico de outras pessoas.

As tabelas `hub.chatbot_conversas` e `hub.chatbot_mensagens` possuem RLS para que cada usuário acesse apenas suas próprias conversas.

### Dependência externa

O chatbot depende de um backend configurado em `EXPO_PUBLIC_CHATBOT_API_URL`. Sem esse servidor, a interface continua existindo, mas o assistente não consegue responder.

---

## 17. Relatórios e exportação

### PDF

O serviço:

1. transforma os dados em uma tabela HTML;
2. aplica estilos;
3. inclui título e data;
4. usa Expo Print no dispositivo;
5. abre o compartilhamento do arquivo.

Na web, abre uma janela de impressão ou baixa um arquivo HTML quando a janela não pode ser aberta.

### Excel

O serviço:

1. converte os objetos para uma planilha;
2. cria um workbook;
3. gera `.xlsx`;
4. baixa no navegador ou compartilha no dispositivo.

### Vantagem da abstração

Connect, Grid e portal do aluno utilizam o mesmo serviço. Isso mantém o comportamento consistente.

---

## 18. Banco de dados

O banco é dividido em schemas.

### Schema `hub`

Responsável por dados centrais:

- `usuarios`;
- `aplicacoes`;
- `usuario_aplicacoes`;
- `arquivos`;
- `notificacoes`;
- `blocos`;
- `salas`;
- auditoria;
- conversas e mensagens do chatbot.

### Schema `connect`

Responsável pela área acadêmica:

- `cursos`;
- `professores`;
- `turmas`;
- `alunos`;
- `turma_alunos`;
- `professor_turmas`;
- `empresas`;
- `aulas`;
- `frequencias`;
- `contratos_alunos`;
- `salarios_alunos`;
- `localizacoes_alunos`.

### Schema `grid`

Responsável pela manutenção:

- `categorias_manutencao`;
- `fornecedores`;
- `itens_estoque`;
- `chamados`;
- `tarefas`;
- `movimentacoes_estoque`;
- `chamado_itens`;
- `reservas_estoque`;
- `anexos_chamado`;
- `relatorios`.

### Relacionamentos importantes

```text
auth.users
    1 ─── 1 hub.usuarios

hub.usuarios
    1 ─── N hub.usuario_aplicacoes

hub.usuarios
    1 ─── 1 connect.alunos ou connect.professores

connect.cursos
    1 ─── N connect.turmas

connect.turmas
    1 ─── N connect.alunos

connect.alunos
    1 ─── N connect.frequencias

connect.alunos
    1 ─── N connect.contratos_alunos

connect.alunos
    1 ─── N connect.salarios_alunos

grid.chamados
    1 ─── N grid.tarefas

grid.chamados
    1 ─── N grid.anexos_chamado
```

### Triggers

O SQL oficial contém triggers para:

- atualizar `updated_at`;
- sincronizar colunas de compatibilidade;
- criar perfil a partir do Supabase Auth;
- sincronizar aplicações do usuário;
- gerar código do chamado;
- registrar auditoria.

---

## 19. Edge Functions

### `create-user-profile`

É a função mais importante para cadastro de usuários.

Ela:

1. valida o token de quem fez a requisição;
2. busca o perfil do solicitante;
3. verifica se ele pode criar aquele tipo de usuário;
4. usa `auth.admin.createUser`;
5. confirma o e-mail;
6. cria ou atualiza `hub.usuarios`;
7. remove o usuário Auth se a criação do perfil falhar;
8. permite reversão controlada de cadastro de aluno.

Isso é necessário porque a chave administrativa do Supabase não pode ficar dentro do aplicativo.

### `calculate-salary`

Implementa uma versão de cálculo salarial no backend. Atualmente, a interface usa a lógica principal do service do aplicativo.

### `cloudinary-sign-upload`

Gera assinatura de upload usando segredos disponíveis somente no ambiente da função.

### `notify-email`

Possui a estrutura para envio por SMTP, mas atualmente registra um `stub`.

### Recuperação por código

`auth-request-reset-code` e `auth-verify-reset-code` são estruturas iniciais. Ainda faltam geração segura, armazenamento do hash, expiração, envio e alteração real da senha.

---

## 20. Compatibilidade e tolerância a versões do banco

Os services possuem funções como `insertWithFallback` e `updateWithFallback`.

Elas tentam mais de um formato de payload quando existem diferenças entre versões do banco, por exemplo:

- nomes de colunas antigos e novos;
- `status` e `coluna`;
- `observacao` e `observacoes`;
- `mes_referencia` e `reference_month`;
- `quantidade_aulas_faltadas` e `missed_lessons`.

Isso facilita a migração, mas não substitui a necessidade de manter o banco atualizado.

---

## 21. Tratamento de erros e experiência do usuário

O aplicativo trata:

- carregamento;
- listas vazias;
- falhas de rede;
- erro de permissão;
- erro de schema não exposto;
- dados obrigatórios;
- UUID inválido;
- confirmação antes da exclusão;
- falha de upload;
- senha incorreta;
- sessão expirada;
- ausência de configuração externa.

Os services transformam erros técnicos do Supabase em mensagens mais compreensíveis.

---

## 22. Recursos multiplataforma

### Web

- download direto de Excel;
- impressão por janela do navegador;
- upload via `Blob` e `File`;
- sem geofencing em segundo plano.

### Android e iOS

- compartilhamento nativo de PDF e Excel;
- seleção de imagens;
- localização;
- geofencing;
- armazenamento local da sessão;
- uso de gestos.

---

## 23. Configuração necessária

Principais variáveis:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
EXPO_PUBLIC_SENAI_LATITUDE=
EXPO_PUBLIC_SENAI_LONGITUDE=
EXPO_PUBLIC_SENAI_RAIO_METROS=
EXPO_PUBLIC_AZURE_API=
EXPO_PUBLIC_AZURE_REGION=
EXPO_PUBLIC_CHATBOT_API_URL=
```

Variáveis privadas devem ficar no backend:

```env
SUPABASE_SERVICE_ROLE_KEY=
CLOUDINARY_API_SECRET=
SMTP_PASS=
```

### Por que não colocar segredos no `.env` do Expo?

Variáveis `EXPO_PUBLIC_*` são incorporadas ao aplicativo e podem ser lidas por quem possui o pacote. Por isso, somente valores públicos devem usar esse prefixo.

---

## 24. O que está implementado e o que depende de configuração

| Recurso | Situação |
|---|---|
| Login e sessão Supabase | Implementado |
| Controle de acesso por perfil | Implementado |
| CRUD acadêmico | Implementado |
| Frequência por chamada | Implementado |
| Contrato automático do aluno | Implementado |
| Cálculo salarial no aplicativo | Implementado |
| Portal do aluno | Implementado |
| CRUD de chamados, tarefas e estoque | Implementado |
| Evidência na conclusão do chamado | Implementado |
| PDF e Excel | Implementado |
| Tema claro e escuro | Implementado |
| Tradução | Implementada, depende do Azure para idiomas remotos |
| Notificações Realtime | Implementadas, dependem do Realtime habilitado |
| Upload de imagens | Implementado, depende do Cloudinary |
| Mapa 3D | Implementado, depende de suporte WebGL |
| Geofencing | Implementado, depende de permissões e development build |
| Chatbot | Interface implementada, depende do backend externo |
| Recuperação por link | Implementada pelo Supabase Auth |
| Recuperação personalizada por código | Estrutura inicial, ainda não finalizada |
| Envio SMTP personalizado | Estrutura inicial, ainda não finalizada |

---

## 25. Pontos técnicos que devem ser explicados com honestidade

1. O app possui fallbacks para diferentes versões de colunas, mas o banco oficial e suas políticas precisam estar aplicados.
2. Os schemas `hub`, `connect` e `grid` precisam estar expostos na API do Supabase.
3. A Edge Function `create-user-profile` precisa estar publicada e receber a `service_role`.
4. O vínculo `professor_turmas` é necessário para o professor registrar dados nas suas turmas.
5. Permissões do frontend e políticas RLS precisam permanecer alinhadas.
6. O chatbot não executa o modelo dentro do celular; ele chama um backend.
7. O geofencing completo não deve ser demonstrado pelo Expo Go.
8. A recuperação por código ainda não é o fluxo usado pela interface.
9. Existem duas implementações de cálculo salarial; a tela atual usa o service do aplicativo.
10. O layout do portal aceita diretamente o perfil `aluno`; o alias `connect_aluno` deve ser validado antes de uma implantação que utilize esse nome.

---

## 26. Roteiro sugerido de demonstração

### Etapa 1: login

Explique:

- validação com React Hook Form e Zod;
- autenticação pelo Supabase;
- busca do perfil;
- redirecionamento por função.

### Etapa 2: Hub

Mostre:

- cards liberados;
- notificações;
- perfil;
- tema e idioma.

### Etapa 3: Connect

Demonstre:

1. dashboard;
2. cadastro ou edição de aluno;
3. vínculo com turma e empresa;
4. chamada;
5. prévia salarial;
6. relatório.

### Etapa 4: Grid

Demonstre:

1. abertura de chamado;
2. atribuição;
3. transformação em tarefa;
4. andamento;
5. conclusão com evidência;
6. estoque;
7. mapa;
8. relatório.

### Etapa 5: aluno

Mostre, se houver uma conta preparada:

- redirecionamento direto;
- frequência;
- salário;
- grade;
- contrato.

### Etapa 6: arquitetura

Finalize mostrando:

- pasta de rotas;
- service;
- tabela correspondente;
- RLS;
- Edge Function.

---

## 27. Fala sugerida para uma apresentação de 8 a 10 minutos

### Abertura

> Meu projeto é o SENAI Hub, um aplicativo multiplataforma que centraliza serviços acadêmicos e de manutenção. Ele foi desenvolvido com React Native, Expo e TypeScript, utilizando Supabase para autenticação, banco e segurança.

### Problema

> A ideia é evitar que informações de alunos, turmas, contratos, frequência e manutenção fiquem separadas. O Hub identifica o perfil do usuário e entrega somente as ferramentas necessárias para ele.

### Arquitetura

> O código foi dividido em telas, componentes, services, stores e banco. As telas cuidam da interface, os services conversam com o Supabase, o Zustand mantém estados globais e o banco aplica as políticas de segurança.

### Connect

> No Connect é possível gerenciar alunos, professores, cursos, turmas, empresas e contratos. O professor registra a chamada por turma e o sistema utiliza as faltas injustificadas no cálculo salarial do aprendiz.

### Grid

> No Grid o usuário abre chamados, define local e prioridade, atribui um responsável e acompanha o serviço como tarefa. Para concluir, o sistema pode exigir uma foto de evidência. O módulo também controla estoque e mostra os atendimentos no mapa do campus.

### Segurança

> A segurança não depende apenas da interface. As rotas são verificadas pelo perfil e o banco usa Row Level Security. A criação de usuários é feita por uma Edge Function para que a chave administrativa nunca fique exposta no aplicativo.

### Encerramento

> O resultado é uma aplicação única, mas adaptada para administrador, secretaria, professor, empresa, aluno e manutenção. O projeto também possui relatórios, notificações em tempo real, upload de imagens, tradução, mapas e integração com chatbot.

---

## 28. Perguntas prováveis e respostas

### O que diferencia o Hub do Connect e do Grid?

O Hub é a camada central de identidade, permissões e acesso. O Connect cuida da operação acadêmica. O Grid cuida da infraestrutura e manutenção.

### Como o sistema sabe o que mostrar?

Depois do login, ele busca o tipo do usuário e suas aplicações. As funções de permissão filtram cards, menus, botões e rotas.

### Esconder o botão garante segurança?

Não. Por isso também existem proteção de rota, RLS no banco e validação nas Edge Functions.

### Por que usar três schemas?

Para separar responsabilidades. `hub` contém dados comuns, `connect` contém dados acadêmicos e `grid` contém manutenção. Isso organiza o banco e facilita políticas específicas.

### Por que usar Zustand?

Para manter sessão, preferências e chatbot disponíveis em várias telas sem precisar passar dados manualmente entre todos os componentes.

### Como evita duplicar frequência?

A combinação de aula e aluno é usada no `upsert`. Se o registro existir, é atualizado; se não existir, é criado.

### Como o salário é calculado?

O valor mensal do contrato é dividido por 22 dias. Cada falta injustificada desconta um valor diário. Bonificações e descontos adicionais também entram no valor final.

### Faltas justificadas descontam salário?

Na lógica atual, não automaticamente. O desconto padrão considera faltas injustificadas.

### O que acontece se não houver contrato?

A prévia usa o valor-base padrão de R$ 1.518,00. Em produção, a regra pode ser alterada para exigir contrato em vez de usar fallback.

### O cálculo é feito no frontend?

A implementação principal atual está no service TypeScript e salva o resultado no Supabase. Existe também uma Edge Function de cálculo. A evolução recomendada é centralizar a fórmula oficial no backend.

### Como um professor vê somente suas turmas?

O sistema encontra o professor pelo `usuario_id` e consulta `professor_turmas`. Existe também um fallback pelo campo de professor responsável da turma.

### Como funciona o contrato automático?

Ao cadastrar ou editar um aluno, o sistema valida a empresa, procura um contrato compatível e cria ou atualiza o vínculo automaticamente.

### O que ocorre se o cadastro do aluno falhar no meio?

O service tenta apagar os registros parciais e também remover o usuário de autenticação criado, informando se a reversão ficou incompleta.

### Como as fotos são armazenadas?

O arquivo vai para o Cloudinary. O Supabase guarda os metadados, a URL e o relacionamento com o usuário, aluno ou chamado.

### Por que não salvar a imagem direto no banco?

Arquivos binários aumentariam o banco e o tráfego. O Cloudinary é especializado em armazenamento e entrega de mídia, enquanto o banco guarda apenas referências.

### Como funciona a localização?

O sistema registra uma região geográfica. Quando o dispositivo do aluno entra ou sai, uma tarefa de segundo plano atualiza sua posição e estado no Supabase.

### A localização funciona na web?

O cálculo de distância pode ser usado, mas o monitoramento de geofence em segundo plano está desativado na web.

### O mapa 3D é apenas uma imagem?

Não. Ele carrega modelos GLB e renderiza a cena com Three.js e WebGL, oferecendo rotação, zoom, seleção e marcadores.

### Como as notificações atualizam sem recarregar?

O aplicativo assina alterações da tabela pelo Supabase Realtime. Quando o banco muda, o hook recarrega as notificações.

### O chatbot acessa diretamente uma chave de IA?

Não. O aplicativo envia o token e a mensagem para um backend seguro. As credenciais do modelo ficam no servidor.

### Como os relatórios funcionam?

Os dados filtrados são transformados em linhas. Para PDF, o sistema gera HTML e imprime. Para Excel, cria uma planilha XLSX.

### O app funciona sem internet?

Tema, idioma e sessão persistida ficam localmente, mas as funções principais dependem do Supabase, Cloudinary e demais serviços. Portanto, ele não é offline-first.

### Por que existem fallbacks de colunas?

Para suportar a transição entre versões do banco e reduzir quebras durante a migração. O objetivo final ainda deve ser padronizar o schema.

### O que é RLS?

É a segurança por linha do PostgreSQL. Cada consulta é avaliada conforme o usuário autenticado, impedindo acesso indevido mesmo por chamadas diretas à API.

### Por que a criação de usuário usa Edge Function?

Criar usuários pelo Admin API exige uma chave secreta. A função mantém essa chave no servidor e valida se o solicitante possui permissão.

### Qual foi a principal preocupação de arquitetura?

Separar interface, regra de negócio, acesso a dados e segurança, permitindo reutilização e evitando que cada tela implemente uma lógica diferente.

### Quais melhorias futuras você faria?

- centralizar o cálculo salarial no backend;
- finalizar a recuperação personalizada por código;
- finalizar envio SMTP;
- criar testes automatizados;
- adicionar modo offline para consultas;
- reforçar auditoria;
- alinhar continuamente permissões do app e RLS;
- adicionar paginação no backend para grandes volumes;
- publicar e monitorar o backend do chatbot.

---

## 29. Arquivos importantes para mostrar ao professor

| Arquivo | O que demonstra |
|---|---|
| `app/_layout.tsx` | Inicialização global |
| `app/index.tsx` | Redirecionamento inicial |
| `app/login.tsx` | Formulário de login |
| `src/services/auth.service.ts` | Autenticação |
| `src/lib/permissions.ts` | Regras de acesso |
| `app/connect/_layout.tsx` | Proteção do Connect |
| `src/services/connect.service.ts` | Regras acadêmicas |
| `app/grid/_layout.tsx` | Proteção do Grid |
| `src/services/grid.service.ts` | Regras de manutenção |
| `src/services/student.service.ts` | Portal do aluno |
| `src/services/upload.service.ts` | Upload e metadados |
| `src/tasks/geofenceTask.ts` | Localização em segundo plano |
| `src/components/maps/CampusMap3D.tsx` | Mapa 3D |
| `src/components/reports/MobileReportBuilder.tsx` | Relatórios |
| `supabase/functions/create-user-profile/index.ts` | Backend administrativo |
| `senai_hub_supabase_definitivo.sql` | Estrutura e segurança do banco |

---

## 30. Checklist antes da apresentação

- [ ] Confirmar que o `.env` possui URL e chave pública corretas.
- [ ] Confirmar que os schemas `hub`, `connect` e `grid` estão expostos.
- [ ] Confirmar que as migrations foram aplicadas.
- [ ] Confirmar que `create-user-profile` está publicada.
- [ ] Preparar contas de admin, professor, empresa, aluno e manutenção.
- [ ] Preparar uma turma com alunos.
- [ ] Preparar frequência do mês.
- [ ] Preparar contrato com valor mensal.
- [ ] Preparar um chamado aberto.
- [ ] Preparar um item com estoque baixo.
- [ ] Confirmar Cloudinary.
- [ ] Confirmar notificações.
- [ ] Confirmar backend do chatbot ou avisar que é integração externa.
- [ ] Testar PDF e Excel.
- [ ] Não depender do geofencing no Expo Go.
- [ ] Ensaiar a explicação da fórmula salarial.
- [ ] Ensaiar a diferença entre permissão de interface e RLS.
- [ ] Ter uma resposta clara sobre recursos ainda em evolução.

---

## 31. Resumo final para memorização

```text
SENAI Hub = identidade, acesso e integração
SENAI Connect = gestão acadêmica
SENAI Grid = manutenção e infraestrutura
Portal do aluno = visão individual

Frontend = React Native + Expo + TypeScript
Estado global = Zustand
Formulários = React Hook Form + Zod
Backend e banco = Supabase
Arquivos = Cloudinary
Segurança = Auth + permissões + rotas + RLS + Edge Functions
Relatórios = PDF + Excel
Tempo real = Supabase Realtime
Localização = Expo Location + geofence
Mapa = Three.js + GLB
Chatbot = aplicativo + backend externo autenticado
```

### Frase final

> O principal valor do SENAI Hub não é apenas reunir muitas telas, mas conectar processos acadêmicos e operacionais com controle de acesso, regras de negócio e uma arquitetura preparada para diferentes perfis.
