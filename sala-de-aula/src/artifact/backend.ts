// Versão "artefato do Claude": faz no navegador o que o servidor fazia,
// usando o Claude da própria conta de quem abre a página (capacidade `sample`).
// Não usa chaves de API. Sem microfone e sem acesso à internet (regras do artefato).
import * as P from '../../server/prompts.js';
import { describeBoard, renderBoardSvg, SVG_KINDS, validateBoard } from '../../shared/board.js';
import { ApiError } from '../api';
import { openPdf, renderPage, type PdfDoc } from '../pdf';
import type { ApiErro, Board, Conceito } from '../types';

type Sample = ((input: unknown, opts?: Record<string, unknown>) => Promise<{ text: string; truncated: boolean }>) & {
  json: <T = any>(input: unknown, opts?: Record<string, unknown>) => Promise<T>;
  limits: () => Promise<{ images?: { maxCount: number }; tools?: { maxCount: number } }>;
};

declare global {
  interface Window {
    claude?: { use: (name: string) => Promise<any> };
  }
}

const NOME_MODELO = 'Claude (sua conta)';

let samplePromise: Promise<Sample | null> | null = null;
export function getSample(): Promise<Sample | null> {
  if (!samplePromise) samplePromise = window.claude?.use ? window.claude.use('sample').catch(() => null) : Promise.resolve(null);
  return samplePromise;
}
async function sampleOrThrow(): Promise<Sample> {
  const s = await getSample();
  if (!s)
    throw new ApiError(
      { tipo: 'configuracao', mensagem: 'O Claude não está disponível nesta página.', comoResolver: 'Abra a sala de aula pelo link do claude.ai, com a sua conta.' },
      503
    );
  return s;
}

let limitesCache: Promise<{ images?: { maxCount: number }; tools?: { maxCount: number } } | null> | null = null;
export async function limites() {
  if (!limitesCache) limitesCache = sampleOrThrow().then((s) => s.limits().catch(() => null));
  return limitesCache;
}

/** Traduz os códigos de erro do `sample` para mensagens para a família. */
export function erroDoClaude(e: any, acao: string): ApiError {
  if (e instanceof ApiError) return e;
  const code: string = e?.code || 'upstream_error';
  const m: Record<string, ApiErro> = {
    not_granted: { tipo: 'permissao', mensagem: 'A página não recebeu permissão para usar o Claude.', comoResolver: 'Recarregue a página e clique em "Permitir" quando o Claude perguntar.' },
    sampling_disabled: { tipo: 'permissao', mensagem: 'O Claude não está disponível para esta conta agora.', comoResolver: 'Confira o seu plano do Claude.' },
    rate_limited: { tipo: 'cota', mensagem: 'Muitos pedidos seguidos, ou o limite de uso da sua conta do Claude foi atingido.', comoResolver: 'Espere alguns minutos e tente de novo.' },
    session_expired: { tipo: 'login', mensagem: 'A sua sessão no Claude expirou.', comoResolver: 'Entre de novo no claude.ai e recarregue a página.' },
    prompt_too_large: { tipo: 'tamanho', mensagem: 'O material é grande demais para enviar de uma vez.', comoResolver: 'Use só as páginas da matéria ou divida o material.' },
    invalid_json: { tipo: 'formato', mensagem: `A resposta do Claude ao ${acao} veio num formato inesperado.`, comoResolver: 'Tente novamente.' },
    refused: { tipo: 'bloqueio', mensagem: `O Claude não respondeu a este pedido (${acao}).`, comoResolver: 'Tente reformular o pedido.' },
    empty_completion: { tipo: 'sem_resposta', mensagem: `O Claude não devolveu resposta ao ${acao}.`, comoResolver: 'Tente novamente.' },
    image_rejected: { tipo: 'formato', mensagem: 'Uma das imagens não pôde ser enviada ao Claude.', comoResolver: 'Tente de novo.' },
    cancelled: { tipo: 'cancelado', mensagem: 'Pedido cancelado.' },
  };
  return new ApiError({ ...(m[code] || { tipo: 'servico', mensagem: `Falha temporária ao ${acao}.`, comoResolver: 'Tente novamente.' }), detalhe: `${code}: ${e?.message || ''}`.slice(0, 300) }, 502);
}

