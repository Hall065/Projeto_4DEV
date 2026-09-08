import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translateTextsWithAzure } from '@/services/azure-translator.service';
import { APP_LANGUAGE_OPTIONS, useAppStore, type AppLanguage } from '@/stores/app.store';

const en: Record<string, string> = {
  'Acesse sua conta': 'Sign in to your account',
  'Informe seu e-mail e senha para continuar.': 'Enter your email and password to continue.',
  'E-mail': 'Email',
  'Senha': 'Password',
  'Entrar': 'Sign in',
  'Recuperar senha': 'Recover password',
  'Acesso rápido para demonstração': 'Quick demo access',
  'Preparando o SENAI Hub...': 'Preparing SENAI Hub...',
  'Carregando informações...': 'Loading information...',
  'Cancelar': 'Cancel',
  'Excluir': 'Delete',
  'Excluir registro': 'Delete record',
  'Salvar': 'Save',
  'Salvar alterações': 'Save changes',
  'Criar usuário': 'Create user',
  'Editar usuário': 'Edit user',
  'Novo usuário': 'New user',
  'Voltar': 'Back',
  'Voltar ao Hub': 'Back to Hub',
  'Sair': 'Sign out',
  'Usuário': 'User',
  'Perfil do usuario': 'User profile',
  'Perfil do usuário': 'User profile',
  'Dados da sua conta SENAI Hub': 'Your SENAI Hub account data',
  'Trocar foto': 'Change photo',
  'Dados pessoais': 'Personal data',
  'Edicao protegida por senha': 'Password-protected editing',
  'Edição protegida por senha': 'Password-protected editing',
  'Nome': 'Name',
  'Telefone': 'Phone',
  'CPF': 'CPF',
  'Senha atual': 'Current password',
  'Editar perfil': 'Edit profile',
  'Seguranca': 'Security',
  'Segurança': 'Security',
  'Senha e recuperacao': 'Password and recovery',
  'Senha e recuperação': 'Password and recovery',
  'Alterar senha': 'Change password',
  'Use o fluxo de recuperacao por codigo': 'Use the code recovery flow',
  'Use o fluxo de recuperação por código': 'Use the code recovery flow',
  'Abrir recuperacao de senha': 'Open password recovery',
  'Abrir recuperação de senha': 'Open password recovery',
  'Informacoes do sistema': 'System information',
  'Informações do sistema': 'System information',
  'Acesso e versao': 'Access and version',
  'Acesso e versão': 'Access and version',
  'Perfil de acesso': 'Access profile',
  'Ultimo login': 'Last login',
  'Último login': 'Last login',
  'Sessao atual': 'Current session',
  'Sessão atual': 'Current session',
  'Versao do app': 'App version',
  'Versão do app': 'App version',
  'Conta protegida': 'Protected account',
  'Confirmacao por senha ativa': 'Password confirmation enabled',
  'Confirmação por senha ativa': 'Password confirmation enabled',
  'Preferências': 'Preferences',
  'Tema e idioma do aplicativo': 'Application theme and language',
  'Modo claro': 'Light mode',
  'Modo escuro': 'Dark mode',
  'Tema atual': 'Current theme',
  'Idioma': 'Language',
  'Português (Brasil)': 'Portuguese (Brazil)',
  'Espanhol': 'Spanish',
  'Francês': 'French',
  'Alemão': 'German',
  'Italiano': 'Italian',
  'Japonês': 'Japanese',
  'Chinês simplificado': 'Simplified Chinese',
  'Idioma atual': 'Current language',
  'Traducao do aplicativo': 'Application translation',
  'Tradução do aplicativo': 'Application translation',
  'Alterar idioma': 'Change language',
  'Selecionar idioma': 'Select language',
  'Aplicar idioma': 'Apply language',
  'Idioma de tradução': 'Translation language',
  'Escolha um idioma para traduzir o aplicativo pela API do Azure.': 'Choose a language to translate the application through the Azure API.',
  'Português': 'Portuguese',
  'Inglês': 'English',
  'Aplicar modo escuro': 'Apply dark mode',
  'Aplicar modo claro': 'Apply light mode',
  'Usar inglês': 'Use English',
  'Usar português': 'Use Portuguese',
  'SENAI Connect': 'SENAI Connect',
  'SENAI Grid': 'SENAI Grid',
  'SENAI Aluno': 'SENAI Student',
  'Acesso liberado conforme seu perfil': 'Access granted according to your profile',
  'Acessar aplicativo': 'Open application',
  'Bem-vindo': 'Welcome',
  'Hub de Aplicações': 'Application Hub',
  'Acesse os sistemas disponíveis para o seu perfil.': 'Access the systems available to your profile.',
  'Gestão completa de alunos, turmas, frequência, contratos e informações acadêmicas.': 'Complete management of students, classes, attendance, contracts and academic information.',
  'Gestão de manutenção predial, infraestrutura, chamados, estoque e equipes.': 'Building maintenance, infrastructure, tickets, inventory and teams management.',
  'Ensino conectado e gestão acadêmica': 'Connected learning and academic management',
  'Gestão de manutenção e infraestrutura': 'Maintenance and infrastructure management',
  'Hub Unificado de Infraestrutura e Serviços': 'Unified infrastructure and services hub',
  'Visão geral': 'Overview',
  'Dashboard': 'Dashboard',
  'Início': 'Home',
  'Inicio': 'Home',
  'Alunos': 'Students',
  'Professores': 'Teachers',
  'Usuários Connect': 'Connect users',
  'Turmas': 'Classes',
  'Cursos': 'Courses',
  'Empresas': 'Companies',
  'Frequência': 'Attendance',
  'Frequencia': 'Attendance',
  'Gerenciar frequência': 'Manage attendance',
  'Gerenciar frequencia': 'Manage attendance',
  'Relatórios': 'Reports',
  'Relatorios': 'Reports',
  'Localização': 'Location',
  'Localizacao': 'Location',
  'Contratos': 'Contracts',
  'Contrato alunos': 'Student contracts',
  'Salário': 'Salary',
  'Salario': 'Salary',
  'Chamados': 'Tickets',
  'Tarefas': 'Tasks',
  'Estoque': 'Inventory',
  'Mapa de tarefas': 'Task map',
  'Usuários': 'Users',
  'Perfil': 'Profile',
  'Grade': 'Schedule',
  'Painel': 'Panel',
  'Acadêmico': 'Academic',
  'Operação': 'Operations',
  'Administração': 'Administration',
  'Recursos': 'Resources',
  'Meu perfil': 'My profile',
  'Dados academicos principais': 'Main academic data',
  'Dados acadêmicos principais': 'Main academic data',
  'Resumo de frequencia': 'Attendance summary',
  'Resumo de frequência': 'Attendance summary',
  'Lancamentos deste mes': 'Records this month',
  'Lançamentos deste mês': 'Records this month',
  'Aulas recentes': 'Recent classes',
  'Ultimos registros encontrados': 'Latest records found',
  'Últimos registros encontrados': 'Latest records found',
  'Frequencia e salario': 'Attendance and salary',
  'Frequência e salário': 'Attendance and salary',
  'Calculo automatico do mes': 'Automatic monthly calculation',
  'Cálculo automático do mês': 'Automatic monthly calculation',
  'Mes anterior': 'Previous month',
  'Mês anterior': 'Previous month',
  'Proximo': 'Next',
  'Próximo': 'Next',
  'Exportar holerite': 'Export payslip',
  'Detalhes do calculo': 'Calculation details',
  'Detalhes do cálculo': 'Calculation details',
  'Formula baseada na frequencia': 'Formula based on attendance',
  'Fórmula baseada na frequência': 'Formula based on attendance',
  'Lancamentos': 'Records',
  'Lançamentos': 'Records',
  'Presencas e faltas no mes': 'Attendance and absences this month',
  'Presenças e faltas no mês': 'Attendance and absences this month',
  'Grade de aulas': 'Class schedule',
  'Aulas registradas e presenca': 'Registered classes and attendance',
  'Aulas registradas e presença': 'Registered classes and attendance',
  'Curso vinculado': 'Linked course',
  'Informações acadêmicas do aluno': 'Student academic information',
  'Aulas do dia': 'Classes of the day',
  'Horario, disciplina e status': 'Time, subject and status',
  'Horário, disciplina e status': 'Time, subject and status',
  'Dados academicos': 'Academic data',
  'Dados acadêmicos': 'Academic data',
  'Curso, turma e empresa': 'Course, class and company',
  'Contrato': 'Contract',
  'Vinculo com empresa': 'Company link',
  'Vínculo com empresa': 'Company link',
  'Ativo': 'Active',
  'Inativo': 'Inactive',
  'ativo': 'active',
  'inativo': 'inactive',
  'bloqueado': 'blocked',
  'pendente': 'pending',
  'aberto': 'open',
  'aguardando': 'waiting',
  'em_andamento': 'in progress',
  'concluido': 'completed',
  'concluida': 'completed',
  'a_fazer': 'to do',
  'presente': 'present',
  'falta_justificada': 'excused absence',
  'falta_injustificada': 'unexcused absence',
  'Abertos': 'Open',
  'Alta prioridade': 'High priority',
  'Em análise': 'In review',
  'Resolvidos': 'Resolved',
  'Total': 'Total',
  'Todos': 'All',
  'Alta': 'High',
  'Em andamento': 'In progress',
  'Concluídos': 'Completed',
  'A fazer': 'To do',
  'Concluídas': 'Completed',
  'Novo aluno': 'New student',
  'Editar aluno': 'Edit student',
  'Criar aluno': 'Create student',
  'Novo professor': 'New teacher',
  'Editar professor': 'Edit teacher',
  'Criar professor': 'Create teacher',
  'Nova turma': 'New class',
  'Editar turma': 'Edit class',
  'Criar turma': 'Create class',
  'Abrir chamado': 'Open ticket',
  'Editar chamado': 'Edit ticket',
  'Nova tarefa': 'New task',
  'Editar tarefa': 'Edit task',
  'Criar tarefa': 'Create task',
  'Selecionar imagem': 'Select image',
  'Trocar imagem': 'Change image',
  'Nenhum dado cadastrado ainda.': 'No data registered yet.',
  'Notificacoes': 'Notifications',
  'Notificações': 'Notifications',
  'Marcar todas como lidas': 'Mark all as read',
  'Carregando notificacoes...': 'Loading notifications...',
  'Carregando notificações...': 'Loading notifications...',
  'Nenhuma notificacao encontrada.': 'No notification found.',
  'Nenhuma notificação encontrada.': 'No notification found.',
  'Confirmar': 'Confirm',
  'Exportar dados': 'Export data',
  'Imagem de abertura': 'Opening image',
  'Evidencia de conclusao': 'Completion evidence',
  'Evidência de conclusão': 'Completion evidence',
  'Controle de acesso da equipe interna do Grid.': 'Access control for the internal Grid team.',
  'Usuários ativos': 'Active users',
  'Manutenção': 'Maintenance',
  'Gerentes': 'Managers',
  'Equipe cadastrada': 'Registered team',
  'Usuários internos e níveis de acesso': 'Internal users and access levels',
  '+ Novo usuário': '+ New user',
  'Resumo operacional da manutenção e infraestrutura.': 'Operational summary of maintenance and infrastructure.',
  'Operação de infraestrutura': 'Infrastructure operations',
  'Prioridades e chamados em tempo real': 'Priorities and tickets in real time',
  'chamados abertos': 'open tickets',
  'Chamados abertos': 'Open tickets',
  'Estoque crítico': 'Critical inventory',
  'Atalhos rápidos': 'Quick shortcuts',
  'Acesso direto às rotinas de manutenção': 'Direct access to maintenance routines',
  'Mapa': 'Map',
  'Chamados recentes': 'Recent tickets',
  'Últimas solicitações registradas': 'Latest registered requests',
  'Tarefas por prioridade': 'Tasks by priority',
  'Distribuição real dos chamados': 'Actual ticket distribution',
  'Itens com estoque baixo': 'Low-stock items',
  'Peças que exigem reposição': 'Parts requiring restock',
  'Controle de itens, reservas e movimentações.': 'Control items, reservations and movements.',
  '+ Adicionar item': '+ Add item',
  'Total de itens': 'Total items',
  'Valor em estoque': 'Inventory value',
  'Indisponiveis': 'Unavailable',
  'Distribuidoras': 'Distributors',
  'Itens cadastrados': 'Registered items',
  'Lista de materiais de manutenção': 'Maintenance material list',
  'Editar item': 'Edit item',
  'Adicionar item': 'Add item',
  'Indicadores de manutencao calculados a partir do Supabase.': 'Maintenance indicators calculated from Supabase.',
  'Tarefas concluidas': 'Completed tasks',
  'Tarefas abertas': 'Open tasks',
  'Custo em estoque': 'Inventory cost',
  'Chamados por status': 'Tickets by status',
  'Distribuicao real das solicitacoes': 'Actual request distribution',
  'Exportacoes': 'Exports',
  'Arquivos gerados': 'Generated files',
  'Exportar manutencoes': 'Export maintenance records',
  'Visualize serviços por bloco, sala e criticidade.': 'View services by block, room and criticality.',
  'Mapa do SENAI': 'SENAI map',
  'Pins coloridos indicam o status dos chamados': 'Colored pins indicate ticket status',
  'Aberto': 'Open',
  'Concluído': 'Completed',
  'Crítico': 'Critical',
  'Tarefas no mapa': 'Tasks on the map',
  'Finalizadas': 'Finished',
  'Atrasadas': 'Delayed',
  'Serviços próximos da sua localização': 'Services near your location',
  'Abertura e acompanhamento dos seus chamados.': 'Open and track your tickets.',
  'Abertura, triagem e acompanhamento de solicitações.': 'Open, triage and track requests.',
  '+ Abrir chamado': '+ Open ticket',
  'Fila de chamados': 'Ticket queue',
  'Dados carregados do Supabase': 'Data loaded from Supabase',
  'Kanban de serviços de manutenção e acompanhamento.': 'Maintenance service kanban and tracking.',
  'Suas tarefas atribuídas e atualização de status.': 'Your assigned tasks and status updates.',
  '+ Adicionar': '+ Add',
  'Turmas e Cursos': 'Classes and courses',
  'Consulte suas turmas e os alunos vinculados.': 'View your classes and linked students.',
  'Gerencie turmas, cursos e vínculos acadêmicos.': 'Manage classes, courses and academic links.',
  '+ Criar turma': '+ Create class',
  'Turmas ativas': 'Active classes',
  'Cursos vinculados': 'Linked courses',
  'Períodos': 'Periods',
  'Turmas ativas e período de aulas': 'Active classes and class period',
  'Gerenciamento de alunos': 'Student management',
  'Cadastro, busca e atualização de alunos.': 'Register, search and update students.',
  '+ Novo aluno': '+ New student',
  'Alunos encontrados': 'Students found',
  'Novos no mês': 'New this month',
  'Lista de alunos': 'Student list',
  'Dados principais e situação acadêmica': 'Main data and academic status',
  'Gerenciamento de professores': 'Teacher management',
  'Cadastro, especialidades e status dos docentes.': 'Teacher registration, specialties and status.',
  '+ Novo professor': '+ New teacher',
  'Especialidades': 'Specialties',
  'Professores cadastrados': 'Registered teachers',
  'Equipe docente ativa': 'Active teaching staff',
  'Cadastro de secretaria, direção e administradores do Connect.': 'Register Connect secretary, management and administrators.',
  'Secretaria': 'Secretary',
  'Admin': 'Admin',
  'Equipe administrativa': 'Administrative team',
  'Usuários com acesso ao SENAI Connect': 'Users with SENAI Connect access',
  'Monitoramento por turma, aluno e geofence.': 'Monitoring by class, student and geofence.',
  'Monitorados': 'Monitored',
  'No campus': 'On campus',
  'Fora': 'Outside',
  'Lista': 'List',
  'Turmas e alunos': 'Classes and students',
  'Buscar turmas ou alunos...': 'Search classes or students...',
  'Ver localizacao': 'View location',
  'Mapa 2.5D do campus': '2.5D campus map',
  'Pin atualizado por Realtime': 'Pin updated by Realtime',
  'Visualizacao, calculo e exportacao de relatorios.': 'View, calculate and export reports.',
  'Presenca geral': 'Overall attendance',
  'Alunos monitorados': 'Monitored students',
  'Evolucao da frequencia': 'Attendance evolution',
  'Comparativo dos registros reais': 'Comparison of actual records',
  'Turmas recentes': 'Recent classes',
  'Status de calculo e fechamento': 'Calculation and closing status',
  'Indicadores de ausencia': 'Absence indicators',
  'Faltas justificadas e injustificadas': 'Excused and unexcused absences',
  'Exportar frequencia': 'Export attendance',
  'Indicadores academicos calculados a partir do Supabase.': 'Academic indicators calculated from Supabase.',
  'Frequencias': 'Attendance records',
  'Cursos ativos': 'Active courses',
  'Frequencia registrada': 'Registered attendance',
  'Distribuicao real dos lancamentos': 'Actual record distribution',
  'Contratos de aprendizagem vinculados às empresas.': 'Apprenticeship contracts linked to companies.',
  '+ Novo contrato': '+ New contract',
  'Contratos ativos': 'Active contracts',
  'Empresas parceiras': 'Partner companies',
  'Pendências': 'Pending items',
  'Contratos vigentes': 'Current contracts',
  'Contratos de aprendizagem': 'Apprenticeship contracts',
  'Cálculo mensal com base em faltas injustificadas.': 'Monthly calculation based on unexcused absences.',
  '+ Novo cálculo': '+ New calculation',
  'Bolsa média': 'Average stipend',
  'Total base': 'Base total',
  'Meses': 'Months',
  'Cálculo do salário': 'Salary calculation',
  'Exportar PDF ou Excel': 'Export PDF or Excel',
  'Alunos calculados': 'Calculated students',
  'Fechamento mensal por status': 'Monthly closing by status',
  'Novo salário': 'New salary',
  'Editar salário': 'Edit salary',
  'Exportar salarios': 'Export salaries',
  'Cursos por período': 'Courses by period',
  'Distribuição do catálogo atual': 'Current catalog distribution',
  'Catálogo': 'Catalog',
  'Cursos cadastrados': 'Registered courses',
  'Editar curso': 'Edit course',
  'Novo curso': 'New course',
  'Carga média': 'Average workload',
  'Atribuido': 'Assigned',
  'Atribuidos': 'Assigned',
  'Validacao': 'Validation',
  'Concluido': 'Completed',
  'Concluidos': 'Completed',
  'Aguardando validacao': 'Awaiting validation',
  'Em atendimento': 'In service',
  'Urgente': 'Urgent',
  'Media': 'Medium',
  'Baixa': 'Low',
  'Todas prioridades': 'All priorities',
  'Fila completa': 'Full queue',
  'Nenhum chamado nesta etapa': 'No tickets at this stage',
  'Ajuste os filtros ou abra uma nova solicitacao.': 'Adjust the filters or open a new request.',
  'chamado': 'ticket',
  'chamados': 'tickets',
  'Fechar': 'Close',
  'Nao informado': 'Not provided',
  'Nao informado.': 'Not provided.',
  'Solicitante nao identificado': 'Unidentified requester',
  'Local nao informado': 'Location not provided',
  'Sem responsavel': 'No assignee',
  'Tarefa vinculada': 'Linked task',
  'Sem descricao informada.': 'No description provided.',
  'Imagem da abertura': 'Opening image',
  'Solicitante': 'Requester',
  'Responsavel': 'Assignee',
  'Local': 'Location',
  'Categoria': 'Category',
  'Aberto em': 'Opened at',
  'Iniciado em': 'Started at',
  'Concluido em': 'Completed at',
  'Abrir fila de tarefas': 'Open task queue',
  'Evidencia da conclusao': 'Completion evidence',
  'Resumo da resolucao': 'Resolution summary',
  'Editar': 'Edit',
  'Atribuir tecnico': 'Assign technician',
  'Iniciar atendimento': 'Start service',
  'Validar servico': 'Validate service',
  'Detalhes do chamado': 'Ticket details',
  'Buscar codigo, titulo, local ou responsavel...': 'Search code, title, location or assignee...',
  'Data indisponivel': 'Date unavailable',
  'Toque para marcar como lida': 'Tap to mark as read',
  'Nao lida': 'Unread',
  'Fechar notificacoes': 'Close notifications',
  'Hoje': 'Today',
  'Anteriores': 'Earlier',
  'Carregando dados do gráfico...': 'Loading chart data...',
  'Nenhum dado para exibir': 'No data to display',
  'Ajuste os filtros ou cadastre novos registros.': 'Adjust the filters or add new records.',
  'Pergunte sobre alunos, turmas, chamados...': 'Ask about students, classes, or tickets...',
  'Enviar mensagem': 'Send message',
  'Conversas': 'Conversations',
  'Criar nova conversa': 'Create new conversation',
  'Nenhuma conversa ainda': 'No conversations yet',
  'Nova conversa': 'New conversation',
  'Abrir assistente SENAI Hub': 'Open SENAI Hub assistant',
  'Arquivar conversa': 'Archive conversation',
  'A conversa saira do historico ativo, mas suas mensagens nao serao apagadas definitivamente.': 'The conversation will leave the active history, but its messages will not be permanently deleted.',
  'Arquivar': 'Archive',
  'Assistente SENAI Hub': 'SENAI Hub assistant',
  'Dados do app em conversa profissional': 'App data in a professional conversation',
  'Arquivar conversa ativa': 'Archive active conversation',
  'Atualizar conversas': 'Refresh conversations',
  'Fechar assistente': 'Close assistant',
  'Carregando conversa...': 'Loading conversation...',
  'Como posso ajudar?': 'How can I help?',
  'Pergunte sobre alunos, turmas, frequencia, chamados, tarefas ou estoque.': 'Ask about students, classes, attendance, tickets, tasks, or inventory.',
  'Assistente respondendo...': 'Assistant is responding...',
  'Quantos alunos tem cadastrados?': 'How many students are registered?',
  'Quantos alunos foram cadastrados hoje?': 'How many students were registered today?',
  'Resumo dos chamados abertos': 'Summary of open tickets',
  'Como esta a frequencia das turmas?': 'How is class attendance?',
  'Quais itens estao com estoque critico?': 'Which items have critical stock?',
  'Construtor': 'Builder',
  'Titulo obrigatorio': 'Title required',
  'Informe um titulo para gerar o relatorio.': 'Enter a title to generate the report.',
  'Selecione as secoes': 'Select sections',
  'Escolha pelo menos uma secao para o relatorio.': 'Choose at least one report section.',
  'Falha ao exportar': 'Export failed',
  'Nao foi possivel gerar o arquivo.': 'The file could not be generated.',
  'Configurar relatorio': 'Configure report',
  'Defina o recorte e o conteudo antes de exportar': 'Set the scope and content before exporting',
  'Titulo': 'Title',
  'Subtitulo': 'Subtitle',
  'Contexto do relatorio': 'Report context',
  'Modelo rapido': 'Quick template',
  'Secoes do relatorio': 'Report sections',
  'secao selecionada': 'section selected',
  'secoes selecionadas': 'sections selected',
  'Gerar previa': 'Generate preview',
  'Exportar': 'Export',
  'Previa atualizada com': 'Preview updated with',
  'linha exportavel.': 'exportable row.',
  'linhas exportaveis.': 'exportable rows.',
  'Gerado em': 'Generated at',
  'Gere a previa para conferir os dados antes de exportar.': 'Generate the preview to review the data before exporting.',
  'Exportar relatorio': 'Export report',
  'registro no recorte': 'record in scope',
  'registros no recorte': 'records in scope',
  'exibindo ate 6 na previa': 'showing up to 6 in the preview',
  'Nenhum registro encontrado para os filtros atuais.': 'No records found for the current filters.',
  'Sim': 'Yes',
  'Nao': 'No',
  'Excluir chamado': 'Delete ticket',
  'Nenhuma frequencia cadastrada.': 'No attendance records yet.',
  'Valor final': 'Final amount',
  'R$': 'R$',
  'Nenhum lancamento encontrado para este mes.': 'No records found for this month.',
  'Exibindo registros disponiveis para': 'Showing available records for',
  'Nenhuma aula registrada ainda.': 'No classes registered yet.',
  'Foto do aluno': 'Student photo',
  'Nenhum contrato encontrado.': 'No contracts found.',
  'Nenhum aluno encontrado.': 'No students found.',
  'Nenhum curso encontrado.': 'No courses found.',
  'Nenhuma empresa encontrada.': 'No companies found.',
  'Turma': 'Class',
  'Nenhuma turma disponivel.': 'No classes available.',
  'Data': 'Date',
  'Dia anterior': 'Previous day',
  'Proximo dia': 'Next day',
  'Aulas no dia': 'Classes on this day',
  'Carregando chamada...': 'Loading attendance list...',
  'Esta turma nao possui alunos cadastrados.': 'This class has no registered students.',
  'RM': 'RM',
  'Aulas faltadas': 'Missed classes',
  'Gestão dos seus contratos': 'Manage your contracts',
  'Consulte contratos, frequência e cálculo salarial apenas dos alunos vinculados à sua empresa.': 'View contracts, attendance, and salary calculations only for students linked to your company.',
  'Acompanhamento centralizado': 'Centralized monitoring',
  'Cursos, turmas, professores e frequência reunidos para consulta rápida.': 'Courses, classes, teachers, and attendance together for quick access.',
  'Latitude': 'Latitude',
  '- Longitude': '- Longitude',
  'Precisao informada:': 'Reported accuracy:',
  'Selecione no mapa ou na lista um aluno com coordenadas reais.': 'Select a student with real coordinates on the map or list.',
  'Nenhum professor encontrado.': 'No teachers found.',
  'presencas em': 'attendance records across',
  'lancamentos': 'entries',
  'Nenhum lancamento de frequencia encontrado.': 'No attendance records found.',
  'Aprendiz': 'Apprentice',
  'Carregando aprendizes...': 'Loading apprentices...',
  '· RM': '· RM',
  'Desconto automatico por faltas': 'Automatic absence deduction',
  'Usa as faltas injustificadas registradas no mes': 'Uses unexcused absences recorded during the month',
  'Nenhum calculo neste mes': 'No calculations this month',
  'Use o simulador ou o calculo em lote para gerar os fechamentos.': 'Use the simulator or batch calculation to generate monthly closings.',
  'Referencia': 'Reference',
  'Proximo mes': 'Next month',
  'Selecione um aprendiz e toque em Simular': 'Select an apprentice and tap Simulate',
  'O calculo considera contrato, frequencia, bonus e descontos.': 'The calculation considers contract, attendance, bonuses, and deductions.',
  'Valor liquido': 'Net amount',
  'Nenhuma turma encontrada.': 'No classes found.',
  'Carregando alunos...': 'Loading students...',
  'Nenhum aluno encontrado nesta turma.': 'No students found in this class.',
  'Nenhum usuário administrativo encontrado.': 'No administrative users found.',
  'Nenhum item encontrado.': 'No items found.',
  'Fila operacional organizada': 'Organized operations queue',
  'Chamados, tarefas e estoque aparecem juntos para facilitar a tomada de decisão.': 'Tickets, tasks, and inventory are shown together to support decision-making.',
  'Nenhum chamado ou tarefa corresponde aos filtros atuais.': 'No tickets or tasks match the current filters.',
  'Bloco': 'Building',
  'Responsavel:': 'Assignee:',
  'Nenhum chamado encontrado.': 'No tickets found.',
  'Chamado': 'Ticket',
  'Excluir tarefa': 'Delete task',
  'Atalho operacional': 'Operations shortcut',
  'Transforme um chamado aberto em tarefa com responsavel definido.': 'Turn an open ticket into a task with an assigned technician.',
  'tarefa(s), ordenadas por prioridade': 'task(s), sorted by priority',
  'Nenhuma tarefa nesta etapa': 'No tasks at this stage',
  'Ajuste os filtros ou crie uma nova tarefa a partir de um chamado.': 'Adjust the filters or create a new task from a ticket.',
  'Ultima observacao': 'Latest note',
  'Nenhum usuário encontrado.': 'No users found.',
  'Sair da conta': 'Sign out',
  'Foto de perfil': 'Profile photo',
  'Usuario': 'User',
  'Nenhuma aplicacao vinculada.': 'No linked applications.',
  'Azure Translator': 'Azure Translator',
  'Informe o e-mail institucional para receber as instruções de redefinição.': 'Enter your institutional email to receive reset instructions.',
  'Redefinir senha': 'Reset password',
  'Digite uma nova senha para continuar usando o SENAI Hub.': 'Enter a new password to continue using SENAI Hub.',
  'Nova senha': 'New password',
  'Confirmar senha': 'Confirm password',
  'Nenhuma autorizacao disponivel nesta fila.': 'No authorizations available in this queue.',
  'Gráfico indisponível:': 'Chart unavailable:',
  'Nenhum dado para exibir.': 'No data to display.',
  'Filtros avancados': 'Advanced filters',
  'resultado(s)': 'result(s)',
  'Nenhuma opção encontrada.': 'No options found.',
  'Continue digitando para refinar a busca.': 'Keep typing to refine the search.',
  'Abrir menu': 'Open menu',
  'Abrir notificações': 'Open notifications',
  'Abrir perfil': 'Open profile',
  'SENAI': 'SENAI',
  'Pav.': 'Floor',
  'Carregando mapa 3D...': 'Loading 3D map...',
  'Nenhum bloco do campus foi carregado.': 'No campus buildings were loaded.',
  'Mapa 3D do campus SENAI': 'SENAI campus 3D map',
  'Pesquisar aluno, matrícula, turma ou responsável...': 'Search student, enrollment, class, or guardian...',
  'Buscar contrato, aluno ou empresa...': 'Search contract, student, or company...',
  'Buscar empresa, CNPJ ou responsavel...': 'Search company, CNPJ, or contact...',
  'Buscar aluno ou RM...': 'Search student or RM...',
  'nao informado': 'not provided',
  'DD/MM/AAAA': 'MM/DD/YYYY',
  'Turma nao vinculada': 'No linked class',
  'Dentro do perimetro': 'Inside the perimeter',
  'Fora do perimetro': 'Outside the perimeter',
  'Perimetro sem informacao': 'Perimeter status unavailable',
  'Buscar por nome, e-mail ou CPF...': 'Search by name, email, or CPF...',
  'AAAA-MM-DD': 'YYYY-MM-DD',
  'Buscar por nome, RM ou turma...': 'Search by name, RM, or class...',
  'Turma nao informada': 'Class not provided',
  'Curso nao informado': 'Course not provided',
  'Buscar aprendiz ou empresa...': 'Search apprentice or company...',
  'Pesquisar turma, curso, professor ou período...': 'Search class, course, teacher, or period...',
  'Pesquisar aluno por nome, RM ou e-mail...': 'Search student by name, RM, or email...',
  'Buscar usuário, e-mail ou perfil...': 'Search user, email, or role...',
  'CHAMADO': 'TICKET',
  'Buscar por item, código ou categoria...': 'Search by item, code, or category...',
  'Sala ou prateleira': 'Room or shelf',
  'Buscar codigo, titulo, sala ou responsavel...': 'Search code, title, room, or assignee...',
  'Nao atribuido': 'Unassigned',
  'TAREFA': 'TASK',
  'Buscar tarefa, chamado, local ou responsavel...': 'Search task, ticket, location, or assignee...',
  'Buscar usuário, e-mail, cargo ou permissão...': 'Search user, email, position, or permission...',
  'seu@email.com': 'your@email.com',
  'Sem perfil': 'No role',
  'Buscar aluno, turma ou protocolo': 'Search student, class, or protocol',
  '% do total analisado': '% of analyzed total',
  'perfil ativo': 'active role',
  'Ponto GPS projetado no campus': 'GPS point projected onto campus',
  'SENAI CONNECT': 'SENAI CONNECT',
  'SENAI GRID': 'SENAI GRID',
};

