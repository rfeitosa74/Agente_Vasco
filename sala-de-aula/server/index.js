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
  comRetentativas,
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
import * as S from './store.js';
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
// Usuários e sessões
// ---------------------------------------------------------------------------
const COOKIE = 'sala_sessao';
const DURACAO_SESSAO = 30 * 24 * 60 * 60 * 1000; // 30 dias
const SEGREDO_SESSAO = S.segredoSessao();
const ADMIN_USUARIO = process.env.ADMIN_USER || 'admin';

// Na internet, o primeiro administrador vem da senha APP_PASSWORD (definida no Render).
if (S.contarUsuarios() === 0 && SENHA) {
  S.criarUsuario({ usuario: ADMIN_USUARIO, nome: 'Administrador', senha: SENHA, admin: true });
  console.log(`Administrador criado: usuário "${ADMIN_USUARIO}" com a senha de APP_PASSWORD.`);
}
// Esqueceu a senha? Com REDEFINIR_ADMIN=sim, o usuário admin volta a usar a senha de
// APP_PASSWORD (e volta a ser administrador). Depois, apague REDEFINIR_ADMIN.
if (/^(sim|1|true)$/i.test(process.env.REDEFINIR_ADMIN || '') && SENHA) {
  const existente = S.listarUsuarios().find((u) => u.usuario === S.normalizarUsuario(ADMIN_USUARIO));
  if (existente) S.alterarUsuario(existente.id, { senha: SENHA, admin: true });
  else S.criarUsuario({ usuario: ADMIN_USUARIO, nome: 'Administrador', senha: SENHA, admin: true });
  console.log(`Senha do usuário "${ADMIN_USUARIO}" redefinida para a de APP_PASSWORD. Apague REDEFINIR_ADMIN no Render.`);
}

function assinar(uid, exp, versao) {
  return crypto.createHmac('sha256', SEGREDO_SESSAO).update(`${uid}.${exp}.${versao}`).digest('base64url');
}
function lerCookie(req) {
  for (const p of String(req.headers.cookie || '').split(';')) {
    const i = p.indexOf('=');
    if (i > 0 && p.slice(0, i).trim() === COOKIE) return p.slice(i + 1).trim();
  }
  return '';
}
function usuarioDaSessao(req) {
  const [uid, exp, sig] = lerCookie(req).split('.');
  if (!uid || !exp || !sig || Number(exp) < Date.now()) return null;
  const u = S.buscarUsuario(uid);
  if (!u) return null;
  const esperado = Buffer.from(assinar(uid, exp, u.versaoSenha || 1));
  const recebido = Buffer.from(sig);
  return esperado.length === recebido.length && crypto.timingSafeEqual(esperado, recebido) ? u : null;
}
function abrirSessao(req, res, u) {
  const exp = Date.now() + DURACAO_SESSAO;
  res.cookie(COOKIE, `${u.id}.${exp}.${assinar(u.id, exp, u.versaoSenha || 1)}`, { httpOnly: true, secure: req.secure, sameSite: 'strict', maxAge: DURACAO_SESSAO, path: '/' });
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
const erroJson = (res, status, tipo, mensagem, comoResolver = '') => res.status(status).json({ erro: { tipo, mensagem, comoResolver } });

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/session', (req, res) => {
  const vazio = S.contarUsuarios() === 0;
  const u = vazio ? null : usuarioDaSessao(req);
  res.json({
    logado: !!u,
    usuario: S.publico(u),
    precisaConfigurar: vazio && SO_LOCAL,
    configuracaoPendente: vazio && !SO_LOCAL,
    // Só o administrador vê o aviso sobre onde os dados estão guardados.
    ...(u?.admin ? { armazenamento: S.situacaoArmazenamento() } : {}),
  });
});

// Primeiro acesso no computador local: cria o administrador.
app.post('/api/setup', (req, res) => {
  if (!SO_LOCAL) return erroJson(res, 403, 'acesso', 'Na internet, o administrador é criado pela senha APP_PASSWORD do servidor.');
  if (S.contarUsuarios() > 0) return erroJson(res, 403, 'acesso', 'A configuração inicial já foi feita.');
  try {
    const u = S.criarUsuario({ usuario: req.body?.usuario, nome: req.body?.nome, senha: req.body?.senha, admin: true });
    abrirSessao(req, res, S.buscarUsuario(u.id));
    res.json({ ok: true, usuario: u });
  } catch (e) {
    erroJson(res, e.status || 400, 'formato', e.message);
  }
});

