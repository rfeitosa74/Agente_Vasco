// Servidor da "Minha sala de aula".
// Guarda a chave da API Gemini e faz todas as chamadas que precisam dela.
import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { Modality } from '@google/genai';
import {
  ai,
  AppError,
  enviarArquivo,
  generateImage,
  generateJson,
  generateText,
  hasKey,
  listModels,
  modelStatus,
  publicError,
  resolveModel,
  toAppError,
} from './gemini.js';
import * as P from './prompts.js';
import { describeBoard, renderBoardSvg, SVG_KINDS, validateBoard } from '../shared/board.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 5173);
// Na nuvem (Render) o servidor precisa ouvir em todas as interfaces.
const NA_NUVEM = !!process.env.RENDER;
const HOST = process.env.HOST || (NA_NUVEM ? '0.0.0.0' : '127.0.0.1');
const SENHA = process.env.APP_PASSWORD || process.env.ACCESS_CODE || '';
const SO_LOCAL = HOST === '127.0.0.1' || HOST === 'localhost';
const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('--producao') || NA_NUVEM;
const abrirNavegador = process.argv.includes('--abrir');

const app = express();
app.set('trust proxy', 1); // HTTPS termina no proxy do Render
app.use(express.json({ limit: '40mb' }));
const LIMITE_MIDIA_MB = Number(process.env.LIMITE_MIDIA_MB || 100);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: LIMITE_MIDIA_MB * 1024 * 1024 } });

