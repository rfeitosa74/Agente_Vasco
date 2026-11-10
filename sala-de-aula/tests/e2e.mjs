// Teste ponta a ponta da interface contra o servidor Gemini SIMULADO (tests/fake-gemini.mjs).
// Verifica a mecânica do aplicativo (fluxos, estados, áudio via WebSocket, ferramentas),
// não a qualidade das respostas de IA reais.
// Uso: APP=http://127.0.0.1:5180 FAKE=http://127.0.0.1:8787 OUT=pasta node tests/e2e.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // usa o Playwright instalado no sistema
import { mkdirSync, statSync } from 'node:fs';
import assert from 'node:assert/strict';
import { abrirSala, entrar } from './helpers.mjs';

const APP = process.env.APP || 'http://127.0.0.1:5180';
const FAKE = process.env.FAKE || 'http://127.0.0.1:8787';
const OUT = process.env.OUT || './e2e-out';
mkdirSync(OUT, { recursive: true });
const shot = (page, n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: false });
const fakeLog = async () => (await fetch(`${FAKE}/__log`)).json();
const liveLog = async () => (await fakeLog()).filter((e) => e.live).map((e) => e.live).at(-1);
const ok = (msg) => console.log(`✓ ${msg}`);

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, acceptDownloads: true, permissions: ['microphone'] });
const page = await ctx.newPage();
const errosConsole = [];
page.on('pageerror', (e) => errosConsole.push(String(e)));
// Qualquer bloqueio da política de segurança do navegador (CSP) conta como erro
page.on('console', (m) => /Content Security Policy|Refused to/i.test(m.text()) && errosConsole.push(m.text()));

await entrar(page, APP);
// O administrador cria a conta do Luan
await page.getByRole('button', { name: 'Usuários' }).click();
await page.getByPlaceholder('ex.: Luan', { exact: true }).fill('Luan');
await page.getByPlaceholder('ex.: luan', { exact: true }).fill('luan');
await page.locator('.novo-usuario input[type=password]').fill('luan2026');
await page.getByRole('button', { name: 'Criar usuário' }).click();
await page.getByText('Usuário “luan” criado.').waitFor();
await shot(page, '00-usuarios');
ok('Administrador criou o usuário do Luan');
await abrirSala(page, 'Ciências');
await page.getByText('Materiais de exemplo').waitFor();
await shot(page, '01-inicio');

// 1) Material A (eclipses)
await page.getByRole('button', { name: /Eclipses do Sol e da Lua/ }).click();
await page.locator('.board-svg svg').waitFor({ timeout: 20000 });
const tituloA = await page.locator('.board-title').innerText();
assert.match(tituloA, /Eclipse solar/);
const conceitosA = await page.locator('.concept-name').allInnerTexts();
ok(`Material A analisado: conceitos ${conceitosA.join(', ')}; quadro "${tituloA}"`);
assert.match(await page.locator('.review-badge').innerText(), /Corrigido/);
ok('Revisão automática corrigiu o quadro com erro proposital (sombra do lado errado)');
await shot(page, '02-aula-eclipse');

// 3) Atalho sobre a parte selecionada
await page.getByRole('button', { name: 'Não entendi esta parte' }).click();
await page.locator('.msg-tutor .msg-text').first().waitFor();
assert.match(await page.locator('.msg-tutor .msg-text').first().innerText(), /Eclipse solar/);
await page.locator('.board-svg .hl[data-id="lua"]').first().waitFor();
ok('Atalho respondeu sobre o conceito selecionado e destacou um elemento existente (lua)');

// 2) Troca de conceito
await page.getByRole('button', { name: /Eclipse lunar/ }).click();
await page.locator('.board-title', { hasText: 'Eclipse lunar' }).waitFor({ timeout: 20000 });
ok('Troca de conceito atualizou o quadro');
await page.getByRole('button', { name: 'O que acontece se mudarmos isso?' }).click();
await page.getByText('O quadro foi atualizado para esta resposta').waitFor({ timeout: 20000 });
const ultimaResp = await page.locator('.msg-tutor .msg-text').last().innerText();
assert.match(ultimaResp, /Eclipse lunar/);
ok('Atalho "e se" respondeu sobre o conceito atual e atualizou o quadro de verdade');

