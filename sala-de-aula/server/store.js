// Armazenamento em disco: usuários, salas, materiais e o progresso de cada aula.
// Estrutura em DATA_DIR (no Render, um disco persistente):
//   usuarios.json
//   segredo.txt                           (assinatura das sessões)
//   salas/<usuarioId>/<salaId>/sala.json  (dados da sala e lista de materiais)
//   salas/<usuarioId>/<salaId>/materiais/<materialId>.json  (análise e estado da aula)
//   salas/<usuarioId>/<salaId>/materiais/<materialId>.arquivo (arquivo original)
//   salas/<usuarioId>/<salaId>/materiais/<materialId>-img-<id>.<ext> (infográficos)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarEspelho } from './espelho.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'dados'));
fs.mkdirSync(path.join(DATA_DIR, 'salas'), { recursive: true });

// ---------------------------------------------------------------------------
// Espelho permanente (Replit Object Storage): ver espelho.js
// ---------------------------------------------------------------------------
let espelho = null;
export async function iniciarArmazenamento() {
  espelho = await criarEspelho(DATA_DIR);
  if (!espelho || espelho.ativo === false) {
    if (espelho?.erro) console.error('[armazenamento]', espelho.erro);
    return;
  }
  try {
    await espelho.testar();
    const n = await espelho.restaurar();
    console.log(`[armazenamento] ${espelho.estado.destino}: ${n} arquivo(s) de dados restaurado(s).`);
  } catch (e) {
    espelho.estado.erro = e.message;
    console.error('[armazenamento] o armazenamento permanente não está funcionando:', e.message);
  }
}
const espelhar = (abs) => espelho?.enviar?.(abs);
const apagarEspelho = (abs) => espelho?.apagar?.(abs);
/** Espera as cópias para o armazenamento permanente terminarem. */
export async function aguardarEspelho() {
  await espelho?.aguardar?.();
}
/** Garante que um arquivo grande (original, infográfico) esteja na pasta local. */
export async function garantirArquivo(abs) {
  if (fs.existsSync(abs)) return true;
  return espelho?.garantir ? espelho.garantir(abs) : false;
}

const ID_OK = /^[a-zA-Z0-9-]{8,64}$/;
export const novoId = () => crypto.randomUUID();
function checarId(id) {
  if (!ID_OK.test(String(id || ''))) throw Object.assign(new Error('id inválido'), { status: 404, paraUsuario: true });
  return String(id);
}

