import assert from 'node:assert/strict';
import test from 'node:test';
import { isStudentRole } from '../src/lib/studentRole.ts';

test('bloqueia os dois aliases de aluno no chatbot global', () => {
  assert.equal(isStudentRole('aluno'), true);
  assert.equal(isStudentRole('connect_aluno'), true);
});

test('mantem um papel autorizado fora da restricao de aluno', () => {
  assert.equal(isStudentRole('admin'), false);
});
