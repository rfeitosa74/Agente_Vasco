// Lentidão do Gemini e queda de conexão durante a análise (servidor simulado).
// Uso: APP=http://127.0.0.1:5270 PROXY=http://127.0.0.1:5271 FAKE=http://127.0.0.1:8787 node tests/lentidao.test-manual.mjs
// O servidor precisa rodar com GEMINI_LIMITE_TEXTO_MS=3000 (tempo máximo curto para o teste).
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import http from 'node:http';
import { abrirSala, entrar } from './helpers.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const APP = process.env.APP || 'http://127.0.0.1:5270';
const FAKE = process.env.FAKE || 'http://127.0.0.1:8787';
const ok = (m) => console.log(`✓ ${m}`);
const opcao = (q) => fetch(`${FAKE}/__opts?${q}`);
const modelos = async (desde) => (await (await fetch(`${FAKE}/__log`)).json()).slice(desde).filter((e) => e.path?.includes(':generateContent')).map((e) => e.path.match(/models\/([^:]+)/)[1]);
const tamanho = async () => (await (await fetch(`${FAKE}/__log`)).json()).length;

// Intermediário que imita um proxy cortando pedidos longos: repassa tudo, mas responde
// 504 em /api/analyze depois de 1 s (o servidor continua trabalhando e salva o resultado).
const alvo = new URL(APP);
const proxy = http.createServer((req, res) => {
  const repasse = http.request({ host: alvo.hostname, port: alvo.port, path: req.url, method: req.method, headers: req.headers }, (r) => {
    if (res.headersSent) return r.resume();
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res);
  });
  req.pipe(repasse);
  if (req.url.startsWith('/api/analyze')) setTimeout(() => !res.headersSent && (res.writeHead(504, { 'content-type': 'text/html' }), res.end('<h1>Gateway Timeout</h1>')), 1000);
});
await new Promise((r) => proxy.listen(5271, r));
const PROXY = 'http://127.0.0.1:5271';

// 1) Modelo principal não responde: o servidor desiste no tempo máximo e troca de modelo.
await opcao('lento=gemini-3.8-flash&atraso=0');
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await entrar(p, APP);
await abrirSala(p, 'Lentidão');
let n = await tamanho();
await p.getByRole('button', { name: /Eclipses do Sol/ }).click();
await p.locator('.board-title').waitFor({ timeout: 60000 });
const usados = await modelos(n);
assert.equal(usados[0], 'gemini-3.8-flash');
assert.ok(usados.includes('gemini-2.5-flash'), `trocou de modelo: ${usados}`);
ok(`modelo que não responde é abandonado no tempo máximo; a aula abriu com outro modelo (${[...new Set(usados)].join(' → ')})`);

// 2) Conexão cortada no meio da análise: a tela espera o resultado salvo pelo servidor.
await opcao('lento=&atraso=2000');
const p2 = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await entrar(p2, PROXY);
await abrirSala(p2, 'Lentidão');
await p2.getByRole('button', { name: /Frações/ }).click();
await p2.getByText('A conexão caiu, mas o servidor continua analisando').waitFor({ timeout: 15000 });
await p2.getByText(/Tempo de espera: \d+ s/).waitFor();
ok('conexão cortada: a tela avisa e mostra o tempo de espera');
await p2.locator('.board-title').waitFor({ timeout: 60000 });
ok('o resultado salvo pelo servidor apareceu e a aula abriu');
await opcao('atraso=0');
await b.close();
proxy.close();
