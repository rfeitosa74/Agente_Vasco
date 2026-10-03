// Ligação da sincronização de imagens com o IndexedDB e com a sincronização do estado (js/sync.js).
import { criarSyncAnexos, blobParaBase64, base64ParaBlob } from './core/syncAnexosCore.js';
import { SYNC_URL, SYNC_KEY } from './syncConfig.js';
import { listar, obterBlob, marcarSync, salvarBlob, existe } from './anexos.js';
import { anexosDaTarefa } from './core/tarefas.js';

const codigo = () => { try { return JSON.parse(localStorage.getItem('missao6:sync') || 'null')?.codigo || null; } catch { return null; } };

async function rpc(nome, corpo) {
  const r = await fetch(`${SYNC_URL}/rest/v1/rpc/${nome}`, { method: 'POST', headers: { apikey: SYNC_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  if (!r.ok) throw new Error(`Servidor respondeu ${r.status}`);
  return r.json();
}

const api = () => { const c = codigo(); return c ? criarSyncAnexos({ rpc, codigo: c }) : null; };

/** Envia para a nuvem as imagens que só existem neste aparelho. */
export async function enviarAnexos() {
  const a = api();
  if (!a) return { enviados: [], pulados: [] };
  return a.enviarPendentes({
    locais: await listar(),
    lerBase64: async (id) => blobParaBase64(await obterBlob(id)),
    marcar: (id) => marcarSync(id, true),
  });
}

/** Baixa uma imagem que veio de outro aparelho. Lança erro se não for possível. */
export async function baixarAnexo(id) {
  const a = api();
  if (!a) throw new Error('Anexo não está neste aparelho.');
  const ok = await a.baixar(id, async ({ tipo, dados }) => { await salvarBlob(await base64ParaBlob(tipo, dados), { id, sync: true }); });
  if (!ok) throw new Error('Imagem ainda não foi enviada pelo outro aparelho.');
}

/** Baixa, em segundo plano, as imagens que as tarefas usam e este aparelho ainda não tem. */
export async function baixarFaltantes(state, limite = 12) {
  const a = api();
  if (!a) return 0;
  const precisa = [...new Set((state.tarefas || []).flatMap(anexosDaTarefa))];
  let n = 0;
  for (const id of precisa) {
    if (n >= limite) break;
    if (await existe(id)) continue;
    try { await baixarAnexo(id); n++; } catch { /* ainda não enviada */ }
  }
  return n;
}
