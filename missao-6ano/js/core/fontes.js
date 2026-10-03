// Consulta a fontes online CONFIÁVEIS (quando há internet) para apoiar o estudo.
// Princípios:
//  • só fontes de uma lista fechada (não é busca aberta na web): Wikipédia, Wikcionário, NASA, IBGE;
//  • cada fonte é independente: se uma falhar, as outras continuam; sem internet, vale o que já foi guardado;
//  • todo texto é tratado como texto puro (nunca HTML) e todo link/imagem precisa pertencer a um domínio permitido;
//  • sempre mostra de onde veio, a licença e um link para a fonte original.

export const FONTES = {
  wikipedia: {
    nome: 'Wikipédia', icone: '📖', idioma: 'pt', licenca: 'CC BY-SA 4.0',
    confianca: 'Enciclopédia livre, escrita e revisada por voluntários, com referências. Boa para começar; confirme os fatos importantes em uma segunda fonte.',
    site: 'https://pt.wikipedia.org',
  },
  wiktionary: {
    nome: 'Wikcionário', icone: '🔤', idioma: 'pt', licenca: 'CC BY-SA 4.0',
    confianca: 'Dicionário colaborativo com significado, classe da palavra e origem.',
    site: 'https://pt.wiktionary.org',
  },
  nasa: {
    nome: 'NASA (Biblioteca de Imagens)', icone: '🚀', idioma: 'en', licenca: 'Domínio público (imagens da NASA)',
    confianca: 'Agência espacial oficial dos EUA. Os textos vêm em inglês — ótima chance de praticar!',
    site: 'https://images.nasa.gov',
  },
  ibge: {
    nome: 'IBGE', icone: '🗺️', idioma: 'pt', licenca: 'Dados abertos do IBGE',
    confianca: 'Instituto oficial de Geografia e Estatística do Brasil.',
    site: 'https://www.ibge.gov.br',
  },
};

export const ORDEM_FONTES = ['wikipedia', 'wiktionary', 'nasa', 'ibge'];

/** Domínios aceitos para links e imagens (defesa extra: nada fora desta lista é usado). */
const DOMINIOS = [/(^|\.)wikipedia\.org$/, /(^|\.)wiktionary\.org$/, /(^|\.)wikimedia\.org$/, /(^|\.)nasa\.gov$/, /(^|\.)ibge\.gov\.br$/];
export function urlPermitida(u) {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' && DOMINIOS.some((r) => r.test(x.hostname));
  } catch { return false; }
}
const limpaUrl = (u) => (u && urlPermitida(u) ? u : null);

// ---------- utilidades de texto ----------
const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&apos;': "'" };
export const tirarHtml = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/&(amp|lt|gt|quot|nbsp|apos|#39);/g, (m) => ENT[m]).replace(/\s+/g, ' ').trim();
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Corta em fim de frase, sem passar de `max` caracteres. */
export function resumir(txt, max = 700) {
  const t = String(txt || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max);
  const ponto = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('! '), corte.lastIndexOf('? '));
  return (ponto > max * 0.5 ? corte.slice(0, ponto + 1) : corte.replace(/\s+\S*$/, '') + '…').trim();
}

// ---------- astronomia (para a NASA, que entende inglês) ----------
const EN = {
  sol: 'sun', lua: 'moon', terra: 'earth', marte: 'mars', venus: 'venus', mercurio: 'mercury', jupiter: 'jupiter', saturno: 'saturn', urano: 'uranus',
  netuno: 'neptune', plutao: 'pluto', estrela: 'star', estrelas: 'stars', galaxia: 'galaxy', cometa: 'comet', asteroide: 'asteroid', eclipse: 'eclipse',
  constelacao: 'constellation', nebulosa: 'nebula', 'via lactea': 'milky way', telescopio: 'telescope', foguete: 'rocket', satelite: 'satellite', astronauta: 'astronaut',
  'monte olimpo': 'olympus mons', olimpo: 'olympus mons', europa: 'europa moon jupiter', encelado: 'enceladus', ganimedes: 'ganymede', calisto: 'callisto', io: 'io moon jupiter',
  titan: 'titan saturn', tita: 'titan saturn', fobos: 'phobos', deimos: 'deimos', 'sistema solar': 'solar system', planeta: 'planet', 'planeta anao': 'dwarf planet',
  'anel de saturno': 'saturn rings', 'aneis de saturno': 'saturn rings', 'grande mancha vermelha': 'great red spot', cratera: 'crater', 'buraco negro': 'black hole',
  'estacao espacial': 'international space station', 'hubble': 'hubble', 'james webb': 'james webb telescope', aurora: 'aurora', solsticio: 'solstice', equinocio: 'equinox',
  gravidade: 'gravity', orbita: 'orbit', atmosfera: 'atmosphere', 'efeito estufa': 'greenhouse effect', lua: 'moon',
};
export function paraIngles(termo) {
  const n = norm(termo);
  if (EN[n]) return EN[n];
  const achado = Object.keys(EN).filter((k) => new RegExp(`(^|\\s)${k}(\\s|$)`).test(n)).sort((a, b) => b.length - a.length)[0];
  return achado ? EN[achado] : null;
}
export const ehAstronomia = (termo) => !!paraIngles(termo);

