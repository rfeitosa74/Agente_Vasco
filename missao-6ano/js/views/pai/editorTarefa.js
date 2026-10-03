// Editor de uma tarefa (usado ao receber e ao editar): disciplina, prazo, descrição, questões e imagens.
import { h } from '../../util/dom.js';
import { DISCIPLINAS } from '../../core/planner.js';
import { TIPOS_ITEM, ORIGENS, novoItem } from '../../core/tarefas.js';
import { extrairItens } from '../../core/zap.js';
import { fmtDia } from '../../util/dates.js';
import { miniatura, abrirLightbox } from '../galeria.js';
import { DISC_COR } from '../../data/tecnicas.js';

const opcoes = (obj, atual) => Object.entries(obj).map(([k, v]) => h('option', { value: k, selected: k === atual }, v));

/**
 * @param {object} t   rascunho da tarefa (é alterado direto)
 * @param {{imagens?: string[], aoRemover?: Function, avisoPrazo?: boolean, titulo?: string}} o
 */
export function editorTarefa(t, { imagens = [], aoRemover, avisoPrazo = false } = {}) {
  const raiz = h('div', { class: 'card stack', style: { borderLeft: `6px solid ${DISC_COR[t.disciplina] || 'var(--brand)'}` } });

  function desenhar() {
    raiz.replaceChildren();
    raiz.style.borderLeftColor = DISC_COR[t.disciplina] || 'var(--brand)';
    const disc = h('select', { 'aria-label': 'Disciplina', onChange: (e) => { t.disciplina = e.target.value; desenhar(); } }, ...DISCIPLINAS.map((d) => h('option', { value: d, selected: d === t.disciplina }, d)));
    const data = h('input', { type: 'date', 'aria-label': 'Data de entrega', value: t.entrega, onChange: (e) => { if (e.target.value) { t.entrega = e.target.value; t.entregaDetectada = true; desenhar(); } } });
    const min = h('input', { type: 'number', min: 5, max: 240, step: 5, 'aria-label': 'Tempo estimado em minutos', placeholder: 'auto', value: t.minutos || '', onInput: (e) => { t.minutos = Number(e.target.value) || null; } });
    const origem = h('select', { 'aria-label': 'De onde veio', onChange: (e) => { t.origem = e.target.value; } }, ...opcoes(ORIGENS, t.origem));
    const titulo = h('input', { type: 'text', 'aria-label': 'Título da tarefa', placeholder: 'Ex.: Livro pág. 54, ex. 1 a 3', value: t.titulo, onInput: (e) => { t.titulo = e.target.value; } });
    const desc = h('textarea', { 'aria-label': 'Descrição', placeholder: 'O que o professor pediu (páginas, instruções…)', style: { minHeight: '70px' }, onInput: (e) => { t.descricao = e.target.value; } }, t.descricao);

    raiz.append(
      h('div', { class: 'row between' }, h('span', { class: 'eyebrow' }, 'Tarefa'), aoRemover ? h('button', { class: 'btn ghost sm', type: 'button', onClick: aoRemover }, '🗑 Remover') : null),
      h('div', { class: 'form-row' },
        h('div', { class: 'field' }, h('label', null, 'Disciplina'), disc),
        h('div', { class: 'field' }, h('label', null, 'Para entregar em'), data, h('span', { class: 'hint' }, fmtDia(t.entrega), t.entregaDetectada === false && avisoPrazo ? ' · estimado — confira' : '')),
        h('div', { class: 'field' }, h('label', null, 'Tempo (min)'), min),
        h('div', { class: 'field' }, h('label', null, 'Origem'), origem)),
      h('div', { class: 'field' }, h('label', null, 'Título'), titulo),
      h('div', { class: 'field' }, h('label', null, 'Descrição / instruções'), desc));

    // ----- imagens -----
    if (imagens.length) {
      raiz.append(h('div', { class: 'field' }, h('label', null, 'Imagens desta tarefa (desmarque as que não pertencem a ela)'),
        h('div', { class: 'thumbs' }, ...imagens.map((id, i) => {
          const marcada = t.anexos.includes(id);
          return h('label', { class: 'thumb-sel' + (marcada ? ' on' : '') },
            miniatura(id, { aoClicar: (e) => { e?.preventDefault?.(); abrirLightbox(imagens, i); }, tamanho: 84 }),
            h('input', { type: 'checkbox', checked: marcada, 'aria-label': `Usar imagem ${i + 1}`, onChange: (e) => { t.anexos = e.target.checked ? [...new Set([...t.anexos, id])] : t.anexos.filter((x) => x !== id); desenhar(); } }));
        }))));
    }

    // ----- questões -----
    const lista = h('div', { class: 'stack sm' });
    t.itens.forEach((it, i) => lista.append(linhaItem(it, i)));
    raiz.append(h('div', { class: 'stack sm' },
      h('div', { class: 'row between' }, h('b', null, t.itens.length ? `Questões (${t.itens.length})` : 'Questões'), h('span', { class: 'small muted' }, t.itens.length ? 'O Luan responde no app.' : 'Sem questões: o Luan faz no caderno e manda foto.')),
      lista,
      h('div', { class: 'row tight' },
        h('button', { class: 'btn sm', type: 'button', onClick: () => { t.itens.push(novoItem({ enunciado: '' })); desenhar(); } }, '＋ Questão'),
        !t.itens.length && t.descricao.trim() ? h('button', { class: 'btn sm', type: 'button', title: 'Separa “1) …”, “2) …”, “a) …” do texto da descrição', onClick: () => {
          const { itens, sobra } = extrairItens(t.descricao.split('\n').map((l) => l.trim()).filter(Boolean));
          if (itens.length) { t.itens = itens; t.descricao = sobra.join('\n'); desenhar(); }
        } }, '✂️ Separar questões do texto') : null)));
  }

  function linhaItem(it, i) {
    const tipo = h('select', { 'aria-label': `Tipo da questão ${i + 1}`, onChange: (e) => { it.tipo = e.target.value; desenhar(); } }, ...opcoes(TIPOS_ITEM, it.tipo));
    const enun = h('textarea', { 'aria-label': `Questão ${i + 1}`, placeholder: 'Enunciado da questão', style: { minHeight: it.tipo === 'redacao' ? '80px' : '52px' }, onInput: (e) => { it.enunciado = e.target.value; } }, it.enunciado);
    const alternativas = it.tipo === 'objetiva' ? h('textarea', { 'aria-label': 'Alternativas', placeholder: 'Uma alternativa por linha', style: { minHeight: '60px' }, onInput: (e) => { it.opcoes = e.target.value.split('\n').map((x) => x.trim()).filter(Boolean); } }, it.opcoes.join('\n')) : null;
    const gab = h('input', { type: 'text', 'aria-label': 'Gabarito', placeholder: it.tipo === 'objetiva' ? 'Letra certa (ex.: b)' : it.tipo === 'vf' ? 'V ou F' : 'Resposta certa', value: it.gabarito, onInput: (e) => { it.gabarito = e.target.value; } });
    return h('div', { class: 'card flat stack sm' },
      h('div', { class: 'row between' }, h('span', { class: 'chip' }, `${i + 1}`), h('div', { class: 'row tight' }, tipo, h('button', { class: 'btn ghost sm', type: 'button', 'aria-label': 'Remover questão', onClick: () => { t.itens.splice(i, 1); desenhar(); } }, '✕'))),
      enun, alternativas,
      it.tipo === 'redacao' ? null : h('details', { class: 'acc' }, h('summary', null, 'Gabarito (opcional — corrige sozinho)'), h('div', { class: 'acc-body' }, gab)));
  }

  desenhar();
  return raiz;
}
