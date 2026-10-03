// Sincronização entre aparelhos (Supabase). Opcional: sem código ativado, nada sai do aparelho.
import { getState, subscribe, substituirEstado } from './store.js';
import { criarSyncCore, gerarCodigo, normalizarCodigo, formatarCodigo } from './core/syncCore.js';
import { SYNC_URL, SYNC_KEY } from './syncConfig.js';

const CHAVE = 'missao6:sync'; // { codigo, base, rev } — fica só neste aparelho
const ouvintes = new Set();
let estado = { fase: 'desligado', ultimoOk: null, erro: '' };
let rodando = false;
let pendente = false;
let tempoPush = null;

const lerCfg = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch { return null; } };
const gravarCfg = (c) => { try { c ? localStorage.setItem(CHAVE, JSON.stringify(c)) : localStorage.removeItem(CHAVE); } catch { /* ignore */ } };
const avisar = (novo) => { estado = { ...estado, ...novo }; ouvintes.forEach((f) => f(estado)); };

const core = criarSyncCore({
  url: SYNC_URL, key: SYNC_KEY,
  fetchFn: (...a) => fetch(...a),
  lerLocal: () => structuredClone(getState()),
  aplicarLocal: (n) => substituirEstado(n),
  lerMeta: () => { const c = lerCfg(); return c ? { base: c.base, rev: c.rev } : null; },
  gravarMeta: (m) => { const c = lerCfg(); if (c) gravarCfg({ ...c, base: m.base, rev: m.rev }); },
});

export const ativo = () => !!lerCfg()?.codigo;
export const codigoAtual = () => lerCfg()?.codigo || '';
export const status = () => estado;
export const ouvir = (fn) => (ouvintes.add(fn), () => ouvintes.delete(fn));
export { gerarCodigo, normalizarCodigo, formatarCodigo };

export async function agora() {
  const c = lerCfg();
  if (!c?.codigo) return;
  if (rodando) { pendente = true; return; }
  rodando = true;
  avisar({ fase: 'sincronizando', erro: '' });
  try {
    await core.sincronizar(c.codigo);
    avisar({ fase: 'ok', ultimoOk: new Date().toISOString(), erro: '' });
  } catch (e) {
    avisar({ fase: 'erro', erro: navigator.onLine === false ? 'Sem internet — tento de novo quando voltar.' : String(e.message || e) });
  } finally {
    rodando = false;
    if (pendente) { pendente = false; setTimeout(agora, 500); }
  }
}

/** Liga a sincronização neste aparelho. `entrar`: o código já existe em outro aparelho (a nuvem manda). */
export async function habilitar(codigo, { entrar = false } = {}) {
  const cod = normalizarCodigo(codigo);
  if (cod.length < 32) throw new Error('Código incompleto: são 32 letras/números.');
  const existe = await core.existeNaNuvem(cod);
  if (entrar && !existe) throw new Error('Não encontrei este código na nuvem. Confira a digitação ou ative no outro aparelho primeiro.');
  gravarCfg({ codigo: cod, base: null, rev: 0 });
  await agora();
  if (estado.fase === 'erro') { const e = estado.erro; gravarCfg(null); avisar({ fase: 'desligado' }); throw new Error(e); }
}

export function desabilitar() {
  gravarCfg(null);
  clearTimeout(tempoPush);
  avisar({ fase: 'desligado', erro: '' });
}

export const linkDePareamento = () => `${location.origin}${location.pathname}#/parear?c=${encodeURIComponent(codigoAtual())}`;

// ---- gatilhos automáticos ----
if (ativo()) avisar({ fase: 'ok' });
subscribe((_, info) => {
  if (!ativo() || info?.sync || info?.externo) return;
  clearTimeout(tempoPush);
  tempoPush = setTimeout(agora, 4000); // junta várias marcações seguidas num envio só
});
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ativo()) agora(); });
  window.addEventListener('online', () => { if (ativo()) agora(); });
  setInterval(() => { if (!document.hidden && ativo()) agora(); }, 45000);
  if (ativo()) setTimeout(agora, 800);
}
