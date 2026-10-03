// Tarefas de casa (pai): o que está a conferir, a fazer e conferido.
import { h } from '../../util/dom.js';
import { getState } from '../../store.js';
import { statusDe, aConferir, tarefasDeHoje, cargaMinutos, estimarMinutos, situacaoDe } from '../../core/tarefas.js';
import { cartaoTarefa } from '../tarefaCard.js';
import { abas, banner, chip } from '../../ui.js';
import { DISCIPLINAS } from '../../core/planner.js';
import { fmtDiaLongo } from '../../util/dates.js';

export default function tarefasPai(ctx) {
  const s = getState();
  const hoje = ctx.hoje;
  const todas = s.tarefas.filter((t) => !t.cancelada);
  const conferir = aConferir(s);
  const fazer = todas.filter((t) => !t.feitaEm);
  const conferidas = todas.filter((t) => t.conferidaEm);
  const aba = ctx.params.aba || (conferir.length ? 'conferir' : 'fazer');
  const fd = ctx.params.d || '';
  const base = { conferir, fazer, conferidas: conferidas.slice().sort((a, b) => (a.conferidaEm < b.conferidaEm ? 1 : -1)), todas: todas.slice().sort((a, b) => (a.entrega < b.entrega ? 1 : -1)) }[aba] || [];
  const lista = base.filter((t) => !fd || t.disciplina === fd).sort((a, b) => (aba === 'fazer' ? (a.entrega < b.entrega ? -1 : 1) : 0));

  const hojeTs = tarefasDeHoje(s, hoje);
  const carga = cargaMinutos(s, hoje);
  const teto = s.config.tetoTarefaMin;
  const raiz = h('div', { class: 'stack lg' });

  raiz.append(h('div', { class: 'row between' },
    h('div', null, h('p', { class: 'eyebrow' }, 'Dever de casa'), h('h1', { style: { margin: 0 } }, 'Tarefas de casa')),
    h('a', { class: 'btn amber lg', href: '#/pai/receber' }, '＋ Receber tarefa')));

  if (!todas.length) {
    raiz.append(h('div', { class: 'card center stack' }, h('div', { class: 'big-emoji' }, '📥'), h('h2', { style: { margin: 0 } }, 'Nenhuma tarefa ainda'),
      h('p', { class: 'muted' }, 'Quando a escola mandar o dever pelo WhatsApp, é só colar a mensagem (ou mandar uma foto da apostila/livro ou um PDF). O app separa por disciplina e o Luan já vê no aplicativo dele.'),
      h('div', { class: 'row', style: { justifyContent: 'center' } }, h('a', { class: 'btn amber lg', href: '#/pai/receber' }, 'Receber a primeira tarefa'))));
    return raiz;
  }

  // carga da noite
  if (hojeTs.length) {
    const pesado = carga > teto;
    raiz.append(h('div', { class: `banner ${pesado ? 'aviso' : 'info'}` }, h('h4', null, `Esta noite · ${fmtDiaLongo(hoje)}`),
      h('p', null, `${hojeTs.length} tarefa${hojeTs.length > 1 ? 's' : ''} para entregar até o próximo dia de aula, cerca de ${carga} min.`),
      pesado ? h('p', { class: 'small' }, `Passa de ${teto} min. O plano pede para NÃO aumentar as horas: priorize o que vale nota e converse com as professoras sobre a carga (especialmente se o reforço é diário).`) : null));
  }

  raiz.append(abas([['conferir', `A conferir (${conferir.length})`], ['fazer', `A fazer (${fazer.length})`], ['conferidas', `Conferidas (${conferidas.length})`], ['todas', `Todas (${todas.length})`]], aba, (a) => ctx.go(`#/pai/tarefas?aba=${a}${fd ? '&d=' + encodeURIComponent(fd) : ''}`)));
  const discs = [...new Set(todas.map((t) => t.disciplina))];
  if (discs.length > 1) raiz.append(h('div', { class: 'row tight' }, h('span', { class: 'small muted' }, 'Disciplina:'), h('button', { class: 'btn sm' + (!fd ? ' primary' : ''), onClick: () => ctx.go(`#/pai/tarefas?aba=${aba}`) }, 'todas'), ...discs.map((d) => h('button', { class: 'btn sm' + (fd === d ? ' primary' : ''), onClick: () => ctx.go(`#/pai/tarefas?aba=${aba}&d=${encodeURIComponent(d)}`) }, d))));

  raiz.append(lista.length ? h('div', { class: 'stack sm' }, ...lista.map((t) => cartaoTarefa(t, hoje, { href: `#/pai/tarefa?id=${t.id}`, pai: true })))
    : h('div', { class: 'card flat center muted' }, aba === 'conferir' ? 'Nada esperando conferência. 🎉' : aba === 'fazer' ? 'Nenhuma tarefa pendente.' : 'Nada por aqui.'));
  return raiz;
}