// Formatos de imagem, áudio e vídeo que o Gemini entende diretamente.
const MIDIA = {
  imagem: { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' },
  audio: {
    'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/wave': 'wav', 'audio/aac': 'aac',
    'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/m4a': 'm4a', 'audio/ogg': 'ogg', 'audio/flac': 'flac', 'audio/x-flac': 'flac',
    'audio/aiff': 'aiff', 'audio/x-aiff': 'aiff', 'audio/webm': 'webm', 'audio/opus': 'opus',
  },
  video: {
    'video/mp4': 'mp4', 'video/mpeg': 'mpeg', 'video/quicktime': 'mov', 'video/x-msvideo': 'avi', 'video/avi': 'avi',
    'video/x-flv': 'flv', 'video/webm': 'webm', 'video/x-ms-wmv': 'wmv', 'video/3gpp': '3gp',
  },
};
// O Gemini prefere estes nomes de tipo
const MIME_GEMINI = { 'audio/x-m4a': 'audio/mp4', 'audio/m4a': 'audio/mp4', 'audio/mp3': 'audio/mpeg', 'audio/x-wav': 'audio/wav', 'audio/wave': 'audio/wav', 'audio/x-flac': 'audio/flac', 'audio/x-aiff': 'audio/aiff', 'video/avi': 'video/x-msvideo' };
const POR_EXTENSAO = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif',
  mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', oga: 'audio/ogg', flac: 'audio/flac', aiff: 'audio/aiff', opus: 'audio/ogg',
  mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo', webm: 'video/webm', mpeg: 'video/mpeg', mpg: 'video/mpeg', wmv: 'video/x-ms-wmv', '3gp': 'video/3gpp', flv: 'video/x-flv',
};
function tipoDeMidia(mime, nomeArquivo) {
  let m = String(mime || '').split(';')[0].toLowerCase();
  const ext = String(nomeArquivo || '').split('.').pop().toLowerCase();
  if ((!m || m === 'application/octet-stream') && POR_EXTENSAO[ext]) m = POR_EXTENSAO[ext];
  for (const [tipo, tabela] of Object.entries(MIDIA)) if (tabela[m]) return { tipo, mime: MIME_GEMINI[m] || m };
  if (POR_EXTENSAO[ext]) {
    const mm = POR_EXTENSAO[ext];
    for (const [tipo, tabela] of Object.entries(MIDIA)) if (tabela[mm]) return { tipo, mime: MIME_GEMINI[mm] || mm };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Login com senha (obrigatório quando o site fica na internet)
// ---------------------------------------------------------------------------
const COOKIE = 'sala_sessao';
const DURACAO_SESSAO = 30 * 24 * 60 * 60 * 1000; // 30 dias
// Chave de assinatura derivada da senha: trocar a senha encerra todas as sessões.
const SEGREDO_SESSAO = crypto.createHmac('sha256', SENHA || 'sem-senha').update('minha-sala-de-aula/sessao').digest();

function assinar(exp) {
  return crypto.createHmac('sha256', SEGREDO_SESSAO).update(String(exp)).digest('base64url');
}
function sessaoValida(req) {
  const c = Object.fromEntries(
    String(req.headers.cookie || '')
      .split(';')
      .map((p) => p.trim().split('='))
      .filter((p) => p.length === 2)
  )[COOKIE];
  if (!c) return false;
  const [exp, sig] = c.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const esperado = Buffer.from(assinar(exp));
  const recebido = Buffer.from(sig);
  return esperado.length === recebido.length && crypto.timingSafeEqual(esperado, recebido);
}
function iguais(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// Proteção contra tentativas repetidas: 8 erros em 15 minutos bloqueiam o endereço.
const tentativas = new Map();
function bloqueado(ip) {
  const t = tentativas.get(ip);
  return t && t.n >= 8 && Date.now() - t.desde < 15 * 60 * 1000;
}
function registrarErro(ip) {
  const t = tentativas.get(ip);
  if (!t || Date.now() - t.desde > 15 * 60 * 1000) tentativas.set(ip, { n: 1, desde: Date.now() });
  else t.n++;
}

const exigeLogin = !!SENHA;
const semProtecao = !SENHA && !SO_LOCAL; // na internet sem senha: não libera nada

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/session', (req, res) => {
  res.json({ exigeLogin, logado: !exigeLogin || sessaoValida(req), configuracaoPendente: semProtecao });
});

app.post('/api/login', (req, res) => {
  const ip = req.ip || 'desconhecido';
  if (!exigeLogin) return res.json({ ok: true });
  if (bloqueado(ip))
    return res.status(429).json({ erro: { tipo: 'acesso', mensagem: 'Muitas tentativas erradas.', comoResolver: 'Espere 15 minutos e tente de novo.' } });
  if (!iguais(req.body?.senha || '', SENHA)) {
    registrarErro(ip);
    return res.status(401).json({ erro: { tipo: 'acesso', mensagem: 'Senha incorreta.' } });
  }
  tentativas.delete(ip);
  const exp = Date.now() + DURACAO_SESSAO;
  res.cookie(COOKIE, `${exp}.${assinar(exp)}`, { httpOnly: true, secure: req.secure, sameSite: 'strict', maxAge: DURACAO_SESSAO, path: '/' });
  res.json({ ok: true });
});

app.post('/api/logout', (_req, res) => {
  res.clearCookie(COOKIE, { path: '/' });
  res.json({ ok: true });
});

app.use('/api', (req, res, next) => {
  if (semProtecao)
    return res.status(503).json({
      erro: { tipo: 'configuracao', mensagem: 'O site está na internet sem senha, por isso foi bloqueado.', comoResolver: 'Defina APP_PASSWORD nas configurações do servidor (no Render: Environment) e reinicie.' },
    });
  if (exigeLogin && !sessaoValida(req))
    return res.status(401).json({ erro: { tipo: 'login', mensagem: 'Entre com a senha para continuar.' } });
  next();
});

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    const ae = toAppError(e);
    if (!(e instanceof AppError)) console.error('[erro]', e);
    else console.warn(`[${ae.tipo}] ${ae.message}${ae.detalhe ? ` — ${ae.detalhe.slice(0, 200)}` : ''}`);
    res.status(ae.status || 500).json({ erro: publicError(ae) });
  }
};

