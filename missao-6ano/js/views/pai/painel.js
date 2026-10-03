// Painel do pai: onde estamos, o que fazer agora e o que pede atenção.
import { h } from '../../util/dom.js';
import { getState, getDay, mutateDay } from '../../store.js';
import { planoDoDia } from '../../core/dayplan.js';
import { resumoSemana, corrente, NIVEL_NOME } from '../../core/xp.js';
import { faseKey, FASES, ORDEM_FASES } from '../../core/phase.js';
import { insights, primeirosPassos } from '../../core/insights.js';
import { errosParaRefazer } from '../../actions.js';
import { chip, barra, toast } from '../../ui.js';
import { fmtDiaLongo, fmtDia, addDays, diffDays } from '../../util/dates.js';
import { ESTAGIOS } from '../../core/planner.js';
import { tarefasDeHoje } from '../../core/tarefas.js';

export default function painel(ctx) {
  const s = getState();
  const hoje = ctx.hoje;
  const plano = planoDoDia(s, hoje);
  const dia = getDay(hoje);
  const fase = plano.fase;
  const raiz = h('div', { class: 'stack lg' });

  raiz.append(h('div', null, h('p', { class: 'eyebrow' }, fmtDiaLongo(hoje)), h('h1', { style: { margin: 0 } }, `Olá, ${s.config.tutor}`)));

  // ---- fase da rampa ----
  let prox = null;
  for (let i = 1; i <= 70 && !prox; i++) { const d = addDays(hoje, i); const k = faseKey(d, s.config); if (k !== fase.key) prox = { key: k, data: d }; }
  raiz.append(h('div', { class: 'card b1 stack sm' },
    h('div', { class: 'row between' }, h('h2', { style: { margin: 0 } }, fase.rotulo), prox ? chip(`${FASES[prox.key].rotulo} em ${diffDays(prox.data, hoje)} dias`, 'info') : chip('rotina completa', 'ok')),
    h('p', { style: { margin: 0 } }, fase.resumo),
    h('div', { class: 'row tight' }, ...ORDEM_FASES.map((k) => chip(FASES[k].rotulo.replace('Rampa · ', ''), k === fase.key ? 'warn' : '')))));

  // ---- primeiros passos ----
  const passos = primeirosPassos(s);
  if (passos.some((p) => !p.feito)) {
    raiz.append(h('div', { class: 'card stack sm' }, h('h2', { style: { margin: 0 } }, 'Primeiros passos'),
      h('p', { class: 'small muted', style: { margin: 0 } }, `${passos.filter((p) => p.feito).length} de ${passos.length} feitos`),
      ...passos.map((p) => h('a', { href: p.hash, class: 'row', style: { textDecoration: 'none', color: 'inherit' } }, h('span', { class: 'chip ' + (p.feito ? 'ok' : '') }, p.feito ? '✓' : '○'), h('span', { style: { textDecoration: p.feito ? 'line-through' : 'none', opacity: p.feito ? .6 : 1 } }, p.texto)))));
  }

  // ---- alertas ----
  const alertas = insights(s, hoje);
  if (alertas.length) {
    raiz.append(h('div', { class: 'stack sm' }, h('h2', { style: { margin: 0 } }, 'Atenção'),
      ...alertas.slice(0, 6).map((a) => h('div', { class: `banner ${a.nivel === 'ok' ? 'ok' : a.nivel === 'aviso' ? 'aviso' : a.nivel === 'erro' ? 'erro' : 'info'}` }, h('h4', null, a.titulo), h('p', null, a.texto), a.acao ? h('a', { class: 'btn sm', href: a.acao.hash }, a.acao.rotulo) : null))));
  }

  // ---- hoje ----
  const feitoDe = (id) => ({ dever: !tarefasDeHoje(s, hoje).length, janela: dia.janelaLimpa, aquecimento: dia.caligrafia, missao: plano.sprints.length && plano.sprints.every((x) => dia.sprints[x.idx]?.ok), episodio: dia.episodio, explica: dia.explicou, desafio: dia.desafio, base: dia.base }[id]);
  const recado = h('textarea', { 'aria-label': 'Recado do dia', placeholder: 'Escreva a Missão do Dia ou um recado para o Luan (ele vê na tela Hoje)…', style: { minHeight: '64px' } }, dia.recado);
  raiz.append(h('div', { class: 'card stack' },
    h('div', { class: 'row between' }, h('h2', { style: { margin: 0 } }, 'Hoje do Luan'), h('a', { class: 'btn sm primary', href: '#/pai/hoje' }, 'Abrir o dia completo')),
    h('p', { style: { margin: 0, fontWeight: 600 } }, plano.titulo),
    h('div', { class: 'row tight' }, ...plano.blocos.map((b) => chip(`${feitoDe(b.id) ? '✓' : '○'} ${b.nome}`, feitoDe(b.id) ? 'ok' : ''))),
    h('div', null, h('label', null, 'Recado do dia (aparece para o Luan)'), recado),
    h('div', null, h('button', { class: 'btn sm', onClick: () => { mutateDay(hoje, (d) => { d.recado = recado.value.trim(); }); toast('Recado salvo'); } }, 'Salvar recado'))));

  // ---- números ----
  const r = resumoSemana(s, hoje);
  const hist = s.ginasio.historico.filter((x) => x.faixa === s.ginasio.faixa);
  const stats = [
    h('div', { class: 'stat' }, h('span', null, 'Corrente'), h('b', null, `🔥 ${corrente(s, hoje)}`)),
    h('div', { class: 'stat' }, h('span', null, 'Cartas para hoje'), h('b', null, String(s.cartas.filter((c) => c.due <= hoje).length))),
    h('div', { class: 'stat' }, h('span', null, 'Erros para refazer'), h('b', null, String(errosParaRefazer(s, hoje).length))),
    h('div', { class: 'stat' }, h('span', null, 'Ginásio'), h('b', null, `Faixa ${s.ginasio.faixa}`), h('small', { class: 'muted' }, hist.length ? `melhor ${Math.min(...hist.map((x) => x.seg)).toFixed(1).replace('.', ',')} s` : 'sem tentativas')),
  ];
  if (fase.xp) stats.unshift(h('div', { class: 'stat' }, h('span', null, 'XP da semana'), h('b', null, `⭐ ${r.total}`), h('small', { class: 'muted' }, r.nivel ? NIVEL_NOME[r.nivel] : 'sem nível ainda')));
  raiz.append(h('div', { class: 'grid c4' }, ...stats));
  if (fase.xp) raiz.append(h('div', { class: 'card flat' }, barra(r.total, Math.max(s.config.niveis.ouro * 1.1, r.total), [{ v: s.config.niveis.bronze, rotulo: '🥉 ' + s.config.niveis.bronze }, { v: s.config.niveis.prata, rotulo: '🥈 ' + s.config.niveis.prata }, { v: s.config.niveis.ouro, rotulo: '🥇 ' + s.config.niveis.ouro }])));

  // ---- provas ----
  const provas = s.provas.filter((p) => !p.cancelada && p.data >= hoje).sort((a, b) => (a.data < b.data ? -1 : 1)).slice(0, 5);
  raiz.append(h('div', { class: 'card stack sm' }, h('div', { class: 'row between' }, h('h2', { style: { margin: 0 } }, 'Próximas provas'), h('a', { class: 'btn sm', href: '#/pai/semana' }, 'Plano da semana')),
    provas.length ? h('table', { class: 'tbl' }, h('tbody', null, ...provas.map((p) => {
      const est = (planoDoDia(s, hoje).estagios || []).find((e) => e.provaId === p.id);
      return h('tr', null, h('td', null, h('b', null, p.disciplina)), h('td', null, fmtDia(p.data)), h('td', null, p.conteudo || h('span', { class: 'muted' }, '—')), h('td', { class: 'right' }, est ? chip(`hoje: ${ESTAGIOS[est.estagio].rotulo}`, 'warn') : chip(`em ${diffDays(p.data, hoje)} d`)));
    }))) : h('p', { class: 'muted' }, 'Nenhuma prova cadastrada.')));

  return raiz;
}
