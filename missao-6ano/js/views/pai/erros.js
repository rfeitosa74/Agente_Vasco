// Diário de erros (pós-prova, 5 min, 15 XP) e notas. A: não sabia · B: sabia e errei · C: fiquei em branco.
import { h, limpar } from '../../util/dom.js';
import { getState, mutate } from '../../store.js';
import { classificarProva } from '../../actions.js';
import { diagnosticoErros, distribuicaoErros, TIPOS_ERRO } from '../../core/insights.js';
import { DISCIPLINAS } from '../../core/planner.js';
import { graficoBarras, graficoLinha, legenda, CORES } from '../../charts.js';
import { chip, confirmar, toast, seg } from '../../ui.js';
import { fmtDia, fmtCurto } from '../../util/dates.js';
import { DISC_COR } from '../../data/tecnicas.js';

export default function erros(ctx) {
  const s = getState();
  const hoje = ctx.hoje;
  const re = () => ctx.rerender();
  const raiz = h('div', { class: 'stack lg' });

  raiz.append(h('div', null, h('p', { class: 'eyebrow' }, 'Depois da prova'), h('h1', { style: { margin: 0 } }, 'Erros e notas'),
    h('p', { class: 'muted' }, 'Quando a prova voltar corrigida (5 minutos, 15 XP): copie só as questões que ele errou, com a correção, e classifique cada uma.')));

  // ---- legenda dos tipos ----
  raiz.append(h('div', { class: 'grid c3' }, ...['A', 'B', 'C'].map((t) => h('div', { class: 'card flat stack sm' }, h('div', { class: 'row' }, h('span', { class: 'chip', style: { background: CORES[t], color: '#fff', border: 0 } }, t), h('b', null, TIPOS_ERRO[t].nome)),
    h('p', { class: 'small', style: { margin: 0 } }, TIPOS_ERRO[t].quando + '.'), h('p', { class: 'small muted', style: { margin: 0 } }, TIPOS_ERRO[t].acao)))));

  // ---- formulário de classificação ----
  const elegiveis = s.provas.filter((p) => !p.cancelada && p.data <= hoje).sort((a, b) => ((a.classificada ? 1 : 0) - (b.classificada ? 1 : 0)) || (a.data < b.data ? 1 : -1));
  const caixa = h('div', { class: 'card stack' });
  raiz.append(caixa);
  let provaId = ctx.params.p || elegiveis[0]?.id || '';
  let linhas = [];
  let nota = '';

  function desenharForm() {
    limpar(caixa);
    caixa.append(h('h2', { style: { margin: 0 } }, 'Classificar uma prova'));
    if (!elegiveis.length) { caixa.append(h('p', { class: 'muted' }, 'Cadastre as provas em “Semana e provas”. Elas aparecem aqui a partir do dia da prova.')); return; }
    const sel = h('select', { 'aria-label': 'Prova', onChange: (e) => { provaId = e.target.value; nota = String(s.provas.find((p) => p.id === provaId)?.nota ?? ''); desenharForm(); } },
      ...elegiveis.map((p) => h('option', { value: p.id, selected: p.id === provaId }, `${fmtDia(p.data)} · ${p.disciplina}${p.classificada ? ' (classificada)' : ''}`)));
    const prova = s.provas.find((p) => p.id === provaId);
    if (nota === '' && prova?.nota != null) nota = String(prova.nota);
    const notaIn = h('input', { type: 'number', min: 0, max: 10, step: 0.1, 'aria-label': 'Nota (0 a 10)', value: nota, onInput: (e) => { nota = e.target.value; } });
    caixa.append(h('div', { class: 'form-row' }, h('div', { class: 'field' }, h('label', null, 'Prova'), sel), h('div', { class: 'field' }, h('label', null, 'Nota (0 a 10)'), notaIn)),
      h('h3', { style: { margin: 0 } }, `Questões erradas (${linhas.length})`),
      ...linhas.map((l, i) => linhaErro(l, i)),
      h('div', { class: 'row' },
        h('button', { class: 'btn', onClick: () => { linhas.push({ assunto: '', enunciado: '', correcao: '', tipo: 'A', virarCarta: true }); desenharForm(); } }, '＋ Adicionar erro'),
        h('button', { class: 'btn primary', onClick: salvar }, prova?.classificada ? 'Salvar (sem novo XP)' : 'Salvar e classificar (+15 XP)')),
      h('p', { class: 'small muted', style: { margin: 0 } }, 'Prova sem erros? Salve só com a nota.'));
  }

  function linhaErro(l, i) {
    return h('div', { class: 'card flat stack sm' },
      h('div', { class: 'row between' }, h('b', null, `Erro ${i + 1}`), h('button', { class: 'btn ghost sm', 'aria-label': 'Remover', onClick: () => { linhas.splice(i, 1); desenharForm(); } }, '✕')),
      h('div', { class: 'form-row' },
        h('div', { class: 'field' }, h('label', null, 'Assunto'), h('input', { type: 'text', value: l.assunto, placeholder: 'Ex.: Egito — escrita', onInput: (e) => { l.assunto = e.target.value; } })),
        h('div', { class: 'field' }, h('label', null, 'Tipo do erro'), seg([['A', 'A · não sabia'], ['B', 'B · sabia e errei'], ['C', 'C · em branco']], l.tipo, (t) => { l.tipo = t; desenharForm(); }))),
      h('div', { class: 'field' }, h('label', null, 'Questão / o que perguntava'), h('textarea', { style: { minHeight: '56px' }, onInput: (e) => { l.enunciado = e.target.value; } }, l.enunciado)),
      h('div', { class: 'field' }, h('label', null, 'Correção (resposta certa)'), h('textarea', { style: { minHeight: '56px' }, onInput: (e) => { l.correcao = e.target.value; } }, l.correcao)),
      l.tipo === 'A' ? h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: l.virarCarta, onChange: (e) => { l.virarCarta = e.target.checked; } }), 'Virar carta-relâmpago (reaparece no Desafio do Pai)') : null);
  }

  function salvar() {
    const prova = s.provas.find((p) => p.id === provaId);
    if (!prova) return;
    const validos = linhas.filter((l) => l.assunto.trim() || l.enunciado.trim());
    mutate((st) => { const p = st.provas.find((x) => x.id === provaId); p.nota = nota === '' ? null : Number(nota); });
    const jaClass = prova.classificada;
    if (!jaClass || validos.length) classificarProva(provaId, validos.map((l) => ({ ...l, assunto: l.assunto.trim(), disciplina: prova.disciplina })), hoje);
    linhas = [];
    toast(validos.length ? `${validos.length} erro(s) registrado(s)` : 'Nota salva');
    re();
  }
  desenharForm();

  // ---- diagnóstico ----
  const classif = s.erros.filter((e) => e.tipo);
  const dg = diagnosticoErros(classif);
  const porDisc = DISCIPLINAS.filter((d) => classif.some((e) => e.disciplina === d));
  const diag = h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, 'O desenho que aparece'), h('div', { class: `banner ${dg.suficiente ? 'info' : 'aviso'}` }, h('p', null, dg.texto)));
  if (classif.length) {
    diag.append(h('div', { class: 'grid c3' }, ...['A', 'B', 'C'].map((t) => h('div', { class: 'stat' }, h('span', null, `Tipo ${t} · ${TIPOS_ERRO[t].nome}`), h('b', null, `${dg.d[t]}`), h('small', { class: 'muted' }, dg.d.total ? `${Math.round((dg.d[t] / dg.d.total) * 100)}%` : '')))));
    if (porDisc.length) {
      diag.append(h('h3', { style: { margin: 0 } }, 'Por disciplina'), graficoBarras({ titulo: 'Erros por tipo e disciplina', rotulos: porDisc, empilhado: true,
        series: ['A', 'B', 'C'].map((t) => ({ nome: `${t} · ${TIPOS_ERRO[t].nome}`, cor: CORES[t], valores: porDisc.map((d) => classif.filter((e) => e.disciplina === d && e.tipo === t).length) })) }),
      legenda(['A', 'B', 'C'].map((t) => ({ nome: `${t} · ${TIPOS_ERRO[t].nome}`, cor: CORES[t] }))));
    }
  }
  raiz.append(diag);

  // ---- notas ----
  const comNota = s.provas.filter((p) => p.nota != null && !p.cancelada).sort((a, b) => (a.data < b.data ? -1 : 1));
  if (comNota.length) {
    const discs = [...new Set(comNota.map((p) => p.disciplina))];
    raiz.append(h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, 'Notas'),
      h('div', { class: 'grid c2' }, ...discs.map((d) => {
        const ps = comNota.filter((p) => p.disciplina === d);
        return h('div', { class: 'stack sm' }, h('h3', { style: { margin: 0 } }, h('span', { class: 'dot', style: { '--c': DISC_COR[d] } }), ' ', d, h('span', { class: 'muted small' }, ` · média ${(ps.reduce((a, p) => a + p.nota, 0) / ps.length).toFixed(1).replace('.', ',')}`)),
          graficoLinha({ titulo: `Notas de ${d}`, cor: DISC_COR[d] || CORES.brand, pontos: ps.map((p) => ({ x: fmtCurto(p.data), y: p.nota })), refs: [{ v: 6, rotulo: 'média 6', cor: 'var(--muted)' }] }));
      }))));
  }

  // ---- lista de erros ----
  const lista = s.erros.slice().sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 80);
  raiz.append(h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, 'Erros registrados'),
    lista.length ? h('div', { class: 'scroll-x' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'Data'), h('th', null, 'Disciplina'), h('th', null, 'O que errou'), h('th', null, 'Tipo'), h('th', null, 'Refazer'), h('th', null, ''))),
      h('tbody', null, ...lista.map((e) => h('tr', null, h('td', { class: 'nowrap' }, fmtCurto(e.data)), h('td', null, e.disciplina), h('td', null, e.assunto || e.enunciado || '—', e.origem === 'matematica' ? h('span', { class: 'chip', style: { marginLeft: '6px' } }, e.leitura ? 'leitura' : 'conta') : null),
        h('td', null, e.tipo ? h('span', { class: 'chip', style: { background: CORES[e.tipo], color: '#fff', border: 0 } }, e.tipo) : '—'),
        h('td', null, e.redoOk ? chip('refeito ✓', 'ok') : e.redoOn ? chip(`volta ${fmtCurto(e.redoOn)}`, 'warn') : '—'),
        h('td', { class: 'right' }, h('button', { class: 'btn ghost sm', 'aria-label': 'Excluir erro', onClick: async () => { if (await confirmar('Excluir este erro do diário?', { ok: 'Excluir', perigo: true })) { mutate((st) => { st.erros = st.erros.filter((x) => x.id !== e.id); }); re(); } } }, '✕'))))))) : h('p', { class: 'muted' }, 'Nenhum erro registrado ainda.')));
  return raiz;
}
