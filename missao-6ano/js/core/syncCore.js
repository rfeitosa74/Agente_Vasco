// Núcleo da sincronização (sem DOM, sem localStorage): conversa com as funções get_estado/set_estado do Supabase
// e mescla o estado deste aparelho com o da nuvem (merge3). Injetando fetch/estado, dá para testar sem rede.
import { merge3 } from './merge3.js';

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Normaliza o código digitado: sem espaços/hífens, maiúsculas. */
export const normalizarCodigo = (c) => String(c || '').replace(/[\s-]/g, '').toUpperCase();
/** Para exibir: XXXX-XXXX-… */
export const formatarCodigo = (c) => (normalizarCodigo(c).match(/.{1,4}/g) || []).join('-');
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 símbolos, sem 0/O/1/I

/** Código novo: 32 símbolos × 5 bits = 160 bits, em grupos de 4 (XXXX-XXXX-…). */
export function gerarCodigo(rand = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  const bytes = rand(32);
  const s = Array.from(bytes, (b) => ALFABETO[b % 32]).join('');
  return s.match(/.{4}/g).join('-');
}

export function criarSyncCore({ url, key, fetchFn = fetch, lerLocal, aplicarLocal, lerMeta, gravarMeta }) {
  async function rpc(nome, corpo) {
    const r = await fetchFn(`${url}/rest/v1/rpc/${nome}`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    if (!r.ok) throw new Error(`Servidor respondeu ${r.status}`);
    return r.json();
  }

  /**
   * Um ciclo completo: baixa, mescla, adota localmente e envia. Repete se outro aparelho gravou no meio.
   * @returns {{ resultado: 'ok', rev: number, mudouLocal: boolean, enviou: boolean }}
   */
  async function sincronizar(codigoBruto) {
    const codigo = normalizarCodigo(codigoBruto);
    let mudouLocal = false;
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      const remoto = await rpc('get_estado', { p_codigo: codigo });
      const meta = lerMeta() || { base: null, rev: 0 };
      const local = lerLocal(); // leitura e adoção abaixo são síncronas: nada se perde entre elas
      let alvo, revBase;
      if (!remoto.existe) { alvo = local; revBase = 0; }
      else {
        alvo = meta.base ? merge3(meta.base, local, remoto.dados) : structuredClone(remoto.dados); // 1ª vez: a nuvem manda
        revBase = remoto.rev;
      }
      if (!igual(alvo, local)) { aplicarLocal(alvo); mudouLocal = true; }
      if (remoto.existe && igual(alvo, remoto.dados)) {
        gravarMeta({ base: alvo, rev: remoto.rev });
        return { resultado: 'ok', rev: remoto.rev, mudouLocal, enviou: false };
      }
      const r = await rpc('set_estado', { p_codigo: codigo, p_dados: alvo, p_rev: revBase });
      if (r.ok) {
        gravarMeta({ base: alvo, rev: r.rev });
        return { resultado: 'ok', rev: r.rev, mudouLocal, enviou: true };
      }
      // conflito: outro aparelho gravou entre o get e o set → tenta de novo com o estado novo
    }
    throw new Error('Não consegui sincronizar (muitos conflitos seguidos). Tente de novo.');
  }

  async function existeNaNuvem(codigoBruto) {
    const r = await rpc('get_estado', { p_codigo: normalizarCodigo(codigoBruto) });
    return !!r.existe;
  }

  return { sincronizar, existeNaNuvem };
}