const knownTranslationSources = Object.freeze(Object.keys(en));
const knownTranslationSourceSet = new Set(knownTranslationSources);

type RemoteLanguage = Exclude<AppLanguage, 'pt-BR'>;
type RemoteTranslationCache = Partial<Record<RemoteLanguage, Record<string, string>>>;

const AZURE_TRANSLATION_CACHE_KEY = '@senai-hub/azure-translations/v2';
const AZURE_BATCH_SIZE = 25;
const AZURE_BATCH_CHARACTER_LIMIT = 5_000;
const AZURE_RETRY_DELAY_MS = 60_000;

const remoteCache: RemoteTranslationCache = {};
const pendingTranslations: Partial<Record<RemoteLanguage, Set<string>>> = {};

const listeners = new Set<() => void>();
let cacheLoaded = false;
let cacheLoadPromise: Promise<void> | null = null;
let queueTimer: ReturnType<typeof setTimeout> | null = null;
const lastAzureFailureAt: Partial<Record<RemoteLanguage, number>> = {};

function isRemoteLanguage(language: AppLanguage): language is RemoteLanguage {
  return language !== 'pt-BR';
}

function getRemoteLanguageCache(language: RemoteLanguage) {
  remoteCache[language] ??= {};
  return remoteCache[language];
}

