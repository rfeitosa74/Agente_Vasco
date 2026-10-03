import test from 'node:test';
import assert from 'node:assert/strict';
import { criarSyncCore, gerarCodigo, normalizarCodigo } from '../js/core/syncCore.js';

// Servidor falso em memória, com a MESMA semântica das funções SQL (get_estado/set_estado, revisão otimista).
function servidorFalso() {
  const tabela = new Map();
  const chamadas = [];
  const fetchFn = async (url, { body }) => {
    const nome = url.split('/rpc/')[1];
    const b = JSON.parse(body);
    chamadas.push(nome);
    if (!b.p_codigo || b.p_codigo.length < 32) return { ok: false, status: 400, json: async () => ({}) };
    const r = tabela.get(b.p_codigo);
    let resp;
    if (nome === 'get_estado') resp = r ? { existe: true, rev: r.rev, dados: r.dados } : { existe: false, rev: 0 };
    else if (!r) resp = b.p_rev === 0 ? (tabela.set(b.p_codigo, { rev: 1, dados: b.p_dados }), { ok: true, rev: 1 }) : { ok: false, existe: false, rev: 0 };
    else if (r.rev !== b.p_rev) resp = { ok: false, existe: true, rev: r.rev, dados: r.dados };
    else { r.rev += 1; r.dados = b.p_dados; resp = { ok: true, rev: r.rev }; }
    return { ok: true, status: 200, json: async () => structuredClone(resp) };
  };
  return { fetchFn, tabela, chamadas };
}

function aparelho(servidor, estadoInicial) {
  let estado = structuredClone(estadoInicial);
  let meta = null;
  const core = criarSyncCore({ url: 'http://x', key: 'k', fetchFn: servidor.fetchFn, lerLocal: () => structuredClone(estado), aplicarLocal: (n) => { estado = structuredClone(n); }, lerMeta: () => meta, gravarMeta: (m) => { meta = structuredClone(m); } });
  return { core, get estado() { return estado; }, mudar: (fn) => fn(estado), get meta() { return meta; } };
}

const CODIGO = gerarCodigo();
const inicial = () => ({ v: 1, days: {}, provas: [], cartas: [{ id: 'ini-0', caixa: 1 }], config: { tutor: 'Rubens', diasLivres: [] } });

test('código gerado: 8 grupos de 4, 160 bits, aceito pelo servidor (>= 32 símbolos)', () => {
  assert.match(CODIGO, /^([A-Z2-9]{4}-){7}[A-Z2-9]{4}$/);
  assert.equal(normalizarCodigo(CODIGO).length, 32);
  assert.notEqual(gerarCodigo(), gerarCodigo());
  assert.equal(normalizarCodigo(' ab-cd ef '), 'ABCDEF');
});

test('1º aparelho cria a nuvem; 2º entra e ADOTA o estado (sem duplicar cartas nem sobrescrever)', async () => {
  const srv = servidorFalso();
  const pai = aparelho(srv, inicial());
  pai.mudar((s) => { s.config.tutor = 'Rubens F.'; s.days['2026-10-05'] = { recado: 'Bom dia' }; });
  const r1 = await pai.core.sincronizar(CODIGO);
  assert.deepEqual([r1.resultado, r1.enviou, r1.rev], ['ok', true, 1]);

  const luan = aparelho(srv, inicial()); // aparelho novo, estado padrão
  const r2 = await luan.core.sincronizar(CODIGO);
  assert.equal(r2.mudouLocal, true);
  assert.equal(luan.estado.config.tutor, 'Rubens F.');
  assert.equal(luan.estado.days['2026-10-05'].recado, 'Bom dia');
  assert.equal(luan.estado.cartas.length, 1);
});

