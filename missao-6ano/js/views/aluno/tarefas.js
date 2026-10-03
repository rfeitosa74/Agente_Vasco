// Tarefas de casa (Luan): o que fazer hoje, amanhã e o que já foi enviado.
import { h } from '../../util/dom.js';
import { getState } from '../../store.js';
import { tarefasAFazer, tarefasDeHoje, cargaMinutos, situacaoDe, statusDe } from '../../core/tarefas.js';
import { cartaoTarefa } from '../tarefaCard.js';
import { chip } from '../../ui.js';
import { fmtDiaLongo } from '../../util/dates.js';

export default function tarefasAluno(ctx) {
  const s = getState();
  const hoje = ctx.hoje;
  const abertas = tarefasAFazer(s, hoje);
  const hojeTs = tarefasDeHoje(s, hoje);
  const idsHoje = new Set(hojeTs.map((t) => t.id));
  const depois = abertas.filter((t) => !idsHoje.has(t.id));
  const enviadas = s.tarefas.filter((t) => !t.cancelada && t.feitaEm && !t.conferidaEm);
  const conferidas = s.tarefas.filter((t) => !t.cancelada && t.conferidaEm).sort((a, b) => (a.conferidaEm < b.conferidaEm ? 1 : -1)).slice(0, 5);
  const carga = cargaMinutos(s, hoje);
  const href = (t) => `#/aluno/tarefa?id=${t.id}`;
  const raiz = h('div', { class: 'stack lg' });

  raiz.append(h('div', null, h('p', { class: 'eyebrow' }, fmtDiaLongo(hoje)), h('h1', { style: { margin: 0 } }, 'Dever de casa')));

  if (!s.tarefas.length) {
    raiz.append(h('div', { class: 'card center stack' }, h('div', { class: 'big-emoji' }, '🎒'), h('h2', { style: { margin: 0 } }, 'Nenhuma tarefa por enquanto'), h('p', { class: 'muted' }, 'Quando o pai receber o dever da escola, ele aparece aqui.')));
    return raiz;
  }

  raiz.append(hojeTs.length
    ? h('div', { class: 'card b2 stack sm' }, h('h2', { style: { margin: 0 } }, `Hoje à noite: ${hojeTs.length} tarefa${hojeTs.length > 1 ? 's' : ''}`), h('p', { style: { margin: 0 } }, `Mais ou menos ${carga} minutos. Uma de cada vez — comece pela que vale mais!`))
    : h('div', { class: 'card b4 center stack sm' }, h('div', { class: 'big-emoji' }, '🎉'), h('h2', { style: { margin: 0 } }, 'Sem tarefa para hoje à noite'), h('p', { class: 'muted', style: { margin: 0 } }, enviadas.length ? 'Já mandou tudo. Agora é só esperar a conferência do pai.' : 'Aproveite o tempo livre!')));

  const secao = (titulo, lista) => (lista.length ? h('div', { class: 'stack sm' }, h('h2', { style: { margin: 0, fontSize: '1.1rem' } }, titulo), ...lista.map((t) => cartaoTarefa(t, hoje, { href: href(t) }))) : null);
  raiz.append(secao('Para fazer agora', hojeTs), secao('Mais pra frente', depois), secao('Enviadas — esperando o pai conferir', enviadas));
  if (conferidas.length) raiz.append(h('div', { class: 'stack sm' }, h('h2', { style: { margin: 0, fontSize: '1.1rem' } }, 'Já conferidas'), ...conferidas.map((t) => cartaoTarefa(t, hoje, { href: href(t) }))));
  return raiz;
}