function getPendingTranslationQueue(language: RemoteLanguage) {
  pendingTranslations[language] ??= new Set<string>();
  return pendingTranslations[language];
}

export function isApprovedUiTranslation(value: string): boolean {
  return knownTranslationSourceSet.has(value.trim());
}

function createAzureBatches(texts: string[]): string[][] {
  const batches: string[][] = [];
  let currentBatch: string[] = [];
  let currentCharacters = 0;

  texts.forEach((text) => {
    if (text.length > AZURE_BATCH_CHARACTER_LIMIT) {
      console.warn('[Translator] Texto de interface excede o limite do Azure e foi ignorado.');
      return;
    }

    const exceedsItems = currentBatch.length >= AZURE_BATCH_SIZE;
    const exceedsCharacters = currentCharacters + text.length > AZURE_BATCH_CHARACTER_LIMIT;
    if (currentBatch.length > 0 && (exceedsItems || exceedsCharacters)) {
      batches.push(currentBatch);
      currentBatch = [];
      currentCharacters = 0;
    }

    currentBatch.push(text);
    currentCharacters += text.length;
  });

  if (currentBatch.length > 0) batches.push(currentBatch);
  return batches;
}

function getLocalTranslation(value: string, language: AppLanguage): string | undefined {
  if (language === 'en-US') return en[value];
  return undefined;
}