test('dois aparelhos mexem em partes diferentes: nada se perde, em qualquer ordem de sincronização', async () => {
  const srv = servidorFalso();
  const pai = aparelho(srv, inicial());
  await pai.core.sincronizar(CODIGO);
  const luan = aparelho(srv, inicial());
  await luan.core.sincronizar(CODIGO);

  luan.mudar((s) => { s.days['2026-10-05'] = { caligrafia: true }; s.cartas[0].caixa = 3; });
  pai.mudar((s) => { s.provas.push({ id: 'p1', disciplina: 'História' }); s.days['2026-10-06'] = { recado: 'Amanhã: Nilo' }; });

  await luan.core.sincronizar(CODIGO);
  await pai.core.sincronizar(CODIGO);
  await luan.core.sincronizar(CODIGO);

  for (const ap of [pai, luan]) {
    assert.equal(ap.estado.days['2026-10-05'].caligrafia, true);
    assert.equal(ap.estado.days['2026-10-06'].recado, 'Amanhã: Nilo');
    assert.equal(ap.estado.provas[0].id, 'p1');
    assert.equal(ap.estado.cartas[0].caixa, 3);
  }
  assert.deepEqual(pai.estado, luan.estado);
});

test('mesmo dia, campos diferentes (caligrafia do Luan × recado do pai) se combinam', async () => {
  const srv = servidorFalso();
  const pai = aparelho(srv, inicial()); await pai.core.sincronizar(CODIGO);
  const luan = aparelho(srv, inicial()); await luan.core.sincronizar(CODIGO);
  luan.mudar((s) => { s.days['2026-10-05'] = { caligrafia: true, recado: '' }; });
  await luan.core.sincronizar(CODIGO);
  await pai.core.sincronizar(CODIGO);
  luan.mudar((s) => { s.days['2026-10-05'].sprints = { 1: { ok: true } }; });
  pai.mudar((s) => { s.days['2026-10-05'].recado = 'Capricha!'; });
  await pai.core.sincronizar(CODIGO);
  await luan.core.sincronizar(CODIGO);
  await pai.core.sincronizar(CODIGO);
  const d = pai.estado.days['2026-10-05'];
  assert.deepEqual([d.caligrafia, d.recado, d.sprints['1'].ok], [true, 'Capricha!', true]);
  assert.deepEqual(pai.estado, luan.estado);
});

test('conflito de revisão no meio do caminho: o ciclo repete e converge', async () => {
  const srv = servidorFalso();
  const a = aparelho(srv, inicial()); await a.core.sincronizar(CODIGO);
  const b = aparelho(srv, inicial()); await b.core.sincronizar(CODIGO);
  a.mudar((s) => { s.days.d1 = { x: 1 }; });
  b.mudar((s) => { s.days.d2 = { x: 2 }; });
  // b grava logo depois do get de a (simula corrida): intercepta o 1º get_estado de a
  const original = srv.fetchFn;
  let primeiro = true;
  const aCore = criarSyncCore({ url: 'http://x', key: 'k', lerLocal: () => structuredClone(a.estado), aplicarLocal: () => {}, lerMeta: () => a.meta, gravarMeta: () => {},
    fetchFn: async (u, o) => { const r = await original(u, o); if (primeiro && u.endsWith('get_estado')) { primeiro = false; await b.core.sincronizar(CODIGO); } return r; } });
  await aCore.sincronizar(CODIGO); // não deve lançar: tenta de novo
  const nuvem = srv.tabela.get(normalizarCodigo(CODIGO)) || srv.tabela.get(CODIGO);
  assert.ok(nuvem.dados.days.d1 && nuvem.dados.days.d2, 'as duas mudanças chegaram à nuvem');
});

test('sem mudanças: não envia nada (só consulta)', async () => {
  const srv = servidorFalso();
  const a = aparelho(srv, inicial()); await a.core.sincronizar(CODIGO);
  srv.chamadas.length = 0;
  const r = await a.core.sincronizar(CODIGO);
  assert.equal(r.enviou, false);
  assert.deepEqual(srv.chamadas, ['get_estado']);
});

test('erro de rede/servidor sobe como exceção (a interface mostra e tenta depois)', async () => {
  const core = criarSyncCore({ url: 'http://x', key: 'k', fetchFn: async () => ({ ok: false, status: 503 }), lerLocal: () => ({}), aplicarLocal() {}, lerMeta: () => null, gravarMeta() {} });
  await assert.rejects(() => core.sincronizar(CODIGO), /503/);
});
