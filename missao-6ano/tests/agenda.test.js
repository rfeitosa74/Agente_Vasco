import test from 'node:test';
import assert from 'node:assert/strict';
import { lerAgenda } from '../js/core/agenda.js';

test('lerAgenda entende data, disciplina, peso e conteúdo', () => {
  const { itens, erros } = lerAgenda('08/10 História 2 Egito e Mesopotâmia\n09/10 matematica 1 Frações\n13/10 Geografia\nlinha torta', 2026);
  assert.equal(erros.length, 1);
  assert.deepEqual(itens[0], { data: '2026-10-08', disciplina: 'História', peso: 2, conteudo: 'Egito e Mesopotâmia' });
  assert.deepEqual(itens[1], { data: '2026-10-09', disciplina: 'Matemática', peso: 1, conteudo: 'Frações' });
  assert.deepEqual(itens[2], { data: '2026-10-13', disciplina: 'Geografia', peso: 1, conteudo: '' });
});

test('lerAgenda aceita ano e disciplina sem acento', () => {
  const { itens } = lerAgenda('5-11-26 portugues 3', 2026);
  assert.equal(itens[0].data, '2026-11-05');
  assert.equal(itens[0].disciplina, 'Português');
  assert.equal(itens[0].peso, 3);
});