// ---------------------------------------------------------------------------
// Documentos (em memória; o navegador reenvia se o servidor reiniciar)
// ---------------------------------------------------------------------------
const docs = new Map();
const MAX_DOCS = 12;

function getDoc(id) {
  const d = docs.get(String(id || ''));
  if (!d) throw new AppError('documento_expirado', 'O servidor não encontrou este material (talvez tenha sido reiniciado).', 'O aplicativo vai reenviar o material automaticamente.', '', 410);
  return d;
}

const DESCRICAO_MIDIA = { imagem: 'uma imagem (por exemplo, foto do caderno ou do livro)', audio: 'um áudio (por exemplo, uma aula gravada)', video: 'um vídeo (por exemplo, uma videoaula)' };

function docParts(doc) {
  if (doc.tipo === 'pdf') return [{ inlineData: { mimeType: 'application/pdf', data: doc.base64 } }];
  if (doc.tipo === 'midia') {
    const arq = doc.fileUri ? { fileData: { fileUri: doc.fileUri, mimeType: doc.mime } } : { inlineData: { mimeType: doc.mime, data: doc.base64 } };
    return [
      arq,
      {
        text: `O MATERIAL DE ESTUDO é ${DESCRICAO_MIDIA[doc.midia]}${doc.nome ? ` ("${doc.nome}")` : ''}${doc.duracao ? `, com duração de ${formatarTempo(doc.duracao)}` : ''}. Use o que é realmente dito e mostrado nele.`,
      },
    ];
  }
  return [{ text: `MATERIAL DE ESTUDO (anotações em texto${doc.nome ? `: "${doc.nome}"` : ''}):\n"""\n${doc.texto}\n"""` }];
}

app.post(
  '/api/documents',
  upload.single('arquivo'),
  wrap(async (req, res) => {
    let doc;
    const midia = req.file ? tipoDeMidia(req.file.mimetype, req.file.originalname) : null;
    if (req.file && midia) {
      const nome = req.body.nome || req.file.originalname;
      doc = { tipo: 'midia', midia: midia.tipo, mime: midia.mime, nome, duracao: Number(req.body.duracao) || 0 };
      // Arquivos pequenos vão junto com cada pedido; os grandes (e os vídeos) pela API de arquivos.
      if (req.file.size > 15 * 1024 * 1024 || midia.tipo === 'video') {
        const f = await enviarArquivo(req.file.buffer, midia.mime, nome);
        doc.fileUri = f.uri;
      } else doc.base64 = req.file.buffer.toString('base64');
    } else if (req.file) {
      const isPdf = req.file.mimetype === 'application/pdf' || req.file.buffer.subarray(0, 5).toString() === '%PDF-';
      if (!isPdf)
        throw new AppError(
          'formato',
          'Este tipo de arquivo não é aceito.',
          'Envie PDF, Word (.docx), texto (.txt), imagem (JPG, PNG, WebP), áudio (MP3, WAV, M4A, OGG, FLAC) ou vídeo (MP4, MOV, WebM, AVI).',
          `${req.file.mimetype} ${req.file.originalname}`,
          400
        );
      if (req.file.size > 19 * 1024 * 1024)
        throw new AppError('tamanho', 'O PDF é grande demais (limite de 19 MB).', 'Divida o PDF em partes menores ou envie só as páginas da matéria.', '', 413);
      doc = {
        tipo: 'pdf',
        nome: req.body.nome || req.file.originalname,
        base64: req.file.buffer.toString('base64'),
        numPaginas: Number(req.body.numPaginas) || 0,
      };
    } else {
      const texto = String(req.body.texto || '').trim();
      if (texto.length < 40) throw new AppError('formato', 'O texto colado é curto demais para preparar uma aula.', 'Cole as anotações completas da matéria.', '', 400);
      doc = { tipo: 'texto', nome: String(req.body.nome || ''), texto: texto.slice(0, 200000) };
    }
    const id = crypto.randomUUID();
    docs.set(id, doc);
    while (docs.size > MAX_DOCS) docs.delete(docs.keys().next().value);
    res.json({ docId: id });
  })
);

