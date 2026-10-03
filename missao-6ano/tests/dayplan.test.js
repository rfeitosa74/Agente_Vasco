import test from 'node:test';
import assert from 'node:assert/strict';
import { getState, mutate, mutateDay } from '../js/store.js';
import { planoDoDia, planoDaSemana } from '../js/core/dayplan.js';
import { itensDoDia, resumoSemana, xpDoDia, corrente, diaCompleto } from '../js/core/xp.js';

const reset = (cfg = {}) => mutate((s) => {
  s.provas = []; s.days = {}; s.semanas = {};
  Object.assign(s.config, { inicioBimestre4: '2026-10-19', faseForcada: null, diasLivres: [] }, cfg);
  s.criadoEm = '2026-09-01';
});

test('antes da rampa: só Aquecimento; com prova, o ciclo manda; Dia D só aquece', () => {
  reset();
  assert.equal(planoDoDia(getState(), '2026-10-05').tipo, 'sem-missao');
  mutate((s) => s.provas.push({ id: 'h', disciplina: 'História', data: '2026-10-08', peso: 1, criadaEm: '2026-09-20' }));
  const seg = planoDoDia(getState(), '2026-10-05');
  assert.equal(seg.tipo, 'ciclo');
  assert.equal(seg.sprints.length, 2);
  assert.equal(seg.sprints[0].estagio, 'D3');
  assert.ok(seg.ponte, 'História deve trazer pergunta-ponte');
  assert.equal(planoDoDia(getState(), '2026-10-07').sprints.length, 1); // D-1: 12 minutos e acabou
  const diaD = planoDoDia(getState(), '2026-10-08');
  assert.equal(diaD.tipo, 'diaD');
  assert.equal(diaD.sprints.length, 0);
  assert.deepEqual(diaD.blocos.map((b) => b.id), ['aquecimento']);
});

test('modo padrão (rotação) a partir da semana 1 da rampa, com 1 sprint; semana 2 com 2 sprints e XP', () => {
  reset();
  const seg = planoDoDia(getState(), '2026-10-19'); // semana 1
  assert.equal(seg.tipo, 'padrao');
  assert.equal(seg.fase.key, 'w1');
  assert.equal(seg.sprints.length, 1);
  assert.equal(seg.fase.xp, false);
  const qua2 = planoDoDia(getState(), '2026-10-28'); // semana 2, quarta
  assert.equal(qua2.fase.key, 'w2');
  assert.equal(qua2.sprints.length, 2);
  assert.equal(qua2.sprints[0].ferramentas[0].id, 'problemas');
  assert.ok(qua2.blocos.some((b) => b.id === 'episodio'));
  assert.ok(qua2.blocos.some((b) => b.id === 'base'));
  const ter2 = planoDoDia(getState(), '2026-10-27');
  assert.ok(!ter2.blocos.some((b) => b.id === 'episodio'));
  // semana 3: sprints de 15 min e Desafio do Pai no sábado
  const sab3 = planoDoDia(getState(), '2026-11-07');
  assert.ok(sab3.blocos.some((b) => b.id === 'desafio'));
  assert.equal(planoDoDia(getState(), '2026-11-03').sprints[0].minutos, 15);
  // domingo: folga
  assert.equal(planoDoDia(getState(), '2026-11-08').tipo, 'folga');
});

test('quinta: História + Geografia em duas cartas', () => {
  reset({ faseForcada: 'full' });
  const qui = planoDoDia(getState(), '2026-10-22');
  assert.deepEqual(qui.sprints.map((s) => s.ferramentas[0].disciplina), ['História', 'Geografia']);
});

test('dois estágios no mesmo dia: um sprint para cada prova', () => {
  reset();
  mutate((s) => s.provas.push(
    { id: 'h', disciplina: 'História', data: '2026-10-08', peso: 1, criadaEm: '2026-09-20' },
    { id: 'g', disciplina: 'Geografia', data: '2026-10-07', peso: 1, criadaEm: '2026-09-20' },
  ));
  const seg = planoDoDia(getState(), '2026-10-05');
  assert.ok(seg.sprints.length <= 2);
  const ativos = seg.estagios.filter((e) => e.estagio !== 'D');
  if (ativos.length === 2) assert.deepEqual(new Set(seg.sprints.map((s) => s.provaId)).size, 2);
});

test('XP: sprint 10 (×2) + missão completa +10 + caligrafia 5 + episódio 15 + explicou 20', () => {
  reset({ faseForcada: 'full' });
  const data = '2026-10-21'; // quarta
  mutateDay(data, (d) => {
    d.caligrafia = true;
    d.sprints = { 1: { ok: true }, 2: { ok: true } };
    d.episodio = true;
    d.explicou = true;
  });
  assert.equal(xpDoDia(getState(), data), 5 + 20 + 10 + 15 + 20);
  assert.ok(diaCompleto(getState().days[data], planoDoDia(getState(), data)));
});

test('dia difícil (5 minutos): mantém a corrente, sem bônus de missão completa', () => {
  reset({ faseForcada: 'full' });
  const data = '2026-10-21';
  mutateDay(data, (d) => { d.caligrafia = true; d.diaDificil = true; d.sprints = { 1: { ok: true } }; });
  assert.equal(xpDoDia(getState(), data), 5 + 10);
  assert.ok(diaCompleto(getState().days[data], planoDoDia(getState(), data)));
});

test('semana com 5 dias completos: +30; corrente conta dias úteis seguidos', () => {
  reset({ faseForcada: 'full' });
  const dias = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'];
  for (const d of dias) {
    const plano = planoDoDia(getState(), d);
    mutateDay(d, (x) => { x.caligrafia = true; for (const sp of plano.sprints) x.sprints[sp.idx] = { ok: true }; });
  }
  const r = resumoSemana(getState(), '2026-10-21');
  assert.equal(r.completos, 5);
  assert.equal(r.bonus, 30);
  assert.equal(corrente(getState(), '2026-10-23'), 5);
  assert.equal(corrente(getState(), '2026-10-26'), 5); // segunda de hoje ainda em aberto
  // um dia incompleto na semana tira o bônus
  mutateDay('2026-10-22', (x) => { x.sprints = {}; });
  assert.equal(resumoSemana(getState(), '2026-10-21').bonus, 0);
});

test('dia livre (feriado) reduz o necessário para o bônus e não quebra a corrente', () => {
  reset({ faseForcada: 'full', diasLivres: ['2026-10-21'] });
  for (const d of ['2026-10-19', '2026-10-20', '2026-10-22', '2026-10-23']) {
    const plano = planoDoDia(getState(), d);
    mutateDay(d, (x) => { x.caligrafia = true; for (const sp of plano.sprints) x.sprints[sp.idx] = { ok: true }; });
  }
  const r = resumoSemana(getState(), '2026-10-21');
  assert.equal(r.necessarios, 4);
  assert.equal(r.bonus, 30);
  assert.equal(corrente(getState(), '2026-10-23'), 4);
  assert.equal(planoDoDia(getState(), '2026-10-21').tipo, 'livre');
});

test('planoDaSemana devolve 7 dias começando na segunda', () => {
  reset();
  const s = planoDaSemana(getState(), '2026-10-07');
  assert.equal(s.length, 7);
  assert.equal(s[0].data, '2026-10-05');
  assert.equal(s[6].data, '2026-10-11');
});
