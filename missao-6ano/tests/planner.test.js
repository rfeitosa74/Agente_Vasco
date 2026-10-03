import test from 'node:test';
import assert from 'node:assert/strict';
import { planejarProvas } from '../js/core/planner.js';
import { faseKey } from '../js/core/phase.js';

// Semana de referência: seg 2026-10-05 … sex 2026-10-09
const P = (id, disciplina, data, extra = {}) => ({ id, disciplina, data, peso: 1, criadaEm: '2026-09-01', ...extra });
const estagios = (r, d) => (r.porDia[d] || []).map((s) => `${s.provaId}:${s.estagio}`);

test('uma prova na quinta: D-3 segunda, D-2 terça, D-1 quarta, Dia D quinta', () => {
  const r = planejarProvas([P('h', 'História', '2026-10-08')]);
  assert.deepEqual(estagios(r, '2026-10-05'), ['h:D3']);
  assert.deepEqual(estagios(r, '2026-10-06'), ['h:D2']);
  assert.deepEqual(estagios(r, '2026-10-07'), ['h:D1']);
  assert.deepEqual(estagios(r, '2026-10-08'), ['h:D']);
});

test('prova na segunda: estágios caem na semana anterior, nunca no fim de semana', () => {
  const r = planejarProvas([P('g', 'Geografia', '2026-10-12')]);
  assert.deepEqual(estagios(r, '2026-10-09'), ['g:D1']); // sexta
  assert.deepEqual(estagios(r, '2026-10-08'), ['g:D2']);
  assert.deepEqual(estagios(r, '2026-10-07'), ['g:D3']);
  for (const d of ['2026-10-10', '2026-10-11']) assert.equal(r.porDia[d], undefined);
});

test('três provas na semana: respeita máx. 2 ativos/dia e nunca dois D-2 juntos', () => {
  const provas = [P('h', 'História', '2026-10-06'), P('g', 'Geografia', '2026-10-08'), P('m', 'Matemática', '2026-10-09')];
  const r = planejarProvas(provas);
  for (const [d, lista] of Object.entries(r.porDia)) {
    assert.ok(lista.filter((s) => s.estagio !== 'D').length <= 2, `${d} tem mais de 2 ativos`);
    assert.ok(lista.filter((s) => s.estagio === 'D2').length <= 1, `${d} tem dois D-2`);
  }
  // cada prova tem os 3 estágios em ordem cronológica
  for (const p of provas) {
    const dias = {};
    for (const [d, lista] of Object.entries(r.porDia)) for (const s of lista) if (s.provaId === p.id) dias[s.estagio] = d;
    assert.ok(dias.D3 <= dias.D2 && dias.D2 <= dias.D1 && dias.D1 < dias.D, `ordem quebrada em ${p.id}: ${JSON.stringify(dias)}`);
  }
});

test('conflito: a disciplina crítica tem prioridade sobre a de maior peso', () => {
  // Duas provas na mesma quinta; ocupar os dias para forçar deslocamento.
  const provas = [
    P('m', 'Matemática', '2026-10-08', { peso: 5 }),
    P('h', 'História', '2026-10-08', { peso: 1 }),
    P('p', 'Português', '2026-10-08', { peso: 3 }),
  ];
  const r = planejarProvas(provas);
  // História pega o D-2 "ideal" (terça); as outras deslocam para trás
  const d2 = (id) => Object.entries(r.porDia).find(([, l]) => l.some((s) => s.provaId === id && s.estagio === 'D2'))[0];
  assert.equal(d2('h'), '2026-10-06');
  assert.ok(d2('m') < d2('h'));
  assert.notEqual(d2('m'), d2('p'));
});

test('pouco tempo (1 dia): fabricar + puxar no mesmo dia, sem D-1, e avisa', () => {
  const r = planejarProvas([P('h', 'História', '2026-10-08', { criadaEm: '2026-10-07' })]);
  assert.deepEqual(estagios(r, '2026-10-07').sort(), ['h:D2', 'h:D3']);
  assert.ok(r.avisos.h.length >= 1);
});

test('pouco tempo (2 dias): D-3 e D-2 juntos no 1º dia, D-1 no 2º', () => {
  const r = planejarProvas([P('h', 'História', '2026-10-08', { criadaEm: '2026-10-06' })]);
  assert.deepEqual(estagios(r, '2026-10-06').sort(), ['h:D2', 'h:D3']);
  assert.deepEqual(estagios(r, '2026-10-07'), ['h:D1']);
  assert.ok(r.avisos.h.length >= 1);
});

test('dia livre (feriado) não recebe estágio', () => {
  const r = planejarProvas([P('h', 'História', '2026-10-08')], { diasLivres: ['2026-10-07'] });
  assert.equal(r.porDia['2026-10-07'], undefined);
  assert.deepEqual(estagios(r, '2026-10-06'), ['h:D1']);
});

test('provas canceladas são ignoradas', () => {
  const r = planejarProvas([P('h', 'História', '2026-10-08', { cancelada: true })]);
  assert.deepEqual(r.porDia, {});
});

test('fases da rampa a partir da 1ª segunda do 4º bimestre', () => {
  const cfg = { inicioBimestre4: '2026-10-19' };
  assert.equal(faseKey('2026-10-16', cfg), 'pre');
  assert.equal(faseKey('2026-10-19', cfg), 'w1');
  assert.equal(faseKey('2026-10-25', cfg), 'w1'); // domingo ainda é semana 1
  assert.equal(faseKey('2026-10-26', cfg), 'w2');
  assert.equal(faseKey('2026-11-02', cfg), 'w3');
  assert.equal(faseKey('2026-11-09', cfg), 'w4');
  assert.equal(faseKey('2026-11-16', cfg), 'full');
  assert.equal(faseKey('2026-10-20', { ...cfg, faseForcada: 'w3' }), 'w3');
});