function formatarTempo(seg) {
  const s = Math.max(0, Math.round(Number(seg) || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}
/** Converte "mm:ss" ou "h:mm:ss" em segundos (ou null). */
function segundos(t) {
  const m = /^\s*(?:(\d+):)?(\d{1,2}):(\d{2})\s*$/.exec(String(t || ''));
  if (!m) return null;
  return Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

function slug(s, fb) {
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

app.post(
  '/api/analyze',
  wrap(async (req, res) => {
    const doc = getDoc(req.body.docId);
    const temPaginas = doc.tipo === 'pdf' && doc.numPaginas > 0;
    const { data, modelo } = await generateJson({
      parts: [...docParts(doc), { text: P.analisePrompt({ temPaginas, numPaginas: doc.numPaginas, nomeArquivo: doc.nome, midia: doc.midia, duracao: doc.duracao ? formatarTempo(doc.duracao) : '' }) }],
      schema: P.ANALISE_SCHEMA,
      temperature: 0.2,
      acao: 'analisar o material',
    });
    if (!data.analisavel || !Array.isArray(data.conceitos) || !data.conceitos.length) {
      throw new AppError(
        'nao_analisavel',
        `Não foi possível preparar uma aula com este material${data.motivoNaoAnalisavel ? `: ${data.motivoNaoAnalisavel}` : '.'}`,
        doc.tipo === 'pdf' ? 'Se o PDF for uma digitalização de baixa qualidade, tente outro arquivo ou cole o texto.' : 'Confira se o texto colado contém a matéria.',
        '',
        422
      );
    }
    // Normalização: ids únicos e páginas reais
    const pageOk = (p) => temPaginas && Number.isInteger(p) && p >= 1 && p <= doc.numPaginas;
    const temTempo = doc.tipo === 'midia' && doc.midia !== 'imagem';
    // Marcas de tempo só valem para áudio/vídeo e dentro da duração real.
    const tempoOk = (t) => {
      const sec = segundos(t);
      return temTempo && sec !== null && (!doc.duracao || sec <= doc.duracao + 5);
    };
    const ids = new Set();
    const secoes = (data.secoes || []).map((s, i) => {
      const o = { id: slug(s.id || s.titulo, `secao${i + 1}`), titulo: String(s.titulo || `Parte ${i + 1}`) };
      if (pageOk(s.paginaInicio)) o.paginaInicio = s.paginaInicio;
      if (pageOk(s.paginaFim)) o.paginaFim = s.paginaFim;
      if (tempoOk(s.inicio)) o.inicio = formatarTempo(segundos(s.inicio));
      return o;
    });
    const conceitos = data.conceitos.slice(0, 10).map((c, i) => {
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
        paginas: [...new Set((c.paginas || []).filter(pageOk))].sort((a, b) => a - b),
        secoes: (c.secoes || []).map((s) => slug(s, '')).filter((s) => secoes.some((x) => x.id === s)),
        figuras: (c.figuras || []).map((f) => ({ descricao: String(f.descricao || ''), ...(pageOk(f.pagina) ? { pagina: f.pagina } : {}) })),
        tempos: [...new Set((c.tempos || []).filter(tempoOk).map((t) => formatarTempo(segundos(t))))].slice(0, 6),
      };
    });
    res.json({
      analise: {
        titulo: String(data.titulo || doc.nome || 'Material de estudo'),
        disciplina: String(data.disciplina || ''),
        resumo: String(data.resumo || ''),
        temPaginas,
        numPaginas: doc.numPaginas || 0,
        temTempo,
        midia: doc.midia || '',
        duracao: doc.duracao || 0,
        secoes,
        conceitos,
      },
      modelo,
    });
  })
);

// ---------------------------------------------------------------------------
// Quadro: gerar → validar → desenhar → revisar → corrigir
// ---------------------------------------------------------------------------
// Fonte incluída no projeto: a imagem de revisão tem texto mesmo em servidores sem fontes instaladas.
const FONTES_REVISAO = {
  loadSystemFonts: true,
  fontFiles: ['DejaVuSans.ttf', 'DejaVuSans-Bold.ttf'].map((f) => path.join(__dirname, 'fonts', f)),
  defaultFontFamily: 'DejaVu Sans',
  sansSerifFamily: 'DejaVu Sans',
};

function boardPng(board) {
  if (!SVG_KINDS.includes(board.tipo)) return null;
  try {
    const svg = renderBoardSvg(board, { standalone: true });
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1000 }, font: FONTES_REVISAO }).render().asPng();
    return png.toString('base64');
  } catch (e) {
    console.warn('Falha ao desenhar o quadro para revisão:', e.message);
    return null;
  }
}