function getRemoteTranslation(value: string, language: AppLanguage): string | undefined {
  if (!isRemoteLanguage(language)) return undefined;
  return getRemoteLanguageCache(language)[value];
}

function hasTranslation(value: string, language: AppLanguage): boolean {
  return Boolean(getLocalTranslation(value, language) || getRemoteTranslation(value, language));
}

function notifyTranslationListeners() {
  listeners.forEach((listener) => listener());
}

function subscribeToTranslations(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function loadRemoteCache() {
  if (cacheLoaded) return;
  if (!cacheLoadPromise) {
    cacheLoadPromise = AsyncStorage.getItem(AZURE_TRANSLATION_CACHE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<RemoteTranslationCache>;
        APP_LANGUAGE_OPTIONS.forEach((option) => {
          if (!isRemoteLanguage(option.code)) return;
          const cachedLanguage = parsed[option.code];
          if (cachedLanguage && typeof cachedLanguage === 'object') {
            const safeEntries = Object.entries(cachedLanguage).filter(
              ([source, translated]) =>
                isApprovedUiTranslation(source) &&
                typeof translated === 'string' &&
                translated.trim().length > 0
            );
            remoteCache[option.code] = Object.fromEntries(safeEntries);
          }
        });
      })
      .catch((error) => {
        console.warn('[Translator] Nao foi possivel carregar cache de traducoes:', error);
      })
      .finally(() => {
        cacheLoaded = true;
        cacheLoadPromise = null;
      });
  }

  await cacheLoadPromise;
}

