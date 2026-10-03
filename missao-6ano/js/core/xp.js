// Sistema de XP (página 11). O XP mede esforço e comportamento de estudo, não acerto.
// É sempre DERIVADO dos registros do dia: nunca se "tira" XP como castigo — só se desfaz uma marcação feita por engano.
import { addDays, weekStart, isWeekday, semanaDe } from '../util/dates.js';
import { planoDoDia } from './dayplan.js';
import { faseDe } from './phase.js';

export const TABELA_XP = {
  caligrafia: { xp: 5, label: 'Caligrafia do dia' },
  sprint: { xp: 10, label: 'Sprint concluído sentado' },
  missaoCompleta: { xp: 10, label: 'Missão do Dia completa' },
  episodio: { xp: 15, label: 'Episódio do canal gravado' },
  explicou: { xp: 20, label: 'Expliquei sem olhar nada' },
  refezErro: { xp: 10, label: 'Refiz e acertei o erro de ontem' },
  provaClassificada: { xp: 15, label: 'Prova classificada no diário de erros' },
  desafio: { xp: 25, label: 'Desafio do Pai' },
  semanaCheia: { xp: 30, label: 'Semana com 5 dias completos' },
};

const sprintsFeitos = (dia, plano) => plano.sprints.filter((s) => dia.sprints?.[s.idx]?.ok).length;

export function missaoCompleta(dia, plano) {
  if (!plano.sprints.length) return false;
  return sprintsFeitos(dia, plano) === plano.sprints.length;
}

/** Dia “completo” para a corrente e o bônus de semana: Aquecimento + toda a Missão (ou o modo 5 minutos). */
export function diaCompleto(dia, plano) {
  if (!dia.caligrafia) return false;
  if (!plano.sprints.length) return true;
  return missaoCompleta(dia, plano) || (dia.diaDificil && sprintsFeitos(dia, plano) >= 1);
}

/** Itens de XP de um dia (sem o bônus semanal). */
export function itensDoDia(state, data) {
  const dia = state.days[data];
  if (!dia) return [];
  const plano = planoDoDia(state, data);
  const itens = [];
  const add = (k, n = 1, label) => itens.push({ k, label: label || TABELA_XP[k].label, xp: TABELA_XP[k].xp * n, n });
  if (dia.caligrafia) add('caligrafia');
  const n = sprintsFeitos(dia, plano);
  if (n) add('sprint', n, n > 1 ? `${n} sprints concluídos` : 'Sprint concluído sentado');
  if (!dia.diaDificil && missaoCompleta(dia, plano)) add('missaoCompleta');
  if (dia.episodio) add('episodio');
  if (dia.explicou) add('explicou');
  if (dia.refezErro) add('refezErro');
  if (dia.provasClassificadas) add('provaClassificada', dia.provasClassificadas);
  if (dia.desafio) add('desafio');
  for (const e of dia.xpExtra || []) itens.push({ k: 'extra', label: e.label, xp: Number(e.xp) || 0, n: 1 });
  return itens;
}

export const xpDoDia = (state, data) => itensDoDia(state, data).reduce((a, i) => a + i.xp, 0);

export function resumoSemana(state, qualquerDia) {
  const dias = semanaDe(qualquerDia);
  const uteis = dias.filter((d) => isWeekday(d) && !state.config.diasLivres.includes(d));
  const porDia = {};
  let total = 0;
  let completos = 0;
  for (const d of dias) {
    const xp = xpDoDia(state, d);
    porDia[d] = xp;
    total += xp;
  }
  for (const d of uteis) {
    const dia = state.days[d];
    if (dia && diaCompleto(dia, planoDoDia(state, d))) completos++;
  }
  const necessarios = Math.min(5, uteis.length);
  const bonus = necessarios >= 3 && completos >= necessarios ? TABELA_XP.semanaCheia.xp : 0;
  total += bonus;
  return { inicio: weekStart(qualquerDia), porDia, bonus, completos, necessarios, total, nivel: nivelDe(total, state.config.niveis) };
}

export function nivelDe(total, niveis) {
  if (total >= niveis.ouro) return 'ouro';
  if (total >= niveis.prata) return 'prata';
  if (total >= niveis.bronze) return 'bronze';
  return null;
}

export const NIVEL_NOME = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro' };

/** Próximo patamar a alcançar (para a barra de progresso). */
export function proximoNivel(total, niveis) {
  for (const k of ['bronze', 'prata', 'ouro']) if (total < niveis[k]) return { chave: k, falta: niveis[k] - total, alvo: niveis[k] };
  return null;
}

/** Corrente: dias de missão completos em sequência (fim de semana e dias livres não quebram). */
export function corrente(state, hoje) {
  let d = hoje;
  const completo = (x) => !!state.days[x] && diaCompleto(state.days[x], planoDoDia(state, x));
  if (isWeekday(d) && !completo(d)) d = addDays(d, -1); // hoje ainda pode estar em andamento
  let n = 0;
  for (let i = 0; i < 400; i++, d = addDays(d, -1)) {
    if (!isWeekday(d) || state.config.diasLivres.includes(d)) continue;
    if (d < state.criadoEm) break;
    if (completo(d)) n++;
    else break;
  }
  return n;
}

/** Semanas Ouro seguidas (fechamentos) — 4 seguidas = Conquista do Mês. */
export function semanasOuroSeguidas(state) {
  const chaves = Object.keys(state.semanas).sort();
  let n = 0;
  for (let i = chaves.length - 1; i >= 0; i--) {
    const s = state.semanas[chaves[i]];
    if (s.fechada && s.nivel === 'ouro') n++;
    else break;
  }
  return n;
}

export const xpAtivo = (state, data) => faseDe(data, state.config).xp;