function textoAlternativo(conceito) {
  const fig = (conceito.figuras || []).find((f) => f.pagina);
  return validateBoard({
    tipo: 'texto',
    pergunta: conceito.perguntaCentral,
    titulo: conceito.nome,
    explicacao: conceito.resumo,
    texto: { blocos: [{ id: 'material', titulo: 'O que o material diz', texto: conceito.conteudo }] },
    ...(fig ? { figuraOriginal: { pagina: fig.pagina, motivo: fig.descricao } } : {}),
  }).board;
}

// Remove referências a páginas que não existem (ou qualquer página, se o material não tiver páginas).
function sanitizeRefs(result, doc) {
  const b = result.board;
  const temPaginas = doc.tipo === 'pdf' && doc.numPaginas > 0;
  const paginaValida = (n) => temPaginas && n >= 1 && n <= doc.numPaginas;
  b.fontes = (b.fontes || []).filter((f) => {
    const m = /\bp(?:ág(?:ina)?)?s?\.?\s*(\d+)/i.exec(f);
    return !m || paginaValida(Number(m[1]));
  });
  if (b.figuraOriginal && !paginaValida(Number(b.figuraOriginal.pagina))) delete b.figuraOriginal;
  return result;
}

async function buildBoard(doc, conceito, opts = {}) {
  return sanitizeRefs(await buildBoardRaw(doc, conceito, opts), doc);
}

async function buildBoardRaw(doc, conceito, { pedido = '', quadroAtual = '' } = {}) {
  const temPaginas = doc.tipo === 'pdf' && doc.numPaginas > 0;
  const base = P.boardPrompt({ conceito, temPaginas, pedido, quadroAtual });
  const gen1 = await generateJson({ parts: [...docParts(doc), { text: base }], schema: P.BOARD_SCHEMA, temperature: 0.35, acao: 'montar o quadro' });
  let { board, problemas } = validateBoard(gen1.data);
  const modelo = gen1.modelo;

  // Revisão de precisão (com a imagem do quadro, quando é um desenho)
  const png = boardPng(board);
  let revisao;
  try {
    const rev = await generateJson({
      parts: [
        ...docParts(doc),
        ...(png ? [{ inlineData: { mimeType: 'image/png', data: png } }] : []),
        { text: P.revisaoPrompt({ conceito, descricao: describeBoard(board), problemasAuto: problemas, temImagem: !!png }) },
      ],
      schema: P.REVISAO_SCHEMA,
      temperature: 0.1,
      acao: 'revisar o quadro',
    });
    revisao = rev.data;
  } catch (e) {
    // Sem revisão: mostra o quadro, mas avisa que não foi conferido.
    return { board, revisao: { status: 'nao_revisado', problemas, aviso: `A revisão automática falhou: ${toAppError(e).message}` }, modelo };
  }

  if (revisao.confiavel === false) {
    return {
      board: textoAlternativo(conceito),
      revisao: { status: 'texto_alternativo', problemas: revisao.problemas || [], aviso: 'Não foi possível montar um desenho confiável deste conceito; veja a explicação em texto e a figura original, se houver.' },
      modelo,
    };
  }
  const todos = [...new Set([...(revisao.problemas || []), ...problemas])];
  if (revisao.aprovado && problemas.length === 0) return { board, revisao: { status: 'aprovado', problemas: [] }, modelo };
  if (!todos.length) return { board, revisao: { status: 'aprovado', problemas: [] }, modelo };

  // Correção: nova geração com a lista de problemas
  const corr = await generateJson({
    parts: [
      ...docParts(doc),
      {
        text: `${base}\n\nUMA VERSÃO ANTERIOR DESTE QUADRO TINHA ERROS. Versão anterior:\n${describeBoard(board)}\n\nCorrija TODOS estes problemas:\n- ${todos.join('\n- ')}`,
      },
    ],
    schema: P.BOARD_SCHEMA,
    temperature: 0.2,
    acao: 'corrigir o quadro',
  });
  const v2 = validateBoard(corr.data);
  return {
    board: v2.board,
    revisao: {
      status: v2.problemas.length ? 'corrigido_com_avisos' : 'corrigido',
      problemas: todos,
      avisos: v2.problemas,
    },
    modelo,
  };
}

