import test from 'node:test';
import assert from 'node:assert/strict';
import { merge3 } from '../js/core/merge3.js';

const base = { days: { '2026-10-05': { caligrafia: false, recado: '' } }, provas: [{ id: 'p1', nota: null }], cartas: [{ id: 'c1', caixa: 1 }, { id: 'c2', caixa: 1 }], config: { diasLivres: ['2026-11-02'], tutor: 'Rubens', niveis: { ouro: 250 } } };

test('cada aparelho muda uma parte do mesmo dia: as duas mudanças sobrevivem', () => {
  const luan = structuredClone(base); luan.days['2026-10-05'].caligrafia = true;          // aparelho do Luan
  const pai = structuredClone(base); pai.days['2026-10-05'].recado = 'Desenhe o Nilo!';   // aparelho do pai
  const m = merge3(base, luan, pai);
  assert.equal(m.days['2026-10-05'].caligrafia, true);
  assert.equal(m.days['2026-10-05'].recado, 'Desenhe o Nilo!');
});

test('dias novos nos dois lados se juntam', () => {
  const a = structuredClone(base); a.days['2026-10-06'] = { caligrafia: true };
  const b = structuredClone(base); b.days['2026-10-07'] = { recado: 'x' };
  const m = merge3(base, a, b);
  assert.deepEqual(Object.keys(m.days).sort(), ['2026-10-05', '2026-10-06', '2026-10-07']);
});

test('listas com id: adição, edição e remoção de itens diferentes se mesclam', () => {
  const a = structuredClone(base); a.cartas.push({ id: 'c3', caixa: 1 }); a.cartas[0].caixa = 3;   // adiciona c3 e edita c1
  const b = structuredClone(base); b.cartas = b.cartas.filter((c) => c.id !== 'c2'); b.provas[0].nota = 8; // apaga c2 e dá nota
  const m = merge3(base, a, b);
  assert.deepEqual(m.cartas.map((c) => c.id).sort(), ['c1', 'c3']);
  assert.equal(m.cartas.find((c) => c.id === 'c1').caixa, 3);
  assert.equal(m.provas[0].nota, 8);
});

test('apagado em um lado e editado no outro: a edição vence (não perde trabalho)', () => {
  const a = structuredClone(base); a.cartas[1].caixa = 4;
  const b = structuredClone(base); b.cartas = b.cartas.filter((c) => c.id !== 'c2');
  assert.equal(merge3(base, a, b).cartas.find((c) => c.id === 'c2').caixa, 4);
});

test('conflito no mesmo campo: o local vence; sem mudança local, o remoto vence', () => {
  const a = structuredClone(base); a.config.tutor = 'Pai A';
  const b = structuredClone(base); b.config.tutor = 'Pai B';
  assert.equal(merge3(base, a, b).config.tutor, 'Pai A');
  assert.equal(merge3(base, structuredClone(base), b).config.tutor, 'Pai B');
});

test('listas de valores simples (dias livres) funcionam como conjuntos', () => {
  const a = structuredClone(base); a.config.diasLivres.push('2026-11-15');
  const b = structuredClone(base); b.config.diasLivres = []; b.config.diasLivres.push('2026-12-25');
  const m = merge3(base, a, b);
  assert.deepEqual(m.config.diasLivres.sort(), ['2026-11-15', '2026-12-25']); // 11-02 foi removido pelo remoto e não mexido no local
});

test('sem base (primeira sincronização): une os dois lados sem perder nada', () => {
  const a = { days: { d1: { x: 1 } }, cartas: [{ id: 'a' }] };
  const b = { days: { d2: { x: 2 } }, cartas: [{ id: 'b' }] };
  const m = merge3(undefined, a, b);
  assert.deepEqual(Object.keys(m.days).sort(), ['d1', 'd2']);
  assert.deepEqual(m.cartas.map((c) => c.id).sort(), ['a', 'b']);
});

test('estados iguais ou só um lado mudou: devolve cópia fiel', () => {
  assert.deepEqual(merge3(base, base, base), base);
  const a = structuredClone(base); a.provas.push({ id: 'p2' });
  assert.deepEqual(merge3(base, a, base), a);
  assert.deepEqual(merge3(base, base, a), a);
});

test('o resultado não compartilha referências com as entradas', () => {
  const a = structuredClone(base); a.days['2026-10-06'] = { caligrafia: true };
  const m = merge3(base, a, structuredClone(base));
  m.days['2026-10-06'].caligrafia = false;
  assert.equal(a.days['2026-10-06'].caligrafia, true);
});
