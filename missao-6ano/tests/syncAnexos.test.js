import test from 'node:test';
import assert from 'node:assert/strict';
import { criarSyncAnexos, LIMITE_BYTES } from '../js/core/syncAnexosCore.js';

function nuvem() {
  const tab = new Map();
  const rpc = async (nome, c) => {
    if (nome === 'list_anexos') return [...tab.keys()];
    if (nome === 'put_anexo') { tab.set(c.p_id, { tipo: c.p_tipo, dados: c.p_dados }); return { ok: true }; }
    if (nome === 'get_anexo') return tab.has(c.p_id) ? { existe: true, ...tab.get(c.p_id) } : { existe: false };
    throw new Error('rpc?');
  };
  return { rpc, tab };
}

test('envia só o que falta, marca como sincronizado e pula imagens grandes demais', async () => {
  const n = nuvem();
  n.tab.set('ja', { tipo: 'image/jpeg', dados: 'x' });
  const marcadas = [];
  const s = criarSyncAnexos({ rpc: n.rpc, codigo: 'C'.repeat(32) });
  const r = await s.enviarPendentes({
    locais: [{ id: 'novo', sync: false, tamanho: 1000 }, { id: 'ja', sync: false, tamanho: 1000 }, { id: 'gigante', sync: false, tamanho: LIMITE_BYTES + 1 }, { id: 'feito', sync: true, tamanho: 10 }],
    lerBase64: async (id) => ({ tipo: 'image/jpeg', dados: 'dados-de-' + id }),
    marcar: async (id) => { marcadas.push(id); },
  });
  assert.deepEqual(r.enviados, ['novo']);
  assert.deepEqual(r.pulados, ['gigante']);
  assert.deepEqual(marcadas.sort(), ['ja', 'novo']);
  assert.equal(n.tab.get('novo').dados, 'dados-de-novo');
});

test('sem pendências não chama a nuvem', async () => {
  let chamadas = 0;
  const s = criarSyncAnexos({ rpc: async () => { chamadas++; return []; }, codigo: 'C'.repeat(32) });
  const r = await s.enviarPendentes({ locais: [{ id: 'a', sync: true }], lerBase64: async () => ({}), marcar: async () => {} });
  assert.deepEqual(r, { enviados: [], pulados: [] });
  assert.equal(chamadas, 0);
});

test('baixar grava no aparelho quando existe; false quando ainda não foi enviada', async () => {
  const n = nuvem();
  n.tab.set('a1', { tipo: 'image/png', dados: 'QUJD' });
  const s = criarSyncAnexos({ rpc: n.rpc, codigo: 'C'.repeat(32) });
  const salvos = [];
  assert.equal(await s.baixar('a1', async (x) => salvos.push(x)), true);
  assert.deepEqual(salvos, [{ id: 'a1', tipo: 'image/png', dados: 'QUJD' }]);
  assert.equal(await s.baixar('nada', async () => assert.fail('não deve salvar')), false);
});