// ---------- países/estados (IBGE) ----------
const PAISES = {
  brasil: 'BR', egito: 'EG', grecia: 'GR', italia: 'IT', iraque: 'IQ', ira: 'IR', siria: 'SY', turquia: 'TR', israel: 'IL', peru: 'PE', mexico: 'MX', argentina: 'AR',
  china: 'CN', india: 'IN', japao: 'JP', 'reino unido': 'GB', franca: 'FR', alemanha: 'DE', espanha: 'ES', portugal: 'PT', 'estados unidos': 'US', russia: 'RU',
  angola: 'AO', mocambique: 'MZ', 'cabo verde': 'CV', chile: 'CL', colombia: 'CO', uruguai: 'UY', paraguai: 'PY', venezuela: 'VE', bolivia: 'BO',
  'africa do sul': 'ZA', australia: 'AU', canada: 'CA', etiopia: 'ET', libano: 'LB', jordania: 'JO', 'arabia saudita': 'SA',
};
const UFS = { acre: 'AC', alagoas: 'AL', amapa: 'AP', amazonas: 'AM', bahia: 'BA', ceara: 'CE', 'distrito federal': 'DF', 'espirito santo': 'ES', goias: 'GO', maranhao: 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS', 'minas gerais': 'MG', para: 'PA', paraiba: 'PB', parana: 'PR', pernambuco: 'PE', piaui: 'PI', 'rio de janeiro': 'RJ', 'rio grande do norte': 'RN', 'rio grande do sul': 'RS', rondonia: 'RO', roraima: 'RR', 'santa catarina': 'SC', 'sao paulo': 'SP', sergipe: 'SE', tocantins: 'TO' };

// ---------- adaptadores ----------
const enc = encodeURIComponent;

async function jsonDe(fetchFn, url, timeoutMs) {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const t = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
  try {
    const r = await fetchFn(url, ctl ? { signal: ctl.signal } : {});
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally { if (t) clearTimeout(t); }
}

async function wikipedia(termo, { fetchFn, timeoutMs }) {
  const url = `https://pt.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*&redirects=1&generator=search&gsrsearch=${enc(termo)}&gsrlimit=5&gsrnamespace=0` +
    `&prop=extracts|pageimages|info&exintro=1&explaintext=1&exsentences=6&exlimit=max&piprop=thumbnail&pithumbsize=480&inprop=url`;
  const j = await jsonDe(fetchFn, url, timeoutMs);
  const paginas = Array.isArray(j?.query?.pages) ? j.query.pages : Object.values(j?.query?.pages || {});
  return paginas
    .sort((a, b) => (a.index || 99) - (b.index || 99))
    .filter((p) => p.extract && !/pode (se )?referir[- ]se a|pode significar|desambigua/i.test(p.extract.slice(0, 160)))
    .slice(0, 3)
    .map((p) => ({
      fonte: 'wikipedia', titulo: p.title, resumo: resumir(p.extract), url: limpaUrl(p.fullurl) || limpaUrl(`https://pt.wikipedia.org/wiki/${enc(String(p.title).replace(/ /g, '_'))}`),
      imagem: limpaUrl(p.thumbnail?.source), idioma: 'pt',
    }));
}

/** Pega a seção “Português” do texto simples de uma página do Wikcionário e deixa legível. */
export function extrairPortugues(extract) {
  const t = String(extract || '');
  const m = t.match(/^==\s*Portugu[eê]s\s*==\s*$/m);
  let corpo = m ? t.slice(m.index + m[0].length) : t;
  const prox = corpo.match(/^==\s*[^=\n][^\n]*==\s*$/m);
  if (prox) corpo = corpo.slice(0, prox.index);
  return corpo
    .replace(/^={3,}\s*(.+?)\s*={3,}\s*$/gm, '▸ $1')
    .replace(/\n{2,}/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
}

async function wiktionary(termo, { fetchFn, timeoutMs }) {
  const palavra = termo.trim();
  if (!palavra || /\s/.test(palavra)) return [];
  const url = `https://pt.wiktionary.org/w/api.php?action=query&format=json&formatversion=2&origin=*&redirects=1&prop=extracts&explaintext=1&titles=${enc(palavra.toLowerCase())}`;
  const j = await jsonDe(fetchFn, url, timeoutMs);
  const p = (j?.query?.pages || [])[0] || Object.values(j?.query?.pages || {})[0];
  if (!p || p.missing || !p.extract) return [];
  const texto = extrairPortugues(p.extract);
  if (!texto) return [];
  return [{ fonte: 'wiktionary', titulo: p.title || palavra, resumo: resumir(texto, 900), url: limpaUrl(`https://pt.wiktionary.org/wiki/${enc(palavra.toLowerCase())}`), imagem: null, idioma: 'pt' }];
}

async function nasa(termo, { fetchFn, timeoutMs }) {
  const en = paraIngles(termo);
  if (!en) return [];
  const url = `https://images-api.nasa.gov/search?q=${enc(en)}&media_type=image&page_size=6`;
  const j = await jsonDe(fetchFn, url, timeoutMs);
  const itens = j?.collection?.items || [];
  const vistos = new Set();
  const out = [];
  for (const it of itens) {
    const d = it.data?.[0];
    if (!d?.nasa_id || vistos.has(d.nasa_id)) continue;
    vistos.add(d.nasa_id);
    out.push({
      fonte: 'nasa', titulo: tirarHtml(d.title), resumo: resumir(tirarHtml(d.description || d.description_508 || ''), 500),
      url: limpaUrl(`https://images.nasa.gov/details/${enc(d.nasa_id)}`), imagem: limpaUrl(it.links?.find((l) => l.render === 'image' || /thumb|small|medium/.test(l.href))?.href || it.links?.[0]?.href), idioma: 'en',
    });
    if (out.length >= 3) break;
  }
  return out;
}

const fmtNum = (n) => Number(n).toLocaleString('pt-BR');
async function ibge(termo, { fetchFn, timeoutMs }) {
  const n = norm(termo);
  if (PAISES[n]) {
    const j = await jsonDe(fetchFn, `https://servicodados.ibge.gov.br/api/v1/paises/${PAISES[n]}`, timeoutMs);
    const p = Array.isArray(j) ? j[0] : j;
    if (!p) return [];
    const partes = [];
    const cap = p.governo?.capital?.nome; if (cap) partes.push(`Capital: ${cap}.`);
    const area = p.area?.total; if (area) partes.push(`Área: ${fmtNum(area)} ${p.area?.unidade?.['símbolo'] || 'km²'}.`);
    const reg = p.localizacao?.regiao?.nome; const sub = p.localizacao?.['sub-regiao']?.nome; if (reg) partes.push(`Localização: ${sub ? `${sub}, ` : ''}${reg}.`);
    const lin = (p.linguas || []).map((l) => l.nome).filter(Boolean); if (lin.length) partes.push(`Línguas: ${lin.join(', ')}.`);
    const moeda = (p['unidades-monetarias'] || []).map((m) => m.nome).filter(Boolean); if (moeda.length) partes.push(`Moeda: ${moeda.join(', ')}.`);
    if (p.historico) partes.push(resumir(tirarHtml(p.historico), 420));
    return [{ fonte: 'ibge', titulo: p.nome?.abreviado || termo, resumo: partes.join(' '), url: limpaUrl('https://paises.ibge.gov.br/'), imagem: null, idioma: 'pt' }];
  }
  if (UFS[n]) {
    const j = await jsonDe(fetchFn, `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${UFS[n]}`, timeoutMs);
    const e = Array.isArray(j) ? j[0] : j;
    if (!e?.nome) return [];
    return [{ fonte: 'ibge', titulo: `${e.nome} (${e.sigla})`, resumo: `Estado do Brasil, na Região ${e.regiao?.nome || '—'}.`, url: limpaUrl(`https://www.ibge.gov.br/cidades-e-estados/${String(e.sigla).toLowerCase()}.html`), imagem: null, idioma: 'pt' }];
  }
  return [];
}

const ADAPTADORES = { wikipedia, wiktionary, nasa, ibge };

/** Quais fontes fazem sentido para este termo (a Wikipédia sempre; as outras conforme o assunto). */
export function fontesAplicaveis(termo, { disciplina = '', habilitadas = ORDEM_FONTES } = {}) {
  const n = norm(termo);
  const uma = n && !/\s/.test(n);
  const out = [];
  if (habilitadas.includes('wikipedia')) out.push('wikipedia');
  if (habilitadas.includes('wiktionary') && uma && (disciplina === 'Português' || n.length >= 4)) out.push('wiktionary');
  if (habilitadas.includes('nasa') && ehAstronomia(termo)) out.push('nasa');
  if (habilitadas.includes('ibge') && (PAISES[n] || UFS[n])) out.push('ibge');
  return out;
}

// ---------- cache ----------
const TTL_FRESCO = 24 * 3600 * 1000;
const MAX_CACHE = 80;

/** @param {{get:()=>object, set:(o:object)=>void}} armazem */
export function criarCache(armazem) {
  const chave = (fonte, termo) => `${fonte}|${norm(termo)}`;
  return {
    ler(fonte, termo, { aceitarVelho = false } = {}) {
      const e = armazem.get()[chave(fonte, termo)];
      if (!e) return null;
      return aceitarVelho || Date.now() - e.t < TTL_FRESCO ? e.r : null;
    },
    gravar(fonte, termo, resultados) {
      const tudo = armazem.get();
      tudo[chave(fonte, termo)] = { t: Date.now(), r: resultados };
      const ks = Object.keys(tudo);
      if (ks.length > MAX_CACHE) for (const k of ks.sort((a, b) => tudo[a].t - tudo[b].t).slice(0, ks.length - MAX_CACHE)) delete tudo[k];
      armazem.set(tudo);
    },
  };
}

/**
 * Consulta as fontes aplicáveis em paralelo.
 * @returns {{resultados: Array, falhas: Array<{fonte:string, erro:string}>, offline: boolean, doCache: boolean}}
 */
export async function consultar(termo, { fontes, habilitadas = ORDEM_FONTES, disciplina = '', fetchFn = (typeof fetch !== 'undefined' ? fetch : null), cache = null, online = true, timeoutMs = 8000 } = {}) {
  const t = String(termo || '').trim();
  if (t.length < 2) return { resultados: [], falhas: [], offline: !online, doCache: false };
  const quais = fontes || fontesAplicaveis(t, { disciplina, habilitadas });
  const resultados = [];
  const falhas = [];
  let doCache = false;
  await Promise.all(quais.map(async (f) => {
    const fresco = cache?.ler(f, t);
    if (fresco) { resultados.push(...fresco); doCache = true; return; }
    if (!online || !fetchFn) {
      const velho = cache?.ler(f, t, { aceitarVelho: true });
      if (velho) { resultados.push(...velho); doCache = true; }
      return;
    }
    try {
      const r = (await ADAPTADORES[f](t, { fetchFn, timeoutMs })).filter((x) => x.titulo && x.resumo).map((x, i) => ({ ...x, id: `${f}:${norm(t)}:${i}`, termo: t, licenca: FONTES[f].licenca }));
      cache?.gravar(f, t, r);
      resultados.push(...r);
    } catch (e) {
      const velho = cache?.ler(f, t, { aceitarVelho: true });
      if (velho) { resultados.push(...velho); doCache = true; }
      falhas.push({ fonte: f, erro: e.name === 'AbortError' ? 'demorou demais' : String(e.message || e) });
    }
  }));
  resultados.sort((a, b) => ORDEM_FONTES.indexOf(a.fonte) - ORDEM_FONTES.indexOf(b.fonte));
  return { resultados, falhas, offline: !online, doCache };
}

// ---------- sites de estudo (links; nada é baixado deles) ----------
export const SITES_ESTUDO = [
  { id: 'khan', nome: 'Khan Academy Brasil', dominio: 'pt.khanacademy.org', desc: 'Aulas em vídeo e exercícios gratuitos, passo a passo', disc: ['Matemática', 'Ciências', 'História', 'Geografia', 'Português'] },
  { id: 'brasilescola', nome: 'Brasil Escola', dominio: 'brasilescola.uol.com.br', desc: 'Resumos e exercícios de todas as matérias', disc: ['História', 'Geografia', 'Português', 'Matemática', 'Ciências'] },
  { id: 'todamateria', nome: 'Toda Matéria', dominio: 'www.todamateria.com.br', desc: 'Resumos organizados por disciplina', disc: ['História', 'Geografia', 'Português', 'Matemática', 'Ciências', 'Inglês'] },
  { id: 'mundoeducacao', nome: 'Mundo Educação', dominio: 'mundoeducacao.uol.com.br', desc: 'Textos e exercícios para o Ensino Fundamental', disc: ['História', 'Geografia', 'Português', 'Matemática', 'Ciências'] },
  { id: 'ibgeeduca', nome: 'IBGE Educa', dominio: 'educa.ibge.gov.br', desc: 'Brasil e Geografia para crianças e jovens, do IBGE', disc: ['Geografia', 'História'] },
  { id: 'nasaspaceplace', nome: 'NASA Space Place', dominio: 'spaceplace.nasa.gov', desc: 'Astronomia explicada para crianças (em inglês)', disc: ['Ciências', 'Inglês'] },
];

/** Link de busca restrita ao site (ex.: “Egito antigo site:brasilescola.uol.com.br”). */
export const linkBusca = (site, termo) => `https://www.google.com/search?q=${enc(`${termo} site:${site.dominio}`)}`;
export const linkVideos = (termo) => `https://www.youtube.com/results?search_query=${enc(`${termo} khan academy brasil`)}`;

/** Testa cada fonte com um termo conhecido (para o pai ver, no próprio aparelho, o que está funcionando). */
export async function diagnosticar({ fetchFn = fetch, timeoutMs = 8000 } = {}) {
  const testes = { wikipedia: 'Júpiter', wiktionary: 'planeta', nasa: 'Júpiter', ibge: 'Egito' };
  const saida = [];
  for (const f of ORDEM_FONTES) {
    const t0 = Date.now();
    try {
      const r = await ADAPTADORES[f](testes[f], { fetchFn, timeoutMs });
      saida.push({ fonte: f, ok: r.length > 0, ms: Date.now() - t0, detalhe: r.length ? `${r.length} resultado(s)` : 'respondeu, mas sem resultados para o termo de teste' });
    } catch (e) { saida.push({ fonte: f, ok: false, ms: Date.now() - t0, detalhe: e.name === 'AbortError' ? 'demorou demais' : String(e.message || e) }); }
  }
  return saida;
}

/** Cria uma carta-relâmpago a partir de um resultado: “O que é X?” → primeiras frases. */
export function cartaDoResultado(r, { frases = 2 } = {}) {
  const partes = r.resumo.replace(/\n/g, ' ').split(/(?<=[.!?])\s+/).filter(Boolean);
  const verso = partes.slice(0, frases).join(' ');
  return { frente: r.fonte === 'wiktionary' ? `O que significa “${r.titulo}”?` : `O que é / quem foi: ${r.titulo}?`, verso: verso || r.resumo };
}

/** Temas a pesquisar citados numa tarefa: “pesquise sobre o Egito antigo”, “faça uma pesquisa sobre a fotossíntese”. */
export function acharTemasDePesquisa(texto) {
  const out = [];
  const re = /(?:pesquis[ea]r?|pesquisa|fa[çc]a uma pesquisa)\s+(?:(?:um|uma)\s+)?(?:sobre|a respeito d[eoa]s?|acerca d[eoa]s?)\s+([^.\n;!?]{3,70})/gi;
  let m;
  while ((m = re.exec(String(texto || '')))) {
    const t = m[1].replace(/\s+(e\s+(entregue|envie|mande)|para\s+(amanh[ãa]|hoje|segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado)|at[ée]\s).*$/i, '').trim();
    if (t.length >= 3) out.push(t.charAt(0).toUpperCase() + t.slice(1));
  }
  return [...new Set(out)].slice(0, 4);
}