// 4) Tutor por voz (WebSocket Live simulado, microfone falso do Chromium)
await page.getByRole('button', { name: /Conversar com o tutor/ }).click();
await page.locator('.status-pill.st-ouvindo, .status-pill.st-respondendo').waitFor({ timeout: 15000 });
ok('Sessão Live conectada (estado real exibido)');
// a sequência de ferramentas do simulador: destacar → mostrar_conceito → criar_infografico
await page.locator('.infographic').waitFor({ timeout: 30000 });
await page.locator('.info-figure img').waitFor({ timeout: 30000 });
await page.waitForTimeout(1500);
const L = await liveLog();
assert.ok(L.audioChunks >= 15, `chunks de áudio enviados: ${L.audioChunks}`);
assert.deepEqual(L.setup.tools.sort(), ['abrir_agora_eu_explico', 'atualizar_quadro', 'criar_infografico', 'destacar_no_quadro', 'mostrar_conceito']);
assert.ok(L.setup.inputTranscription && L.setup.outputTranscription && L.setup.compressao);
assert.ok(L.url.includes('BidiGenerateContentConstrained') && L.url.includes('access_token=auth_tokens/'), 'usa token efêmero');
assert.ok(!L.url.includes('key=fake'), 'a chave real não vai para o navegador');
const [r1, r2, r3] = L.toolResponses.map((x) => x[0]);
assert.equal(r1.response.ok, true);
assert.deepEqual(r1.response.destacados, ['lua']);
assert.deepEqual(r1.response.naoEncontrados, ['inexistente']);
assert.equal(r2.response.ok, true);
assert.equal(r3.response.status, 'iniciado');
assert.ok(L.contextUpdates >= 1, 'contexto atualizado');
assert.ok(L.videoFrames >= 1, 'imagens enviadas ao tutor');
assert.ok(L.textos.some((t) => t.includes('ficou pronto')), 'tutor avisado quando o infográfico ficou pronto');
assert.ok(L.setup.systemInstructionInicio.includes('CONCEITO SELECIONADO AGORA'));
ok(`Live: ${L.audioChunks} pedaços de áudio de 100 ms enviados; ferramentas executadas e respondidas (${L.toolResponses.length}); ${L.contextUpdates} atualizações de contexto; ${L.videoFrames} imagens enviadas`);
ok(`Infográfico pedido por voz gerado; tutor avisado só depois da imagem pronta`);
await page.getByRole('button', { name: /Transcrição/ }).click();
await page.locator('.tr-tutor').first().waitFor();
await shot(page, '03-tutor-transcricao');
await page.getByRole('button', { name: 'Ocultar transcrição' }).click();

// 7) Infográfico: ampliar, baixar, corrigir, revisar
const caption = await page.locator('.info-figure figcaption').innerText();
assert.match(caption, /2752×1536/);
assert.match(caption, /gemini-3-pro-image/);
ok(`Legenda do infográfico: ${caption}`);
await page.locator('.info-figure').scrollIntoViewIfNeeded();
await shot(page, '04-infografico');
await page.getByRole('button', { name: 'Ampliar', exact: true }).click();
await page.locator('.zoom-img').waitFor();
await shot(page, '05-infografico-ampliado');
const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.modal .btn-primary', { hasText: 'Baixar' }).click()]);
const dlPath = `${OUT}/${dl.suggestedFilename()}`;
await dl.saveAs(dlPath);
ok(`Download: ${dl.suggestedFilename()} (${statSync(dlPath).size} bytes)`);
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Revisar o infográfico' }).click();
await page.getByText('Revisão visual (orientação, não garantia de precisão)').waitFor();
await page.getByRole('button', { name: 'usar como correção' }).click();
await page.getByRole('button', { name: 'Corrigir imagem' }).click();
await page.getByText('Versão 2 de 2').waitFor({ timeout: 20000 });
const edit = (await fakeLog()).filter((e) => e.path?.includes('image') && e.body.contents[0].parts.some((p) => p.inlineData)).at(-1);
assert.ok(edit, 'correção enviou a imagem existente ao modelo');
assert.equal(edit.body.generationConfig.imageConfig.aspectRatio, '16:9');
assert.equal(edit.body.generationConfig.imageConfig.imageSize, '2K');
ok('Correção enviou a imagem + instrução ao modelo de imagem (16:9, 2K) e criou a versão 2');
await page.getByRole('button', { name: 'Perguntar ao tutor sobre este infográfico' }).click();
await page.waitForTimeout(800);
assert.ok((await liveLog()).textos.some((t) => t.includes('Perguntar ao tutor sobre este infográfico')));
ok('"Perguntar ao tutor sobre este infográfico" enviou a imagem e o pedido ao Live');

// 5) Agora eu explico
await page.getByRole('button', { name: 'Agora eu explico' }).click();
await page.locator('.explain-question').waitFor();
await page.locator('#explicacao').fill('Acho que é quando fica escuro de dia.');
await page.waitForTimeout(500);
assert.equal(await page.locator('.evaluation').count(), 0, 'não avalia antes do botão');
await page.getByRole('button', { name: /Responder falando|Gravar mais/ }).click();
await page.locator('.rec-dot').waitFor();
await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Parar gravação/ }).click();
await page.waitForFunction(() => (document.querySelector('#explicacao')?.value || '').includes('A Lua fica entre'), null, { timeout: 15000 });
ok('Gravação por voz transcrita e acrescentada ao texto editável');
const transc = (await fakeLog()).filter((e) => e.path?.includes('generateContent') && JSON.stringify(e.body).includes('Transcreva')).at(-1);
assert.ok(JSON.stringify(transc.body).includes('audio/wav'), 'áudio enviado como WAV');
await page.getByRole('button', { name: 'Terminei minha explicação' }).click();
await page.locator('.evaluation').waitFor();
const aval = await page.locator('.evaluation').innerText();
assert.match(aval, /Acho que é quando fica escuro de dia/);
ok('"Agora eu explico" avaliou a resposta real enviada');
await shot(page, '06-agora-eu-explico');
await page.getByRole('button', { name: 'Voltar ao quadro para revisar' }).click();