app.post('/api/login', (req, res) => {
  const ip = req.ip || 'desconhecido';
  if (bloqueado(ip)) return erroJson(res, 429, 'acesso', 'Muitas tentativas erradas.', 'Espere 15 minutos e tente de novo.');
  const u = S.verificarLogin(req.body?.usuario, req.body?.senha || '');
  if (!u) {
    registrarErro(ip);
    return erroJson(res, 401, 'acesso', 'Usuário ou senha incorretos.');
  }
  tentativas.delete(ip);
  abrirSessao(req, res, u);
  res.json({ ok: true, usuario: S.publico(u) });
});

app.post('/api/logout', (_req, res) => {
  res.clearCookie(COOKIE, { path: '/' });
  res.json({ ok: true });
});

app.use('/api', (req, res, next) => {
  if (S.contarUsuarios() === 0)
    return SO_LOCAL
      ? erroJson(res, 401, 'login', 'Crie a conta de administrador para começar.')
      : erroJson(res, 503, 'configuracao', 'O site está na internet sem senha de administrador, por isso foi bloqueado.', 'Defina APP_PASSWORD nas configurações do servidor (no Render: Environment) e reinicie.');
  const u = usuarioDaSessao(req);
  if (!u) return erroJson(res, 401, 'login', 'Entre com seu usuário e senha para continuar.');
  req.usuario = u;
  next();
});

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    if (e?.paraUsuario) return erroJson(res, e.status || 400, e.status === 404 ? 'nao_encontrado' : e.status === 403 ? 'acesso' : 'formato', e.message);
    const ae = toAppError(e);
    if (!(e instanceof AppError)) console.error('[erro]', e);
    else console.warn(`[${ae.tipo}] ${ae.message}${ae.detalhe ? ` — ${ae.detalhe.slice(0, 200)}` : ''}`);
    res.status(ae.status || 500).json({ erro: publicError(ae) });
  }
};
function exigirAdmin(req) {
  if (!req.usuario.admin) throw Object.assign(new Error('Só o administrador pode fazer isso.'), { status: 403, paraUsuario: true });
}

// --- minha conta
app.put(
  '/api/conta/senha',
  wrap(async (req, res) => {
    if (!S.verificarLogin(req.usuario.usuario, req.body?.atual || ''))
      throw Object.assign(new Error('A senha atual não confere.'), { status: 400, paraUsuario: true });
    S.alterarUsuario(req.usuario.id, { senha: req.body?.nova });
    abrirSessao(req, res, S.buscarUsuario(req.usuario.id)); // as outras sessões são encerradas
    res.json({ ok: true });
  })
);

// --- usuários (somente administrador)
app.get('/api/usuarios', wrap(async (req, res) => (exigirAdmin(req), res.json(S.listarUsuarios().map((u) => ({ ...u, totalSalas: S.listarSalas(u.id).length }))))));
app.post('/api/usuarios', wrap(async (req, res) => (exigirAdmin(req), res.json(S.criarUsuario(req.body || {})))));
app.patch(
  '/api/usuarios/:id',
  wrap(async (req, res) => {
    exigirAdmin(req);
    const { nome, senha, admin } = req.body || {};
    if (req.params.id === req.usuario.id && admin === false) throw Object.assign(new Error('Você não pode tirar o seu próprio acesso de administrador.'), { status: 400, paraUsuario: true });
    res.json(S.alterarUsuario(req.params.id, { nome, senha: senha || undefined, admin }));
  })
);
app.delete(
  '/api/usuarios/:id',
  wrap(async (req, res) => {
    exigirAdmin(req);
    if (req.params.id === req.usuario.id) throw Object.assign(new Error('Você não pode remover a sua própria conta.'), { status: 400, paraUsuario: true });
    S.removerUsuario(req.params.id);
    res.json({ ok: true });
  })
);

// --- salas do usuário
app.get('/api/salas', wrap(async (req, res) => res.json(S.listarSalas(req.usuario.id))));
app.post('/api/salas', wrap(async (req, res) => res.json(S.criarSala(req.usuario.id, req.body || {}))));
app.get('/api/salas/:sid', wrap(async (req, res) => res.json(S.lerSala(req.usuario.id, req.params.sid))));
app.patch('/api/salas/:sid', wrap(async (req, res) => res.json(S.alterarSala(req.usuario.id, req.params.sid, req.body || {}))));
app.delete('/api/salas/:sid', wrap(async (req, res) => (S.removerSala(req.usuario.id, req.params.sid), res.json({ ok: true }))));

