import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/rng.js';
import { gerarSerie, parseResp, igual, fmtResp, FAIXAS, sequenciaMeta, deveSubir } from '../js/core/ginasio.js';

test('parseResp aceita inteiro, milhar, decimal com vírgula/ponto e fração', () => {
  assert.deepEqual(parseResp('238'), { n: 238, d: 1 });
  assert.deepEqual(parseResp('1.225'), { n: 1225, d: 1 });
  assert.ok(igual(parseResp('0,75'), parseResp('3/4')));
  assert.ok(igual(parseResp('0.75'), parseResp('6/8')));
  assert.equal(parseResp(''), null);
  assert.equal(parseResp('abc'), null);
  assert.equal(parseResp('1/0'), null);
});

test('fmtResp', () => {
  assert.equal(fmtResp({ n: 2496, d: 1 }), '2.496');
  assert.equal(fmtResp({ n: 75, d: 100 }), '0,75');
  assert.equal(fmtResp({ n: 3, d: 4 }, 'fracao'), '3/4');
  assert.equal(fmtResp({ n: 1, d: 3 }), '1/3');
});

test('Faixa 1: 20 produtos distintos de 2..12, resposta correta', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const s = gerarSerie(1, makeRng(seed));
    assert.equal(s.length, 20);
    const chaves = new Set();
    for (const it of s) {
      const [a, b] = it.texto.split(' × ').map(Number);
      assert.ok(a >= 2 && a <= 12 && b >= 2 && b <= 12);
      assert.equal(it.resp.n, a * b);
      chaves.add([a, b].sort((x, y) => x - y).join('x'));
    }
    assert.equal(chaves.size, 20);
  }
});

// avalia "a × b" / "a²" para conferir o gabarito dos atalhos
const avalia = (t) => (t.includes('²') ? Number(t.replace('²', '')) ** 2 : t.split(' × ').map(Number).reduce((x, y) => x * y));

test('Faixas 2, 3 e 4: gabarito bate com a conta', () => {
  for (let seed = 1; seed <= 40; seed++) {
    for (const f of [2, 3, 4]) {
      const s = gerarSerie(f, makeRng(seed));
      assert.equal(s.length, FAIXAS[f - 1].qtd);
      for (const it of s) assert.equal(it.resp.n, avalia(it.texto), `${it.texto}`);
    }
  }
});

test('Faixa 4 traz uma conta de cada arma', () => {
  const armas = new Set(gerarSerie(4, makeRng(7)).map((i) => i.arma));
  assert.equal(armas.size, 5);
});

test('Faixa 5: todas as respostas são frações válidas e aceitas pelo parser', () => {
  for (let seed = 1; seed <= 200; seed++) {
    for (const it of gerarSerie(5, makeRng(seed))) {
      assert.ok(it.resp && Number.isInteger(it.resp.n) && it.resp.d > 0, it.texto);
      assert.ok(igual(parseResp(fmtResp(it.resp, it.forma)), it.resp), `${it.texto} → ${fmtResp(it.resp, it.forma)}`);
    }
  }
});

test('sequência da meta: 3 dias de missão seguidos sobem de faixa; fim de semana não quebra', () => {
  // seg 05, ter 06, qua 07
  const h = ['2026-10-05', '2026-10-06', '2026-10-07'].map((data) => ({ data, faixa: 1, ok: true }));
  assert.equal(sequenciaMeta(h, 1, '2026-10-07'), 3);
  assert.ok(deveSubir(h, 1, '2026-10-07'));
  // sex 02, seg 05, ter 06 (fim de semana no meio)
  const h2 = ['2026-10-02', '2026-10-05', '2026-10-06'].map((data) => ({ data, faixa: 1, ok: true }));
  assert.equal(sequenciaMeta(h2, 1, '2026-10-06'), 3);
  // um dia de missão em branco quebra
  const h3 = ['2026-10-05', '2026-10-07'].map((data) => ({ data, faixa: 1, ok: true }));
  assert.equal(sequenciaMeta(h3, 1, '2026-10-07'), 1);
  // um dia sem bater a meta quebra
  const h4 = [{ data: '2026-10-05', faixa: 1, ok: true }, { data: '2026-10-06', faixa: 1, ok: false }, { data: '2026-10-07', faixa: 1, ok: true }];
  assert.equal(sequenciaMeta(h4, 1, '2026-10-07'), 1);
  // hoje ainda sem tentativa: conta os dias anteriores
  assert.equal(sequenciaMeta(h, 1, '2026-10-08'), 3);
  // outra faixa não conta
  assert.equal(sequenciaMeta(h, 2, '2026-10-07'), 0);
  // faixa 5 nunca sobe
  assert.equal(deveSubir(h.map((x) => ({ ...x, faixa: 5 })), 5, '2026-10-07'), false);
});
