// Progresso: o que está mudando, em gráficos. Esforço (XP, constância) primeiro; nota é consequência.
import { h } from '../../util/dom.js';
import { getState, getDay } from '../../store.js';
import { planoDoDia } from '../../core/dayplan.js';
import { resumoSemana, diaCompleto, corrente } from '../../core/xp.js';
import { graficoBarras, graficoLinha, legenda, CORES } from '../../charts.js';
import { resumo } from '../../core/leitner.js';
import { FAIXAS } from '../../core/ginasio.js';
import { weekStart, addDays, fmtCurto, isWeekday, DIAS_CURTO } from '../../util/dates.js';
import { chip } from '../../ui.js';
import { faseDe } from '../../core/phase.js';

export default function progresso(ctx) {
  const s = getState();
  const hoje = ctx.hoje;
  const raiz = h('div', { class: 'stack lg' });
  const N = 8;
  const semanas = Array.from({ length: N }, (_, i) => addDays(weekStart(hoje), (i - (N - 1)) * 7));
  raiz.append(h('div', null, h('p', { class: 'eyebrow' }, 'Acompanhamento'), h('h1', { style: { margin: 0 } }, 'Progresso'),
    h('p', { class: 'muted' }, 'O XP e a constância medem esforço — é o que você controla. A nota demora um bimestre; o comportamento de estudo muda em três semanas.')));

  // ---- constância (mapa de dias) ----
  const cel = (d) => {
    const livre = s.config.diasLivres.includes(d);
    const dia = s.days[d];
    const futuro = d > hoje;
    let cor = 'var(--surface-2)', rotulo = 'sem registro';
    if (livre) { cor = 'var(--line)'; rotulo = 'dia livre'; }
    else if (futuro) { cor = 'transparent'; rotulo = 'futuro'; }
    else if (dia && diaCompleto(dia, planoDoDia(s, d))) { cor = 'var(--ok)'; rotulo = 'dia completo'; }
    else if (dia && (dia.caligrafia || Object.keys(dia.sprints).length)) { cor = 'var(--amber)'; rotulo = 'parcial'; }
    return h('div', { title: `${fmtCurto(d)} · ${rotulo}`, style: { background: cor, border: '1px solid var(--line)', borderRadius: '6px', height: '26px' } });
  };
  raiz.append(h('div', { class: 'card stack' }, h('div', { class: 'row between' }, h('h2', { style: { margin: 0 } }, 'Constância'), chip(`🔥 corrente: ${corrente(s, hoje)} dia(s)`)),
    h('div', { style: { display: 'grid', gridTemplateColumns: `60px repeat(${N}, 1fr)`, gap: '4px', alignItems: 'center' } },
      h('span'), ...semanas.map((w) => h('small', { class: 'muted center' }, fmtCurto(w))),
      ...[0, 1, 2, 3, 4].flatMap((k) => [h('small', { class: 'muted' }, DIAS_CURTO[k + 1]), ...semanas.map((w) => cel(addDays(w, k)))])),
    h('div', { class: 'legend' }, h('span', null, h('i', { style: { background: 'var(--ok)' } }), 'dia completo'), h('span', null, h('i', { style: { background: 'var(--amber)' } }), 'parcial'), h('span', null, h('i', { style: { background: 'var(--surface-2)', border: '1px solid var(--line)' } }), 'sem registro'), h('span', null, h('i', { style: { background: 'var(--line)' } }), 'dia livre'))));

  // ---- XP ----
  if (faseDe(hoje, s.config).xp || s.semanas && Object.keys(s.semanas).length) {
    const rs = semanas.map((w) => resumoSemana(s, w));
    const n = s.config.niveis;
    raiz.append(h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, 'XP por semana'),
      graficoBarras({ titulo: 'XP por semana', rotulos: semanas.map(fmtCurto), series: [{ nome: 'XP', cor: CORES.brand, valores: rs.map((r) => r.total) }],
        linhasRef: [{ v: n.bronze, rotulo: 'Bronze', cor: '#b87333' }, { v: n.prata, rotulo: 'Prata', cor: '#7b8794' }, { v: n.ouro, rotulo: 'Ouro', cor: '#d19a00' }] })));
  }

  // ---- Ginásio ----
  const faixa = s.ginasio.faixa;
  const def = FAIXAS[faixa - 1];
  const porDia = {};
  for (const x of s.ginasio.historico.filter((y) => y.faixa === faixa)) porDia[x.data] = Math.min(porDia[x.data] ?? 1e9, x.seg);
  raiz.append(h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, `Ginásio de Cálculo · faixa ${faixa}`), graficoLinha({ titulo: 'Melhor tempo por dia', pontos: Object.entries(porDia).map(([d, y]) => ({ x: fmtCurto(d), y })), refs: def.meta ? [{ v: def.meta, rotulo: `meta ${def.meta}s`, cor: 'var(--ok)' }] : [], fmt: (v) => `${v}s` })));

  // ---- erros por semana ----
  const classif = s.erros.filter((e) => e.tipo);
  if (classif.length) {
    raiz.append(h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, 'Tipos de erro por semana'),
      graficoBarras({ titulo: 'Erros por tipo por semana', empilhado: true, rotulos: semanas.map(fmtCurto), series: ['A', 'B', 'C'].map((t) => ({ nome: t, cor: CORES[t], valores: semanas.map((w) => classif.filter((e) => weekStart(e.data) === w && e.tipo === t).length) })) }),
      legenda([{ nome: 'A · não sabia', cor: CORES.A }, { nome: 'B · sabia e errei', cor: CORES.B }, { nome: 'C · em branco', cor: CORES.C }])));
  }

  // ---- cartas ----
  const discs = [...new Set(s.cartas.map((c) => c.disciplina))];
  raiz.append(h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, 'Cartas dominadas'), h('div', { class: 'grid c3' }, ...discs.map((d) => { const r = resumo(s.cartas, (c) => c.disciplina === d); return h('div', { class: 'stat' }, h('span', null, d), h('b', null, `${r.dominadas}/${r.total}`), h('small', { class: 'muted' }, `${r.total ? Math.round((r.dominadas / r.total) * 100) : 0}% nas caixas 4–5`)); }))));

  // ---- português ----
  const leit = s.leituras.slice(-10);
  if (leit.length) raiz.append(h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, 'Caça ao detalhe (Português)'), graficoBarras({ titulo: 'Acertos nas leituras', rotulos: leit.map((l) => fmtCurto(l.data)), series: [{ nome: 'Acertos', cor: CORES.ok, valores: leit.map((l) => l.acertos) }], linhasRef: [{ v: 3, rotulo: 'máx. 3', cor: 'var(--muted)' }] })));

  // ---- tarefas de casa ----
  const feitas = (s.tarefas || []).filter((t) => !t.cancelada && t.feitaEm);
  if (feitas.length) {
    const noPrazo = (t) => t.feitaEm <= t.entrega;
    const conf = feitas.filter((t) => t.conferidaEm && t.itens.length);
    const pctCertas = conf.length ? Math.round((conf.reduce((a, t) => a + t.itens.filter((i) => i.correcao.res === 'certo').length + t.itens.filter((i) => i.correcao.res === 'parcial').length * 0.5, 0) / conf.reduce((a, t) => a + t.itens.length, 0)) * 100) : null;
    raiz.append(h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, '📚 Tarefas de casa'),
      graficoBarras({ titulo: 'Tarefas enviadas por semana', empilhado: true, rotulos: semanas.map(fmtCurto), series: [
        { nome: 'No prazo', cor: CORES.ok, valores: semanas.map((w) => feitas.filter((t) => weekStart(t.feitaEm) === w && noPrazo(t)).length) },
        { nome: 'Atrasadas', cor: CORES.A, valores: semanas.map((w) => feitas.filter((t) => weekStart(t.feitaEm) === w && !noPrazo(t)).length) }] }),
      legenda([{ nome: 'No prazo', cor: CORES.ok }, { nome: 'Atrasadas', cor: CORES.A }]),
      h('div', { class: 'grid c3' },
        h('div', { class: 'stat' }, h('span', null, 'Enviadas'), h('b', null, String(feitas.length))),
        h('div', { class: 'stat' }, h('span', null, 'No prazo'), h('b', null, `${Math.round((feitas.filter(noPrazo).length / feitas.length) * 100)}%`)),
        h('div', { class: 'stat' }, h('span', null, 'Acertos conferidos'), h('b', null, pctCertas == null ? '—' : `${pctCertas}%`)))));
  }

  // ---- números ----
  raiz.append(h('div', { class: 'grid c4' },
    h('div', { class: 'stat' }, h('span', null, 'Dias com registro'), h('b', null, String(Object.keys(s.days).length))),
    h('div', { class: 'stat' }, h('span', null, 'Episódios gravados'), h('b', null, String(s.episodios.filter((e) => ['gravado', 'publicado'].includes(e.status)).length))),
    h('div', { class: 'stat' }, h('span', null, 'Desafios do Pai'), h('b', null, String((s.desafios || []).length))),
    h('div', { class: 'stat' }, h('span', null, 'Provas com nota'), h('b', null, String(s.provas.filter((p) => p.nota != null).length)))));
  return raiz;
}
