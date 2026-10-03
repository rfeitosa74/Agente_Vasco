// Anexos das tarefas (fotos de apostila/livro/caderno, páginas de PDF): guardados no aparelho em IndexedDB.
// Também: compressão de fotos, PDF → imagens (+ texto do PDF) e leitura de texto de imagens (OCR) — tudo local,
// com as bibliotecas de /vendor (funciona offline e nada é enviado a terceiros).
import { uid } from './core/rng.js';

const DB = 'missao6-anexos';
const VERSAO_DB = 2;
let dbPromessa = null;

function abrirDb() {
  dbPromessa ||= new Promise((res, rej) => {
    const r = indexedDB.open(DB, VERSAO_DB);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('anexos')) db.createObjectStore('anexos', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('compartilhado')) db.createObjectStore('compartilhado', { keyPath: 'id' }); // usado pelo service worker (compartilhar do WhatsApp)
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbPromessa;
}

const pedido = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
async function loja(nome, modo = 'readonly') { const db = await abrirDb(); return db.transaction(nome, modo).objectStore(nome); }

// ---------- CRUD ----------
export async function salvarBlob(blob, { nome = '', w = 0, h = 0, id = uid(), sync = false } = {}) {
  await pedido((await loja('anexos', 'readwrite')).put({ id, blob, tipo: blob.type, nome, w, h, tamanho: blob.size, criado: Date.now(), sync }));
  return id;
}
export async function obterRegistro(id) { return pedido((await loja('anexos')).get(id)); }
export async function obterBlob(id) { return (await obterRegistro(id))?.blob || null; }
export async function existe(id) { return !!(await pedido((await loja('anexos')).getKey(id))); }
export async function listar() {
  const todos = await pedido((await loja('anexos')).getAll());
  return todos.map(({ id, tipo, tamanho, sync, criado, nome }) => ({ id, tipo, tamanho, sync, criado, nome }));
}
export async function marcarSync(id, v = true) {
  const s = await loja('anexos', 'readwrite');
  const r = await pedido(s.get(id));
  if (r) { r.sync = v; await pedido(s.put(r)); }
}
const urls = new Map();
export async function apagar(id) {
  await pedido((await loja('anexos', 'readwrite')).delete(id));
  if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); }
}
export async function urlDe(id) {
  if (urls.has(id)) return urls.get(id);
  const b = await obterBlob(id);
  if (!b) return null;
  const u = URL.createObjectURL(b);
  urls.set(id, u);
  return u;
}

// ---------- imagens ----------
async function carregarBitmap(file) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* cai para <img> */ }
  }
  const u = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = u;
    await img.decode();
    return img;
  } finally { setTimeout(() => URL.revokeObjectURL(u), 3000); }
}

const paraBlob = (canvas, tipo = 'image/jpeg', q = 0.82) => new Promise((res) => canvas.toBlob(res, tipo, q));

/** Reduz fotos grandes (celular) para ~1600 px de lado maior e JPEG: leve para guardar e sincronizar. */
export async function comprimirImagem(file, { maxLado = 1600, qualidade = 0.82 } = {}) {
  const bmp = await carregarBitmap(file);
  const w0 = bmp.width, h0 = bmp.height;
  const k = Math.min(1, maxLado / Math.max(w0, h0));
  if (k === 1 && file.size < 350 * 1024 && /jpeg|png|webp/.test(file.type)) return { blob: file, w: w0, h: h0 };
  const w = Math.round(w0 * k), h = Math.round(h0 * k);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, w, h);
  g.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  return { blob: await paraBlob(c, 'image/jpeg', qualidade), w, h };
}

export async function salvarImagem(file) {
  const { blob, w, h } = await comprimirImagem(file);
  return salvarBlob(blob, { nome: file.name || 'foto.jpg', w, h });
}

export const ehImagem = (f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(f.name || '');
export const ehPdf = (f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name || '');
export const ehTexto = (f) => f.type === 'text/plain' || /\.(txt|md)$/i.test(f.name || '');

// ---------- carregamento sob demanda das bibliotecas ----------
const abs = (rel) => new URL(rel, document.baseURI).href;
const scripts = new Map();
function carregarScript(rel) {
  if (!scripts.has(rel)) {
    scripts.set(rel, new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = abs(rel);
      s.onload = res;
      s.onerror = () => rej(new Error(`Não consegui carregar ${rel}. Se estiver sem internet, abra o app uma vez com internet para ele guardar os arquivos.`));
      document.head.append(s);
    }));
  }
  return scripts.get(rel);
}

