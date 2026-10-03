// Plano do dia: junta a fase da rampa + o ciclo D-3 + a rotação padrão em uma só estrutura.
// É a única fonte de verdade sobre "o que o Luan faz neste dia".
import { dow, weekStart, addDays } from '../util/dates.js';
import { faseDe } from './phase.js';
import { planejarProvas, estagiosAtivos, ESTAGIOS } from './planner.js';
import { ROTACAO, sprintsDoEstagio } from '../data/tecnicas.js';
import { PONTES } from '../data/ponte.js';
import { hashStr } from './rng.js';

let cachePlanner = { chave: '', resultado: null };

/** Resultado do planejador para o estado atual (com cache enquanto provas/dias livres não mudam). */
export function planoDasProvas(state) {
  const chave = JSON.stringify([state.provas.map((p) => [p.id, p.disciplina, p.data, p.peso, p.criadaEm, p.cancelada]), state.config.diasLivres]);
  if (cachePlanner.chave !== chave) {
    cachePlanner = { chave, resultado: planejarProvas(state.provas, { diasLivres: state.config.diasLivres }) };
  }
  return cachePlanner.resultado;
}

export function estagiosDoDia(state, data) {
  const lista = planoDasProvas(state).porDia[data] || [];
  return lista.map((s) => ({ ...s, prova: state.provas.find((p) => p.id === s.provaId) }));
}

/** Pergunta-ponte (regra dos 2 minutos) estável para a data; `offset` troca por outra. */
export function pontePara(data, disciplina, offset = 0) {
  const lista = PONTES.filter((p) => p.disciplina === disciplina);
  if (!lista.length) return null;
  return lista[(hashStr(`${data}|${disciplina}`) + offset) % lista.length];
}

const BLOCO = (id, nome, hora, min, extra = {}) => ({ id, nome, hora, min, ...extra });

/**
 * @returns {{
 *  data, fase, dow, tipo: 'folga'|'livre'|'ciclo'|'diaD'|'padrao'|'sem-missao'|'sabado',
 *  blocos: Array, sprints: Array, estagios: Array, ponte: object|null, titulo: string, avisos: string[]
 * }}
 */
export function planoDoDia(state, data) {
  const cfg = state.config;
  const fase = faseDe(data, cfg);
  const d = dow(data);
  const h = cfg.horarios;
  const base = { data, fase, dow: d, blocos: [], sprints: [], estagios: [], ponte: null, avisos: [] };

  if (d === 0) return { ...base, tipo: 'folga', titulo: 'Domingo: folga total' };
  if (cfg.diasLivres.includes(data)) return { ...base, tipo: 'livre', titulo: 'Dia livre (feriado/sem aula de reforço)' };

  const aquecimento = BLOCO('aquecimento', 'Aquecimento', h.aquecimento, 15, { detalhe: 'Caligrafia + 5 min do Ginásio de Cálculo' });
  const explica = fase.xp ? BLOCO('explica', 'Me explica', h.explica, 5, { detalhe: '5 minutos de conversa com o pai' }) : null;
  const baseCarga = fase.base ? BLOCO('base', 'Celular na base', h.base, 0, { detalhe: 'O celular dorme na sala' }) : null;

  if (d === 6) {
    const blocos = [aquecimento];
    if (fase.desafio) blocos.push(BLOCO('desafio', 'Desafio do Pai', h.desafio, 25, { detalhe: 'Quiz com o pai + soma do XP' }));
    if (explica) blocos.push(explica);
    if (baseCarga) blocos.push(baseCarga);
    return { ...base, tipo: 'sabado', blocos, titulo: fase.desafio ? 'Sábado: Desafio do Pai' : 'Sábado: só o Aquecimento' };
  }

  // ----- dia útil -----
  const estagios = estagiosDoDia(state, data);
  const ativos = estagiosAtivos(estagios);
  const temDiaD = estagios.some((s) => s.estagio === 'D');
  let tipo, sprints = [], titulo;
  const minutos = fase.sprintMin;

  if (ativos.length) {
    tipo = 'ciclo';
    if (ativos.length === 1) {
      const s = ativos[0];
      sprints = sprintsDoEstagio(s.estagio, s.disciplina).map((sp, i) => ({ ...sp, idx: i + 1, estagio: s.estagio, disciplina: s.disciplina, provaId: s.provaId }));
    } else {
      sprints = ativos.slice(0, 2).map((s, i) => ({ ...sprintsDoEstagio(s.estagio, s.disciplina)[0], idx: i + 1, estagio: s.estagio, disciplina: s.disciplina, provaId: s.provaId }));
    }
    sprints = sprints.map((sp) => ({
      ...sp, tipo: 'ciclo', minutos,
      rotulo: `${ESTAGIOS[sp.estagio].rotulo} · ${sp.disciplina}`,
      ferramentas: [{ id: 'prova', provaId: sp.provaId, estagio: sp.estagio, disciplina: sp.disciplina }],
    }));
    titulo = ativos.map((s) => `${s.disciplina} ${ESTAGIOS[s.estagio].rotulo}`).join(' + ');
  } else if (temDiaD) {
    tipo = 'diaD';
    titulo = 'Dia de prova: só o Aquecimento';
  } else if (fase.rotacao && ROTACAO[d]) {
    tipo = 'padrao';
    const rot = ROTACAO[d];
    sprints = rot.sprints.slice(0, fase.sprints).map((sp, i) => ({
      ...sp, idx: i + 1, tipo: 'padrao', minutos,
      disciplina: sp.ferramentas[0]?.disciplina || rot.disciplina,
      rotulo: `${rot.disciplina} · ${rot.tecnica}`,
    }));
    titulo = `${rot.disciplina} — ${rot.tecnica}`;
  } else {
    tipo = 'sem-missao';
    titulo = 'Hoje só o Aquecimento';
  }

  // Pergunta-ponte para a primeira Missão de História/Geografia do dia
  const primeira = sprints[0];
  const discPonte = primeira && ['História', 'Geografia'].includes(primeira.disciplina) ? primeira.disciplina : sprints.find((s) => ['História', 'Geografia'].includes(s.disciplina))?.disciplina;
  const ponte = discPonte ? pontePara(data, discPonte, state.days[data]?.ponteOffset || 0) : null;

  const blocos = [aquecimento];
  if (sprints.length) {
    blocos.push(BLOCO('missao', 'Missão do Dia', h.missao, sprints.length * minutos + (sprints.length > 1 ? 5 : 0), { detalhe: `${sprints.length} × ${minutos} min${sprints.length > 1 ? ' + 5 de pausa' : ''}` }));
  }
  if (fase.episodios.includes(d)) blocos.push(BLOCO('episodio', 'Episódio do canal', h.episodio, 10, { detalhe: '1 minuto, no máximo 2 takes' }));
  if (explica) blocos.push(explica);
  if (baseCarga) blocos.push(baseCarga);

  const avisos = [];
  if (tipo === 'ciclo' && estagios.some((s) => s.comprimido)) avisos.push('Prova com pouco tempo: estágios apertados.');
  return { ...base, tipo, blocos, sprints, estagios, ponte, titulo, avisos };
}

/** Os 7 planos da semana (seg..dom). */
export function planoDaSemana(state, data) {
  const ini = weekStart(data);
  return Array.from({ length: 7 }, (_, i) => planoDoDia(state, addDays(ini, i)));
}
