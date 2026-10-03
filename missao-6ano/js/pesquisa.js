// Pesquisa nas fontes online confiáveis: cache local, biblioteca (guardados), sugestões do pai e cartas.
import { getState, mutate, uid } from './store.js';
import { consultar, criarCache, cartaDoResultado, ORDEM_FONTES } from './core/fontes.js';
import { novaCarta } from './core/leitner.js';
import { today } from './util/dates.js';

const CHAVE_CACHE = 'missao6:fontesCache'; // fora do estado principal: é só cópia temporária, não sincroniza nem entra no backup
const armazem = {
  get() { try { return JSON.parse(localStorage.getItem(CHAVE_CACHE) || '{}'); } catch { return {}; } },
  set(o) { try { localStorage.setItem(CHAVE_CACHE, JSON.stringify(o)); } catch { /* sem espaço: segue sem cache */ } },
};
const cache = criarCache(armazem);
export const limparCache = () => { try { localStorage.removeItem(CHAVE_CACHE); } catch { /* ignore */ } };
export const tamanhoCache = () => Object.keys(armazem.get()).length;

export const configFontes = () => getState().config.fontes || { habilitadas: ORDEM_FONTES, pesquisaLivreAluno: false, linksExternosAluno: true };
export const temInternet = () => (typeof navigator === 'undefined' || navigator.onLine !== false);

export async function buscar(termo, disciplina = '') {
  return consultar(termo, { habilitadas: configFontes().habilitadas, disciplina, cache, online: temInternet() });
}

// ---------- biblioteca ----------
export const biblioteca = () => getState().biblioteca || [];
export const estaGuardado = (r) => biblioteca().some((b) => b.chave === chaveDe(r));
const chaveDe = (r) => `${r.fonte}|${r.url || r.titulo}`;

export function guardar(r, { disciplina = '', tarefaId = null } = {}) {
  if (estaGuardado(r)) return false;
  mutate((s) => {
    s.biblioteca.push({ id: uid(), chave: chaveDe(r), fonte: r.fonte, termo: r.termo, titulo: r.titulo, resumo: r.resumo, url: r.url || null, imagem: r.imagem || null, licenca: r.licenca, disciplina, tarefaId, guardadoEm: today() });
  });
  return true;
}
export const removerDaBiblioteca = (id) => mutate((s) => { s.biblioteca = s.biblioteca.filter((b) => b.id !== id); });

/** Transforma um resultado em carta-relâmpago (com a fonte anotada em `tag`). */
export function criarCartaDe(r, disciplina) {
  const c = cartaDoResultado(r);
  mutate((s) => { s.cartas.push(novaCarta({ disciplina: disciplina || 'Ciências', frente: c.frente, verso: c.verso, tag: `fonte: ${r.fonte}`, origem: 'pesquisa', hoje: today() })); });
}

// ---------- sugestões do pai ----------
export function sugerir(termo, disciplina = '') {
  const t = String(termo || '').trim();
  if (!t || getState().sugestoes.some((x) => !x.feita && x.termo.toLowerCase() === t.toLowerCase())) return false;
  mutate((s) => { s.sugestoes.push({ id: uid(), termo: t, disciplina, criadaEm: today(), feita: false }); });
  return true;
}
export const marcarSugestaoFeita = (id) => mutate((s) => { const x = s.sugestoes.find((y) => y.id === id); if (x) x.feita = true; });
export const removerSugestao = (id) => mutate((s) => { s.sugestoes = s.sugestoes.filter((y) => y.id !== id); });

/** Anexa um trecho de fonte à tarefa (o Luan o vê como “material de apoio”). */
export function anexarReferencia(tarefaId, r) {
  mutate((s) => {
    const t = s.tarefas.find((x) => x.id === tarefaId);
    if (!t) return;
    t.referencias ||= [];
    if (!t.referencias.some((x) => x.chave === chaveDe(r))) t.referencias.push({ id: uid(), chave: chaveDe(r), fonte: r.fonte, titulo: r.titulo, resumo: r.resumo, url: r.url || null, licenca: r.licenca });
  });
}
export const removerReferencia = (tarefaId, id) => mutate((s) => { const t = s.tarefas.find((x) => x.id === tarefaId); if (t) t.referencias = (t.referencias || []).filter((x) => x.id !== id); });
