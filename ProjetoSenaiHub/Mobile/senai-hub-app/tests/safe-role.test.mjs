import assert from 'node:assert/strict';
import test from 'node:test';
import { APPLICATIONS, ROLE_APPLICATION_ACCESS, USER_ROLES } from '../src/constants/roles.ts';

test('declara os tres papeis operacionais do SENAI Safe', () => {
  assert.equal(USER_ROLES.includes('safe_aqv'), true);
  assert.equal(USER_ROLES.includes('safe_professor'), true);
  assert.equal(USER_ROLES.includes('safe_portaria'), true);
});

test('mantem o Safe isolado dos papeis sem permissao padrao', () => {
  assert.equal(APPLICATIONS.SAFE, 'senai_safe');
  assert.equal(ROLE_APPLICATION_ACCESS.safe_aqv.safe, true);
  assert.equal(ROLE_APPLICATION_ACCESS.safe_professor.safe, true);
  assert.equal(ROLE_APPLICATION_ACCESS.safe_portaria.safe, true);
  assert.equal(ROLE_APPLICATION_ACCESS.aluno.safe, false);
});
