import test from 'node:test';
import assert from 'node:assert/strict';
import { consultar, fontesAplicaveis, criarCache, urlPermitida, tirarHtml, resumir, paraIngles, extrairPortugues, cartaDoResultado, acharTemasDePesquisa, diagnosticar, linkBusca, SITES_ESTUDO } from '../js/core/fontes.js';

// ---- respostas de exemplo, no formato documentado de cada API ----
const WIKI = { batchcomplete: true, query: { pages: [
  { pageid: 2, title: 'Marte (desambiguação)', index: 2, extract: 'Marte pode referir-se a:', fullurl: 'https://pt.wikipedia.org/wiki/Marte_(desambigua%C3%A7%C3%A3o)' },
  { pageid: 1, title: 'Marte', index: 1, extract: 'Marte é o quarto planeta a partir do Sol. É conhecido como planeta vermelho. Possui duas luas, Fobos e Deimos.', fullurl: 'https://pt.wikipedia.org/wiki/Marte', thumbnail: { source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/OSIRIS_Mars_true_color.jpg/480px-OSIRIS_Mars_true_color.jpg', width: 480, height: 480 } },
  { pageid: 3, title: 'Marte (mitologia)', index: 3, extract: 'Marte era o deus romano da guerra.', fullurl: 'https://pt.wikipedia.org/wiki/Marte_(mitologia)' },
] } };
const WIKT = { query: { pages: [{ pageid: 9, title: 'planeta', extract: 'Introdução\n\n\n== Português ==\n\n=== Etimologia ===\nDo latim planeta.\n\n=== Substantivo ===\nplaneta m.\ncorpo celeste que orbita uma estrela\n\n== Espanhol ==\nplaneta m.\nalgo' }] } };
const NASA = { collection: { items: [
  { href: 'x', data: [{ nasa_id: 'PIA00001', title: 'Mars &amp; Olympus', description: 'The <b>largest</b> volcano in the solar system.', media_type: 'image' }], links: [{ href: 'https://images-assets.nasa.gov/image/PIA00001/PIA00001~small.jpg', rel: 'preview', render: 'image' }] },
  { href: 'y', data: [{ nasa_id: 'PIA00001', title: 'repetido' }], links: [] },
  { href: 'z', data: [{ nasa_id: 'PIA00002', title: 'Mars rover', description: 'A rover on Mars.' }], links: [{ href: 'https://evil.example.com/x.jpg', render: 'image' }] },
] } };
const IBGE_PAIS = [{ id: { M49: 818 }, nome: { abreviado: 'Egito' }, area: { total: '1001450', unidade: { 'símbolo': 'km²' } }, localizacao: { regiao: { nome: 'África' }, 'sub-regiao': { nome: 'África Setentrional' } }, linguas: [{ nome: 'árabe' }], governo: { capital: { nome: 'Cairo' } }, 'unidades-monetarias': [{ nome: 'Libra egípcia' }], historico: 'O Egito é um país do nordeste da África <i>antigo</i>.' }];
const IBGE_UF = { id: 21, sigla: 'MA', nome: 'Maranhão', regiao: { id: 2, sigla: 'NE', nome: 'Nordeste' } };

const resp = (obj, ok = true, status = 200) => ({ ok, status, json: async () => obj });
const falso = (mapa) => async (url) => {
  for (const [trecho, r] of Object.entries(mapa)) if (url.includes(trecho)) return typeof r === 'function' ? r(url) : r;
  throw new Error('rede indisponível: ' + url);
};
const memoria = () => { let o = {}; return { get: () => o, set: (n) => { o = n; } }; };

test('Wikipédia: ordena pelo índice, tira desambiguação e normaliza', async () => {
  const r = await consultar('Marte', { fontes: ['wikipedia'], fetchFn: falso({ 'wikipedia.org': resp(WIKI) }) });
  assert.deepEqual(r.resultados.map((x) => x.titulo), ['Marte', 'Marte (mitologia)']);
  assert.equal(r.resultados[0].fonte, 'wikipedia');
  assert.match(r.resultados[0].imagem, /^https:\/\/upload\.wikimedia\.org/);
  assert.equal(r.resultados[0].licenca, 'CC BY-SA 4.0');
  assert.equal(r.falhas.length, 0);
});

test('Wikcionário: pega só a seção Português e arruma os títulos', () => {
  const t = extrairPortugues(WIKT.query.pages[0].extract);
  assert.match(t, /▸ Etimologia/);
  assert.match(t, /corpo celeste/);
  assert.doesNotMatch(t, /Espanhol|algo/);
});

test('NASA: traduz o termo, limpa HTML, remove repetidos e bloqueia imagem de domínio estranho', async () => {
  assert.equal(paraIngles('Monte Olimpo'), 'olympus mons');
  assert.equal(paraIngles('Júpiter'), 'jupiter');
  assert.equal(paraIngles('culinária'), null);
  let url = '';
  const r = await consultar('Monte Olimpo', { fontes: ['nasa'], fetchFn: falso({ 'images-api.nasa.gov': (u) => { url = u; return resp(NASA); } }) });
  assert.match(url, /q=olympus%20mons/);
  assert.equal(r.resultados.length, 2);
  assert.equal(r.resultados[0].titulo, 'Mars & Olympus');
  assert.equal(r.resultados[0].resumo, 'The largest volcano in the solar system.');
  assert.equal(r.resultados[0].idioma, 'en');
  assert.equal(r.resultados[1].imagem, null, 'imagem de domínio não permitido é descartada');
  assert.match(r.resultados[0].url, /^https:\/\/images\.nasa\.gov\/details\/PIA00001/);
});

test('IBGE: país (capital, área, línguas) e estado', async () => {
  const f = falso({ '/paises/EG': resp(IBGE_PAIS), '/estados/MA': resp(IBGE_UF) });
  const p = await consultar('Egito', { fontes: ['ibge'], fetchFn: f });
  assert.match(p.resultados[0].resumo, /Capital: Cairo/);
  assert.match(p.resultados[0].resumo, /Línguas: árabe/);
  assert.match(p.resultados[0].resumo, /1\.001\.450/);
  assert.doesNotMatch(p.resultados[0].resumo, /<i>/);
  const e = await consultar('Maranhão', { fontes: ['ibge'], fetchFn: f });
  assert.equal(e.resultados[0].titulo, 'Maranhão (MA)');
  assert.match(e.resultados[0].url, /ibge\.gov\.br\/cidades-e-estados\/ma\.html/);
});

test('uma fonte falha e as outras continuam (falhas isoladas)', async () => {
  const f = falso({ 'wikipedia.org/w/api': resp(WIKI), 'images-api.nasa.gov': resp({}, false, 503) });
  const r = await consultar('Marte', { fontes: ['wikipedia', 'nasa'], fetchFn: f });
  assert.equal(r.resultados.length, 2);
  assert.deepEqual(r.falhas.map((x) => x.fonte), ['nasa']);
  assert.match(r.falhas[0].erro, /503/);
});

test('cache: reaproveita resposta fresca; sem internet usa o que foi guardado; falha de rede cai no cache', async () => {
  const cache = criarCache(memoria());
  let chamadas = 0;
  const f = falso({ 'wikipedia.org': () => { chamadas++; return resp(WIKI); } });
  await consultar('Marte', { fontes: ['wikipedia'], fetchFn: f, cache });
  const r2 = await consultar('marte', { fontes: ['wikipedia'], fetchFn: f, cache });
  assert.equal(chamadas, 1); assert.ok(r2.doCache);
  const off = await consultar('Marte', { fontes: ['wikipedia'], fetchFn: f, cache, online: false });
  assert.equal(off.resultados.length, 2); assert.equal(off.offline, true); assert.equal(chamadas, 1);
  const semCache = await consultar('Vênus', { fontes: ['wikipedia'], fetchFn: f, cache, online: false });
  assert.equal(semCache.resultados.length, 0); assert.equal(chamadas, 1);
  const quebrou = await consultar('Marte', { fontes: ['wikipedia'], cache: criarCache(memoria()), fetchFn: async () => { throw new Error('caiu'); } });
  assert.equal(quebrou.resultados.length, 0);
  assert.equal(quebrou.falhas.length, 1);
});

test('quais fontes valem para cada termo', () => {
  assert.deepEqual(fontesAplicaveis('Júpiter'), ['wikipedia', 'wiktionary', 'nasa']);
  assert.deepEqual(fontesAplicaveis('Egito'), ['wikipedia', 'wiktionary', 'ibge']);
  assert.deepEqual(fontesAplicaveis('Código de Hamurábi'), ['wikipedia']);
  assert.deepEqual(fontesAplicaveis('Júpiter', { habilitadas: ['wikipedia'] }), ['wikipedia']);
});

test('segurança: só https e domínios permitidos; HTML vira texto', () => {
  assert.ok(urlPermitida('https://pt.wikipedia.org/wiki/Marte'));
  assert.ok(urlPermitida('https://images-assets.nasa.gov/a.jpg'));
  assert.ok(!urlPermitida('http://pt.wikipedia.org/wiki/Marte'));
  assert.ok(!urlPermitida('https://pt.wikipedia.org.evil.com/x'));
  assert.ok(!urlPermitida('javascript:alert(1)'));
  assert.equal(tirarHtml('<script>x</script>Olá &amp; <b>mundo</b>'), 'x Olá & mundo');
});

test('resumir corta em fim de frase', () => {
  const t = 'Primeira frase longa o bastante. Segunda frase também longa. Terceira frase que passa do limite escolhido aqui.';
  assert.equal(resumir(t, 70), 'Primeira frase longa o bastante. Segunda frase também longa.');
  assert.equal(resumir('curto', 70), 'curto');
});

test('carta a partir do resultado e temas de pesquisa na mensagem', () => {
  const c = cartaDoResultado({ fonte: 'wikipedia', titulo: 'Marte', resumo: 'Marte é o quarto planeta. É vermelho. Tem duas luas.' });
  assert.equal(c.verso, 'Marte é o quarto planeta. É vermelho.');
  assert.match(c.frente, /Marte/);
  assert.deepEqual(acharTemasDePesquisa('História: pesquise sobre o Egito antigo e entregue na sexta. Faça uma pesquisa sobre a fotossíntese.'), ['O Egito antigo', 'A fotossíntese']);
  assert.deepEqual(acharTemasDePesquisa('Matemática: ex. 1 a 3'), []);
});

test('diagnóstico: informa o que funciona e o que não', async () => {
  const f = falso({ 'pt.wikipedia.org': resp(WIKI), 'pt.wiktionary.org': resp(WIKT), 'images-api.nasa.gov': resp({}, false, 500) });
  const d = await diagnosticar({ fetchFn: f });
  assert.deepEqual(d.map((x) => [x.fonte, x.ok]), [['wikipedia', true], ['wiktionary', true], ['nasa', false], ['ibge', false]]);
});

test('sites de estudo: busca restrita ao domínio', () => {
  assert.match(linkBusca(SITES_ESTUDO[0], 'frações'), /site%3Apt\.khanacademy\.org/);
  assert.ok(SITES_ESTUDO.every((s) => s.dominio && s.desc));
});

test('tarefa do WhatsApp com pedido de pesquisa já traz o tema', async () => {
  const { analisarMensagem } = await import('../js/core/zap.js');
  const r = analisarMensagem('Ciências: pesquise sobre Marte e entregue na sexta.\n1) Qual o quarto planeta?', '2026-10-21');
  assert.deepEqual(r.tarefas[0].pesquisas, ['Marte']);
});

test('prazo “entregue na sexta” é entendido e sai do título', async () => {
  const { analisarMensagem } = await import('../js/core/zap.js');
  const [t] = analisarMensagem('Ciências: pesquise sobre o sistema solar e entregue na sexta', '2026-11-10').tarefas;
  assert.equal(t.entrega, '2026-11-13');
  assert.equal(t.entregaDetectada, true);
  assert.doesNotMatch(t.titulo, /entregue/);
  assert.deepEqual(t.pesquisas, ['O sistema solar']);
});
