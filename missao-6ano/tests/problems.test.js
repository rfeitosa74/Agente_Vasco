import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/rng.js';
import { gerarCincoProblemas, gerarConta, CHAVES_CONTA, gerarEnunciado, conferir, respostaTexto } from '../js/core/problems.js';
import { fmtResp, parseResp, igual } from '../js/core/ginasio.js';
import { novaCarta, avaliar, devidas, resumo } from '../js/core/leitner.js';

test('toda conta gera resposta consistente e aceita o próprio gabarito', () => {
  for (let seed = 1; seed <= 300; seed++) {
    for (const k of CHAVES_CONTA) {
      const p = gerarConta(makeRng(seed), k);
      assert.ok(Number.isInteger(p.resp.n) && p.resp.d > 0, `${k}: ${p.texto}`);
      assert.ok(conferir(p, fmtResp(p.resp, p.forma)), `${k}: ${p.texto} → ${fmtResp(p.resp, p.forma)}`);
      assert.ok(p.solucao && p.texto);
    }
  }
});

test('enunciados: exatamente um dado sobrando, resposta inteira e coerente', () => {
  for (let seed = 1; seed <= 200; seed++) {
    for (const tpl of ['cadernos', 'piscina', 'van', 'figurinhas', 'grupos', 'troco', 'torneira', 'campo']) {
      const p = gerarEnunciado(makeRng(seed), tpl);
      const nums = p.partes.filter((x) => x.num);
      assert.equal(nums.length, 3, tpl);
      assert.equal(nums.filter((x) => !x.uso).length, 1, `${tpl} deve ter 1 sobra`);
      assert.ok(Number.isInteger(p.resp.n) && p.resp.d === 1 && p.resp.n > 0, `${tpl}: ${p.texto} → ${p.resp.n}`);
      assert.ok(['+', '−', '×', '÷'].includes(p.op));
    }
  }
});

test('enunciado "troco" e "grupos" nunca dão resultado negativo/fracionado', () => {
  for (let seed = 1; seed <= 500; seed++) {
    for (const tpl of ['troco', 'grupos', 'van']) {
      const p = gerarEnunciado(makeRng(seed), tpl);
      assert.ok(p.resp.n >= 1 && p.resp.d === 1);
    }
  }
});

test('cinco problemas: 5 itens, 2 enunciados distintos, 3 contas', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const ps = gerarCincoProblemas(makeRng(seed));
    assert.equal(ps.length, 5);
    assert.equal(ps.filter((p) => p.kind === 'enunciado').length, 2);
    const t = ps.filter((p) => p.kind === 'enunciado').map((p) => p.tpl);
    assert.notEqual(t[0], t[1]);
    assert.equal(new Set(ps.map((p) => p.id)).size, 5);
  }
});

test('conferir aceita variações de formato', () => {
  const p = { resp: { n: 3, d: 4 }, forma: 'fracao' };
  assert.ok(conferir(p, '3/4') && conferir(p, '0,75') && conferir(p, '6/8') && conferir(p, ' 0.75 '));
  assert.ok(!conferir(p, '4/3') && !conferir(p, ''));
  assert.equal(respostaTexto({ resp: { n: 60, d: 1 }, unidade: 'cm²' }), '60 cm²');
});

test('Leitner: acerto sobe e espaça; erro volta para a caixa 1 e amanhã', () => {
  let c = novaCarta({ disciplina: 'História', frente: 'f', verso: 'v', hoje: '2026-10-05' });
  assert.equal(c.caixa, 1);
  assert.equal(c.due, '2026-10-05');
  c = avaliar(c, true, '2026-10-05');
  assert.deepEqual([c.caixa, c.due], [2, '2026-10-08']);
  c = avaliar(c, true, '2026-10-08');
  assert.deepEqual([c.caixa, c.due], [3, '2026-10-15']);
  c = avaliar(c, false, '2026-10-15');
  assert.deepEqual([c.caixa, c.due], [1, '2026-10-16']);
  assert.equal(c.erros, 1);
  // teto na caixa 5
  let d = { ...c, caixa: 5 };
  d = avaliar(d, true, '2026-10-16');
  assert.equal(d.caixa, 5);
});

test('Leitner: devidas ordena caixas baixas primeiro e respeita o filtro', () => {
  const mk = (id, caixa, due, disciplina = 'História') => ({ id, caixa, due, disciplina });
  const l = devidas([mk('a', 3, '2026-10-01'), mk('b', 1, '2026-10-04'), mk('c', 1, '2026-10-09'), mk('d', 2, '2026-10-02', 'Geografia')], '2026-10-05');
  assert.deepEqual(l.map((x) => x.id), ['b', 'd', 'a']);
  assert.deepEqual(devidas([mk('a', 1, '2026-10-01'), mk('d', 1, '2026-10-01', 'Geografia')], '2026-10-05', (c) => c.disciplina === 'Geografia').map((x) => x.id), ['d']);
  assert.deepEqual(resumo([mk('a', 4, 'x'), mk('b', 1, 'x')]).dominadas, 1);
});
