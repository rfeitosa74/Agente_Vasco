import test from 'node:test';
import assert from 'node:assert/strict';
import { novaTarefa, statusDe, situacaoDe, estimarMinutos, conferirAuto, progressoDe, tarefasAFazer, tarefasDeHoje, cargaMinutos, aConferir, anexosDaTarefa, resumoConferencia } from '../js/core/tarefas.js';

const HOJE = '2026-10-07'; // quarta
const T = (p = {}) => novaTarefa({ disciplina: 'Matemática', titulo: 'Ex. 1 a 3', ...p }, HOJE);

test('prazo padrão é o próximo dia de aula; sexta → segunda', () => {
  assert.equal(T().entrega, '2026-10-08');
  assert.equal(novaTarefa({ titulo: 'x' }, '2026-10-09').entrega, '2026-10-12');
  assert.equal(novaTarefa({ titulo: 'x', entrega: '2026-10-20' }, HOJE).entrega, '2026-10-20');
});

test('status: pendente → andamento (resposta, foto ou início) → feita → conferida', () => {
  const t = T({ itens: [{ enunciado: 'a' }, { enunciado: 'b' }] });
  assert.equal(statusDe(t), 'pendente');
  t.itens[0].resposta = 'algo';
  assert.equal(statusDe(t), 'andamento');
  assert.deepEqual(progressoDe(t), { feitos: 1, total: 2 });
  const c = T(); c.fotosCaderno.push('f1');
  assert.equal(statusDe(c), 'andamento');
  t.feitaEm = HOJE;
  assert.equal(statusDe(t), 'feita');
  t.conferidaEm = HOJE;
  assert.equal(statusDe(t), 'conferida');
});

test('situação em relação ao prazo', () => {
  assert.equal(situacaoDe(T({ entrega: '2026-10-06' }), HOJE), 'atrasada');
  assert.equal(situacaoDe(T({ entrega: HOJE }), HOJE), 'hoje');
  assert.equal(situacaoDe(T({ entrega: '2026-10-08' }), HOJE), 'amanha');
  assert.equal(situacaoDe(T({ entrega: '2026-10-12' }), HOJE), 'futura');
  const feita = T(); feita.feitaEm = HOJE;
  assert.equal(situacaoDe(feita, HOJE), 'ok');
});

test('estimativa de tempo: do pai, dos itens ou padrão', () => {
  assert.equal(estimarMinutos(T({ minutos: 40 })), 40);
  assert.equal(estimarMinutos(T()), 20);
  assert.equal(estimarMinutos(T({ titulo: 'Redação sobre as férias' })), 30);
  assert.equal(estimarMinutos(T({ itens: [{ tipo: 'aberta' }, { tipo: 'aberta' }, { tipo: 'redacao' }] })), 33);
});

test('correção automática: múltipla escolha, V/F e cálculo (formatos de número)', () => {
  assert.equal(conferirAuto({ tipo: 'objetiva', gabarito: 'b', resposta: 'B) a planta produz alimento' }), 'certo');
  assert.equal(conferirAuto({ tipo: 'objetiva', gabarito: 'b', resposta: 'c' }), 'errado');
  assert.equal(conferirAuto({ tipo: 'vf', gabarito: 'Falso', resposta: 'f' }), 'certo');
  assert.equal(conferirAuto({ tipo: 'calculo', gabarito: '0,75', resposta: '3/4' }), 'certo');
  assert.equal(conferirAuto({ tipo: 'calculo', gabarito: '918', resposta: '1.000' }), 'errado');
  assert.equal(conferirAuto({ tipo: 'aberta', gabarito: 'x', resposta: 'x' }), null);
  assert.equal(conferirAuto({ tipo: 'objetiva', gabarito: '', resposta: 'a' }), null);
});

test('listas do Luan: ordem por urgência, o que é de hoje à noite, carga e conferência', () => {
  const st = { config: { diasLivres: [] }, tarefas: [] };
  const atrasada = T({ titulo: 'a', entrega: '2026-10-05' }), amanha = T({ titulo: 'b' }), longe = T({ titulo: 'c', entrega: '2026-10-14' }), feita = T({ titulo: 'd' });
  feita.feitaEm = HOJE;
  st.tarefas = [longe, amanha, feita, atrasada];
  assert.deepEqual(tarefasAFazer(st, HOJE).map((t) => t.titulo), ['a', 'b', 'c']);
  assert.deepEqual(tarefasDeHoje(st, HOJE).map((t) => t.titulo), ['a', 'b']);
  assert.equal(cargaMinutos(st, HOJE), 40);
  assert.deepEqual(aConferir(st).map((t) => t.titulo), ['d']);
});

test('anexos da tarefa sem repetição; resumo da conferência', () => {
  const t = T({ anexos: ['a1'], itens: [{ anexos: ['a1', 'a2'] }] }); t.fotosCaderno = ['f1'];
  assert.deepEqual(anexosDaTarefa(t).sort(), ['a1', 'a2', 'f1']);
  t.itens[0].correcao.res = 'certo';
  assert.deepEqual(resumoConferencia(t), { certo: 1, parcial: 0, errado: 0, aberto: 0 });
});
