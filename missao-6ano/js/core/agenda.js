// Leitura de agenda de provas colada em texto: “08/10 História 2 Egito e Mesopotâmia”.
import { DISCIPLINAS } from './planner.js';
import { iso } from '../util/dates.js';

const norm = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Lê linhas como “08/10 História 2 Egito e Mesopotâmia” (data, disciplina, peso opcional, conteúdo opcional). */
export function lerAgenda(texto, anoPadrao) {
  const itens = [];
  const erros = [];
  for (const bruta of texto.split('\n')) {
    const linha = bruta.trim();
    if (!linha) continue;
    const m = linha.match(/^(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\s+(.+)$/);
    if (!m) { erros.push(linha); continue; }
    const ano = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : anoPadrao;
    const data = iso(new Date(ano, Number(m[2]) - 1, Number(m[1])));
    const resto = m[4].trim();
    const disc = DISCIPLINAS.find((d) => norm(resto).startsWith(norm(d)));
    if (!disc) { erros.push(linha); continue; }
    const depois = resto.slice(disc.length).trim();
    const pm = depois.match(/^([1-3])\b\s*(.*)$/);
    itens.push({ data, disciplina: disc, peso: pm ? Number(pm[1]) : 1, conteudo: (pm ? pm[2] : depois).trim() });
  }
  return { itens, erros };
}
