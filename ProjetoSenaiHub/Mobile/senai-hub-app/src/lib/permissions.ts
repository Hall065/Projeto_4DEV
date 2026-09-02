import type { UserRole } from '@/constants/roles';
import { ROLE_APPLICATION_ACCESS } from '@/constants/roles';
import { ROUTES } from '@/constants/routes';
import type { AuthSession, HubUsuario, UsuarioAplicacao } from '@/types/auth.types';
import { isStudentRole } from '@/lib/studentRole';

export { isStudentRole } from '@/lib/studentRole';

export type Permission = string;

const ROLE_ALIASES: Partial<Record<UserRole, UserRole>> = {
  professor: 'connect_professor',
  secretaria: 'connect_secretaria',
  aluno: 'connect_aluno',
  empresa: 'connect_empresa',
  manutencao: 'grid_funcionario',
  gerente_manutencao: 'grid_chefe',
  direcao: 'admin',
};

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  admin: ['*'],
  direcao: ['*'],

  professor: [
    'connect.access',
    'connect.dashboard',
    'connect.classes.view',
    'connect.students.view',
    'connect.attendance.view',
    'connect.attendance.manage',
    'connect.location.view',
    'connect.reports.view',
    // Regra mobile mantida: professor tambem abre/acompanha seus chamados Grid.
    'grid.access',
    'grid.tickets.view',
    'grid.tickets.create_own',
    'safe.access',
    'safe.dashboard',
    'safe.approve',
  ],
  connect_professor: [
    'connect.access',
    'connect.dashboard',
    'connect.classes.view',
    'connect.students.view',
    'connect.attendance.view',
    'connect.attendance.manage',
    'connect.reports.view',
    'safe.access',
    'safe.dashboard',
    'safe.approve',
  ],

  secretaria: [
    'connect.access',
    'connect.dashboard',
    'connect.people.manage',
    'connect.students.manage',
    'connect.teachers.manage',
    'connect.classes.manage',
    'connect.courses.manage',
    'connect.contracts.manage',
    'connect.companies.manage',
    'connect.attendance.view',
    'connect.attendance.manage',
    'connect.reports.view',
    'connect.spreadsheets',
    'connect.location.view',
    'connect.salary.manage',
  ],
  connect_secretaria: [
    'connect.access',
    'connect.dashboard',
    'connect.people.manage',
    'connect.students.manage',
    'connect.teachers.manage',
    'connect.classes.manage',
    'connect.courses.manage',
    'connect.contracts.manage',
    'connect.attendance.view',
    'connect.attendance.manage',
    'connect.reports.view',
    'connect.spreadsheets',
    'connect.location.view',
  ],
  connect_aqv: [
    'connect.access',
    'connect.dashboard',
    'connect.students.view',
    'connect.classes.view',
    'connect.attendance.view',
    'connect.reports.view',
    'connect.reports.manage',
    'connect.spreadsheets',
  ],

  empresa: [
    'connect.access',
    'connect.dashboard',
    'connect.attendance.view',
    'connect.reports.view',
    'connect.contracts.view_own',
    'connect.salary.view_own',
  ],
  connect_empresa: [
    'connect.access',
    'connect.dashboard',
    'connect.attendance.view',
    'connect.reports.view',
    'connect.contracts.view_own',
    'connect.salary.view_own',
  ],

  aluno: [
    'connect.access',
    'connect.attendance.view_own',
    'connect.salary.view_own',
  ],
  connect_aluno: [
    'connect.access',
    'connect.attendance.view_own',
    'connect.salary.view_own',
  ],

  manutencao: [
    'grid.access',
    'grid.dashboard',
    'grid.tasks.manage',
  ],
  grid_funcionario: [
    'grid.access',
    'grid.dashboard',
    'grid.tickets.view',
    'grid.tickets.update',
    'grid.tasks.manage',
    'grid.inventory.view',
    'grid.reports.view',
  ],

  gerente_manutencao: [
    'grid.access',
    'grid.dashboard',
    'grid.tickets.manage',
    'grid.tasks.manage',
    'grid.inventory.manage',
    'grid.users.manage',
    'grid.reports.view',
    'grid.spreadsheets',
  ],
  grid_chefe: [
    'grid.access',
    'grid.dashboard',
    'grid.tickets.manage',
    'grid.tasks.manage',
    'grid.inventory.manage',
    'grid.users.manage',
    'grid.reports.view',
    'grid.spreadsheets',
  ],

  safe_aqv: [
    'safe.access',
    'safe.dashboard',
    'safe.students.view',
    'safe.authorizations.manage',
  ],
  safe_professor: [
    'safe.access',
    'safe.dashboard',
    'safe.approve',
  ],
  safe_portaria: [
    'safe.access',
    'safe.dashboard',
    'safe.portaria',
  ],
};