app.post(
  '/api/board',
  wrap(async (req, res) => {
    const doc = getDoc(req.body.docId);
    const conceito = req.body.conceito;
    if (!conceito?.nome) throw new AppError('formato', 'Conceito não informado.', '', '', 400);
    res.json(await buildBoard(doc, conceito, { pedido: req.body.pedido, quadroAtual: req.body.quadroAtual }));
  })
);

// ---------------------------------------------------------------------------
// Perguntas e atalhos
// ---------------------------------------------------------------------------
app.post(
  '/api/ask',
  wrap(async (req, res) => {
    const doc = getDoc(req.body.docId);
    const { conceito, acao, pergunta, historico, quadroAtual, nivel } = req.body;
    if (!conceito?.nome) throw new AppError('formato', 'Conceito não informado.', '', '', 400);
    if (acao === 'pergunta' && !String(pergunta || '').trim()) throw new AppError('formato', 'Escreva uma pergunta.', '', '', 400);
    const temPaginas = doc.tipo === 'pdf' && doc.numPaginas > 0;
    const { data, modelo } = await generateJson({
      parts: [...docParts(doc), { text: P.perguntaPrompt({ conceito, acao, pergunta, historico, quadroAtual, temPaginas, nivel: String(nivel || '').slice(0, 120) }) }],
      schema: P.RESPOSTA_SCHEMA,
      temperature: acao === 'outra_maneira' ? 0.7 : 0.4,
      acao: 'responder',
    });
    const out = { resposta: String(data.resposta || ''), destacar: data.destacar || [], modelo };
    if (data.atualizarQuadro) {
      try {
        const pedido = `${data.pedidoParaQuadro || ''} (Contexto: ${P.ACOES[acao] || ''} ${pergunta ? `Pergunta: ${pergunta}` : ''} Resposta dada ao aluno: ${out.resposta})`;
        Object.assign(out, await buildBoard(doc, conceito, { pedido, quadroAtual }));
        out.destacar = [];
      } catch (e) {
        out.boardErro = publicError(toAppError(e, 'atualizar o quadro'));
      }
    }
    res.json(out);
  })
);

// ---------------------------------------------------------------------------
// Agora eu explico
// ---------------------------------------------------------------------------
app.post(
  '/api/explain/question',
  wrap(async (req, res) => {
    const doc = getDoc(req.body.docId);
    const { data } = await generateJson({
      parts: [...docParts(doc), { text: P.perguntaAbertaPrompt({ conceito: req.body.conceito }) }],
      schema: P.PERGUNTA_ABERTA_SCHEMA,
      temperature: 0.6,
      acao: 'preparar a pergunta',
    });
    res.json({ pergunta: data.pergunta });
  })
);

