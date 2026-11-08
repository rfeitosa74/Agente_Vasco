// Teste da versão "artefato do Claude" (dist-artefato) com um window.claude SIMULADO
// que repassa os pedidos ao servidor Gemini simulado (tests/fake-gemini.mjs).
// Verifica a ligação da página com o Claude, não a qualidade das respostas.
// Uso: SITE=http://127.0.0.1:5300 FAKE=http://127.0.0.1:8787 node tests/artifact-e2e.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const SITE = process.env.SITE || 'http://127.0.0.1:5300';
const FAKE = process.env.FAKE || 'http://127.0.0.1:8787';
const OUT = process.env.OUT || '.';
const ok = (m) => console.log(`✓ ${m}`);

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
await p.addInitScript((FAKE) => {
  const ask = async (prompt) => {
    const text = typeof prompt === 'string' ? prompt : prompt.map((t) => t.content).join('\n');
    const r = await fetch(`${FAKE}/v1beta/models/claude:generateContent`, { method: 'POST', body: JSON.stringify({ contents: [{ parts: [{ text }] }] }) });
    return (await r.json()).candidates[0].content.parts[0].text;
  };
  window.__chamadas = [];
  window.__downloads = [];
  const sample = async (input, opts = {}) => {
    window.__chamadas.push({ imagens: opts.images?.length || 0, tools: (opts.tools || []).map((t) => t.name) });
    if (opts.tools) {
      const tool = opts.tools.find((t) => t.name === 'destacar_no_quadro');
      await tool.execute({ ids: ['lua'] }, { signal: new AbortController().signal });
      const text = 'Destaquei a Lua no quadro.';
      opts.onText?.({ text, delta: text });
      return { text, truncated: false };
    }
    const text = await ask(input);
    opts.onText?.({ text, delta: text });
    return { text, truncated: false };
  };
  sample.json = async (input, opts = {}) => {
    window.__chamadas.push({ imagens: opts.images?.length || 0, json: true });
    return JSON.parse(await ask(input));
  };
  sample.limits = async () => ({ maxPromptBytes: 262144, images: { maxCount: 6, maxInputBytes: 2e7, mediaTypes: ['image/png', 'image/jpeg'] }, tools: { maxCount: 8 } });
  const downloads = { save: async ({ filename, data }) => (window.__downloads.push({ filename, size: data.size }), { status: 'saved' }) };
  window.claude = { use: async (n) => (n === 'sample' ? sample : n === 'downloads' ? downloads : null) };
}, FAKE);

await p.goto(SITE);
await p.getByText('Esta versão roda dentro do Claude').waitFor();
assert.equal(await p.getByText('Verificar configuração e modelos').count(), 0);
await p.screenshot({ path: `${OUT}/art-01-inicio.png` });
await p.getByRole('button', { name: /Eclipses do Sol/ }).click();
await p.locator('.board-svg svg').waitFor({ timeout: 20000 });
assert.match(await p.locator('.review-badge').innerText(), /Corrigido/);
const rev = await p.evaluate(() => window.__chamadas.filter((c) => c.imagens > 0).length);
assert.ok(rev >= 1, 'revisão enviou a imagem do quadro ao Claude');
ok('Análise e quadro feitos pelo Claude; revisão com a imagem do quadro corrigiu o desenho');
await p.getByRole('button', { name: 'Não entendi esta parte' }).click();
await p.locator('.msg-tutor .msg-text').first().waitFor();
ok('Atalho respondeu');
await p.getByRole('button', { name: 'Conversar com o tutor' }).click();
await p.getByLabel('Mensagem para o tutor').fill('Mostre a Lua');
await p.getByRole('button', { name: 'Enviar' }).click();
await p.getByText('Destaquei a Lua no quadro.').waitFor();
await p.locator('.board-svg .hl[data-id="lua"]').first().waitFor();
ok('Tutor por escrito usou a ferramenta e destacou a Lua de verdade');
await p.screenshot({ path: `${OUT}/art-02-tutor.png` });
await p.getByRole('button', { name: 'Ocultar conversa' }).click();
await p.getByRole('button', { name: 'Agora eu explico' }).click();
await p.locator('.explain-question').waitFor();
assert.equal(await p.getByRole('button', { name: /Responder falando/ }).count(), 0, 'sem microfone no artefato');
await p.locator('#explicacao').fill('A Lua fica entre o Sol e a Terra.');
await p.getByRole('button', { name: 'Terminei minha explicação' }).click();
await p.locator('.evaluation').waitFor();
ok('"Agora eu explico" por escrito avaliou a resposta');
await p.getByRole('button', { name: 'Voltar ao quadro para revisar' }).click();
await p.getByRole('button', { name: 'Criar infográfico' }).click();
await p.locator('.info-figure img').waitFor({ timeout: 20000 });
assert.match(await p.locator('.info-figure figcaption').innerText(), /desenhado pelo Claude em SVG/);
await p.getByRole('button', { name: /Baixar \(SVG/ }).click();
await p.waitForFunction(() => window.__downloads.length === 1);
await p.locator('#correcao').fill('aumente o título');
await p.getByRole('button', { name: 'Corrigir imagem' }).click();
await p.getByText('Versão 2 de 2').waitFor({ timeout: 20000 });
await p.getByRole('button', { name: 'Perguntar ao tutor sobre este infográfico' }).click();
await p.getByText(/Quero perguntar sobre o infográfico/).waitFor();
await p.locator('.infographic').scrollIntoViewIfNeeded();
await p.screenshot({ path: `${OUT}/art-03-infografico.png` });
ok('Infográfico em SVG: gerado, baixado pelo Claude, corrigido e enviado ao tutor');
await p.getByRole('button', { name: 'Trocar material' }).click();
await p.getByRole('button', { name: /Frações/ }).click();
await p.locator('.board-svg svg').waitFor({ timeout: 20000 });
ok('Troca de material funcionou');
if (process.env.MIDIA) {
  const abrir = async (arquivo) => {
    await p.getByRole('button', { name: 'Trocar material' }).click();
    await p.locator('input[type=file]').setInputFiles(`${process.env.MIDIA}/${arquivo}`);
    await p.getByRole('button', { name: 'Começar aula com este documento' }).click();
  };
  await abrir('materia.docx');
  await p.locator('.board-title').waitFor({ timeout: 20000 });
  assert.match(await p.locator('.nb-meta').innerText(), /documento do Word/);
  ok('Artefato: Word (.docx) aceito');
  await abrir('foto.png');
  await p.locator('.board-title').waitFor({ timeout: 20000 });
  const comFoto = await p.evaluate(() => window.__chamadas.at(-1).imagens);
  assert.ok(comFoto >= 1, 'a foto vai junto nos pedidos ao Claude');
  ok('Artefato: foto aceita e enviada ao Claude em cada pedido');
  await abrir('aula.wav');
  await p.getByText('Áudios e vídeos não funcionam na versão de artefato do Claude.').waitFor();
  ok('Artefato: áudio recusado com explicação (use o site no Render)');
}
assert.deepEqual(errs, []);
ok('Nenhum erro de JavaScript');
await b.close();
