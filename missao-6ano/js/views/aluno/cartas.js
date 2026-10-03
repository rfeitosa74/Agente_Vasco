// Cartas-relâmpago: revisão espaçada de História, Geografia e do que ele fabricar.
import { h } from '../../util/dom.js';
import { getState, mutate } from '../../store.js';
import { devidas, resumo, novaCarta } from '../../core/leitner.js';
import { montar as tCartas } from '../../tools/cartas.js';
import { abas, abrirModal, chip, toast } from '../../ui.js';
import { DISCIPLINAS } from '../../core/planner.js';

export default function cartas(ctx) {
  const s = getState();
  const hoje = ctx.hoje;
  const disc = ctx.params.disc || 'todas';
  const filtro = (c) => disc === 'todas' || c.disciplina === disc;
  const devidasHoje = devidas(s.cartas, hoje, filtro).length;
  const r = resumo(s.cartas, filtro);
  const discs = ['todas', ...new Set(s.cartas.map((c) => c.disciplina))];

  const nova = () => {
    const d = h('select', { 'aria-label': 'Disciplina' }, ...DISCIPLINAS.map((x) => h('option', { value: x, selected: x === (disc === 'todas' ? 'História' : disc) }, x)));
    const f = h('input', { type: 'text', 'aria-label': 'Frente', placeholder: 'Frente: a pergunta' });
    const v = h('textarea', { 'aria-label': 'Verso', placeholder: 'Verso: a resposta' });
    let fechar;
    fechar = abrirModal(h('div', { class: 'stack' }, h('div', null, h('label', null, 'Disciplina'), d), h('div', null, h('label', null, 'Frente'), f), h('div', null, h('label', null, 'Verso'), v),
      h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, h('button', { class: 'btn amber', onClick: () => {
        if (!f.value.trim() || !v.value.trim()) { toast('Preencha frente e verso.'); return; }
        mutate((st) => st.cartas.push(novaCarta({ disciplina: d.value, frente: f.value, verso: v.value, origem: 'aluno', hoje })));
        fechar(); ctx.rerender();
      } }, 'Salvar carta'))), { titulo: 'Fabricar uma carta' });
  };

  return h('div', { class: 'stack lg' },
    h('div', { class: 'row between' }, h('div', null, h('p', { class: 'eyebrow' }, 'Cartas-relâmpago'), h('h1', { style: { margin: 0 } }, 'Puxe da memória')),
      h('button', { class: 'btn sm', onClick: nova }, '＋ Nova carta')),
    abas(discs.map((d) => [d, d === 'todas' ? 'Todas' : d]), disc, (d) => ctx.go(`#/aluno/cartas?disc=${encodeURIComponent(d)}`)),
    h('div', { class: 'grid c3' },
      h('div', { class: 'stat' }, h('span', null, 'Para hoje'), h('b', null, String(devidasHoje))),
      h('div', { class: 'stat' }, h('span', null, 'No baralho'), h('b', null, String(r.total))),
      h('div', { class: 'stat' }, h('span', null, 'Dominadas (caixa 4–5)'), h('b', null, String(r.dominadas)))),
    tCartas({ hoje, filtro }),
    h('p', { class: 'muted small center' }, 'Caixa 1 volta amanhã · 2 em 3 dias · 3 em 1 semana · 4 em 2 semanas · 5 em 1 mês.'));
}
