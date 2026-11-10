// Teste dos formatos de material (Word, áudio, vídeo, foto) no site com Gemini SIMULADO.
// Uso: APP=http://127.0.0.1:5180 FAKE=http://127.0.0.1:8787 MIDIA=pasta-com-arquivos node tests/formatos-e2e.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { abrirSala, entrar } from './helpers.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const APP = process.env.APP || 'http://127.0.0.1:5180';
const FAKE = process.env.FAKE || 'http://127.0.0.1:8787';
const M = process.env.MIDIA;
const OUT = process.env.OUT || '.';
const ok = (m) => console.log(`✓ ${m}`);
const ultimoGenerate = async (filtro) => (await (await fetch(`${FAKE}/__log`)).json()).filter((e) => e.path?.includes('generateContent') && JSON.stringify(e.body).includes(filtro)).at(-1);

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => /Content Security Policy|Refused to/i.test(m.text()) && errs.push(m.text()));

await entrar(p, APP);
async function abrir(arquivo) {
  await p.goto(APP);
  await p.locator('.portal-bar').waitFor();
  await abrirSala(p, 'Formatos');
  await p.locator('input[type=file]').setInputFiles(`${M}/${arquivo}`);
  await p.getByRole('button', { name: 'Começar aula com este documento' }).click();
  await p.locator('.board-title').waitFor({ timeout: 30000 });
  return p.locator('.nb-meta').innerText();
}

let meta = await abrir('materia.docx');
assert.match(meta, /documento do Word/);
let req = await ultimoGenerate('Analise o material');
assert.ok(JSON.stringify(req.body).includes('a Lua passa entre o Sol e a Terra'), 'texto do Word enviado');
await p.getByRole('button', { name: 'Ver anotações originais' }).click();
await p.getByText('Texto extraído do documento do Word').waitFor();
await p.keyboard.press('Escape');
ok(`Word (.docx): texto extraído e analisado (${meta})`);

if (process.env.PDF) {
  await p.goto(APP);
  await p.locator('.portal-bar').waitFor();
  await abrirSala(p, 'Formatos');
  await p.locator('input[type=file]').setInputFiles(process.env.PDF);
  await p.getByRole('button', { name: 'Começar aula com este documento' }).click();
  await p.locator('.board-title').waitFor({ timeout: 30000 });
  await p.getByRole('button', { name: 'Ver anotações originais' }).click();
  await p.locator('.pdf-page canvas').waitFor();
  await p.waitForTimeout(1500);
  const pintado = await p.locator('.pdf-page canvas').evaluate((c) => c.width > 100 && c.height > 100);
  assert.ok(pintado, 'página do PDF desenhada');
  await p.keyboard.press('Escape');
  ok('PDF: analisado e página original desenhada (leitor de PDF funciona com a CSP)');
}

meta = await abrir('aula.wav');
assert.match(meta, /áudio de 00:10/);
req = await ultimoGenerate('O material é um ÁUDIO');
assert.ok(JSON.stringify(req.body).includes('"mimeType":"audio/wav"'), 'áudio enviado ao Gemini');
const refs = await p.locator('.concept-ref').allInnerTexts();
assert.equal(refs[0], '▶ 00:04', 'momento inválido (99:00) descartado');
await p.getByRole('button', { name: 'Ouvir o áudio original' }).click();
await p.locator('audio.midia-player').waitFor();
await p.getByRole('button', { name: /Conceito atual · 00:04/ }).click();
await p.waitForTimeout(500);
const pos = await p.locator('audio.midia-player').evaluate((a) => a.currentTime);
assert.ok(pos >= 3.9, `player foi para 00:04 (${pos})`);
await p.screenshot({ path: `${OUT}/fmt-audio.png` });
await p.keyboard.press('Escape');
ok(`Áudio (.wav): enviado ao Gemini, momentos validados, player pula para 00:04 (${meta})`);

meta = await abrir('aula.mp4');
assert.match(meta, /vídeo de 00:08/);
const log = await (await fetch(`${FAKE}/__log`)).json();
assert.ok(log.some((e) => e.upload === 'start' && e.mime === 'video/mp4'), 'vídeo enviado pela API de arquivos');
req = await ultimoGenerate('O material é um VÍDEO');
assert.ok(JSON.stringify(req.body).includes('"fileUri"'), 'análise usou o arquivo enviado');
await p.getByRole('button', { name: 'Ver o vídeo original' }).click();
await p.locator('video.midia-player').waitFor();
await p.screenshot({ path: `${OUT}/fmt-video.png` });
await p.keyboard.press('Escape');
ok(`Vídeo (.mp4): enviado pela API de arquivos e analisado (${meta})`);

meta = await abrir('foto.png');
assert.match(meta, /imagem/);
req = await ultimoGenerate('O material é uma IMAGEM');
assert.ok(JSON.stringify(req.body).includes('"mimeType":"image/png"'));
ok(`Foto (.png): enviada ao Gemini e analisada (${meta})`);

await p.goto(APP);
await abrirSala(p, 'Formatos');
await p.locator('input[type=file]').setInputFiles({ name: 'antigo.doc', mimeType: 'application/msword', buffer: Buffer.from('x'.repeat(100)) });
await p.getByRole('button', { name: 'Começar aula com este documento' }).click();
await p.getByText('Arquivos .doc (Word antigo) não são aceitos.').waitFor();
await p.getByRole('button', { name: /Voltar à sala Formatos/ }).click();
await abrirSala(p, 'Formatos');
await p.locator('input[type=file]').setInputFiles({ name: 'planilha.zip', mimeType: 'application/zip', buffer: Buffer.from('PK') });
await p.getByRole('button', { name: 'Começar aula com este documento' }).click();
await p.getByText('Este tipo de arquivo não é aceito.').waitFor();
ok('Formatos não aceitos (.doc antigo, .zip) mostram como resolver');
assert.deepEqual(errs, []);
ok('Nenhum erro de JavaScript');
await b.close();
