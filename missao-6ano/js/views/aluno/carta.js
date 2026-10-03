// A carta do pai para o Luan (página 14 do plano), exibida na primeira abertura.
import { h } from '../../util/dom.js';
import { getState, mutate } from '../../store.js';
import { CARTA_LUAN, REGRAS_LUAN, FECHO_CARTA } from '../../data/guia.js';

export default function carta(ctx) {
  const nome = getState().config.aluno.split(' ')[0];
  const jaLida = getState().flags.cartaLida;
  return h('div', { class: 'stack lg' },
    h('div', { class: 'card stack', style: { background: 'linear-gradient(135deg, #2b4fa6, #4a78e0)', border: 0 } },
      h('p', { class: 'eyebrow', style: { color: '#ffd596' } }, 'Uma carta para você'),
      h('h1', { style: { color: '#fff', margin: 0 } }, `${nome}, isso aqui é um jogo`),
      h('p', { style: { color: '#e4ecff', margin: 0 } }, 'Leia antes de começar.')),
    h('div', { class: 'card stack' },
      ...CARTA_LUAN.map((p) => h('p', null, p)),
      h('p', { style: { fontWeight: 700 } }, 'As regras do jogo são estas:'),
      h('ol', { class: 'steps' }, ...REGRAS_LUAN.map((r) => h('li', null, h('b', null, r.t + ' '), r.d))),
      h('p', null, FECHO_CARTA)),
    h('div', { class: 'center' }, h('button', { class: 'btn amber lg', onClick: () => { mutate((s) => { s.flags.cartaLida = true; }); ctx.go('#/aluno/hoje'); } }, jaLida ? 'Voltar' : 'Entendi, bora! 🚀')));
}