// ---------------------------------------------------------------------------
// Materiais (guardados no disco, dentro de cada sala)
// ---------------------------------------------------------------------------
const DESCRICAO_MIDIA = { imagem: 'uma imagem (por exemplo, foto do caderno ou do livro)', audio: 'um áudio (por exemplo, uma aula gravada)', video: 'um vídeo (por exemplo, uma videoaula)' };
const VALIDADE_ARQUIVO_GEMINI = 40 * 60 * 60 * 1000; // a API guarda por 48 h; renovamos antes
const usaApiDeArquivos = (meta) => meta.tipo === 'midia' && (meta.midia === 'video' || (meta.tamanho || 0) > 15 * 1024 * 1024);

const docId = (sid, mid) => `${sid}:${mid}`;
function partesDoc(id) {
  const [sid, mid] = String(id || '').split(':');
  if (!sid || !mid) throw new AppError('documento_expirado', 'Material não informado.', 'Volte à sala e abra o material de novo.', '', 410);
  return { sid, mid };
}

// Guarda na memória os arquivos usados por último, para não ler o disco a cada pedido.
const cacheBase64 = new Map();
function base64DoArquivo(uid, sid, mid) {
  const chave = `${uid}:${sid}:${mid}`;
  if (cacheBase64.has(chave)) {
    const v = cacheBase64.get(chave);
    cacheBase64.delete(chave);
    cacheBase64.set(chave, v);
    return v;
  }
  const v = fs.readFileSync(S.arqOriginal(uid, sid, mid)).toString('base64');
  cacheBase64.set(chave, v);
  while (cacheBase64.size > 6) cacheBase64.delete(cacheBase64.keys().next().value);
  return v;
}

async function getDoc(req, id) {
  const { sid, mid } = partesDoc(id);
  const uid = req.usuario.id;
  let m;
  try {
    m = S.lerMaterial(uid, sid, mid).meta;
  } catch {
    throw new AppError('documento_expirado', 'Este material não foi encontrado na sua sala.', 'Volte à sala e abra o material de novo.', '', 410);
  }
  const doc = { tipo: m.tipo, nome: m.nome, numPaginas: m.numPaginas || 0, midia: m.midia, mime: m.mime, duracao: m.duracao || 0, texto: m.texto, uid, sid, mid };
  if (m.tipo === 'pdf') doc.base64 = base64DoArquivo(uid, sid, mid);
  if (m.tipo === 'midia') {
    if (usaApiDeArquivos(m)) {
      if (!m.fileUri || Date.now() - (m.fileUriEm || 0) > VALIDADE_ARQUIVO_GEMINI) {
        const f = await enviarArquivo(fs.readFileSync(S.arqOriginal(uid, sid, mid)), m.mime, m.nome);
        S.alterarMeta(uid, sid, mid, { fileUri: f.uri, fileUriEm: Date.now() });
        doc.fileUri = f.uri;
      } else doc.fileUri = m.fileUri;
    } else doc.base64 = base64DoArquivo(uid, sid, mid);
  }
  return doc;
}

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
  '/api/salas/:sid/materiais',
  upload.single('arquivo'),
  wrap(async (req, res) => {
    const uid = req.usuario.id;
    const sid = req.params.sid;
    S.lerSala(uid, sid);
    let meta;
    let conteudo;
    const midia = req.file ? tipoDeMidia(req.file.mimetype, req.file.originalname) : null;
    const exemplo = req.body.exemplo === '1';
    const origem = String(req.body.origem || '').slice(0, 40);
    if (req.file && midia) {
      meta = { tipo: 'midia', midia: midia.tipo, mime: midia.mime, nome: req.body.nome || req.file.originalname, duracao: Number(req.body.duracao) || 0, tamanho: req.file.size };
      conteudo = req.file.buffer;
      // Vídeos e arquivos grandes vão já para a API de arquivos (os erros aparecem agora).
      if (usaApiDeArquivos(meta)) {
        const f = await enviarArquivo(req.file.buffer, midia.mime, meta.nome);
        Object.assign(meta, { fileUri: f.uri, fileUriEm: Date.now() });
      }
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
      meta = { tipo: 'pdf', mime: 'application/pdf', nome: req.body.nome || req.file.originalname, numPaginas: Number(req.body.numPaginas) || 0, tamanho: req.file.size };
      conteudo = req.file.buffer;
    } else {
      const texto = String(req.body.texto || '').trim();
      if (texto.length < 40) throw new AppError('formato', 'O texto colado é curto demais para preparar uma aula.', 'Cole as anotações completas da matéria.', '', 400);
      meta = { tipo: 'texto', nome: String(req.body.nome || 'Minhas anotações').slice(0, 120) };
      conteudo = texto.slice(0, 200000);
    }
    Object.assign(meta, { exemplo, origem });
    const m = S.criarMaterial(uid, sid, meta, conteudo);
    res.json({ materialId: m.id, docId: docId(sid, m.id) });
  })
);

