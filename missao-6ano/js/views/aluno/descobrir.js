// “Descobrir”: o Luan consulta fontes online confiáveis para estudar (quando há internet).
import { h } from '../../util/dom.js';
import { painelPesquisa } from '../pesquisa.js';

export default function descobrir(ctx) {
  return h('div', { class: 'stack lg' },
    h('div', null, h('p', { class: 'eyebrow' }, 'Estudar mais'), h('h1', { style: { margin: 0 } }, '🔎 Descobrir'),
      h('p', { class: 'muted' }, 'Fontes confiáveis da internet para entender melhor um assunto. Depois, escreva com as suas palavras.')),
    painelPesquisa({ modo: 'aluno', q: ctx.params.q || '', disciplina: ctx.params.d || '', tarefaId: ctx.params.t || '', rerender: ctx.rerender }));
}
