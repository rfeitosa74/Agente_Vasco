// Registro de atenção (página 13): 10 segundos por dia, só para o pai. Em 3 semanas responde duas perguntas:
// qual o melhor horário do dia dele e se a distração é geral ou só em certas matérias.
import { h } from '../../util/dom.js';
import { getState, mutate } from '../../store.js';
import { graficoBarras, CORES } from '../../charts.js';
import { chip, confirmar, banner } from '../../ui.js';
import { fmtDia, diffDays, weekStart } from '../../util/dates.js';

const media = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const faixaHora = (hhmm) => { const hr = Number((hhmm || '00:00').slice(0, 2)); return hr < 9 ? 'Manhã cedo (até 9h)' : hr < 12 ? 'Fim da manhã (9–12h)' : hr < 18 ? 'Tarde' : 'Noite'; };

export function analisarAtencao(reg) {
  const grupo = (chave) => {
    const g = {};
    for (const r of reg) { const k = chave(r); if (!k) continue; (g[k] ||= []).push(r); }
    return Object.entries(g).map(([k, rs]) => ({ k, n: rs.length, inter: media(rs.map((r) => r.interrupcoes)), terminou: rs.filter((r) => r.terminou).length / rs.length }));
  };
  const porHora = grupo((r) => faixaHora(r.horario)).filter((x) => x.n >= 2);
  const porDisc = grupo((r) => r.disciplina).filter((x) => x.n >= 2);
  const melhorHora = porHora.slice().sort((a, b) => a.inter - b.inter || b.terminou - a.terminou)[0];
  const piorDisc = porDisc.slice().sort((a, b) => b.inter - a.inter)[0];
  const melhorDisc = porDisc.slice().sort((a, b) => a.inter - b.inter)[0];
  const geral = media(reg.map((r) => r.interrupcoes));
  let distracao = '';
  if (porDisc.length >= 2) distracao = piorDisc.inter - melhorDisc.inter >= 1.5 ? `A distração parece concentrada em certas matérias (mais em ${piorDisc.k}, menos em ${melhorDisc.k}).` : 'A distração parece geral: aparece de forma parecida em todas as matérias.';
  return { porHora, porDisc, melhorHora, geral, distracao, terminou: reg.length ? reg.filter((r) => r.terminou).length / reg.length : 0 };
}

