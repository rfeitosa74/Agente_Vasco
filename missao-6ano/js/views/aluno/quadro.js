// Quadro de Missões digital (página 15 do plano): marque cada quadradinho na hora que terminar.
import { h } from '../../util/dom.js';
import { getState, getDay } from '../../store.js';
import { planoDoDia } from '../../core/dayplan.js';
import { resumoSemana, xpDoDia, missaoCompleta, NIVEL_NOME } from '../../core/xp.js';
import { alternarCampo, marcarSprint } from '../../actions.js';
import { chip } from '../../ui.js';
import { weekStart, addDays, fmtCurto, semanaDe, DIAS_LONGO } from '../../util/dates.js';
import { abrirFechamento } from '../compartilhado.js';

export default function quadro(ctx) {
  const s = getState();
  const hoje = ctx.hoje;
  const ini = ctx.params.semana ? weekStart(ctx.params.semana) : weekStart(hoje);
  const dias = semanaDe(ini);
  const r = resumoSemana(s, ini);
  const reg = s.semanas[ini];

  const cx = (on, aoClicar, disabled, rotulo) => h('button', { class: 'cx' + (on ? ' on' : ''), disabled, 'aria-pressed': String(!!on), 'aria-label': rotulo, onClick: aoClicar }, '✓');
  const traco = h('span', { class: 'na' }, '—');

  const linhas = dias.slice(0, 6).map((data, i) => {
    const plano = planoDoDia(s, data);
    const dia = getDay(data);
    const futuro = data > hoje;
    const nomeDia = DIAS_LONGO[(i + 1) % 7];
    const temSprint = (idx) => plano.sprints.some((x) => x.idx === idx);
    const sprintCx = (idx) => (temSprint(idx) ? cx(dia.sprints[idx]?.ok, () => { marcarSprint(data, idx, !dia.sprints[idx]?.ok, { manual: true }); ctx.rerender(); }, futuro, `${nomeDia}: sprint ${idx}`) : traco);
    const missaoOk = plano.sprints.length && missaoCompleta(dia, plano);
    const temEp = plano.blocos.some((b) => b.id === 'episodio');
    const sabado = i === 5;
    const desc = plano.tipo === 'livre' ? 'dia livre' : sabado ? 'Desafio do Pai — 25 XP' : plano.tipo === 'diaD' ? 'Dia de prova: só aquecer' : plano.sprints.length ? plano.titulo : plano.titulo;
    return h('tr', { class: data === hoje ? 'hoje' : '' },
      h('td', null, h('b', null, nomeDia.charAt(0).toUpperCase() + nomeDia.slice(1)), h('small', null, desc)),
      h('td', null, cx(dia.caligrafia, () => { alternarCampo(data, 'caligrafia', 'Caligrafia'); ctx.rerender(); }, futuro, `${nomeDia}: caligrafia`)),
      sabado ? h('td', { colspan: 4, class: 'muted' }, plano.fase.desafio ? h('div', { class: 'row', style: { justifyContent: 'center' } }, 'Quiz com o pai ', cx(dia.desafio, () => { alternarCampo(data, 'desafio', 'Desafio do Pai'); ctx.rerender(); }, futuro, 'Desafio do Pai')) : 'Desafio do Pai entra na semana 3')
        : [h('td', null, sprintCx(1)), h('td', null, sprintCx(2)), h('td', null, missaoOk ? cx(true, () => {}, true, 'missão completa') : plano.sprints.length ? cx(false, () => {}, true, 'missão completa') : traco),
          h('td', null, temEp ? cx(dia.episodio, () => { alternarCampo(data, 'episodio', 'Episódio'); ctx.rerender(); }, futuro, `${nomeDia}: episódio`) : traco)],
      h('td', null, cx(dia.explicou, () => { alternarCampo(data, 'explicou', 'Expliquei sem olhar'); ctx.rerender(); }, futuro, `${nomeDia}: expliquei sem olhar`)),
      h('td', { class: 'xpd' }, String(r.porDia[data] || 0)));
  });

  const domingo = h('tr', null, h('td', { colspan: 8, style: { background: 'var(--ok-soft)', color: 'var(--ok)', textAlign: 'center', fontWeight: 700 } }, 'Domingo: FOLGA. Descansar, jogar, brincar na rua, desenhar. Nada de estudo.'));
  const fechaveis = addDays(ini, 5) <= hoje;

  return h('div', { class: 'stack lg' },
    h('div', { class: 'row between' },
      h('div', null, h('p', { class: 'eyebrow' }, 'Quadro de missões'), h('h1', { style: { margin: 0 } }, `Semana de ${fmtCurto(ini)} a ${fmtCurto(addDays(ini, 6))}`)),
      h('div', { class: 'row tight' },
        h('a', { class: 'btn sm', href: `#/aluno/quadro?semana=${addDays(ini, -7)}` }, '◀'),
        h('a', { class: 'btn sm', href: `#/aluno/quadro?semana=${hoje}` }, 'Esta semana'),
        h('a', { class: 'btn sm', href: `#/aluno/quadro?semana=${addDays(ini, 7)}` }, '▶'))),
    h('p', { class: 'muted small' }, 'Marque cada quadradinho na hora que terminar. (O cronômetro marca os sprints sozinho; se usar o cronômetro de cozinha, marque à mão.)'),
    h('div', { class: 'card pad0 scroll-x' }, h('table', { class: 'quadro' },
      h('thead', null, h('tr', null, h('th', null, 'Dia e missão'), h('th', null, 'Caligrafia', h('br'), '5 XP'), h('th', null, 'Sprint 1', h('br'), '10 XP'), h('th', null, 'Sprint 2', h('br'), '10 XP'), h('th', null, 'Missão completa', h('br'), '+10'), h('th', null, 'Episódio', h('br'), '15 XP'), h('th', null, 'Expliquei sem olhar', h('br'), '20 XP'), h('th', null, 'XP do dia'))),
      h('tbody', null, ...linhas, domingo))),
    h('div', { class: 'grid c3' },
      h('div', { class: 'stat' }, h('span', null, 'Bônus semana completa'), h('b', null, r.bonus ? '+30 ✓' : `+30 (${r.completos}/${r.necessarios} dias)`)),
      h('div', { class: 'stat' }, h('span', null, 'Total de XP da semana'), h('b', null, `⭐ ${r.total}`)),
      h('div', { class: 'stat' }, h('span', null, 'Nível conquistado'), h('b', null, r.nivel ? NIVEL_NOME[r.nivel] : '—'), h('small', { class: 'muted' }, `Bronze ${s.config.niveis.bronze} · Prata ${s.config.niveis.prata} · Ouro ${s.config.niveis.ouro}`))),
    fechaveis ? h('div', { class: 'card b2 row between' }, h('div', null, h('h3', { style: { margin: 0 } }, reg?.fechada ? `Semana fechada: ${reg.nivel ? NIVEL_NOME[reg.nivel] : 'sem nível'}` : 'Hora de fechar a semana!'), reg?.recompensa ? h('p', { class: 'small', style: { margin: 0 } }, `Recompensa: ${reg.recompensa}`) : h('p', { class: 'small muted', style: { margin: 0 } }, 'Soma o XP e escolhe a recompensa, junto com o pai.')),
      h('button', { class: 'btn amber', onClick: () => abrirFechamento(ini, () => ctx.rerender()) }, reg?.fechada ? 'Ver / atualizar' : 'Fechar a semana')) : null);
}
