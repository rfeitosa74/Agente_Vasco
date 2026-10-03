// Cartas-relâmpago (gestão do baralho): criar, importar em lote, editar e acompanhar as caixas.
import { h, limpar } from '../../util/dom.js';
import { getState, mutate } from '../../store.js';
import { novaCarta, resumo } from '../../core/leitner.js';
import { DISCIPLINAS } from '../../core/planner.js';
import { abrirModal, chip, confirmar, toast } from '../../ui.js';
import { fmtCurto } from '../../util/dates.js';

export default function cartasPai(ctx) {
  const s = getState();
  const hoje = ctx.hoje;
  const re = () => ctx.rerender();
  const fd = ctx.params.d || '';
  const ft = ctx.params.t || '';
  const q = (ctx.params.q || '').toLowerCase();
  const sel = s.cartas.filter((c) => (!fd || c.disciplina === fd) && (!ft || c.tag === ft) && (!q || (c.frente + ' ' + c.verso).toLowerCase().includes(q)));
  const r = resumo(s.cartas, (c) => !fd || c.disciplina === fd);
  const tags = [...new Set(s.cartas.filter((c) => !fd || c.disciplina === fd).map((c) => c.tag).filter(Boolean))].sort();
  const raiz = h('div', { class: 'stack lg' });
  const nav = (o) => { const p = new URLSearchParams({ d: fd, t: ft, q: ctx.params.q || '', ...o }); for (const [k, v] of [...p]) if (!v) p.delete(k); return `#/pai/cartas${p.toString() ? '?' + p : ''}`; };

  raiz.append(h('div', null, h('p', { class: 'eyebrow' }, 'Cartas-relâmpago'), h('h1', { style: { margin: 0 } }, 'Baralho'),
    h('p', { class: 'muted' }, 'Monte as cartas dos capítulos do bimestre. A revisão é espaçada: errou volta amanhã; acertou, o intervalo cresce (1 · 3 · 7 · 14 · 30 dias).')));

  raiz.append(h('div', { class: 'grid c4' },
    h('div', { class: 'stat' }, h('span', null, 'No baralho'), h('b', null, String(r.total))),
    h('div', { class: 'stat' }, h('span', null, 'Para hoje'), h('b', null, String(s.cartas.filter((c) => c.due <= hoje && (!fd || c.disciplina === fd)).length))),
    h('div', { class: 'stat' }, h('span', null, 'Dominadas'), h('b', null, String(r.dominadas))),
    h('div', { class: 'stat' }, h('span', null, 'Caixas 1→5'), h('b', { style: { fontSize: '1.1rem' } }, r.porCaixa.join(' · ')))));

  // ---- nova carta ----
  const disc = h('select', { 'aria-label': 'Disciplina' }, ...DISCIPLINAS.map((d) => h('option', { value: d, selected: d === (fd || 'História') }, d)));
  const tag = h('input', { type: 'text', 'aria-label': 'Capítulo ou tema', placeholder: 'Capítulo / tema (ex.: Egito)', list: 'tags-lista', value: ft });
  const frente = h('input', { type: 'text', 'aria-label': 'Frente', placeholder: 'Frente: a pergunta' });
  const verso = h('textarea', { 'aria-label': 'Verso', placeholder: 'Verso: a resposta', style: { minHeight: '64px' } });
  const add = () => {
    if (!frente.value.trim() || !verso.value.trim()) { toast('Preencha a frente e o verso.'); return; }
    mutate((st) => st.cartas.push(novaCarta({ disciplina: disc.value, frente: frente.value, verso: verso.value, tag: tag.value, origem: 'tutor', hoje })));
    toast('Carta criada'); frente.value = ''; verso.value = ''; re();
  };
  raiz.append(h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, 'Nova carta'),
    h('datalist', { id: 'tags-lista' }, ...tags.map((t) => h('option', { value: t }))),
    h('div', { class: 'form-row' }, h('div', { class: 'field' }, h('label', null, 'Disciplina'), disc), h('div', { class: 'field' }, h('label', null, 'Capítulo / tema'), tag)),
    h('div', { class: 'field' }, h('label', null, 'Frente'), frente), h('div', { class: 'field' }, h('label', null, 'Verso'), verso),
    h('div', { class: 'row' }, h('button', { class: 'btn primary', onClick: add }, 'Criar carta'), h('button', { class: 'btn', onClick: importar }, 'Importar várias de uma vez'))));

  // ---- filtros + lista ----
  const busca = h('input', { type: 'text', 'aria-label': 'Buscar', placeholder: 'Buscar nas cartas…', value: ctx.params.q || '' });
  busca.addEventListener('keydown', (e) => { if (e.key === 'Enter') ctx.go(nav({ q: busca.value })); });
  raiz.append(h('div', { class: 'card stack' },
    h('div', { class: 'row' },
      h('select', { 'aria-label': 'Filtrar disciplina', onChange: (e) => ctx.go(nav({ d: e.target.value, t: '' })) }, h('option', { value: '' }, 'Todas as disciplinas'), ...[...new Set(s.cartas.map((c) => c.disciplina))].map((d) => h('option', { value: d, selected: d === fd }, d))),
      h('select', { 'aria-label': 'Filtrar tema', onChange: (e) => ctx.go(nav({ t: e.target.value })) }, h('option', { value: '' }, 'Todos os temas'), ...tags.map((t) => h('option', { value: t, selected: t === ft }, t))),
      h('div', { class: 'grow' }, busca)),
    h('p', { class: 'small muted', style: { margin: 0 } }, `${sel.length} carta(s)${sel.length > 100 ? ' (mostrando 100)' : ''}`),
    sel.length ? h('div', { class: 'scroll-x' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'Frente'), h('th', null, 'Verso'), h('th', null, 'Caixa'), h('th', null, 'Revisão'), h('th', null, ''))),
      h('tbody', null, ...sel.slice(0, 100).map((c) => h('tr', null,
        h('td', null, h('b', null, c.frente), h('br'), h('small', { class: 'muted' }, `${c.disciplina}${c.tag ? ' · ' + c.tag : ''}${c.origem === 'erro' ? ' · de um erro de prova' : ''}`)),
        h('td', { class: 'small' }, c.verso), h('td', null, chip(String(c.caixa), c.caixa >= 4 ? 'ok' : c.caixa === 1 ? 'warn' : '')), h('td', { class: 'nowrap small' }, c.due <= hoje ? 'hoje' : fmtCurto(c.due)),
        h('td', { class: 'right nowrap' }, h('button', { class: 'btn sm', onClick: () => editar(c) }, 'Editar'), ' ', h('button', { class: 'btn sm danger', 'aria-label': 'Apagar', onClick: async () => { if (await confirmar('Apagar esta carta?', { ok: 'Apagar', perigo: true })) { mutate((st) => { st.cartas = st.cartas.filter((x) => x.id !== c.id); }); re(); } } }, '✕'))))))) : h('p', { class: 'muted' }, 'Nenhuma carta com esses filtros.')));
  return raiz;

  function editar(c) {
    const f = h('input', { type: 'text', value: c.frente, 'aria-label': 'Frente' });
    const v = h('textarea', { 'aria-label': 'Verso' }, c.verso);
    const t = h('input', { type: 'text', value: c.tag, 'aria-label': 'Tema' });
    let fechar;
    fechar = abrirModal(h('div', { class: 'stack' }, h('div', null, h('label', null, 'Frente'), f), h('div', null, h('label', null, 'Verso'), v), h('div', null, h('label', null, 'Tema'), t),
      h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('button', { class: 'btn', onClick: () => { mutate(() => { c.caixa = 1; c.due = hoje; }); fechar(); re(); } }, 'Zerar caixa'),
        h('div', { class: 'row' }, h('button', { class: 'btn ghost', onClick: () => fechar() }, 'Cancelar'), h('button', { class: 'btn primary', onClick: () => { mutate(() => { c.frente = f.value.trim(); c.verso = v.value.trim(); c.tag = t.value.trim(); }); fechar(); re(); } }, 'Salvar')))), { titulo: 'Editar carta' });
  }

  function importar() {
    const d = h('select', { 'aria-label': 'Disciplina' }, ...DISCIPLINAS.map((x) => h('option', { value: x, selected: x === (fd || 'História') }, x)));
    const t = h('input', { type: 'text', 'aria-label': 'Tema', placeholder: 'Capítulo / tema (opcional)' });
    const area = h('textarea', { 'aria-label': 'Cartas', style: { minHeight: '180px' }, placeholder: 'O que é uma pólis? | Cidade-Estado grega, com leis e governo próprios\nQuem foi Hamurábi? | Rei da Babilônia (~1750 a.C.), autor de um código de leis' });
    const previa = h('p', { class: 'small muted' });
    const ler = () => area.value.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((p) => p.length >= 2 && p[0] && p[1]);
    area.addEventListener('input', () => { previa.textContent = `${ler().length} carta(s) reconhecida(s)`; });
    let fechar;
    fechar = abrirModal(h('div', { class: 'stack' }, h('p', { class: 'muted small' }, 'Uma carta por linha, no formato: frente | verso'), h('div', { class: 'form-row' }, h('div', null, h('label', null, 'Disciplina'), d), h('div', null, h('label', null, 'Tema'), t)), area, previa,
      h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, h('button', { class: 'btn ghost', onClick: () => fechar() }, 'Cancelar'), h('button', { class: 'btn primary', onClick: () => {
        const itens = ler();
        if (!itens.length) { toast('Nada reconhecido.'); return; }
        mutate((st) => { for (const [fr, ve] of itens) st.cartas.push(novaCarta({ disciplina: d.value, frente: fr, verso: ve, tag: t.value, origem: 'tutor', hoje })); });
        toast(`${itens.length} carta(s) importada(s)`); fechar(); re();
      } }, 'Importar'))), { titulo: 'Importar cartas', larga: true });
  }
}