app.post(
  '/api/explain/evaluate',
  wrap(async (req, res) => {
    const doc = getDoc(req.body.docId);
    const { conceito, pergunta, resposta } = req.body;
    if (!String(resposta || '').trim()) throw new AppError('formato', 'A explicação está vazia.', 'Fale ou escreva sua explicação antes de terminar.', '', 400);
    const { data, modelo } = await generateJson({
      parts: [...docParts(doc), { text: P.avaliacaoPrompt({ conceito, pergunta, resposta }) }],
      schema: P.AVALIACAO_SCHEMA,
      temperature: 0.1,
      acao: 'avaliar a explicação',
    });
    res.json({ ...data, modelo });
  })
);

app.post(
  '/api/transcribe',
  upload.single('audio'),
  wrap(async (req, res) => {
    if (!req.file?.buffer?.length) throw new AppError('formato', 'Nenhum áudio recebido.', 'Grave novamente.', '', 400);
    const mime = (req.file.mimetype || 'audio/webm').split(';')[0];
    const { text } = await generateText({
      parts: [
        { inlineData: { mimeType: mime, data: req.file.buffer.toString('base64') } },
        {
          text: 'Transcreva literalmente esta fala em português do Brasil. Devolva somente a transcrição, sem comentários, sem corrigir o conteúdo. Se não houver fala compreensível, devolva exatamente: [sem fala]',
        },
      ],
      temperature: 0,
      acao: 'transcrever o áudio',
    });
    const texto = text.trim();
    res.json({ texto: texto === '[sem fala]' ? '' : texto });
  })
);

// ---------------------------------------------------------------------------
// Infográficos (Nano Banana Pro)
// ---------------------------------------------------------------------------
app.post(
  '/api/infographic/direction',
  wrap(async (req, res) => {
    const doc = getDoc(req.body.docId);
    const { conceito, duvida, quadroAtual } = req.body;
    const { data, modelo } = await generateJson({
      parts: [...docParts(doc), { text: P.direcaoPrompt({ conceito, duvida, quadroAtual }) }],
      schema: P.DIRECAO_SCHEMA,
      temperature: 0.5,
      acao: 'preparar a direção visual',
    });
    data.secoes = (data.secoes || []).slice(0, 3);
    res.json({ direcao: data, modelo });
  })
);

app.post(
  '/api/infographic/generate',
  wrap(async (req, res) => {
    const d = req.body.direcao;
    if (!d?.titulo) throw new AppError('formato', 'Direção visual ausente.', '', '', 400);
    const img = await generateImage({ parts: [{ text: P.imagemPrompt(d) }] });
    res.json(img);
  })
);

app.post(
  '/api/infographic/edit',
  wrap(async (req, res) => {
    const { imagem, instrucao, direcao } = req.body;
    if (!imagem?.data || !String(instrucao || '').trim()) throw new AppError('formato', 'Informe a correção desejada.', '', '', 400);
    const img = await generateImage({
      parts: [{ inlineData: { mimeType: imagem.mimeType || 'image/png', data: imagem.data } }, { text: P.correcaoImagemPrompt({ instrucao, direcao }) }],
    });
    res.json(img);
  })
);

app.post(
  '/api/infographic/review',
  wrap(async (req, res) => {
    const doc = getDoc(req.body.docId);
    const { conceito, direcao, imagem } = req.body;
    const { data, modelo } = await generateJson({
      parts: [...docParts(doc), { inlineData: { mimeType: imagem.mimeType || 'image/png', data: imagem.data } }, { text: P.revisaoImagemPrompt({ conceito, direcao }) }],
      schema: P.REVISAO_IMAGEM_SCHEMA,
      temperature: 0.1,
      acao: 'revisar o infográfico',
    });
    res.json({ ...data, modelo });
  })
);

