import test from 'node:test';
import assert from 'node:assert/strict';
import { CARTAS_INICIAIS } from '../js/data/cartas.js';
import { PONTES } from '../js/data/ponte.js';
import { TEXTOS } from '../js/data/textos.js';
import { EPISODIOS_IDEIAS } from '../js/data/episodios.js';
import { ROTACAO, sprintsDoEstagio, FERRAMENTA_DISC } from '../js/data/tecnicas.js';
import { GUIA, PERGUNTAS_PROFESSORAS, REGRAS_LUAN } from '../js/data/guia.js';
import { DISCIPLINAS } from '../js/core/planner.js';
import { diagnosticoErros, distribuicaoErros, insights, primeirosPassos } from '../js/core/insights.js';
import { getState, mutate } from '../js/store.js';

const preenchido = (...v) => v.every((x) => typeof x === 'string' && x.trim().length > 2);

test('cartas iniciais: campos completos, disciplina válida, sem frentes repetidas', () => {
  const frentes = new Set();
  for (const c of CARTAS_INICIAIS) {
    assert.ok(preenchido(c.frente, c.verso, c.tag), JSON.stringify(c));
    assert.ok(DISCIPLINAS.includes(c.disciplina), c.disciplina);
    assert.ok(!frentes.has(c.frente), `repetida: ${c.frente}`);
    frentes.add(c.frente);
  }
  for (const d of ['História', 'Geografia', 'Matemática', 'Português']) assert.ok(CARTAS_INICIAIS.some((c) => c.disciplina === d), d);
});

test('pontes da astronomia: História e Geografia, com pergunta e deixa', () => {
  for (const p of PONTES) { assert.ok(preenchido(p.pergunta, p.deixa, p.topico)); assert.ok(['História', 'Geografia'].includes(p.disciplina)); }
  assert.ok(PONTES.filter((p) => p.disciplina === 'História').length >= 8);
  assert.ok(PONTES.filter((p) => p.disciplina === 'Geografia').length >= 6);
});

test('textos do Caça ao detalhe: 3 perguntas, 4 opções, resposta dentro do intervalo', () => {
  for (const t of TEXTOS) {
    assert.ok(preenchido(t.titulo, t.texto));
    assert.equal(t.perguntas.length, 3, t.id);
    for (const q of t.perguntas) { assert.equal(q.o.length, 4); assert.ok(q.c >= 0 && q.c < 4); assert.equal(new Set(q.o).size, 4, `opções repetidas em ${t.id}`); }
  }
});

test('episódios: gancho, 3 fatos e fecho', () => {
  for (const e of EPISODIOS_IDEIAS) { assert.ok(preenchido(e.titulo, e.gancho, e.fecho, e.conteudo6)); assert.equal(e.fatos.length, 3); assert.ok(e.materias.length >= 1); }
  assert.equal(EPISODIOS_IDEIAS.filter((e) => e.destaque).length, 1); // Eratóstenes
});

test('rotação seg–sex: cada sprint tem passos; sábado e domingo não entram', () => {
  assert.deepEqual(Object.keys(ROTACAO).map(Number), [1, 2, 3, 4, 5]);
  for (const r of Object.values(ROTACAO)) { assert.equal(r.sprints.length, 2); for (const s of r.sprints) assert.ok(s.passos.length >= 2 && preenchido(s.titulo)); }
});

test('estágios: D-3 e D-2 têm 2 sprints, D-1 só 1 (12 minutos e acabou), Dia D nenhum', () => {
  for (const d of DISCIPLINAS) {
    assert.equal(sprintsDoEstagio('D3', d).length, 2);
    assert.equal(sprintsDoEstagio('D2', d).length, 2);
    assert.equal(sprintsDoEstagio('D1', d).length, 1);
    assert.equal(sprintsDoEstagio('D', d).length, 0);
    assert.ok(FERRAMENTA_DISC[d]);
  }
});

test('guia, perguntas às professoras e carta do Luan existem e têm texto', () => {
  assert.equal(PERGUNTAS_PROFESSORAS.length, 4);
  assert.equal(REGRAS_LUAN.length, 6);
  for (const s of GUIA) { assert.ok(s.titulo && s.itens.length); for (const i of s.itens) assert.ok(preenchido(i.t, i.d)); }
});

test('diagnóstico do diário de erros segue a leitura do plano (A, B, C)', () => {
  const mk = (t, n) => Array.from({ length: n }, () => ({ tipo: t }));
  assert.equal(diagnosticoErros(mk('B', 3)).suficiente, false);
  assert.match(diagnosticoErros([...mk('B', 8), ...mk('A', 2)]).texto, /nunca foi estudo/);
  assert.match(diagnosticoErros([...mk('A', 8), ...mk('B', 2)]).texto, /falta cobertura/);
  assert.match(diagnosticoErros([...mk('C', 8), ...mk('A', 2)]).texto, /sono e ansiedade/);
  assert.deepEqual(distribuicaoErros([...mk('A', 2), ...mk('C', 1), { tipo: null }]), { A: 2, B: 0, C: 1, total: 3 });
});

test('alertas: sem provas e sem teste de Matemática aparecem; com provas somem', () => {
  mutate((s) => { s.provas = []; s.testesMat = []; s.days = {}; s.erros = []; s.config.faseForcada = null; s.config.inicioBimestre4 = '2026-10-19'; });
  const t = insights(getState(), '2026-10-05').map((i) => i.titulo);
  assert.ok(t.some((x) => /Nenhuma prova/.test(x)));
  assert.ok(t.some((x) => /teste de 10 minutos/.test(x)));
  mutate((s) => s.provas.push({ id: 'p', disciplina: 'História', data: '2026-10-08', peso: 1, criadaEm: '2026-10-01' }));
  assert.ok(!insights(getState(), '2026-10-05').some((i) => /Nenhuma prova/.test(i.titulo)));
  assert.ok(primeirosPassos(getState()).length === 7);
});
