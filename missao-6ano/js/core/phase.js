// Implantação em fases (página 12 do plano).
//   Antes da rampa: SÓ Bloco 1 + ciclo D-3. Sem XP, sem quadro, sem Desafio do Pai.
//   Semana 1: Aquecimento + 1 sprint.        Semana 2: 2 sprints, entra XP e a base de carregamento.
//   Semana 3: sprints de 15 min, episódio 3×, Desafio do Pai.   Semana 4: rotina completa + conversa com as professoras.
import { diffDays, weekStart } from '../util/dates.js';

const SEG = 1, QUA = 3, SEX = 5;

export const FASES = {
  pre: {
    key: 'pre', rotulo: 'Antes da rampa', resumo: 'Só Aquecimento + ciclo D-3 da prova da semana. Sem XP, sem quadro, sem Desafio do Pai.',
    sprints: 2, sprintMin: 12, xp: false, base: false, episodios: [], desafio: false, rotacao: false,
  },
  w1: {
    key: 'w1', rotulo: 'Rampa · semana 1', resumo: 'Só o Aquecimento e UM sprint. Objetivo único: ele terminar a semana pensando “é só isso?”.',
    sprints: 1, sprintMin: 12, xp: false, base: false, episodios: [], desafio: false, rotacao: true,
  },
  w2: {
    key: 'w2', rotulo: 'Rampa · semana 2', resumo: 'Dois sprints. Começa o XP e a base de carregamento na sala. Episódio do canal 2× na semana. Primeiro fechamento de sábado.',
    sprints: 2, sprintMin: 12, xp: true, base: true, episodios: [SEG, QUA], desafio: false, rotacao: true,
  },
  w3: {
    key: 'w3', rotulo: 'Rampa · semana 3', resumo: 'Sprints passam de 12 para 15 minutos. Episódio 3×. Entra o Desafio do Pai no sábado.',
    sprints: 2, sprintMin: 15, xp: true, base: true, episodios: [SEG, QUA, SEX], desafio: true, rotacao: true,
  },
  w4: {
    key: 'w4', rotulo: 'Rampa · semana 4', resumo: 'Tudo rodando. Primeira avaliação: converse com as professoras e pergunte se mudou a FORMA de responder dele.',
    sprints: 2, sprintMin: 12, xp: true, base: true, episodios: [SEG, QUA, SEX], desafio: true, rotacao: true, conversa: true,
  },
  full: {
    key: 'full', rotulo: 'Rotina completa', resumo: 'Rotina completa: 2 sprints, episódio 3×, Desafio do Pai, XP e base de carregamento.',
    sprints: 2, sprintMin: 12, xp: true, base: true, episodios: [SEG, QUA, SEX], desafio: true, rotacao: true,
  },
};

export const ORDEM_FASES = ['pre', 'w1', 'w2', 'w3', 'w4', 'full'];

/** Fase vigente numa data, conforme o início do 4º bimestre (1ª segunda-feira da rampa). */
export function faseDe(data, cfg) {
  const key = faseKey(data, cfg);
  const f = { ...FASES[key] };
  if (cfg.sprintMin && cfg.sprintMin[key]) f.sprintMin = Number(cfg.sprintMin[key]);
  return f;
}

export function faseKey(data, cfg) {
  if (cfg.faseForcada && FASES[cfg.faseForcada]) return cfg.faseForcada;
  const ini = cfg.inicioBimestre4;
  if (!ini || data < ini) return 'pre';
  const semanas = Math.floor(diffDays(data, weekStart(ini)) / 7);
  return ['w1', 'w2', 'w3', 'w4'][semanas] || 'full';
}