// Quando o material é uma foto, ela vai junto em cada pedido.
let imagemMaterial: Blob | null = null;
async function comImagemMaterial(opts: Record<string, unknown>) {
  if (!imagemMaterial) return opts;
  const max = (await limites())?.images?.maxCount || 0;
  if (!max) throw new ApiError({ tipo: 'indisponivel', mensagem: 'Esta visualização não consegue enviar imagens ao Claude.', comoResolver: 'Abra a sala de aula no claude.ai pelo navegador e permita o envio de imagens.' }, 400);
  const outras = (opts.images as Blob[] | undefined) || [];
  return { ...opts, images: [imagemMaterial, ...outras].slice(0, max) };
}

async function pedirJson<T = any>(prompt: string, acao: string, opts: Record<string, unknown> = {}): Promise<T> {
  const s = await sampleOrThrow();
  opts = await comImagemMaterial(opts);
  try {
    return await s.json<T>(prompt, opts);
  } catch (e) {
    throw erroDoClaude(e, acao);
  }
}
async function pedirTexto(prompt: string, acao: string, opts: Record<string, unknown> = {}) {
  const s = await sampleOrThrow();
  opts = await comImagemMaterial(opts);
  try {
    return (await s(prompt, opts)).text;
  } catch (e) {
    throw erroDoClaude(e, acao);
  }
}

function formatoJson(schema: unknown) {
  return `\n\nResponda SOMENTE com um objeto JSON válido que siga este JSON Schema (sem texto antes ou depois):\n${JSON.stringify(schema)}`;
}

// ---------------------------------------------------------------------------
// Material (mantido só na memória da página)
// ---------------------------------------------------------------------------
interface Doc {
  tipo: 'pdf' | 'texto' | 'imagem';
  nome: string;
  texto: string; // texto do material (PDF: por página)
  numPaginas: number;
  pdf?: PdfDoc;
  imagens: Map<number, Blob>; // páginas renderizadas como imagem (para figuras)
}
const docs = new Map<string, Doc>();
let seq = 0;

async function paginaComoImagem(pdf: PdfDoc, n: number): Promise<Blob | null> {
  try {
    const c = document.createElement('canvas');
    await renderPage(pdf, n, c, 900 / (window.devicePixelRatio || 1));
    return await new Promise((ok) => c.toBlob((b) => ok(b), 'image/jpeg', 0.8));
  } catch {
    return null;
  }
}

async function registrar(form: FormData) {
  const arquivo = form.get('arquivo') as File | null;
  const nome = String(form.get('nome') || '');
  const midia = String(form.get('midia') || '');
  let doc: Doc;
  imagemMaterial = null;
  if (arquivo && midia && midia !== 'imagem')
    throw new ApiError({ tipo: 'indisponivel', mensagem: 'Áudios e vídeos não funcionam na versão de artefato do Claude.', comoResolver: 'Use o site no Render (versão com Gemini).' }, 400);
  if (arquivo && midia === 'imagem') {
    imagemMaterial = arquivo;
    doc = { tipo: 'imagem', nome: nome || arquivo.name, texto: '', numPaginas: 0, imagens: new Map() };
  } else if (arquivo) {
    const pdf = await openPdf(arquivo);
    const partes: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      const t = (tc.items as any[]).map((it) => ('str' in it ? it.str : '')).join(' ').replace(/\s+/g, ' ').trim();
      partes.push(`--- Página ${i} ---\n${t || '(página sem texto extraível; pode ter só imagens)'}`);
    }
    doc = { tipo: 'pdf', nome: nome || arquivo.name, texto: partes.join('\n\n').slice(0, 180000), numPaginas: pdf.numPages, pdf, imagens: new Map() };
  } else {
    const texto = String(form.get('texto') || '').trim();
    if (texto.length < 40) throw new ApiError({ tipo: 'formato', mensagem: 'O texto colado é curto demais para preparar uma aula.', comoResolver: 'Cole as anotações completas da matéria.' }, 400);
    doc = { tipo: 'texto', nome, texto: texto.slice(0, 180000), numPaginas: 0, imagens: new Map() };
  }
  const id = `doc${++seq}`;
  docs.clear(); // trocar de material apaga o anterior
  docs.set(id, doc);
  return { docId: id };
}

