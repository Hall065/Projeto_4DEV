import type { UserRole } from '../constants/roles';

export function isStudentRole(role: UserRole | undefined) {
  return role === 'aluno' || role === 'connect_aluno';
}