// Erro de faturamento no infográfico: mostra erro, sem imagem substituta
await fetch(`${FAKE}/__opts?imageError=billing`);
await page.locator('.info-head .btn-icon').click();
await page.getByRole('button', { name: 'Criar infográfico' }).click();
await page.getByText('Faturamento necessário').waitFor({ timeout: 20000 });
assert.equal(await page.locator('.info-figure img').count(), 0);
await page.locator('.infographic').scrollIntoViewIfNeeded();
await shot(page, '07-erro-faturamento');
ok('Falha de faturamento exibida como erro específico, sem imagem substituta');
await fetch(`${FAKE}/__opts?imageError=`);

// 1) Material B (frações): conceitos e representações diferentes; contexto reiniciado
const analisesAntes = (await fakeLog()).filter((e) => e.path?.includes('generateContent') && JSON.stringify(e.body).includes('Analise o material')).length;
await page.getByRole('button', { name: /Voltar à sala Ciências/ }).first().click();
await page.locator('.material-item').first().waitFor();
assert.equal(await page.locator('.status-pill.st-ouvindo').count(), 0, 'tutor encerrado ao sair do material');
await shot(page, '07b-sala');
await page.getByRole('button', { name: '+ Adicionar material' }).click();
await page.getByRole('button', { name: /Frações/ }).click();
await page.locator('.board-svg svg').waitFor({ timeout: 20000 });
const conceitosB = await page.locator('.concept-name').allInnerTexts();
assert.ok(!conceitosB.some((c) => conceitosA.includes(c)));
assert.equal(await page.locator('.msg').count(), 0, 'conversa reiniciada');
ok(`Material B: conceitos ${conceitosB.join(', ')} (diferentes dos de A); conversa reiniciada`);
await shot(page, '08-aula-fracoes');
await page.getByRole('button', { name: /Tipos de fração/ }).click();
await page.locator('.board-compare').waitFor({ timeout: 20000 });
await shot(page, '09-fracoes-comparacao');
ok('Material B usa outras representações (esquema de relações e comparação)');

// Progresso guardado: reabrir o material A sem nova análise
await page.waitForTimeout(1600); // salvamento automático
await page.getByRole('button', { name: /Voltar à sala Ciências/ }).first().click();
await page.locator('.material-item', { hasText: 'Eclipses' }).locator('.material-abrir').click();
await page.locator('.board-svg svg').waitFor({ timeout: 20000 });
assert.match(await page.locator('.board-title').innerText(), /Eclipse lunar/, 'voltou ao último conceito estudado');
assert.ok((await page.locator('.msg-tutor').count()) >= 2, 'conversa restaurada');
await page.locator('.info-figure img').waitFor();
const analisesDepois = (await fakeLog()).filter((e) => e.path?.includes('generateContent') && JSON.stringify(e.body).includes('Analise o material')).length;
assert.equal(analisesDepois, analisesAntes + 1, 'só a análise do material B; o A foi reaberto do disco');
await shot(page, '10-material-reaberto');
ok('Material reaberto do disco: último conceito, conversa e infográfico restaurados, sem nova análise');

// Separação por usuário: o Luan não vê a sala do administrador
await page.getByRole('button', { name: /Voltar à sala Ciências/ }).first().click();
await page.getByRole('button', { name: 'Sair' }).click();
await entrar(page, APP, { usuario: 'luan', senha: 'luan2026' });
await page.getByText('Você ainda não tem salas.').waitFor();
assert.equal(await page.locator('.sala-card').count(), 0);
await abrirSala(page, 'Matemática');
await page.getByRole('button', { name: 'Minhas salas', exact: true }).click();
await page.locator('.sala-card').first().waitFor();
assert.deepEqual(await page.locator('.sala-nome').allInnerTexts(), ['Matemática']);
assert.equal(await page.getByRole('button', { name: 'Usuários' }).count(), 0, 'aluno não administra usuários');
await shot(page, '11-salas-do-luan');
ok('Luan entra com a própria senha e vê só as próprias salas');

assert.deepEqual(errosConsole, [], `erros na página: ${errosConsole.join('\n')}`);
ok('Nenhum erro de JavaScript na página');
await browser.close();