function getDoc(id: unknown): Doc {
  const d = docs.get(String(id || ''));
  if (!d) throw new ApiError({ tipo: 'documento_expirado', mensagem: 'O material não está mais carregado.', comoResolver: 'Use "Trocar material" e envie de novo.' }, 410);
  return d;
}

function materialTexto(doc: Doc) {
  if (doc.tipo === 'imagem')
    return `MATERIAL DE ESTUDO: a PRIMEIRA imagem anexada ("${doc.nome}"), por exemplo uma foto do caderno, do livro ou da lousa. Leia todo o texto e os desenhos dela. Não há páginas: refira-se às partes da imagem (títulos, quadros, tópicos).`;
  return doc.tipo === 'pdf'
    ? `MATERIAL DE ESTUDO: PDF "${doc.nome}" com ${doc.numPaginas} páginas. Texto extraído de cada página:\n"""\n${doc.texto}\n"""`
    : `MATERIAL DE ESTUDO (anotações em texto${doc.nome ? `: "${doc.nome}"` : ''}):\n"""\n${doc.texto}\n"""`;
}

/** Imagens de páginas do PDF (figuras), se a página puder enviar imagens. */
async function imagensDePaginas(doc: Doc, paginas: number[]): Promise<Blob[]> {
  if (doc.tipo !== 'pdf' || !doc.pdf || !paginas.length) return [];
  const lim = await limites();
  const max = lim?.images?.maxCount || 0;
  if (!max) return [];
  const out: Blob[] = [];
  for (const p of paginas.slice(0, max)) {
    if (!doc.imagens.has(p)) {
      const b = await paginaComoImagem(doc.pdf, p);
      if (b) doc.imagens.set(p, b);
    }
    const b = doc.imagens.get(p);
    if (b) out.push(b);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Análise
// ---------------------------------------------------------------------------
function slug(s: unknown, fb: string) {
  return (
    String(s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 40) || fb
  );
}

async function analisar(body: any) {
  const doc = getDoc(body.docId);
  const temPaginas = doc.tipo === 'pdf' && doc.numPaginas > 0;
  const imgs = await imagensDePaginas(doc, Array.from({ length: Math.min(doc.numPaginas, 6) }, (_, i) => i + 1));
  const data: any = await pedirJson(
    `${materialTexto(doc)}\n\n${imgs.length ? `As ${imgs.length} imagens anexadas são as primeiras páginas do PDF, para você ver as figuras.\n\n` : ''}${P.analisePrompt({ temPaginas, numPaginas: doc.numPaginas, nomeArquivo: doc.nome, midia: doc.tipo === 'imagem' ? 'imagem' : '' })}${formatoJson(P.ANALISE_SCHEMA)}`,
    'analisar o material',
    imgs.length ? { images: imgs } : {}
  );
  if (!data?.analisavel || !Array.isArray(data.conceitos) || !data.conceitos.length)
    throw new ApiError(
      { tipo: 'nao_analisavel', mensagem: `Não foi possível preparar uma aula com este material${data?.motivoNaoAnalisavel ? `: ${data.motivoNaoAnalisavel}` : '.'}`, comoResolver: 'Confira o material ou cole o texto da matéria.' },
      422
    );
  const pageOk = (p: unknown) => temPaginas && Number.isInteger(p) && (p as number) >= 1 && (p as number) <= doc.numPaginas;
  const secoes = (data.secoes || []).map((s: any, i: number) => {
    const o: any = { id: slug(s.id || s.titulo, `secao${i + 1}`), titulo: String(s.titulo || `Parte ${i + 1}`) };
    if (pageOk(s.paginaInicio)) o.paginaInicio = s.paginaInicio;
    if (pageOk(s.paginaFim)) o.paginaFim = s.paginaFim;
    return o;
  });
  const ids = new Set<string>();
  const conceitos = data.conceitos.slice(0, 10).map((c: any, i: number) => {
    let id = slug(c.id || c.nome, `conceito${i + 1}`);
    while (ids.has(id)) id += '_';
    ids.add(id);
    return {
      id,
      nome: String(c.nome),
      resumo: String(c.resumo || ''),
      conteudo: String(c.conteudo || ''),
      perguntaCentral: String(c.perguntaCentral || ''),
      representacao: c.representacao,
      motivoRepresentacao: String(c.motivoRepresentacao || ''),
      paginas: [...new Set<number>((c.paginas || []).filter(pageOk))].sort((a, b) => a - b),
      secoes: (c.secoes || []).map((s: unknown) => slug(s, '')).filter((s: string) => secoes.some((x: any) => x.id === s)),
      figuras: (c.figuras || []).map((f: any) => ({ descricao: String(f.descricao || ''), ...(pageOk(f.pagina) ? { pagina: f.pagina } : {}) })),
    };
  });
  return {
    analise: { titulo: String(data.titulo || doc.nome || 'Material de estudo'), disciplina: String(data.disciplina || ''), resumo: String(data.resumo || ''), temPaginas, numPaginas: doc.numPaginas, secoes, conceitos },
    modelo: NOME_MODELO,
  };
}

// ---------------------------------------------------------------------------
// Quadro: gerar → validar → desenhar → revisar → corrigir
// ---------------------------------------------------------------------------
export async function svgParaPng(svg: string, largura = 1000, fundo = '#2f5d46'): Promise<Blob | null> {
  try {
    const img = new Image();
    await new Promise<void>((ok, fail) => {
      img.onload = () => ok();
      img.onerror = () => fail(new Error('svg'));
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });
    const w = largura;
    const h = Math.round((img.naturalHeight / (img.naturalWidth || 1)) * w) || Math.round(w * 0.56);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise((ok) => c.toBlob((b) => ok(b), 'image/png'));
  } catch {
    return null;
  }
}

function sanitizeRefs<T extends { board: Board }>(r: T, doc: Doc): T {
  const temPaginas = doc.tipo === 'pdf' && doc.numPaginas > 0;
  const ok = (n: number) => temPaginas && n >= 1 && n <= doc.numPaginas;
  r.board.fontes = (r.board.fontes || []).filter((f) => {
    const m = /\bp(?:ág(?:ina)?)?s?\.?\s*(\d+)/i.exec(f);
    return !m || ok(Number(m[1]));
  });
  if (r.board.figuraOriginal && !ok(Number(r.board.figuraOriginal.pagina))) delete r.board.figuraOriginal;
  return r;
}

function textoAlternativo(c: Conceito): Board {
  const fig = (c.figuras || []).find((f) => f.pagina);
  return validateBoard({
    tipo: 'texto',
    pergunta: c.perguntaCentral,
    titulo: c.nome,
    explicacao: c.resumo,
    texto: { blocos: [{ id: 'material', titulo: 'O que o material diz', texto: c.conteudo }] },
    ...(fig ? { figuraOriginal: { pagina: fig.pagina, motivo: fig.descricao } } : {}),
  }).board;
}

async function montarQuadro(doc: Doc, conceito: Conceito, pedido = '', quadroAtual = '') {
  const temPaginas = doc.tipo === 'pdf' && doc.numPaginas > 0;
  const base = `${materialTexto(doc)}\n\n${P.boardPrompt({ conceito, temPaginas, pedido, quadroAtual, contextoExtra: '' })}`;
  const figs = await imagensDePaginas(doc, (conceito.figuras || []).map((f) => f.pagina!).filter(Boolean).slice(0, 2));
  const g1 = await pedirJson(`${base}${figs.length ? '\n\nAs imagens anexadas são as páginas do PDF com as figuras deste conceito.' : ''}${formatoJson(P.BOARD_SCHEMA)}`, 'montar o quadro', figs.length ? { images: figs } : {});
  let { board, problemas } = validateBoard(g1);

  // Revisão de precisão com a imagem do quadro
  const png = SVG_KINDS.includes(board.tipo) ? await svgParaPng(renderBoardSvg(board, { standalone: true })) : null;
  const lim = await limites();
  const podeImagem = !!png && !!lim?.images?.maxCount;
  let rev: any;
  try {
    rev = await pedirJson(
      `${materialTexto(doc)}\n\n${P.revisaoPrompt({ conceito, descricao: describeBoard(board), problemasAuto: problemas, temImagem: podeImagem })}${podeImagem && doc.tipo === 'imagem' ? '\n(A imagem do quadro é a ÚLTIMA imagem anexada.)' : ''}${formatoJson(P.REVISAO_SCHEMA)}`,
      'revisar o quadro',
      podeImagem ? { images: [png!] } : {}
    );
  } catch (e) {
    return { board, revisao: { status: 'nao_revisado', problemas, aviso: `A revisão automática falhou: ${(e as ApiError).erro?.mensagem || e}` } };
  }
  if (rev?.confiavel === false)
    return { board: textoAlternativo(conceito), revisao: { status: 'texto_alternativo', problemas: rev.problemas || [], aviso: 'Não foi possível montar um desenho confiável deste conceito; veja a explicação em texto e a figura original, se houver.' } };
  const todos = [...new Set<string>([...(rev?.problemas || []), ...problemas])];
  if ((rev?.aprovado && !problemas.length) || !todos.length) return { board, revisao: { status: 'aprovado', problemas: [] } };
  const g2 = await pedirJson(
    `${base}\n\nUMA VERSÃO ANTERIOR DESTE QUADRO TINHA ERROS. Versão anterior:\n${describeBoard(board)}\n\nCorrija TODOS estes problemas:\n- ${todos.join('\n- ')}${formatoJson(P.BOARD_SCHEMA)}`,
    'corrigir o quadro'
  );
  const v2 = validateBoard(g2);
  return { board: v2.board, revisao: { status: v2.problemas.length ? 'corrigido_com_avisos' : 'corrigido', problemas: todos, avisos: v2.problemas } };
}

async function quadro(body: any) {
  const doc = getDoc(body.docId);
  return { ...sanitizeRefs(await montarQuadro(doc, body.conceito, body.pedido, body.quadroAtual), doc), modelo: NOME_MODELO };
}

async function perguntar(body: any) {
  const doc = getDoc(body.docId);
  const { conceito, acao, pergunta, historico, quadroAtual, nivel } = body;
  if (acao === 'pergunta' && !String(pergunta || '').trim()) throw new ApiError({ tipo: 'formato', mensagem: 'Escreva uma pergunta.' }, 400);
  const temPaginas = doc.tipo === 'pdf' && doc.numPaginas > 0;
  const data: any = await pedirJson(
    `${materialTexto(doc)}\n\n${P.perguntaPrompt({ conceito, acao, pergunta, historico, quadroAtual, temPaginas, nivel })}${formatoJson(P.RESPOSTA_SCHEMA)}`,
    'responder',
    { cache: false }
  );
  const out: any = { resposta: String(data?.resposta || ''), destacar: data?.destacar || [], modelo: NOME_MODELO };
  if (data?.atualizarQuadro) {
    try {
      const pedido = `${data.pedidoParaQuadro || ''} (Contexto: ${(P.ACOES as any)[acao] || ''} ${pergunta ? `Pergunta: ${pergunta}` : ''} Resposta dada ao aluno: ${out.resposta})`;
      Object.assign(out, sanitizeRefs(await montarQuadro(doc, conceito, pedido, quadroAtual), doc));
      out.destacar = [];
    } catch (e) {
      out.boardErro = (e as ApiError).erro || { tipo: 'desconhecido', mensagem: String(e) };
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Agora eu explico
// ---------------------------------------------------------------------------
async function perguntaAberta(body: any) {
  const doc = getDoc(body.docId);
  const d: any = await pedirJson(`${materialTexto(doc)}\n\n${P.perguntaAbertaPrompt({ conceito: body.conceito })}${formatoJson(P.PERGUNTA_ABERTA_SCHEMA)}`, 'preparar a pergunta', { cache: false, modelTier: 'quick' });
  return { pergunta: String(d?.pergunta || '') };
}
async function avaliar(body: any) {
  const doc = getDoc(body.docId);
  if (!String(body.resposta || '').trim()) throw new ApiError({ tipo: 'formato', mensagem: 'A explicação está vazia.' }, 400);
  const d: any = await pedirJson(
    `${materialTexto(doc)}\n\n${P.avaliacaoPrompt({ conceito: body.conceito, pergunta: body.pergunta, resposta: body.resposta })}${formatoJson(P.AVALIACAO_SCHEMA)}`,
    'avaliar a explicação',
    { cache: false }
  );
  return {
    entendeuCorretamente: d?.entendeuCorretamente || [],
    faltou: d?.faltou || [],
    confundiu: d?.confundiu || [],
    correcao: String(d?.correcao || ''),
    situacao: String(d?.situacao || ''),
    comentario: String(d?.comentario || ''),
    modelo: NOME_MODELO,
  };
}

// ---------------------------------------------------------------------------
// Infográfico (desenhado pelo Claude em SVG: o Nano Banana Pro não funciona aqui)
// ---------------------------------------------------------------------------
function b64(s: string) {
  return btoa(unescape(encodeURIComponent(s)));
}
function deB64(s: string) {
  return decodeURIComponent(escape(atob(s)));
}
function extrairSvg(texto: string, acao: string) {
  const m = /<svg[\s\S]*<\/svg>/i.exec(texto);
  if (!m) throw new ApiError({ tipo: 'sem_imagem', mensagem: `O Claude não devolveu um desenho ao ${acao}.`, comoResolver: 'Tente novamente.' }, 502);
  const svg = m[0];
  const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
  if (parsed.querySelector('parsererror')) throw new ApiError({ tipo: 'sem_imagem', mensagem: `O desenho devolvido ao ${acao} veio com defeito.`, comoResolver: 'Tente novamente.' }, 502);
  return svg.includes('xmlns=') ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
}
const REGRAS_SVG = `Responda SOMENTE com um único documento SVG completo (de <svg> até </svg>), sem explicações.
Regras do SVG: width="1600" height="900" viewBox="0 0 1600 900"; fundo claro; fontes "Arial, Helvetica, sans-serif"; textos em português do Brasil com acentos corretos; títulos com pelo menos 48px e legendas com pelo menos 24px; nenhum texto pode sair da área nem se sobrepor a outro; sem imagens externas, sem scripts, sem fontes externas; formas simples e precisas.`;

function imagemSvg(svg: string) {
  return { mimeType: 'image/svg+xml', data: b64(svg), modelo: 'Claude (desenho em SVG)', modeloPedido: 'Claude (desenho em SVG)', configUsada: { aspectRatio: '16:9' } };
}

async function direcao(body: any) {
  const doc = getDoc(body.docId);
  const d: any = await pedirJson(
    `${materialTexto(doc)}\n\n${P.direcaoPrompt({ conceito: body.conceito, duvida: body.duvida, quadroAtual: body.quadroAtual })}${formatoJson(P.DIRECAO_SCHEMA)}`,
    'preparar a direção visual',
    { cache: false }
  );
  d.secoes = (d.secoes || []).slice(0, 3);
  return { direcao: d, modelo: NOME_MODELO };
}
async function gerarInfografico(body: any) {
  const texto = await pedirTexto(`Desenhe um infográfico educacional seguindo esta direção.\n\n${P.imagemPrompt(body.direcao)}\n\n${REGRAS_SVG}`, 'desenhar o infográfico', { cache: false, modelTier: 'complex' });
  return imagemSvg(extrairSvg(texto, 'desenhar o infográfico'));
}
async function corrigirInfografico(body: any) {
  const atual = deB64(body.imagem.data);
  const texto = await pedirTexto(
    `${P.correcaoImagemPrompt({ instrucao: body.instrucao, direcao: body.direcao })}\n\nINFOGRÁFICO ATUAL (SVG):\n${atual}\n\n${REGRAS_SVG}`,
    'corrigir o infográfico',
    { cache: false, modelTier: 'complex' }
  );
  return imagemSvg(extrairSvg(texto, 'corrigir o infográfico'));
}
async function revisarInfografico(body: any) {
  const doc = getDoc(body.docId);
  const svg = deB64(body.imagem.data);
  const png = await svgParaPng(svg, 1600, '#ffffff');
  const lim = await limites();
  const comImagem = !!png && !!lim?.images?.maxCount;
  const d: any = await pedirJson(
    `${materialTexto(doc)}\n\n${P.revisaoImagemPrompt({ conceito: body.conceito, direcao: body.direcao })}\n\n${comImagem ? (doc.tipo === 'imagem' ? 'O infográfico é a ÚLTIMA imagem anexada.' : 'A imagem anexada é o infográfico.') : `O infográfico é este SVG:\n${svg}`}${formatoJson(P.REVISAO_IMAGEM_SCHEMA)}`,
    'revisar o infográfico',
    comImagem ? { images: [png!], cache: false } : { cache: false }
  );
  return { observacoes: d?.observacoes || [], resumo: String(d?.resumo || ''), modelo: NOME_MODELO };
}

// ---------------------------------------------------------------------------
// Roteamento (mesmas rotas do servidor)
// ---------------------------------------------------------------------------
const SAMPLES = import.meta.glob('../../samples/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export async function handle(url: string, init: RequestInit): Promise<unknown> {
  const path = url.split('?')[0];
  const body = init.body instanceof FormData ? init.body : init.body ? JSON.parse(String(init.body)) : {};
  switch (path) {
    case '/api/session':
      return { exigeLogin: false, logado: true, configuracaoPendente: false };
    case '/api/status':
      return { chaveConfigurada: true };
    case '/api/samples':
      return Object.entries(SAMPLES)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([f, texto]) => ({ id: f.split('/').pop()!.replace(/\.md$/, ''), titulo: (texto.match(/^#\s+(.+)$/m) || [])[1] || f, texto }));
    case '/api/documents':
      return registrar(body as FormData);
    case '/api/analyze':
      return analisar(body);
    case '/api/board':
      return quadro(body);
    case '/api/ask':
      return perguntar(body);
    case '/api/explain/question':
      return perguntaAberta(body);
    case '/api/explain/evaluate':
      return avaliar(body);
    case '/api/infographic/direction':
      return direcao(body);
    case '/api/infographic/generate':
      return gerarInfografico(body);
    case '/api/infographic/edit':
      return corrigirInfografico(body);
    case '/api/infographic/review':
      return revisarInfografico(body);
    case '/api/logout':
      return { ok: true };
    default:
      throw new ApiError({ tipo: 'indisponivel', mensagem: 'Este recurso não existe na versão de artefato do Claude.' }, 404);
  }
}