app.get(
  '/api/salas/:sid/materiais/:mid',
  wrap(async (req, res) => {
    const m = S.lerMaterial(req.usuario.id, req.params.sid, req.params.mid);
    const { fileUri, fileUriEm, ...meta } = m.meta;
    res.json({ meta, analise: m.analise, estado: m.estado, docId: docId(req.params.sid, req.params.mid) });
  })
);

app.get(
  '/api/salas/:sid/materiais/:mid/arquivo',
  wrap(async (req, res) => {
    const m = S.lerMaterial(req.usuario.id, req.params.sid, req.params.mid);
    if (m.meta.tipo === 'texto') throw Object.assign(new Error('Este material não tem arquivo.'), { status: 404, paraUsuario: true });
    res.type(m.meta.mime || 'application/octet-stream');
    res.sendFile(S.arqOriginal(req.usuario.id, req.params.sid, req.params.mid));
  })
);

app.put(
  '/api/salas/:sid/materiais/:mid/estado',
  wrap(async (req, res) => {
    S.salvarEstado(req.usuario.id, req.params.sid, req.params.mid, req.body?.estado || null);
    res.json({ ok: true });
  })
);

app.delete(
  '/api/salas/:sid/materiais/:mid',
  wrap(async (req, res) => {
    S.removerMaterial(req.usuario.id, req.params.sid, req.params.mid);
    for (const k of [...cacheBase64.keys()]) if (k.endsWith(`:${req.params.mid}`)) cacheBase64.delete(k);
    res.json({ ok: true });
  })
);

app.get(
  '/api/salas/:sid/materiais/:mid/imagens/:iid',
  wrap(async (req, res) => res.json(S.lerImagem(req.usuario.id, req.params.sid, req.params.mid, req.params.iid)))
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
    const doc = await getDoc(req, req.body.docId);
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
    const analise = {
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
      };
    S.salvarAnalise(doc.uid, doc.sid, doc.mid, analise);
    res.json({ analise, modelo });
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
    const doc = await getDoc(req, req.body.docId);
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
    const doc = await getDoc(req, req.body.docId);
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
    const doc = await getDoc(req, req.body.docId);
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
    const doc = await getDoc(req, req.body.docId);
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
    const doc = await getDoc(req, req.body.docId);
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

// Guarda o infográfico na sala, para ele continuar disponível depois.
async function guardarImagem(req, img) {
  if (!req.body?.docId) return img;
  try {
    const doc = await getDoc(req, req.body.docId);
    return { ...img, imagemId: S.salvarImagem(doc.uid, doc.sid, doc.mid, img) };
  } catch (e) {
    console.warn('Não foi possível guardar o infográfico:', e.message);
    return img;
  }
}

app.post(
  '/api/infographic/generate',
  wrap(async (req, res) => {
    const d = req.body.direcao;
    if (!d?.titulo) throw new AppError('formato', 'Direção visual ausente.', '', '', 400);
    const img = await generateImage({ parts: [{ text: P.imagemPrompt(d) }] });
    res.json(await guardarImagem(req, img));
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
    res.json(await guardarImagem(req, img));
  })
);

app.post(
  '/api/infographic/review',
  wrap(async (req, res) => {
    const doc = await getDoc(req, req.body.docId);
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
      token = await comRetentativas(() => ai().authTokens.create({
        config: {
          uses: 1,
          expireTime: new Date(agora + 30 * 60 * 1000).toISOString(),
          newSessionExpireTime: new Date(agora + 2 * 60 * 1000).toISOString(),
          liveConnectConstraints: { model: modelo, config: { responseModalities: [Modality.AUDIO] } },
          lockAdditionalFields: [],
          httpOptions: { apiVersion: 'v1alpha' },
        },
      }));
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
  console.log(`Dados guardados em: ${S.DATA_DIR}`);
  if (!S.situacaoArmazenamento().persistente)
    console.log('ATENÇÃO: a pasta de dados NÃO está num disco permanente. Usuários, salas e materiais serão apagados a cada reinício. No Render, adicione um disco em /var/data (plano Starter) e defina DATA_DIR=/var/data.');
  if (S.contarUsuarios() === 0)
    console.log(SO_LOCAL ? 'Primeiro acesso: abra o endereço acima e crie a conta de administrador.' : 'ATENÇÃO: sem usuários e sem APP_PASSWORD. O site fica bloqueado até você definir APP_PASSWORD.');
});
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`\nA porta ${PORT} já está em uso: a sala de aula provavelmente já está aberta em outra janela. Feche a outra janela ou abra http://localhost:${PORT} no navegador.`);
  else console.error(e);
  process.exitCode = 1;
});
