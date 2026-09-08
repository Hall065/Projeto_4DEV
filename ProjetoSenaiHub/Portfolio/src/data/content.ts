export const project = {
  name: "SENAI Hub",
  tagline: "Plataforma integrada de educação profissional",
  semester: "4º Semestre — ADS SENAI",
  repo: "https://github.com/Hall065/Projeto_4DEV",
  figma:
    "https://www.figma.com/design/QHglNi7cxkfA9et0MDvDQV/Senai-Hub?node-id=0-1&p=f&t=KEe6K3QUaYYP4LcK-0",
  milanote: "https://app.milanote.com/1VVhMY1W5awS4v?p=xnqgoJHf9J8",
  description:
    "Um hub único que concentra Connect, Grid e SAFE — gestão acadêmica, manutenção predial e autorizações de entrada e saída — com autenticação, permissões e experiência unificada.",
}

export const heroStats = [
  {
    label: "Módulos",
    value: "04",
    detail: "Hub · Connect · Grid · SAFE",
    note: "Um login, quatro sistemas",
  },
  {
    label: "Stack",
    value: "Full",
    detail: "React + Laravel + Mobile",
    note: "SPA, API REST e Expo",
  },
  {
    label: "Status",
    value: "Live",
    detail: "Pronto para apresentar",
    note: "Demo + repositório público",
    pulse: true,
  },
]

export const team = [
  {
    name: "João Vitor Francisco",
    role: "Desenvolvimento",
    focus: "Hub, autenticação e integração entre módulos",
    tags: ["Frontend", "RBAC", "UX"],
  },
  {
    name: "Gabriel Soares",
    role: "Desenvolvimento",
    focus: "Connect, SAFE e fluxos acadêmicos / portaria",
    tags: ["API", "Workflows", "Dados"],
  },
  {
    name: "Gabriel Gomes",
    role: "Desenvolvimento",
    focus: "Grid, mapa 3D e operação predial",
    tags: ["Three.js", "Tickets", "Mobile"],
  },
]

export const modules = [
  {
    id: "hub",
    name: "Hub",
    label: "01",
    accent: "#00A9E0",
    accentSoft: "#004B93",
    logo: "/logos/hub/named.png",
    icon: "/logos/hub/icon.png",
    cover: "/covers/hub.png",
    route: "/hub",
    audience: "Todos os perfis",
    title: "Centro de aplicações",
    summary:
      "Ponto de entrada da plataforma. O usuário autentica uma vez e acessa apenas os sistemas liberados para o seu perfil.",
    highlights: ["SSO / um login", "RBAC por app", "Temas & i18n"],
    features: [
      "Login, recuperação e redefinição de senha",
      "Solicitação de acesso com fluxo de aprovação",
      "Painel de aplicações por perfil (RBAC)",
      "Gestão de usuários e papéis (admin)",
      "Arquivo histórico cross-módulo",
      "Temas e papéis de parede personalizáveis",
      "Perfil, configurações e i18n (PT / EN / ES)",
    ],
  },
  {
    id: "connect",
    name: "Connect",
    label: "02",
    accent: "#3DBE4A",
    accentSoft: "#1E4FA3",
    logo: "/logos/connect/named.png",
    icon: "/logos/connect/icon.png",
    cover: "/covers/connect.png",
    route: "/connect",
    audience: "Academia",
    title: "Gestão acadêmica",
    summary:
      "Módulo escolar completo: pessoas, turmas, frequência, calendário, contratos e relatórios em um só lugar.",
    highlights: ["Turmas & frequência", "Contratos", "Mapa 3D"],
    features: [
      "Visão geral com indicadores da unidade",
      "Cadastro de pessoas, alunos e professores",
      "Turmas, cursos e calendário acadêmico",
      "Frequência e gerenciamento de presença",
      "Contratos de alunos e folha salarial",
      "Mapa de localização (lazy / 3D)",
      "Relatórios e hub de planilhas",
    ],
  },
  {
    id: "grid",
    name: "Grid",
    label: "03",
    accent: "#F7941D",
    accentSoft: "#0057A8",
    logo: "/logos/grid/named.png",
    icon: "/logos/grid/icon.png",
    cover: "/covers/grid.png",
    route: "/grid",
    audience: "Operação predial",
    title: "Manutenção predial",
    summary:
      "Do chamado à conclusão: tickets, tarefas, estoque, mapa de intervenção e relatórios para a operação predial do SENAI.",
    highlights: ["Tickets", "Estoque", "Mapa de tarefas"],
    features: [
      "Dashboard operacional de chamados",
      "Abertura e acompanhamento de tickets",
      "Controle de fluxo e status",
      "Tarefas e mapa espacial de execução",
      "Estoque de materiais",
      "Relatórios de manutenção",
      "Usuários do módulo e planilhas",
    ],
  },
  {
    id: "safe",
    name: "SAFE",
    label: "04",
    accent: "#7B4FC7",
    accentSoft: "#3A3F48",
    logo: "/logos/safe/named.png",
    icon: "/logos/safe/icon.png",
    cover: "/covers/safe.png",
    route: "/safe",
    audience: "Portaria & professores",
    title: "Autorizações & portaria",
    summary:
      "Fluxo AQV de entrada e saída: solicitação, aprovação do professor e confirmação da portaria — com histórico completo.",
    highlights: ["Protocolo AQV", "Fila professor", "Portaria"],
    features: [
      "Dashboard com KPIs e filas",
      "Alunos sincronizados com o Connect",
      "Solicitações de autorização (protocolo)",
      "Fila de aprovação do professor",
      "Confirmação / recusa na portaria",
      "Detalhe com histórico de eventos",
      "Filtros por status e arquivo",
    ],
  },
] as const