async function saveRemoteCache() {
  try {
    await AsyncStorage.setItem(AZURE_TRANSLATION_CACHE_KEY, JSON.stringify(remoteCache));
  } catch (error) {
    console.warn('[Translator] Nao foi possivel salvar cache de traducoes:', error);
  }
}

async function flushPendingTranslations() {
  await loadRemoteCache();
  let updated = false;
  let firstError: unknown = null;

  for (const language of Object.keys(pendingTranslations) as RemoteLanguage[]) {
    const queue = getPendingTranslationQueue(language);
    const texts = Array.from(queue).filter((text) => !hasTranslation(text, language));
    queue.clear();

    try {
      for (const batch of createAzureBatches(texts)) {
        const translations = await translateTextsWithAzure(batch, language);
        const missing = batch.filter((text) => !translations[text]);
        if (missing.length > 0) {
          throw new Error('O Azure retornou um lote de traducao incompleto.');
        }
        Object.assign(getRemoteLanguageCache(language), translations);
        updated = updated || Object.keys(translations).length > 0;
      }
      lastAzureFailureAt[language] = 0;
    } catch (error) {
      texts.filter((text) => !hasTranslation(text, language)).forEach((text) => queue.add(text));
      lastAzureFailureAt[language] = Date.now();
      firstError ??= error;
    }
  }

  if (updated) {
    await saveRemoteCache();
    notifyTranslationListeners();
  }

  if (firstError) throw firstError;
}

