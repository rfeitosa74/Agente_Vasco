// Mesclagem de 3 vias (base × local × remoto) para sincronizar dois aparelhos sem um sobrescrever o outro.
//   base   = último estado que este aparelho sincronizou com o servidor
//   local  = estado atual deste aparelho
//   remoto = estado atual no servidor
// Regra: quem mudou algo em relação à base vence naquele ponto; se os dois mudaram a mesma coisa, o LOCAL vence.
// Listas de objetos com `id` são tratadas como mapas por id (adição, remoção e edição de itens se mesclam);
// listas de valores simples (ex.: dias livres) são tratadas como conjuntos.

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);
const listaComId = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => objeto(x) && x.id != null);

export function merge3(base, local, remoto) {
  if (igual(local, remoto)) return structuredClone(local);
  if (base !== undefined && igual(local, base)) return structuredClone(remoto); // só o remoto mudou
  if (base !== undefined && igual(remoto, base)) return structuredClone(local); // só o local mudou

  if (objeto(local) && objeto(remoto)) {
    const b = objeto(base) ? base : {};
    const saida = {};
    for (const k of new Set([...Object.keys(local), ...Object.keys(remoto)])) {
      const naLocal = k in local, noRemoto = k in remoto, naBase = k in b;
      if (naLocal && noRemoto) saida[k] = merge3(naBase ? b[k] : undefined, local[k], remoto[k]);
      else if (naLocal) { if (!naBase || !igual(local[k], b[k])) saida[k] = structuredClone(local[k]); /* senão: o remoto apagou, e o local não mexeu */ }
      else if (noRemoto) { if (!naBase || !igual(remoto[k], b[k])) saida[k] = structuredClone(remoto[k]); }
    }
    return saida;
  }

  if (Array.isArray(local) && Array.isArray(remoto)) {
    const bArr = Array.isArray(base) ? base : [];
    if (listaComId(local) || listaComId(remoto) || (listaComId(bArr) && (!local.length || !remoto.length))) {
      const porId = (arr) => new Map(arr.filter((x) => objeto(x) && x.id != null).map((x) => [x.id, x]));
      const B = porId(bArr), L = porId(local), R = porId(remoto);
      const ordem = [];
      const visto = new Set();
      for (const x of [...remoto, ...local]) if (objeto(x) && x.id != null && !visto.has(x.id)) { visto.add(x.id); ordem.push(x.id); }
      const saida = [];
      for (const id of ordem) {
        const noL = L.has(id), noR = R.has(id), noB = B.has(id);
        if (noL && noR) saida.push(merge3(noB ? B.get(id) : undefined, L.get(id), R.get(id)));
        else if (noL) { if (!noB || !igual(L.get(id), B.get(id))) saida.push(structuredClone(L.get(id))); }
        else if (noR) { if (!noB || !igual(R.get(id), B.get(id))) saida.push(structuredClone(R.get(id))); }
      }
      return saida;
    }
    // conjuntos de valores simples (ordem preservada: remoto primeiro, depois novidades do local)
    const chave = (v) => JSON.stringify(v);
    const B = new Set(bArr.map(chave)), L = new Set(local.map(chave)), R = new Set(remoto.map(chave));
    const saida = [];
    const ja = new Set();
    for (const v of [...remoto, ...local]) {
      const c = chave(v);
      if (ja.has(c)) continue;
      ja.add(c);
      const noL = L.has(c), noR = R.has(c), noB = B.has(c);
      if ((noL && noR) || (noL && !noB) || (noR && !noB)) saida.push(structuredClone(v));
    }
    return saida;
  }

  return structuredClone(local); // valores simples em conflito: o local vence
}
