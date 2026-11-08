// Teste da resiliência contra falhas do Gemini (servidor simulado).
// Uso: APP=http://127.0.0.1:5180 FAKE=http://127.0.0.1:8787 node tests/instabilidade.test-manual.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const APP = process.env.APP || 'http://127.0.0.1:5180';
const FAKE = process.env.FAKE || 'http://127.0.0.1:8787';
let cookie = '';
async function api(path, body, method = body ? 'POST' : 'GET') {
  const r = await fetch(APP + path, { method, headers: { 'content-type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
  const c = r.headers.get('set-cookie');
  if (c) cookie = c.split(';')[0];
  return { status: r.status, json: await r.json() };
}
const opcao = (q) => fetch(`${FAKE}/__opts?${q}`);
const modelosChamados = async (desde) => (await (await fetch(`${FAKE}/__log`)).json()).slice(desde).filter((e) => e.path?.includes(':generateContent')).map((e) => e.path.match(/models\/([^:]+)/)[1]);
const tamanhoLog = async () => (await (await fetch(`${FAKE}/__log`)).json()).length;

await api('/api/setup', { usuario: 'rubens', nome: 'Rubens', senha: 'segredo1' });
if ((await api('/api/session')).json.logado !== true) await api('/api/login', { usuario: 'rubens', senha: 'segredo1' });
const sala = (await api('/api/salas', { nome: 'Teste de instabilidade' })).json;
const fd = new FormData();
fd.append('texto', readFileSync(new URL('../samples/1-eclipses.md', import.meta.url), 'utf8'));
const doc = (await (await fetch(`${APP}/api/salas/${sala.id}/materiais`, { method: 'POST', headers: { cookie }, body: fd })).json()).docId;

// 1) Duas respostas 503 seguidas: a terceira tentativa funciona, no mesmo modelo.
await opcao('falhas503=2&quebrado=');
let n = await tamanhoLog();
let r = await api('/api/analyze', { docId: doc });
assert.equal(r.status, 200, JSON.stringify(r.json));
assert.deepEqual(await modelosChamados(n), ['gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-3.8-flash']);
console.log('✓ 503 duas vezes: deu certo na 3ª tentativa, mesmo modelo');

// 2) Modelo principal sempre com erro 500: passa para o próximo modelo disponível.
await opcao('falhas503=0&quebrado=gemini-3.8-flash');
n = await tamanhoLog();
r = await api('/api/analyze', { docId: doc });
assert.equal(r.status, 200, JSON.stringify(r.json));
const usados = await modelosChamados(n);
assert.deepEqual(usados, ['gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-2.5-flash']);
console.log('✓ modelo principal com erro 500: trocou para gemini-2.5-flash e funcionou');

// 2b) O modelo com problema fica por último nos próximos pedidos (sem perder tempo com ele).
n = await tamanhoLog();
r = await api('/api/analyze', { docId: doc });
assert.equal(r.status, 200);
assert.deepEqual(await modelosChamados(n), ['gemini-2.5-flash']);
console.log('✓ pedido seguinte foi direto ao modelo que funciona');

// 3) Todos falhando: mensagem clara e detalhe com cada modelo tentado.
await opcao('quebrado=todos');
r = await api('/api/analyze', { docId: doc });
assert.equal(r.status, 502);
assert.match(r.json.erro.mensagem, /várias tentativas com 2 modelos diferentes/);
assert.match(r.json.erro.detalhe, /gemini-2\.5-flash: 500/);
assert.match(r.json.erro.detalhe, /gemini-3\.8-flash: 500/);
console.log('✓ tudo fora do ar: erro claro, com o detalhe de cada modelo');
await opcao('quebrado=');
