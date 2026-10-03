// Sincronização das imagens das tarefas (núcleo sem DOM): envia as que só existem aqui e baixa as que faltam.
// As imagens já saem comprimidas (~1600 px, JPEG), então cada uma tem poucas centenas de KB.

export const LIMITE_BYTES = 4 * 1024 * 1024; // acima disso a imagem fica só neste aparelho

export function criarSyncAnexos({ rpc, codigo }) {
  const chamar = (nome, corpo) => rpc(nome, { p_codigo: codigo, ...corpo });

  /**
   * @param locais [{id, sync, tipo, tamanho}] anexos deste aparelho
   * @param lerBase64 (id) => Promise<{tipo, dados}>   lê a imagem do aparelho
   * @param marcar (id) => Promise<void>                marca como sincronizada
   * @returns {{enviados: string[], pulados: string[]}}
   */
  async function enviarPendentes({ locais, lerBase64, marcar }) {
    const pendentes = locais.filter((a) => !a.sync);
    if (!pendentes.length) return { enviados: [], pulados: [] };
    const naNuvem = new Set(await chamar('list_anexos', {}));
    const enviados = [], pulados = [];
    for (const a of pendentes) {
      if (naNuvem.has(a.id)) { await marcar(a.id); continue; }
      if ((a.tamanho || 0) > LIMITE_BYTES) { pulados.push(a.id); continue; }
      const { tipo, dados } = await lerBase64(a.id);
      await chamar('put_anexo', { p_id: a.id, p_tipo: tipo || 'image/jpeg', p_dados: dados });
      await marcar(a.id);
      enviados.push(a.id);
    }
    return { enviados, pulados };
  }

  /** Baixa uma imagem da nuvem. `salvar({id, tipo, dados})` grava no aparelho. Devolve true se achou. */
  async function baixar(id, salvar) {
    const r = await chamar('get_anexo', { p_id: id });
    if (!r.existe) return false;
    await salvar({ id, tipo: r.tipo, dados: r.dados });
    return true;
  }

  return { enviarPendentes, baixar };
}

export const blobParaBase64 = (blob) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res({ tipo: blob.type, dados: String(r.result).split(',')[1] });
  r.onerror = () => rej(r.error);
  r.readAsDataURL(blob);
});

export async function base64ParaBlob(tipo, dados) {
  const bin = atob(dados);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}
