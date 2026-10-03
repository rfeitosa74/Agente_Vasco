// Cartas-relâmpago com repetição espaçada (caixas de Leitner).
// Caixa 1 volta amanhã; cada acerto sobe a caixa e espaça a próxima revisão. Erro volta para a caixa 1.
import { addDays } from '../util/dates.js';
import { uid } from './rng.js';

export const INTERVALOS = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 }; // dias até a próxima revisão ao ESTAR na caixa
export const CAIXA_DOMINADA = 4;

export function novaCarta({ disciplina, frente, verso, tag = '', origem = 'manual', provaId = null, hoje }) {
  return { id: uid(), disciplina, frente: frente.trim(), verso: verso.trim(), tag: tag.trim(), origem, provaId, caixa: 1, due: hoje, acertos: 0, erros: 0, criada: hoje };
}

/** Aplica o resultado de uma revisão e devolve a carta atualizada (não muta). */
export function avaliar(carta, lembrou, hoje) {
  const caixa = lembrou ? Math.min(carta.caixa + 1, 5) : 1;
  return {
    ...carta,
    caixa,
    due: addDays(hoje, lembrou ? INTERVALOS[caixa] : 1),
    acertos: carta.acertos + (lembrou ? 1 : 0),
    erros: carta.erros + (lembrou ? 0 : 1),
    ultima: hoje,
  };
}

export const devida = (c, hoje) => c.due <= hoje;

/** Cartas a revisar hoje: caixas baixas primeiro (as que ele mais esquece). */
export function devidas(cartas, hoje, filtro = () => true) {
  return cartas.filter((c) => devida(c, hoje) && filtro(c)).sort((a, b) => a.caixa - b.caixa || (a.due < b.due ? -1 : 1));
}

export function resumo(cartas, filtro = () => true) {
  const sel = cartas.filter(filtro);
  const porCaixa = [0, 0, 0, 0, 0, 0];
  for (const c of sel) porCaixa[c.caixa]++;
  return { total: sel.length, porCaixa: porCaixa.slice(1), dominadas: sel.filter((c) => c.caixa >= CAIXA_DOMINADA).length };
}
