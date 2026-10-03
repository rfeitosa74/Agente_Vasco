// Pesquisar (pai): mesma ferramenta do Luan, com mais poder — pode sugerir temas e anexar trechos às tarefas.
import { h } from '../../util/dom.js';
import { getState } from '../../store.js';
import { painelPesquisa } from '../pesquisa.js';
import { removerSugestao } from '../../pesquisa.js';

export default function pesquisar(ctx) {
  const s = getState();
  const raiz = h('div', { class: 'stack lg' },
    h('div', null, h('p', { class: 'eyebrow' }, 'Apoio ao estudo'), h('h1', { style: { margin: 0 } }, 'Pesquisar em fontes confiáveis'),
      h('p', { class: 'muted' }, 'Wikipédia, Wikcionário, NASA e IBGE — só com internet. Guarde, vire carta, anexe à tarefa ou sugira ao Luan.')));
  const pend = s.sugestoes.filter((x) => !x.feita);
  if (pend.length) {
    raiz.append(h('div', { class: 'card stack sm' }, h('b', null, '💡 Sugeridos ao Luan (ainda não pesquisados)'),
      h('div', { class: 'row tight' }, ...pend.map((x) => h('span', { class: 'chip' }, x.termo, h('button', { class: 'btn ghost sm', 'aria-label': `Remover ${x.termo}`, style: { padding: '0 4px' }, onClick: (e) => { removerSugestao(x.id); e.currentTarget.parentElement.remove(); } }, '✕'))))));
  }
  raiz.append(painelPesquisa({ modo: 'pai', q: ctx.params.q || '', disciplina: ctx.params.d || '', tarefaId: ctx.params.t || '', rerender: ctx.rerender }));
  return raiz;
}
