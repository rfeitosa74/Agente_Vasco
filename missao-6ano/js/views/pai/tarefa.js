// Detalhe e correção de uma tarefa (pai).
import { h } from '../../util/dom.js';
import { getState } from '../../store.js';
import { tarefaPorId, atualizarTarefa, excluirTarefa, conferirAutomatico, concluirConferencia, marcarFeita, desfazerFeita } from '../../actionsTarefas.js';
import { statusDe, situacaoDe, estimarMinutos, ROTULO_STATUS, TIPOS_ITEM, ORIGENS, resumoConferencia, progressoDe } from '../../core/tarefas.js';
import { galeria } from '../galeria.js';
import { editorTarefa } from './editorTarefa.js';
import { abrirModal, banner, chip, confirmar, toast } from '../../ui.js';
import { removerReferencia } from '../../pesquisa.js';
import { fmtDia } from '../../util/dates.js';
import { DISC_COR } from '../../data/tecnicas.js';
import { TIPOS_ERRO } from '../../core/insights.js';
import { CORES } from '../../charts.js';

const PONTOS_REDACAO = ['Tema', 'Coerência', 'Ortografia', 'Pontuação', 'Parágrafos', 'Letra / caligrafia'];
const palavras = (t) => (String(t).trim().match(/\S+/g) || []).length;