export async function preloadTranslationsForLanguage(language: AppLanguage) {
  if (!isRemoteLanguage(language)) return;

  await loadRemoteCache();
  const texts = knownTranslationSources.filter((text) => !hasTranslation(text, language));
  if (texts.length === 0) return;

  let updated = false;
  for (const batch of createAzureBatches(texts)) {
    const translations = await translateTextsWithAzure(batch, language);
    const missing = batch.filter((text) => !translations[text]);
    if (missing.length > 0) {
      throw new Error('O Azure retornou um lote de traducao incompleto.');
    }
    Object.assign(getRemoteLanguageCache(language), translations);
    updated = updated || Object.keys(translations).length > 0;
  }

  if (updated) {
    await saveRemoteCache();
    notifyTranslationListeners();
  }
}

function queueAzureTranslation(value: string | undefined | null, language: AppLanguage) {
  if (!value || !isRemoteLanguage(language)) return;
  if (Date.now() - (lastAzureFailureAt[language] ?? 0) < AZURE_RETRY_DELAY_MS) return;

  const text = value.trim();
  if (!text || !isApprovedUiTranslation(text) || hasTranslation(text, language)) return;

  getPendingTranslationQueue(language).add(text);
  if (queueTimer) return;

  queueTimer = setTimeout(() => {
    queueTimer = null;
    void flushPendingTranslations().catch((error) => {
      console.warn('[Translator] Falha ao traduzir com Azure:', error);
    });
  }, 120);
}

export function translate(value: string | undefined | null, language: AppLanguage) {
  if (!value || language === 'pt-BR') return value ?? '';

  const text = value.trim();
  if (!text) return value;
  if (!isApprovedUiTranslation(text)) return value;

  return getLocalTranslation(text, language) ?? getRemoteTranslation(text, language) ?? value;
}

export function useI18n() {
  const language = useAppStore((state) => state.language);
  const [, setTranslationVersion] = useState(0);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = subscribeToTranslations(() => {
      if (mounted) setTranslationVersion((version) => version + 1);
    });

    if (isRemoteLanguage(language)) {
      void loadRemoteCache().then(() => {
        if (mounted) setTranslationVersion((version) => version + 1);
      });
    }

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [language]);

  const t = useCallback(
    (value: string | undefined | null) => {
      queueAzureTranslation(value, language);
      return translate(value, language);
    },
    [language]
  );

  return { language, t };
}