const CONNECT_ROUTE_PERMISSIONS: Record<string, readonly Permission[]> = {
  [ROUTES.connect.index]: ['connect.dashboard'],
  [ROUTES.connect.alunos]: ['connect.students.view', 'connect.students.manage'],
  [ROUTES.connect.professores]: ['connect.teachers.manage'],
  [ROUTES.connect.usuarios]: ['connect.people.manage'],
  [ROUTES.connect.turmas]: ['connect.classes.view', 'connect.classes.manage'],
  [ROUTES.connect.cursos]: ['connect.courses.manage'],
  [ROUTES.connect.empresas]: ['connect.companies.manage', 'connect.contracts.manage'],
  [ROUTES.connect.frequencia]: [
    'connect.attendance.view',
    'connect.attendance.view_own',
    'connect.attendance.manage',
  ],
  [ROUTES.connect.gerenciarFrequencia]: ['connect.attendance.view', 'connect.attendance.manage'],
  [ROUTES.connect.relatorios]: ['connect.reports.view', 'connect.reports.manage'],
  [ROUTES.connect.localizacao]: ['connect.location.view'],
  [ROUTES.connect.contratos]: ['connect.contracts.manage', 'connect.contracts.view_own'],
  [ROUTES.connect.contratoAlunos]: ['connect.contracts.manage'],
  [ROUTES.connect.salario]: ['connect.salary.manage', 'connect.salary.view_own'],
};

const GRID_ROUTE_PERMISSIONS: Record<string, readonly Permission[]> = {
  [ROUTES.grid.index]: ['grid.dashboard'],
  [ROUTES.grid.chamados]: ['grid.tickets.view', 'grid.tickets.manage', 'grid.tickets.create_own'],
  [ROUTES.grid.tarefas]: ['grid.tasks.manage'],
  [ROUTES.grid.relatorios]: ['grid.reports.view'],
  [ROUTES.grid.estoque]: ['grid.inventory.view', 'grid.inventory.manage'],
  [ROUTES.grid.mapaTarefas]: ['grid.tasks.manage'],
  [ROUTES.grid.usuarios]: ['grid.users.manage'],
};

const SAFE_ROUTE_PERMISSIONS: Record<string, readonly Permission[]> = {
  [ROUTES.safe.index]: ['safe.dashboard'],
  [ROUTES.safe.autorizacoes]: ['safe.authorizations.manage'],
  [ROUTES.safe.aprovacoes]: ['safe.approve'],
  [ROUTES.safe.portaria]: ['safe.portaria'],
};

const PROFESSOR_CONNECT_ROUTES = new Set<string>([
  ROUTES.connect.index,
  ROUTES.connect.turmas,
  ROUTES.connect.frequencia,
  ROUTES.connect.gerenciarFrequencia,
  ROUTES.connect.localizacao,
]);

const EMPRESA_CONNECT_ROUTES = new Set<string>([
  ROUTES.connect.index,
  ROUTES.connect.contratos,
  ROUTES.connect.gerenciarFrequencia,
  ROUTES.connect.salario,
]);

export function getWebEquivalentRole(role: UserRole | undefined): UserRole | undefined {
  if (!role) return undefined;
  return ROLE_ALIASES[role] ?? role;
}

export function getRolePermissions(role: UserRole | undefined): readonly Permission[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  const permissions = getRolePermissions(role);
  return permissions.includes('*') || permissions.includes(permission);
}

export function hasAnyPermission(
  role: UserRole | undefined,
  permissions: readonly Permission[]
): boolean {
  if (!permissions.length) return true;
  return permissions.some((permission) => hasPermission(role, permission));
}

export function canAccessConnect(perfil: HubUsuario, aplicacoes: UsuarioAplicacao[]): boolean {
  const role = perfil.tipo as UserRole;
  const roleAllowsConnect = hasPermission(role, 'connect.access') && !isStudentRole(role);
  if (hasApplication(aplicacoes, 'senai_connect')) return roleAllowsConnect;
  return (ROLE_APPLICATION_ACCESS[role]?.connect ?? false) && roleAllowsConnect;
}

