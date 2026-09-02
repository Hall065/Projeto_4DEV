import {
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  CircleDollarSign,
  FileText,
  GraduationCap,
  Home,
  Map,
  MapPin,
  Package,
  DoorOpen,
  User,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react-native';
import type { DrawerMenuItem } from '@/components/layout/SidebarDrawer';
import type { NavItem } from '@/components/layout/BottomNav';
import { connectTheme, gridTheme } from '@/constants/colors';
import type { UserRole } from '@/constants/roles';
import { ROUTES } from '@/constants/routes';

export const CONNECT_DRAWER_ITEMS: DrawerMenuItem[] = [
  { label: 'Visão geral', route: ROUTES.connect.index, icon: <Home />, section: 'Painel' },
  { label: 'Alunos', route: ROUTES.connect.alunos, icon: <Users />, section: 'Acadêmico' },
  { label: 'Professores', route: ROUTES.connect.professores, icon: <UserCheck />, section: 'Acadêmico' },
  { label: 'Usuários Connect', route: ROUTES.connect.usuarios, icon: <User />, section: 'Administração' },
  { label: 'Turmas', route: ROUTES.connect.turmas, icon: <GraduationCap />, section: 'Acadêmico' },
  { label: 'Cursos', route: ROUTES.connect.cursos, icon: <BookOpen />, section: 'Acadêmico' },
  { label: 'Empresas', route: ROUTES.connect.empresas, icon: <Building2 />, section: 'Relacionamentos' },
  { label: 'Frequência', route: ROUTES.connect.frequencia, icon: <CalendarCheck />, section: 'Operação' },
  { label: 'Gerenciar frequência', route: ROUTES.connect.gerenciarFrequencia, icon: <ClipboardCheck />, section: 'Operação' },
  { label: 'Relatórios', route: ROUTES.connect.relatorios, icon: <BarChart3 />, section: 'Operação' },
  { label: 'Localização', route: ROUTES.connect.localizacao, icon: <MapPin />, section: 'Operação' },
  { label: 'Contratos', route: ROUTES.connect.contratos, icon: <FileText />, section: 'Contratos' },
  { label: 'Contrato alunos', route: ROUTES.connect.contratoAlunos, icon: <BriefcaseBusiness />, section: 'Contratos' },
  { label: 'Salário', route: ROUTES.connect.salario, icon: <CircleDollarSign />, section: 'Contratos' },
];

export const GRID_DRAWER_ITEMS: DrawerMenuItem[] = [
  { label: 'Dashboard', route: ROUTES.grid.index, icon: <Home />, section: 'Painel' },
  { label: 'Chamados', route: ROUTES.grid.chamados, icon: <Wrench />, section: 'Operação' },
  { label: 'Tarefas', route: ROUTES.grid.tarefas, icon: <ClipboardList />, section: 'Operação' },
  { label: 'Relatórios', route: ROUTES.grid.relatorios, icon: <BarChart3 />, section: 'Operação' },
  { label: 'Estoque', route: ROUTES.grid.estoque, icon: <Package />, section: 'Recursos' },
  { label: 'Localizacao de chamados', route: ROUTES.grid.mapaTarefas, icon: <Map />, section: 'Recursos' },
  { label: 'Usuários', route: ROUTES.grid.usuarios, icon: <Users />, section: 'Administração' },
];

export const SAFE_DRAWER_ITEMS: DrawerMenuItem[] = [
  { label: 'Resumo', route: ROUTES.safe.index, icon: <Home />, section: 'Painel' },
  { label: 'Autorizacoes', route: ROUTES.safe.autorizacoes, icon: <ClipboardList />, section: 'Operacao AQV' },
  { label: 'Aprovacoes', route: ROUTES.safe.aprovacoes, icon: <UserCheck />, section: 'Professor' },
  { label: 'Portaria', route: ROUTES.safe.portaria, icon: <DoorOpen />, section: 'Validacao presencial' },
];

export const CONNECT_BOTTOM_NAV: NavItem[] = [
  { label: 'Início', route: ROUTES.connect.index, icon: <Home size={20} color={connectTheme.primary} /> },
  { label: 'Alunos', route: ROUTES.connect.alunos, icon: <Users size={20} color={connectTheme.primary} /> },
  { label: 'Turmas', route: ROUTES.connect.turmas, icon: <GraduationCap size={20} color={connectTheme.primary} /> },
  { label: 'Frequência', route: ROUTES.connect.frequencia, icon: <ClipboardList size={20} color={connectTheme.primary} /> },
];

const EMPRESA_CONNECT_DRAWER_ITEMS: DrawerMenuItem[] = [
  { label: 'Visão geral', route: ROUTES.connect.index, icon: <Home />, section: 'Painel' },
  { label: 'Contratos', route: ROUTES.connect.contratos, icon: <FileText />, section: 'Aprendizes' },
  { label: 'Frequência', route: ROUTES.connect.gerenciarFrequencia, icon: <ClipboardCheck />, section: 'Aprendizes' },
  { label: 'Salário', route: ROUTES.connect.salario, icon: <CircleDollarSign />, section: 'Aprendizes' },
];

const EMPRESA_CONNECT_BOTTOM_NAV: NavItem[] = [
  { label: 'Início', route: ROUTES.connect.index, icon: <Home size={20} color={connectTheme.primary} /> },
  { label: 'Contratos', route: ROUTES.connect.contratos, icon: <FileText size={20} color={connectTheme.primary} /> },
  { label: 'Frequência', route: ROUTES.connect.gerenciarFrequencia, icon: <ClipboardCheck size={20} color={connectTheme.primary} /> },
  { label: 'Salário', route: ROUTES.connect.salario, icon: <CircleDollarSign size={20} color={connectTheme.primary} /> },
];

const PROFESSOR_CONNECT_ROUTES = new Set<string>([
  ROUTES.connect.index,
  ROUTES.connect.turmas,
  ROUTES.connect.frequencia,
  ROUTES.connect.gerenciarFrequencia,
  ROUTES.connect.localizacao,
]);

export function getConnectDrawerItems(role?: UserRole): DrawerMenuItem[] {
  if (role === 'empresa' || role === 'connect_empresa') return EMPRESA_CONNECT_DRAWER_ITEMS;
  if (role === 'professor' || role === 'connect_professor') {
    return CONNECT_DRAWER_ITEMS.filter((item) => PROFESSOR_CONNECT_ROUTES.has(item.route));
  }
  return CONNECT_DRAWER_ITEMS;
}

export function getConnectBottomNav(role?: UserRole): NavItem[] {
  if (role === 'empresa' || role === 'connect_empresa') return EMPRESA_CONNECT_BOTTOM_NAV;
  if (role === 'professor' || role === 'connect_professor') {
    return CONNECT_BOTTOM_NAV.filter((item) => PROFESSOR_CONNECT_ROUTES.has(item.route));
  }
  return CONNECT_BOTTOM_NAV;
}

export const GRID_BOTTOM_NAV: NavItem[] = [
  { label: 'Início', route: ROUTES.grid.index, icon: <Home size={20} color={gridTheme.primary} /> },
  { label: 'Chamados', route: ROUTES.grid.chamados, icon: <Wrench size={20} color={gridTheme.primary} /> },
  { label: 'Tarefas', route: ROUTES.grid.tarefas, icon: <ClipboardList size={20} color={gridTheme.primary} /> },
  { label: 'Estoque', route: ROUTES.grid.estoque, icon: <Package size={20} color={gridTheme.primary} /> },
];

export const ALUNO_BOTTOM_NAV: NavItem[] = [
  { label: 'Inicio', route: ROUTES.aluno.dashboard, icon: <Home size={20} color={connectTheme.primary} /> },
  { label: 'Frequencia', route: ROUTES.aluno.frequencia, icon: <CalendarCheck size={20} color={connectTheme.primary} /> },
  { label: 'Grade', route: ROUTES.aluno.grade, icon: <ClipboardList size={20} color={connectTheme.primary} /> },
  { label: 'Perfil', route: ROUTES.aluno.perfil, icon: <User size={20} color={connectTheme.primary} /> },
];