function lerJson(arquivo, padrao) {
  try {
    return JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  } catch {
    return padrao;
  }
}
/** Gravação atômica: escreve num arquivo temporário e renomeia. */
function gravarJson(arquivo, dados) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  const tmp = `${arquivo}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(dados));
  fs.renameSync(tmp, arquivo);
  espelhar(arquivo);
}

// ---------------------------------------------------------------------------
// Segredo das sessões
// ---------------------------------------------------------------------------
export function segredoSessao() {
  if (process.env.SESSION_SECRET) return Buffer.from(process.env.SESSION_SECRET);
  const arq = path.join(DATA_DIR, 'segredo.txt');
  if (!fs.existsSync(arq)) {
    fs.writeFileSync(arq, crypto.randomBytes(48).toString('base64'), { mode: 0o600 });
    espelhar(arq);
  }
  return Buffer.from(fs.readFileSync(arq, 'utf8').trim());
}

// ---------------------------------------------------------------------------
// Usuários
// ---------------------------------------------------------------------------
const ARQ_USUARIOS = path.join(DATA_DIR, 'usuarios.json');
const lerUsuarios = () => lerJson(ARQ_USUARIOS, []);
const gravarUsuarios = (u) => gravarJson(ARQ_USUARIOS, u);

function hashSenha(senha, sal = crypto.randomBytes(16).toString('hex')) {
  return { sal, hash: crypto.scryptSync(String(senha), sal, 64).toString('hex') };
}
export const publico = (u) => u && { id: u.id, usuario: u.usuario, nome: u.nome, admin: !!u.admin, criadoEm: u.criadoEm };
export const normalizarUsuario = (s) => String(s || '').trim().toLowerCase();

export function contarUsuarios() {
  return lerUsuarios().length;
}
export function listarUsuarios() {
  return lerUsuarios().map(publico);
}
export function buscarUsuario(id) {
  return lerUsuarios().find((u) => u.id === id) || null;
}

export function validarNovaSenha(senha) {
  if (String(senha || '').length < 6) throw Object.assign(new Error('A senha precisa ter pelo menos 6 caracteres.'), { status: 400, paraUsuario: true });
}

export function criarUsuario({ usuario, nome, senha, admin = false }) {
  const u = normalizarUsuario(usuario);
  if (!/^[a-z0-9._-]{3,32}$/.test(u))
    throw Object.assign(new Error('O usuário deve ter de 3 a 32 letras minúsculas, números, ponto, hífen ou sublinhado (sem espaços nem acentos).'), { status: 400, paraUsuario: true });
  validarNovaSenha(senha);
  const todos = lerUsuarios();
  if (todos.some((x) => x.usuario === u)) throw Object.assign(new Error('Já existe um usuário com esse nome.'), { status: 409, paraUsuario: true });
  const novo = { id: novoId(), usuario: u, nome: String(nome || u).trim().slice(0, 60) || u, admin: !!admin, ...hashSenha(senha), versaoSenha: 1, criadoEm: new Date().toISOString() };
  gravarUsuarios([...todos, novo]);
  return publico(novo);
}

export function verificarLogin(usuario, senha) {
  const u = lerUsuarios().find((x) => x.usuario === normalizarUsuario(usuario));
  // Mesmo trabalho com ou sem usuário, para não revelar quais existem.
  const { hash } = hashSenha(senha, u ? u.sal : 'sal-inexistente');
  if (!u) return null;
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(u.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? u : null;
}

export function alterarUsuario(id, { nome, senha, admin }) {
  const todos = lerUsuarios();
  const u = todos.find((x) => x.id === id);
  if (!u) throw Object.assign(new Error('Usuário não encontrado.'), { status: 404, paraUsuario: true });
  if (nome != null) u.nome = String(nome).trim().slice(0, 60) || u.nome;
  if (senha != null) {
    validarNovaSenha(senha);
    Object.assign(u, hashSenha(senha));
    u.versaoSenha = (u.versaoSenha || 1) + 1; // encerra as sessões abertas
  }
  if (admin != null) {
    if (!admin && u.admin && todos.filter((x) => x.admin).length === 1)
      throw Object.assign(new Error('É preciso manter pelo menos um administrador.'), { status: 400, paraUsuario: true });
    u.admin = !!admin;
  }
  gravarUsuarios(todos);
  return publico(u);
}

export function removerUsuario(id) {
  const todos = lerUsuarios();
  const u = todos.find((x) => x.id === id);
  if (!u) throw Object.assign(new Error('Usuário não encontrado.'), { status: 404, paraUsuario: true });
  if (u.admin && todos.filter((x) => x.admin).length === 1) throw Object.assign(new Error('Não é possível remover o único administrador.'), { status: 400, paraUsuario: true });
  gravarUsuarios(todos.filter((x) => x.id !== id));
  fs.rmSync(path.join(DATA_DIR, 'salas', checarId(id)), { recursive: true, force: true });
  apagarEspelho(path.join(DATA_DIR, 'salas', checarId(id)));
}

// ---------------------------------------------------------------------------
// Salas
// ---------------------------------------------------------------------------
const dirSala = (uid, sid) => path.join(DATA_DIR, 'salas', checarId(uid), checarId(sid));
const arqSala = (uid, sid) => path.join(dirSala(uid, sid), 'sala.json');
const dirMateriais = (uid, sid) => path.join(dirSala(uid, sid), 'materiais');

export function listarSalas(uid) {
  const base = path.join(DATA_DIR, 'salas', checarId(uid));
  if (!fs.existsSync(base)) return [];
  return fs
    .readdirSync(base)
    .filter((d) => ID_OK.test(d))
    .map((d) => lerJson(path.join(base, d, 'sala.json'), null))
    .filter(Boolean)
    .map(({ materiais = [], ...s }) => ({ ...s, totalMateriais: materiais.length }))
    .sort((a, b) => String(b.atualizadaEm).localeCompare(String(a.atualizadaEm)));
}

export function lerSala(uid, sid) {
  const s = lerJson(arqSala(uid, sid), null);
  if (!s) throw Object.assign(new Error('Sala não encontrada.'), { status: 404, paraUsuario: true });
  return s;
}

const TIPOS_SALA = ['disciplina', 'curso', 'modulo', 'outro'];
function dadosSala(d, atual = {}) {
  const nome = String(d.nome ?? atual.nome ?? '').trim().slice(0, 80);
  if (!nome) throw Object.assign(new Error('Dê um nome para a sala.'), { status: 400, paraUsuario: true });
  return {
    nome,
    tipo: TIPOS_SALA.includes(d.tipo) ? d.tipo : atual.tipo || 'disciplina',
    descricao: String(d.descricao ?? atual.descricao ?? '').trim().slice(0, 300),
  };
}

export function criarSala(uid, d) {
  const agora = new Date().toISOString();
  const sala = { id: novoId(), ...dadosSala(d), criadaEm: agora, atualizadaEm: agora, materiais: [] };
  gravarJson(arqSala(uid, sala.id), sala);
  return sala;
}

export function alterarSala(uid, sid, d) {
  const s = lerSala(uid, sid);
  Object.assign(s, dadosSala(d, s), { atualizadaEm: new Date().toISOString() });
  gravarJson(arqSala(uid, sid), s);
  return s;
}

export function removerSala(uid, sid) {
  lerSala(uid, sid);
  fs.rmSync(dirSala(uid, sid), { recursive: true, force: true });
  apagarEspelho(dirSala(uid, sid));
}

function tocarSala(uid, sid, mudar) {
  const s = lerSala(uid, sid);
  mudar(s);
  s.atualizadaEm = new Date().toISOString();
  gravarJson(arqSala(uid, sid), s);
  return s;
}

// ---------------------------------------------------------------------------
// Materiais
// ---------------------------------------------------------------------------
const arqMaterial = (uid, sid, mid) => path.join(dirMateriais(uid, sid), `${checarId(mid)}.json`);
export const arqOriginal = (uid, sid, mid) => path.join(dirMateriais(uid, sid), `${checarId(mid)}.arquivo`);

/** Cria um material na sala. `meta` descreve o material; `conteudo` é o arquivo (Buffer) ou o texto. */
export function criarMaterial(uid, sid, meta, conteudo) {
  lerSala(uid, sid);
  const id = novoId();
  const agora = new Date().toISOString();
  const m = { ...meta, id, criadoEm: agora, atualizadoEm: agora };
  fs.mkdirSync(dirMateriais(uid, sid), { recursive: true });
  if (Buffer.isBuffer(conteudo)) {
    fs.writeFileSync(arqOriginal(uid, sid, id), conteudo);
    espelhar(arqOriginal(uid, sid, id));
  }
  else m.texto = String(conteudo || '');
  gravarJson(arqMaterial(uid, sid, id), { meta: m, analise: null, estado: null });
  tocarSala(uid, sid, (s) => s.materiais.push(resumoMaterial(m, null)));
  return m;
}

function resumoMaterial(meta, analise) {
  return {
    id: meta.id,
    nome: meta.nome,
    tipo: meta.tipo,
    midia: meta.midia || '',
    origem: meta.origem || '',
    exemplo: !!meta.exemplo,
    titulo: analise?.titulo || '',
    totalConceitos: analise?.conceitos?.length || 0,
    criadoEm: meta.criadoEm,
    atualizadoEm: meta.atualizadoEm,
  };
}

export function lerMaterial(uid, sid, mid) {
  const m = lerJson(arqMaterial(uid, sid, mid), null);
  if (!m) throw Object.assign(new Error('Material não encontrado.'), { status: 404, paraUsuario: true });
  return m;
}

function gravarMaterial(uid, sid, mid, m) {
  m.meta.atualizadoEm = new Date().toISOString();
  gravarJson(arqMaterial(uid, sid, mid), m);
  tocarSala(uid, sid, (s) => {
    const i = s.materiais.findIndex((x) => x.id === mid);
    if (i >= 0) s.materiais[i] = resumoMaterial(m.meta, m.analise);
  });
}

export function salvarAnalise(uid, sid, mid, analise) {
  const m = lerMaterial(uid, sid, mid);
  m.analise = analise;
  m.estado = null; // nova análise: o progresso anterior não vale mais
  gravarMaterial(uid, sid, mid, m);
}

export function salvarEstado(uid, sid, mid, estado) {
  const m = lerMaterial(uid, sid, mid);
  m.estado = estado;
  gravarMaterial(uid, sid, mid, m);
}

export function alterarMeta(uid, sid, mid, mudancas) {
  const m = lerMaterial(uid, sid, mid);
  Object.assign(m.meta, mudancas);
  gravarJson(arqMaterial(uid, sid, mid), m);
}

export function removerMaterial(uid, sid, mid) {
  lerMaterial(uid, sid, mid);
  const dir = dirMateriais(uid, sid);
  for (const f of fs.readdirSync(dir)) if (f.startsWith(mid)) fs.rmSync(path.join(dir, f), { force: true });
  apagarEspelho(path.join(dir, mid));
  tocarSala(uid, sid, (s) => (s.materiais = s.materiais.filter((x) => x.id !== mid)));
}

// Infográficos (imagens grandes ficam em arquivos próprios)
export function salvarImagem(uid, sid, mid, { mimeType, data }) {
  lerMaterial(uid, sid, mid);
  const id = novoId();
  const ext = mimeType.includes('svg') ? 'svg' : mimeType.includes('jpeg') ? 'jpg' : mimeType.includes('webp') ? 'webp' : 'png';
  const arq = path.join(dirMateriais(uid, sid), `${mid}-img-${id}.${ext}`);
  fs.writeFileSync(arq, Buffer.from(data, 'base64'));
  espelhar(arq);
  return id;
}
export async function lerImagem(uid, sid, mid, iid) {
  const dir = dirMateriais(uid, sid);
  const prefixo = `${checarId(mid)}-img-${checarId(iid)}.`;
  let f = fs.existsSync(dir) ? fs.readdirSync(dir).find((x) => x.startsWith(prefixo)) : null;
  if (!f && espelho?.procurar) {
    // Máquina nova: busca a imagem no armazenamento permanente
    const [remoto] = await espelho.procurar(path.join(dir, prefixo));
    if (remoto && (await espelho.garantir(remoto))) f = path.basename(remoto);
  }
  if (!f) throw Object.assign(new Error('Imagem não encontrada.'), { status: 404, paraUsuario: true });
  const ext = f.split('.').pop();
  const mimeType = { svg: 'image/svg+xml', jpg: 'image/jpeg', webp: 'image/webp', png: 'image/png' }[ext] || 'image/png';
  return { mimeType, data: fs.readFileSync(path.join(dir, f)).toString('base64') };
}

/**
 * Os dados estão num lugar permanente? No Render, só um disco montado à parte
 * (ex.: /var/data) sobrevive a reinícios; o resto do sistema de arquivos é apagado.
 * Detecta comparando o dispositivo da pasta de dados com o da raiz do sistema.
 */
export function situacaoArmazenamento() {
  const pasta = DATA_DIR;
  if (espelho || process.env.REPL_ID || process.env.REPLIT_DEPLOYMENT) {
    const motivo = !espelho ? 'ARMAZENAMENTO=local' : espelho.ativo === false ? espelho.erro : espelho.estado?.erro || '';
    return { persistente: !motivo, pasta, verificado: true, plataforma: process.env.REPL_ID || process.env.REPLIT_DEPLOYMENT ? 'replit' : 'espelho', onde: espelho?.estado?.destino || '', motivo };
  }
  if (!process.env.RENDER) return { persistente: true, pasta, verificado: false };
  try {
    const persistente = fs.statSync(pasta).dev !== fs.statSync('/').dev;
    return { persistente, pasta, verificado: true, plataforma: 'render' };
  } catch {
    return { persistente: false, pasta, verificado: true, plataforma: 'render' };
  }
}
