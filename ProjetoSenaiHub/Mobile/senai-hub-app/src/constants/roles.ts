export const MOBILE_USER_ROLES = [
  'admin',
  'aluno',
  'professor',
  'secretaria',
  'direcao',
  'empresa',
  'manutencao',
  'gerente_manutencao',
] as const;

export const WEB_USER_ROLES = [
  'connect_professor',
  'connect_secretaria',
  'connect_aqv',
  'connect_empresa',
  'connect_aluno',
  'grid_chefe',
  'grid_funcionario',
  'safe_aqv',
  'safe_professor',
  'safe_portaria',
] as const;

export const USER_ROLES = [...MOBILE_USER_ROLES, ...WEB_USER_ROLES] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const APPLICATIONS = {
  HUB: 'senai_hub',
  CONNECT: 'senai_connect',
  GRID: 'senai_grid',
  SAFE: 'senai_safe',
} as const;

export type ApplicationCode = (typeof APPLICATIONS)[keyof typeof APPLICATIONS];

export const ROLE_APPLICATION_ACCESS: Record<
  UserRole,
  { hub: boolean; connect: boolean; grid: boolean; safe: boolean }
> = {
  admin: { hub: true, connect: true, grid: true, safe: true },
  direcao: { hub: true, connect: true, grid: true, safe: true },
  secretaria: { hub: true, connect: true, grid: false, safe: false },
  professor: { hub: true, connect: true, grid: true, safe: false },
  aluno: { hub: true, connect: false, grid: false, safe: false },
  empresa: { hub: true, connect: true, grid: false, safe: false },
  manutencao: { hub: true, connect: false, grid: true, safe: false },
  gerente_manutencao: { hub: true, connect: false, grid: true, safe: false },
  connect_professor: { hub: true, connect: true, grid: false, safe: false },
  connect_secretaria: { hub: true, connect: true, grid: false, safe: false },
  connect_aqv: { hub: true, connect: true, grid: false, safe: false },
  connect_empresa: { hub: true, connect: true, grid: false, safe: false },
  connect_aluno: { hub: true, connect: false, grid: false, safe: false },
  grid_chefe: { hub: true, connect: false, grid: true, safe: false },
  grid_funcionario: { hub: true, connect: false, grid: true, safe: false },
  safe_aqv: { hub: true, connect: false, grid: false, safe: true },
  safe_professor: { hub: true, connect: false, grid: false, safe: true },
  safe_portaria: { hub: true, connect: false, grid: false, safe: true },
};