// ---------- PDF ----------
async function pdfjs() {
  await carregarScript('vendor/pdfjs/pdf.min.js');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = abs('vendor/pdfjs/pdf.worker.min.js');
  return window.pdfjsLib;
}

/** Abre um PDF e devolve um objeto com número de páginas e funções para renderizar/ler o texto de cada página. */
export async function abrirPdf(file) {
  const lib = await pdfjs();
  const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  return {
    paginas: doc.numPages,
    async imagem(n, escala = 1.6, maxLado = 1600) {
      const pg = await doc.getPage(n);
      let vp = pg.getViewport({ scale: escala });
      const k = Math.min(1, maxLado / Math.max(vp.width, vp.height));
      vp = pg.getViewport({ scale: escala * k });
      const c = document.createElement('canvas');
      c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      await pg.render({ canvasContext: g, viewport: vp }).promise;
      return { blob: await paraBlob(c), w: c.width, h: c.height };
    },
    async texto(n) {
      const pg = await doc.getPage(n);
      const tc = await pg.getTextContent();
      const linhas = new Map();
      for (const it of tc.items) {
        if (!it.str) continue;
        const y = Math.round(it.transform[5] / 3); // itens da mesma linha têm y parecido
        (linhas.get(y) || linhas.set(y, []).get(y)).push([it.transform[4], it.str]);
      }
      return [...linhas.entries()].sort((a, b) => b[0] - a[0]).map(([, xs]) => xs.sort((a, b) => a[0] - b[0]).map((x) => x[1]).join(' ').replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
    },
    destruir: () => doc.destroy(),
  };
}

/** Converte as páginas escolhidas em anexos (imagens). Devolve [{id, pagina, texto}]. */
export async function pdfParaAnexos(pdf, paginas, aoProgresso) {
  const saida = [];
  for (let i = 0; i < paginas.length; i++) {
    aoProgresso?.(i, paginas.length);
    const { blob, w, h } = await pdf.imagem(paginas[i]);
    const id = await salvarBlob(blob, { nome: `pagina-${paginas[i]}.jpg`, w, h });
    saida.push({ id, pagina: paginas[i], texto: await pdf.texto(paginas[i]).catch(() => '') });
  }
  aoProgresso?.(paginas.length, paginas.length);
  return saida;
}

// ---------- OCR ----------
let workerPromessa = null;
let fila = Promise.resolve();
let ouvinteOcr = null;

async function criarWorker() {
  await carregarScript('vendor/tesseract/tesseract.min.js');
  return window.Tesseract.createWorker('por', 1, {
    workerPath: abs('vendor/tesseract/worker.min.js'),
    corePath: abs('vendor/tesseract/core'),
    langPath: abs('vendor/tesseract/lang'),
    logger: (m) => ouvinteOcr?.(m),
  });
}

/**
 * Lê o texto de uma imagem (id de anexo, Blob ou File). Uma de cada vez.
 * @returns {Promise<{texto: string, confianca: number}>}
 */
export function lerTexto(origem, aoProgresso) {
  const tarefa = fila.then(async () => {
    const blob = typeof origem === 'string' ? await obterBlob(origem) : origem;
    if (!blob) throw new Error('Imagem não encontrada.');
    aoProgresso?.({ fase: 'Preparando o leitor de texto…', p: 0 });
    workerPromessa ||= criarWorker();
    let worker;
    try { worker = await workerPromessa; } catch (e) { workerPromessa = null; throw e; }
    ouvinteOcr = (m) => { if (m.status === 'recognizing text') aoProgresso?.({ fase: 'Lendo o texto…', p: m.progress }); };
    const { data } = await worker.recognize(blob);
    ouvinteOcr = null;
    return { texto: (data.text || '').trim(), confianca: Math.round(data.confidence || 0) };
  });
  fila = tarefa.catch(() => {});
  return tarefa;
}

// ---------- compartilhado do WhatsApp (gravado pelo service worker) ----------
export async function pegarCompartilhado() {
  const r = await pedido((await loja('compartilhado')).get('ultimo'));
  if (r) await pedido((await loja('compartilhado', 'readwrite')).delete('ultimo'));
  return r || null;
}

/** Ordem de leitura: arquivos do mesmo lote, pela ordem original. */
export async function salvarVarios(files) {
  const ids = [];
  for (const f of files) if (ehImagem(f)) ids.push(await salvarImagem(f));
  return ids;
}
