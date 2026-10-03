// Cartão de tarefa (lista do pai e do Luan).
import { h } from '../util/dom.js';
import { statusDe, situacaoDe, progressoDe, estimarMinutos, ROTULO_STATUS, resumoConferencia } from '../core/tarefas.js';
import { chip } from '../ui.js';
import { DISC_COR } from '../data/tecnicas.js';
import { fmtDia } from '../util/dates.js';

const ROT_SIT = { atrasada: ['atrasada', 'bad'], hoje: ['entrega hoje', 'warn'], amanha: ['entrega amanhã', 'info'], futura: [null, ''], ok: [null, ''] };

export function cartaoTarefa(t, hoje, { href, pai = false } = {}) {
  const st = statusDe(t);
  const sit = situacaoDe(t, hoje);
  const pr = progressoDe(t);
  const [rotSit, clsSit] = ROT_SIT[sit];
  const conf = resumoConferencia(t);
  return h('a', { class: `tarefa-card${sit === 'atrasada' ? ' atrasada' : ''}`, href, style: { '--c': DISC_COR[t.disciplina] || 'var(--brand)' } },
    h('div', { class: 'faixa' }),
    h('div', { class: 'stack sm', style: { minWidth: 0 } },
      h('div', { class: 'row tight' }, h('span', { class: 'chip' }, t.rotuloOriginal || t.disciplina), rotSit ? chip(rotSit, clsSit) : null, chip(st === 'feita' && !pai ? 'enviada ✓' : ROTULO_STATUS[st], st === 'conferida' ? 'ok' : st === 'feita' ? 'warn' : '')),
      h('h3', null, t.titulo),
      h('div', { class: 'row tight small muted' }, `para ${fmtDia(t.entrega)}`, ' · ', `~${estimarMinutos(t)} min`,
        pr.total ? ` · ${pr.feitos}/${pr.total} respondidas` : '', (t.anexos || []).length ? ` · 🖼️ ${t.anexos.length}` : '',
        st === 'conferida' && pr.total ? ` · ✓ ${conf.certo} ✗ ${conf.errado}` : '')),
    h('span', { 'aria-hidden': 'true', style: { fontSize: '1.4rem', paddingRight: '8px', color: 'var(--muted)' } }, '›'));
}