export default function tarefa(ctx) {
  const t = tarefaPorId(ctx.params.id);
  const hoje = ctx.hoje;
  const re = () => ctx.rerender();
  if (!t) return h('div', { class: 'stack' }, banner('aviso', 'Tarefa não encontrada', 'Ela pode ter sido excluída.'), h('a', { class: 'btn', href: '#/pai/tarefas' }, '← Tarefas'));

  const st = statusDe(t);
  const raiz = h('div', { class: 'stack lg' });
  const pr = progressoDe(t);

  // ---------- cabeçalho ----------
  raiz.append(
    h('a', { href: '#/pai/tarefas', class: 'small' }, '← todas as tarefas'),
    h('div', { class: 'card stack sm', style: { borderLeft: `6px solid ${DISC_COR[t.disciplina] || 'var(--brand)'}` } },
      h('div', { class: 'row tight' }, chip(t.rotuloOriginal || t.disciplina), chip(ROTULO_STATUS[st], st === 'conferida' ? 'ok' : st === 'feita' ? 'warn' : ''), situacaoDe(t, hoje) === 'atrasada' ? chip('atrasada', 'bad') : null, chip(ORIGENS[t.origem] || t.origem)),
      h('h1', { style: { margin: 0 } }, t.titulo),
      h('p', { class: 'small muted', style: { margin: 0 } }, `Para entregar em ${fmtDia(t.entrega)} · ~${estimarMinutos(t)} min${t.tempoGasto ? ` · o Luan levou ${t.tempoGasto} min` : ''}${pr.total ? ` · ${pr.feitos}/${pr.total} respondidas` : ''}`),
      t.descricao ? h('div', { class: 'quote' }, t.descricao) : null,
      h('div', { class: 'row tight no-print' }, h('button', { class: 'btn sm', onClick: editar }, '✏️ Editar'), h('button', { class: 'btn sm danger', onClick: async () => { if (await confirmar(`Excluir a tarefa “${t.titulo}” e as imagens dela? O Luan deixa de vê-la.`, { ok: 'Excluir', perigo: true })) { await excluirTarefa(t.id); ctx.go('#/pai/tarefas'); } } }, '🗑 Excluir'))));

  if (t.anexos?.length) raiz.append(h('div', { class: 'card stack sm' }, h('h3', { style: { margin: 0 } }, 'Páginas / imagens da tarefa'), galeria(t.anexos, { tamanho: 110 })));

  // ---------- fontes online ----------
  const q = encodeURIComponent((t.pesquisas && t.pesquisas[0]) || t.titulo.replace(/^Reda[cç][aã]o:\s*/i, ''));
  raiz.append(h('div', { class: 'card stack sm no-print' }, h('div', { class: 'row between' }, h('h3', { style: { margin: 0 } }, '🔎 Fontes online'), h('a', { class: 'btn sm', href: `#/pai/pesquisar?q=${q}&d=${encodeURIComponent(t.disciplina)}&t=${t.id}` }, 'Pesquisar sobre esta tarefa')),
    (t.pesquisas || []).length ? h('p', { class: 'small', style: { margin: 0 } }, 'Temas para o Luan: ', t.pesquisas.join(', ')) : h('p', { class: 'small muted', style: { margin: 0 } }, 'Dica: em “Editar”, liste temas para pesquisar e o Luan os vê na tarefa.'),
    ...(t.referencias || []).map((r) => h('div', { class: 'row between' }, h('span', { class: 'small' }, `📎 ${r.titulo} (${r.fonte})`), h('button', { class: 'btn ghost sm', 'aria-label': 'Remover referência', onClick: () => { removerReferencia(t.id, r.id); re(); } }, '✕')))));

  // ---------- estado ----------
  if (!t.feitaEm) {
    raiz.append(h('div', { class: 'banner aviso' }, h('h4', null, 'O Luan ainda não marcou como feita'), h('p', null, 'Você pode conferir assim mesmo (por exemplo, se ele fez no caderno e mostrou) ou marcar como feita por ele.'),
      h('button', { class: 'btn sm', onClick: () => { marcarFeita(t.id); re(); } }, 'Marcar como feita')));
  }

  // fotos do caderno do Luan
  if (t.fotosCaderno?.length) raiz.append(h('div', { class: 'card stack sm' }, h('h3', { style: { margin: 0 } }, '📓 Fotos do caderno do Luan'), galeria(t.fotosCaderno, { tamanho: 110 })));
  if (t.respondeuNoCaderno && !t.itens.length) raiz.append(h('p', { class: 'small muted' }, 'O Luan disse que fez tudo no caderno.'));

  // ---------- itens ----------
  if (t.itens.length) {
    const auto = t.itens.some((i) => i.gabarito && i.resposta && !i.correcao.res);
    raiz.append(h('div', { class: 'row between' }, h('h2', { style: { margin: 0 } }, 'Conferência'),
      auto ? h('button', { class: 'btn sm', onClick: () => { const n = conferirAutomatico(t.id); toast(n ? `${n} questão(ões) corrigida(s) pelo gabarito` : 'Nada para corrigir sozinho'); re(); } }, '⚡ Corrigir pelo gabarito') : null));
    t.itens.forEach((i, idx) => raiz.append(cartaoItem(i, idx)));
  }

  // ---------- fechamento ----------
  const cf = resumoConferencia(t);
  const pct = t.itens.length ? Math.round(((cf.certo + cf.parcial * 0.5) / t.itens.length) * 100) : null;
  const coment = h('textarea', { 'aria-label': 'Comentário para o Luan', placeholder: 'Um recado para o Luan: o que foi bem, o que rever. Elogie o processo, não a inteligência.', style: { minHeight: '70px' } }, t.comentarioPai || '');
  const nota = h('input', { type: 'number', min: 0, max: 10, step: 0.1, 'aria-label': 'Nota (opcional)', placeholder: pct != null ? String((pct / 10).toFixed(1)) : '0–10', value: t.nota ?? '' });
  raiz.append(h('div', { class: 'card stack' },
    h('h2', { style: { margin: 0 } }, st === 'conferida' ? 'Conferida ✓' : 'Concluir a conferência'),
    t.itens.length ? h('p', { class: 'small muted', style: { margin: 0 } }, `✓ ${cf.certo} certas · ◐ ${cf.parcial} parciais · ✗ ${cf.errado} erradas · ${cf.aberto} sem correção${pct != null ? ` · ${pct}%` : ''}`) : null,
    h('div', { class: 'form-row' }, h('div', { class: 'field', style: { gridColumn: '1 / -1' } }, h('label', null, 'Comentário para o Luan'), coment), h('div', { class: 'field' }, h('label', null, 'Nota (opcional)'), nota)),
    h('p', { class: 'small muted', style: { margin: 0 } }, 'As questões erradas vão para o Diário de erros (com o tipo A/B/C). Erro tipo A com gabarito vira carta-relâmpago; erro de Matemática volta amanhã para refazer.'),
    h('div', { class: 'row' }, h('button', { class: 'btn primary lg', onClick: () => { concluirConferencia(t.id, { comentario: coment.value.trim(), nota: nota.value === '' ? (pct != null ? Number((pct / 10).toFixed(1)) : null) : Number(nota.value) }); re(); } }, st === 'conferida' ? 'Atualizar conferência' : '✓ Concluir conferência'),
      t.feitaEm && st !== 'conferida' ? h('button', { class: 'btn ghost', onClick: () => { desfazerFeita(t.id); re(); } }, 'Desfazer “feita”') : null)));
  return raiz;

  // ================= helpers =================
  function cartaoItem(i, idx) {
    const c = i.correcao;
    const set = (fn) => { atualizarTarefa(t.id, (tt) => fn(tt.itens.find((x) => x.id === i.id).correcao, tt.itens.find((x) => x.id === i.id))); };
    const resBtn = (res, rotulo, cls) => h('button', { class: `btn res-btn ${cls}`, 'aria-pressed': String(c.res === res), onClick: () => { set((cc) => { cc.res = cc.res === res ? null : res; if (cc.res !== 'errado') cc.tipoErro = null; }); re(); } }, rotulo);
    const gab = h('input', { type: 'text', value: i.gabarito, 'aria-label': 'Gabarito', placeholder: i.tipo === 'objetiva' ? 'Letra certa' : 'Resposta certa (opcional)', onChange: (e) => { set((cc, it) => { it.gabarito = e.target.value; }); } });
    const com = h('input', { type: 'text', value: c.comentario || '', 'aria-label': 'Comentário da questão', placeholder: 'Comentário (aparece para o Luan)', onChange: (e) => set((cc) => { cc.comentario = e.target.value; }) });
    return h('div', { class: 'card stack sm' },
      h('div', { class: 'row between' }, h('div', { class: 'row tight' }, h('span', { class: 'chip' }, `${idx + 1}`), h('span', { class: 'chip' }, TIPOS_ITEM[i.tipo]), c.auto ? chip('corrigida pelo gabarito', 'info') : null, c.registrado ? chip('no diário de erros', 'warn') : null)),
      h('div', { class: 'quote' }, i.enunciado || '(sem enunciado)'),
      i.opcoes?.length ? h('ul', { class: 'small', style: { margin: 0 } }, ...i.opcoes.map((o, k) => h('li', null, `${String.fromCharCode(97 + k)}) ${o}`))) : null,
      h('div', { class: 'stack sm' }, h('b', { class: 'small' }, 'Resposta do Luan'),
        i.resposta?.trim() ? h('div', { class: 'quote' + (i.tipo === 'redacao' ? ' texto-redacao' : '') }, i.resposta) : h('p', { class: 'small muted', style: { margin: 0 } }, '(sem resposta digitada)'),
        i.tipo === 'redacao' && i.resposta?.trim() ? h('span', { class: 'small muted' }, `${palavras(i.resposta)} palavras · ${i.resposta.split('\n').filter((l) => l.trim()).length} parágrafo(s)/linha(s)`) : null,
        i.anexos?.length ? galeria(i.anexos, { tamanho: 90 }) : null),
      i.refeita ? h('div', { class: 'stack sm' }, h('b', { class: 'small' }, 'Refeita pelo Luan'), h('div', { class: 'quote' }, i.refeita)) : null,
      i.tipo === 'redacao' ? null : h('div', { class: 'field' }, h('label', null, 'Gabarito'), gab),
      h('div', { class: 'row tight' }, resBtn('certo', '✓ Certo', 'certo'), resBtn('parcial', '◐ Parcial', 'parcial'), resBtn('errado', '✗ Errado', 'errado')),
      c.res === 'errado' ? h('div', { class: 'stack sm' }, h('span', { class: 'small muted' }, 'Que tipo de erro foi?'),
        h('div', { class: 'row tight' }, ...['A', 'B', 'C'].map((k) => h('button', { class: 'btn sm', title: `${TIPOS_ERRO[k].nome}: ${TIPOS_ERRO[k].quando}`, 'aria-pressed': String(c.tipoErro === k), style: c.tipoErro === k ? { background: CORES[k], color: '#fff', borderColor: 'transparent' } : null, onClick: () => { set((cc) => { cc.tipoErro = cc.tipoErro === k ? null : k; }); re(); } }, `${k} · ${TIPOS_ERRO[k].nome}`)))) : null,
      i.tipo === 'redacao' ? h('div', { class: 'stack sm' }, h('span', { class: 'small muted' }, 'O que melhorar:'), h('div', { class: 'row tight' }, ...PONTOS_REDACAO.map((p) => { const on = (c.pontos || []).includes(p); return h('button', { class: 'btn sm', 'aria-pressed': String(on), style: on ? { background: 'var(--warn-soft)', borderColor: 'var(--amber)' } : null, onClick: () => { set((cc) => { cc.pontos = on ? cc.pontos.filter((x) => x !== p) : [...(cc.pontos || []), p]; }); re(); } }, (on ? '● ' : '') + p); }))) : null,
      com);
  }

  function editar() {
    const copia = structuredClone({ ...t });
    let fechar;
    const ed = editorTarefa(copia, { imagens: [...new Set([...(t.anexos || [])])] });
    fechar = abrirModal(h('div', { class: 'stack' }, ed, h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, h('button', { class: 'btn ghost', onClick: () => fechar() }, 'Cancelar'), h('button', { class: 'btn primary', onClick: () => {
      atualizarTarefa(t.id, (tt) => { for (const k of ['disciplina', 'titulo', 'descricao', 'entrega', 'minutos', 'origem', 'anexos', 'itens']) tt[k] = copia[k]; });
      fechar(); re(); toast('Tarefa atualizada');
    } }, 'Salvar'))), { titulo: 'Editar tarefa', larga: true });
  }
}