export default function atencao(ctx) {
  const s = getState();
  const hoje = ctx.hoje;
  const reg = s.atencao.slice().sort((a, b) => (a.data < b.data ? -1 : 1));
  const raiz = h('div', { class: 'stack lg' });
  const dias = new Set(reg.map((r) => r.data)).size;
  const semanasReg = reg.length ? Math.floor(diffDays(hoje, reg[0].data) / 7) + 1 : 0;

  raiz.append(h('div', null, h('p', { class: 'eyebrow' }, 'Só para o pai · não mostre ao Luan'), h('h1', { style: { margin: 0 } }, 'Registro de atenção'),
    h('p', { class: 'muted' }, 'Anote no fim de cada sessão (aba “Hoje do Luan”): horário do bloco, quantas vezes ele se levantou e se terminou. Em três semanas você responde duas perguntas que hoje são impressão.')));

  raiz.append(h('div', { class: 'grid c3' }, h('div', { class: 'stat' }, h('span', null, 'Dias registrados'), h('b', null, `${dias}`), h('small', { class: 'muted' }, 'meta: 15 (3 semanas)')),
    h('div', { class: 'stat' }, h('span', null, 'Semanas de registro'), h('b', null, String(semanasReg))), h('div', { class: 'stat' }, h('span', null, 'Terminaram a sessão'), h('b', null, reg.length ? `${Math.round(analisarAtencao(reg).terminou * 100)}%` : '—'))));

  if (reg.length < 6) {
    raiz.append(banner('aviso', 'Poucos dados ainda', 'Com menos de ~6 registros a análise seria chute. Continue anotando — leva 10 segundos por dia.'));
  } else {
    const a = analisarAtencao(reg);
    raiz.append(h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, 'O que os dados mostram'),
      a.melhorHora ? h('p', { style: { margin: 0 } }, h('b', null, 'Melhor horário: '), `${a.melhorHora.k} (média de ${a.melhorHora.inter.toFixed(1).replace('.', ',')} interrupções, ${Math.round(a.melhorHora.terminou * 100)}% terminaram).`) : h('p', { class: 'muted', style: { margin: 0 } }, 'Melhor horário: ainda sem dados em mais de uma faixa.'),
      h('p', { style: { margin: 0 } }, h('b', null, 'Geral ou por matéria? '), a.distracao || 'Registre pelo menos 2 matérias diferentes para comparar.'),
      h('p', { style: { margin: 0 } }, h('b', null, 'Média geral: '), `${a.geral.toFixed(1).replace('.', ',')} vezes que se levantou por sessão.`),
      a.porDisc.length ? graficoBarras({ titulo: 'Interrupções médias por matéria', rotulos: a.porDisc.map((x) => x.k), series: [{ nome: 'Interrupções', cor: CORES.A, valores: a.porDisc.map((x) => Math.round(x.inter * 10) / 10) }] }) : null,
      a.porHora.length ? graficoBarras({ titulo: 'Interrupções médias por faixa de horário', rotulos: a.porHora.map((x) => x.k.split(' (')[0]), series: [{ nome: 'Interrupções', cor: CORES.B, valores: a.porHora.map((x) => Math.round(x.inter * 10) / 10) }] }) : null));
  }

  // sono × erros em branco
  const comSono = reg.filter((r) => r.sono != null);
  if (comSono.length >= 5) {
    const pouco = comSono.filter((r) => r.sono < 9);
    raiz.append(h('div', { class: 'card stack sm' }, h('h2', { style: { margin: 0 } }, 'Sono'), h('p', { style: { margin: 0 } }, `Média de ${media(comSono.map((r) => r.sono)).toFixed(1).replace('.', ',')} h. Em ${pouco.length} de ${comSono.length} dias dormiu menos de 9 h${pouco.length ? ` (interrupções: ${media(pouco.map((r) => r.interrupcoes)).toFixed(1).replace('.', ',')} vs ${media(comSono.filter((r) => r.sono >= 9).map((r) => r.interrupcoes)).toFixed(1).replace('.', ',')} nos demais)` : ''}.`),
      h('p', { class: 'small muted', style: { margin: 0 } }, 'Aos 11 anos o recomendado é de 9 a 11 horas. Antes de qualquer outra hipótese, garanta o sono por três semanas e observe.')));
  }

  raiz.append(h('div', { class: 'banner info' }, h('h4', null, 'Se depois de 6 a 8 semanas nada mudar'), h('p', null, 'Com rotina estável, sono de 9 horas, celular fora do quarto e esforço presente, a maioria das crianças melhora de forma perceptível. Se não melhorar, leve este registro ao pediatra e converse sobre uma avaliação mais completa — não como rótulo, mas porque dificuldade de atenção persistente em criança que se esforça tem causas identificáveis e tratáveis. A astronomia já pesa contra a hipótese de déficit de atenção.')));

  raiz.append(h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, 'Registros'),
    reg.length ? h('div', { class: 'scroll-x' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'Dia'), h('th', null, 'Horário'), h('th', null, 'Matéria'), h('th', null, 'Levantou'), h('th', null, 'Terminou'), h('th', null, 'Sono'), h('th', null, ''))),
      h('tbody', null, ...reg.slice().reverse().slice(0, 60).map((r) => h('tr', null, h('td', { class: 'nowrap' }, fmtDia(r.data)), h('td', null, r.horario || '—'), h('td', null, r.disciplina || '—'), h('td', null, String(r.interrupcoes)), h('td', null, r.terminou ? chip('sim', 'ok') : chip('não', 'warn')), h('td', null, r.sono != null ? `${r.sono} h` : '—'),
        h('td', { class: 'right' }, h('button', { class: 'btn ghost sm', 'aria-label': 'Excluir', onClick: async () => { if (await confirmar('Excluir este registro?', { ok: 'Excluir', perigo: true })) { mutate((st) => { st.atencao = st.atencao.filter((x) => x.id !== r.id); }); ctx.rerender(); } } }, '✕'))))))) : h('p', { class: 'muted' }, 'Nenhum registro ainda. Use a aba “Hoje do Luan”.')));
  return raiz;
}