// ---------------------------------------------------------------------------
// Live: token efêmero (a chave real fica no servidor)
// ---------------------------------------------------------------------------
app.post(
  '/api/live/token',
  wrap(async (req, res) => {
    const modelo = await resolveModel('live');
    const agora = Date.now();
    let token;
    try {
      token = await ai().authTokens.create({
        config: {
          uses: 1,
          expireTime: new Date(agora + 30 * 60 * 1000).toISOString(),
          newSessionExpireTime: new Date(agora + 2 * 60 * 1000).toISOString(),
          liveConnectConstraints: { model: modelo, config: { responseModalities: [Modality.AUDIO] } },
          lockAdditionalFields: [],
          httpOptions: { apiVersion: 'v1alpha' },
        },
      });
    } catch (e) {
      throw toAppError(e, 'criar o acesso temporário do tutor por voz');
    }
    res.json({
      token: token.name,
      modelo,
      expiraEm: new Date(agora + 30 * 60 * 1000).toISOString(),
      // Somente nos testes automatizados (servidor Gemini simulado):
      ...(process.env.GEMINI_TEST_BASE_URL ? { testBaseUrl: process.env.GEMINI_TEST_BASE_URL } : {}),
    });
  })
);

// ---------------------------------------------------------------------------
// Situação e diagnóstico
// ---------------------------------------------------------------------------
app.get(
  '/api/status',
  wrap(async (req, res) => {
    const out = { chaveConfigurada: hasKey() };
    if (req.query.verificar && hasKey()) {
      await listModels(true).catch(() => {});
      out.modelos = await modelStatus();
    }
    res.json(out);
  })
);

app.get(
  '/api/samples',
  wrap(async (_req, res) => {
    const dir = path.join(ROOT, 'samples');
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : [];
    res.json(
      files.map((f) => {
        const texto = fs.readFileSync(path.join(dir, f), 'utf8');
        const titulo = (texto.match(/^#\s+(.+)$/m) || [])[1] || f;
        return { id: f.replace(/\.md$/, ''), titulo, texto };
      })
    );
  })
);

// Erros do envio de arquivos (ex.: arquivo grande demais)
app.use('/api', (err, _req, res, next) => {
  if (err?.code === 'LIMIT_FILE_SIZE')
    return res.status(413).json({
      erro: { tipo: 'tamanho', mensagem: `O arquivo é grande demais (limite de ${LIMITE_MIDIA_MB} MB).`, comoResolver: 'Envie um arquivo menor, ou corte o áudio/vídeo só na parte da matéria.' },
    });
  if (err) return res.status(400).json({ erro: { tipo: 'formato', mensagem: 'Não foi possível receber o arquivo.', detalhe: String(err.message || err) } });
  next();
});

app.use('/api', (_req, res) => res.status(404).json({ erro: { tipo: 'rota', mensagem: 'Rota não encontrada.' } }));

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------
if (isProd) {
  const dist = path.join(ROOT, 'dist');
  app.use(express.static(dist));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}

const server = app.listen(PORT, HOST, async () => {
  const url = `http://${HOST === '0.0.0.0' || HOST === '127.0.0.1' ? 'localhost' : HOST}:${PORT}`;
  console.log(`\nMinha sala de aula: ${url}`);
  if (!NA_NUVEM) console.log('Deixe esta janela aberta enquanto o Luan estuda. Para desligar, feche a janela.');
  if (abrirNavegador) {
    const { exec } = await import('node:child_process');
    const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
    exec(cmd, () => {});
  }
  if (!hasKey()) console.log('ATENÇÃO: GEMINI_API_KEY não definida. Crie o arquivo .env (veja .env.example).');
  if (semProtecao) console.log('ATENÇÃO: o servidor está visível na rede sem APP_PASSWORD. As funções foram bloqueadas até você definir uma senha.');
  else if (exigeLogin) console.log('Acesso protegido por senha (APP_PASSWORD).');
});
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`\nA porta ${PORT} já está em uso: a sala de aula provavelmente já está aberta em outra janela. Feche a outra janela ou abra http://localhost:${PORT} no navegador.`);
  else console.error(e);
  process.exitCode = 1;
});