export function canAccessGrid(perfil: HubUsuario, aplicacoes: UsuarioAplicacao[]): boolean {
  const role = perfil.tipo as UserRole;
  const roleAllowsGrid = hasPermission(role, 'grid.access');
  if (hasApplication(aplicacoes, 'senai_grid')) return roleAllowsGrid;
  return (ROLE_APPLICATION_ACCESS[role]?.grid ?? false) && roleAllowsGrid;
}

export function canAccessSafe(perfil: HubUsuario, aplicacoes: UsuarioAplicacao[]): boolean {
  const role = perfil.tipo as UserRole;
  const roleAllowsSafe = hasPermission(role, 'safe.access');
  if (hasApplication(aplicacoes, 'senai_safe')) return roleAllowsSafe;
  return (ROLE_APPLICATION_ACCESS[role]?.safe ?? false) && roleAllowsSafe;
}

export function hasApplication(aplicacoes: UsuarioAplicacao[], codigo: string): boolean {
  return aplicacoes.some((a) => a.aplicacao_codigo === codigo);
}

export function canManageUsers(role: UserRole): boolean {
  return hasAnyPermission(role, ['connect.people.manage', 'grid.users.manage']);
}

export function canApprovePurchase(role: UserRole, valor: number): boolean {
  if (hasPermission(role, '*')) return true;
  if (hasPermission(role, 'connect.contracts.manage') && valor <= 500) return true;
  return false;
}

export function isEmpresaRole(role: UserRole | undefined) {
  return role === 'empresa' || role === 'connect_empresa';
}

export function isProfessorRole(role: UserRole | undefined) {
  return role === 'professor' || role === 'connect_professor';
}

export function canManageConnectData(role: UserRole | undefined) {
  return hasAnyPermission(role, [
    'connect.people.manage',
    'connect.students.manage',
    'connect.teachers.manage',
    'connect.classes.manage',
    'connect.courses.manage',
    'connect.contracts.manage',
    'connect.salary.manage',
  ]);
}

export function canAccessConnectRoute(role: UserRole | undefined, route: string): boolean {
  if (isStudentRole(role)) return false;
  if (isProfessorRole(role) && !PROFESSOR_CONNECT_ROUTES.has(route)) return false;
  if (isEmpresaRole(role) && !EMPRESA_CONNECT_ROUTES.has(route)) return false;
  return hasAnyPermission(role, CONNECT_ROUTE_PERMISSIONS[route] ?? ['connect.access']);
}

export function canAccessGridRoute(role: UserRole | undefined, route: string): boolean {
  return hasAnyPermission(role, GRID_ROUTE_PERMISSIONS[route] ?? ['grid.access']);
}

export function canAccessSafeRoute(role: UserRole | undefined, route: string): boolean {
  if (role === 'admin' || role === 'direcao') {
    return route === ROUTES.safe.index || route === ROUTES.safe.autorizacoes;
  }
  return hasAnyPermission(role, SAFE_ROUTE_PERMISSIONS[route] ?? ['safe.access']);
}

export function getDefaultConnectRoute(role: UserRole | undefined) {
  if (role === 'professor' || role === 'connect_professor') return ROUTES.connect.turmas;
  if (isEmpresaRole(role)) return ROUTES.connect.contratos;
  return ROUTES.connect.index;
}

export function getDefaultGridRoute(role: UserRole | undefined) {
  if (role === 'professor') return ROUTES.grid.chamados;
  if (role === 'manutencao' || role === 'grid_funcionario') return ROUTES.grid.tarefas;
  return ROUTES.grid.index;
}

export function getDefaultSafeRoute(role: UserRole | undefined) {
  if (hasPermission(role, 'safe.authorizations.manage')) return ROUTES.safe.autorizacoes;
  if (hasPermission(role, 'safe.approve')) return ROUTES.safe.aprovacoes;
  if (hasPermission(role, 'safe.portaria')) return ROUTES.safe.portaria;
  return ROUTES.safe.index;
}

export function getPostLoginRoute(session: AuthSession | null) {
  const role = session?.perfil?.tipo;
  if (!session?.perfil || !role) return ROUTES.login;
  if (isStudentRole(role)) return ROUTES.aluno.dashboard;

  return ROUTES.hub;
}

export function isMaintenanceRole(role: UserRole | undefined) {
  return role === 'manutencao' || role === 'gerente_manutencao' || role === 'grid_funcionario' || role === 'grid_chefe';
}
