// Guia do plano: o conteúdo do PDF “Missão 6º Ano”, sempre à mão.
import { h } from '../../util/dom.js';
import { GUIA } from '../../data/guia.js';
import { TABELA_XP } from '../../core/xp.js';
import { ROTACAO, REGRAS_SPRINT } from '../../data/tecnicas.js';
import { FASES, ORDEM_FASES } from '../../core/phase.js';
import { getState } from '../../store.js';

export default function guia(ctx) {
  const abertas = new Set((ctx.params.s || '').split(',').filter(Boolean));
  const raiz = h('div', { class: 'stack lg' });
  raiz.append(h('div', { class: 'row between' }, h('div', null, h('p', { class: 'eyebrow' }, 'Parte 1 a 8 do plano'), h('h1', { style: { margin: 0 } }, 'Guia do pai'),
    h('p', { class: 'muted' }, 'O plano completo, em seções. Princípios: menos tempo, mais foco · puxar, não reler · entrar pela astronomia.')),
    h('div', { class: 'row tight no-print' }, h('a', { class: 'btn sm', href: '#/aluno/carta' }, '💌 Carta do Luan'), h('button', { class: 'btn sm', onClick: () => { document.querySelectorAll('details.acc').forEach((d) => (d.open = true)); window.print(); } }, '🖨 Imprimir tudo'))));

  raiz.append(h('div', { class: 'grid c3' }, ...[['01', 'Menos tempo, mais foco', 'Dois sprints de 12 minutos valem mais que duas horas de caderno aberto.'], ['02', 'Puxar, não reler', 'A nota sobe quando o aluno é obrigado a tirar a informação da memória, não quando ela entra de novo.'], ['03', 'Entrar pela astronomia', 'Ele já tem um canal e sabe os planetas de cor. É por aí que História e Geografia entram.']].map(([n, t, d]) => h('div', { class: 'card b1 stack sm' }, h('p', { class: 'eyebrow tint-b1' }, `Princípio ${n}`), h('h3', { style: { margin: 0 } }, t), h('p', { class: 'small', style: { margin: 0 } }, d)))));

  for (const sec of GUIA) {
    raiz.append(h('details', { class: 'acc', id: sec.id, open: abertas.has(sec.id) || sec.id === 'diagnostico' },
      h('summary', null, sec.titulo),
      h('div', { class: 'acc-body stack' },
        sec.intro ? h('p', { class: 'muted' }, sec.intro) : null,
        ...sec.itens.map((i) => h('div', null, h('h3', { style: { margin: '0 0 2px' } }, i.t), h('p', { style: { margin: 0 } }, i.d))),
        ...(sec.destaques || []).map((d) => h('div', { class: `banner ${d.tipo}` }, h('h4', null, d.titulo), h('p', null, d.texto))))));
  }

  // tabelas de referência
  raiz.append(h('details', { class: 'acc' }, h('summary', null, 'Referência rápida: rotação semanal, XP e fases'), h('div', { class: 'acc-body stack' },
    h('h3', { style: { margin: 0 } }, 'Rotação semanal (só nas semanas sem prova)'),
    h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'Dia'), h('th', null, 'Missão'), h('th', null, 'Técnica'))), h('tbody', null,
      ...[1, 2, 3, 4, 5].map((d) => h('tr', null, h('td', null, ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'][d]), h('td', null, ROTACAO[d].disciplina), h('td', null, ROTACAO[d].tecnica))),
      h('tr', null, h('td', null, 'Sábado'), h('td', null, 'Desafio do Pai'), h('td', null, 'Revisão misturada + fechamento do XP')), h('tr', null, h('td', null, 'Domingo'), h('td', { colspan: 2 }, 'Folga total (regra do método)')))),
    h('h3', { style: { margin: 0 } }, 'Tabela de XP'),
    h('table', { class: 'tbl' }, h('tbody', null, ...Object.values(TABELA_XP).map((t) => h('tr', null, h('td', null, t.label), h('td', { class: 'right' }, `+${t.xp}`))))),
    h('p', { class: 'small muted' }, `Níveis atuais: Bronze ${getState().config.niveis.bronze} · Prata ${getState().config.niveis.prata} · Ouro ${getState().config.niveis.ouro}. Semana de 5 dias completos soma, no máximo, perto de 400 XP; o plano estima 250–300 numa semana “cheia” real.`),
    h('h3', { style: { margin: 0 } }, 'As cinco regras do sprint'), h('ul', null, ...REGRAS_SPRINT.map((r) => h('li', null, r))),
    h('h3', { style: { margin: 0 } }, 'Fases'), h('table', { class: 'tbl' }, h('tbody', null, ...ORDEM_FASES.map((k) => h('tr', null, h('td', { class: 'nowrap' }, h('b', null, FASES[k].rotulo)), h('td', null, FASES[k].resumo))))))));
  return raiz;
}