export const extras = [
  {
    id: "map3d",
    title: "Mapa 3D do campus",
    body: "Campus SENAI em Three.js (Blocos A–D) — carro-chefe visual do Connect e do Grid, com navegação livre e seleção de bloco.",
    tags: ["Three.js", "GLB", "OrbitControls"],
  },
  {
    id: "chatbot",
    title: "Chatbot com Groq",
    body: "Assistente conversacional integrado para suporte e orientação dentro da plataforma, sem sair do contexto do módulo.",
    tags: ["IA", "Groq", "Suporte"],
  },
  {
    id: "mobile",
    title: "App mobile (Expo)",
    body: "Cliente React Native / Expo com autenticação Supabase para acesso em movimento — login e fluxos essenciais no bolso.",
    tags: ["Expo", "Supabase", "RN"],
  },
  {
    id: "spreadsheets",
    title: "Hub de planilhas",
    body: "Importação e organização de planilhas vinculadas a Connect e Grid, reduzindo o trabalho manual em Excel solto.",
    tags: ["Import", "Connect", "Grid"],
  },
  {
    id: "archive",
    title: "Arquivo histórico",
    body: "Turmas encerradas, chamados finalizados e autorizações SAFE concluídas em um só arquivo consultável.",
    tags: ["Auditoria", "Histórico", "Cross-módulo"],
  },
]

export const techStack = [
  {
    group: "Frontend",
    blurb: "SPA tipada, rotas por módulo e UI consistente com i18n.",
    items: ["React", "TypeScript", "Vite", "React Router", "Tailwind", "i18next"],
  },
  {
    group: "Backend",
    blurb: "API REST com autenticação, papéis e MySQL como fonte de verdade.",
    items: ["Laravel", "API REST", "MySQL", "Auth & RBAC"],
  },
  {
    group: "Extras",
    blurb: "Extensões que elevam o produto além do CRUD clássico.",
    items: ["Chatbot Groq", "Expo / React Native", "Supabase", "Mapa 3D (Three.js)"],
  },
  {
    group: "Processo",
    blurb: "Entrega acadêmica com rastro de design, código e documentação.",
    items: ["Git / GitHub", "Sprints", "Figma", "Documentação ABNT"],
  },
]

export const audience = [
  {
    title: "Alunos",
    body: "Acompanham a jornada acadêmica e solicitações SAFE em um ambiente unificado.",
    points: ["Frequência e turmas", "Solicitações de saída", "Perfil e preferências"],
  },
  {
    title: "Professores",
    body: "Gerenciam turmas, frequência e aprovam autorizações de saída com clareza.",
    points: ["Turmas e presença", "Fila de aprovação SAFE", "Visão da unidade"],
  },
  {
    title: "Operação / TI",
    body: "Controlam chamados prediais, estoque e usuários com permissões granulares.",
    points: ["Tickets Grid", "Usuários e papéis", "Arquivo e auditoria"],
  },
  {
    title: "Portaria",
    body: "Confirma liberações em tempo real, fechando o ciclo de segurança do campus.",
    points: ["Fila de liberação", "Confirmação / recusa", "Histórico do protocolo"],
  },
]

export const problems = [
  "Falta de transparência no andamento dos chamados",
  "Demora e fragmentação no atendimento predial",
  "Dados espalhados em planilhas e sistemas isolados",
  "Ausência de histórico estruturado por unidade",
  "Fluxo manual de autorizações de entrada e saída",
]

export const outcomes = [
  "Acesso centralizado com menos senhas e cliques",
  "Workflow completo de manutenção predial",
  "Gestão acadêmica integrada ao SAFE",
  "Auditoria e arquivo histórico cross-módulo",
  "Experiência multi-idioma e temas personalizados",
]

export const journey = [
  {
    step: "01",
    title: "Entrar no Hub",
    body: "Login único, recuperação de senha e solicitação de acesso quando necessário.",
  },
  {
    step: "02",
    title: "Ver o que pode usar",
    body: "Painel de aplicações filtra Connect, Grid e SAFE pelo perfil (RBAC).",
  },
  {
    step: "03",
    title: "Operar no módulo",
    body: "Academia, manutenção ou portaria — cada fluxo com layout e dados próprios.",
  },
  {
    step: "04",
    title: "Registrar e auditar",
    body: "Arquivo histórico, relatórios e planilhas fecham o ciclo da unidade.",
  },
]

export const ctaLinks = [
  {
    title: "GitHub",
    subtitle: "Código-fonte completo",
    body: "Repositório do Projeto_4DEV — frontend, API, mobile e modelos 3D.",
    href: "https://github.com/Hall065/Projeto_4DEV",
    primary: true,
  },
  {
    title: "Figma",
    subtitle: "Design system & telas",
    body: "Fluxos, componentes e identidade visual do SENAI Hub.",
    href: "https://www.figma.com/design/QHglNi7cxkfA9et0MDvDQV/Senai-Hub?node-id=0-1&p=f&t=KEe6K3QUaYYP4LcK-0",
    primary: false,
  },
  {
    title: "Milanote",
    subtitle: "Pesquisa & planejamento",
    body: "Board de ideação, referências e organização do semestre.",
    href: "https://app.milanote.com/1VVhMY1W5awS4v?p=xnqgoJHf9J8",
    primary: false,
  },
]

export const marqueeItems = [
  "Hub de Aplicações",
  "Connect",
  "Grid",
  "SAFE",
  "Chatbot",
  "Mobile",
  "Planilhas",
  "Arquivo Histórico",
  "RBAC",
  "Temas",
  "i18n",
  "Mapa 3D",
]
