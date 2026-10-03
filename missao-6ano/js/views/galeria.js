// Miniaturas e ampliação de imagens anexadas (páginas da apostila, fotos do caderno).
import { h } from '../util/dom.js';
import { urlDe } from '../anexos.js';
import { abrirModal } from '../ui.js';
import { baixarAnexo } from '../syncAnexos.js';

/** Miniatura que carrega a imagem do IndexedDB (ou busca na nuvem, se veio de outro aparelho). */
export function miniatura(id, { aoClicar, aoRemover, tamanho = 92 } = {}) {
  const img = h('img', { alt: 'Imagem anexada', draggable: 'false' });
  const ph = h('span', { class: 'thumb-ph' }, '⏳');
  const caixa = h('div', { class: 'thumb', style: { '--t': tamanho + 'px' } },
    h('button', { class: 'thumb-btn', type: 'button', 'aria-label': 'Ampliar imagem', onClick: aoClicar }, ph, img),
    aoRemover ? h('button', { class: 'thumb-x', type: 'button', 'aria-label': 'Remover imagem', onClick: (e) => { e.stopPropagation(); aoRemover(id); } }, '✕') : null);
  (async () => {
    let u = await urlDe(id);
    if (!u) { ph.textContent = '☁️'; try { await baixarAnexo(id); u = await urlDe(id); } catch { /* sem rede */ } }
    if (u) { img.src = u; ph.remove(); } else ph.textContent = '❔';
  })();
  return caixa;
}

export function galeria(ids, { aoRemover, tamanho } = {}) {
  if (!ids?.length) return null;
  return h('div', { class: 'thumbs' }, ...ids.map((id, i) => miniatura(id, { tamanho, aoClicar: () => abrirLightbox(ids, i), aoRemover })));
}

export function abrirLightbox(ids, inicio = 0) {
  let i = inicio;
  let zoom = 1;
  const img = h('img', { alt: 'Página ampliada', class: 'lb-img' });
  const cont = h('div', { class: 'lb-scroll' }, img);
  const pos = h('span', { class: 'chip' }, '');
  async function mostrar() {
    pos.textContent = `${i + 1} de ${ids.length}`;
    img.removeAttribute('src');
    let u = await urlDe(ids[i]);
    if (!u) { try { await baixarAnexo(ids[i]); u = await urlDe(ids[i]); } catch { /* ignore */ } }
    if (u) img.src = u;
    aplicarZoom();
  }
  function aplicarZoom() { img.style.width = `${zoom * 100}%`; cont.scrollTo?.(0, 0); }
  const nav = (d) => { i = (i + d + ids.length) % ids.length; zoom = 1; mostrar(); };
  const corpo = h('div', { class: 'stack sm' },
    h('div', { class: 'row between' },
      h('div', { class: 'row tight' }, ids.length > 1 ? h('button', { class: 'btn sm', 'aria-label': 'Anterior', onClick: () => nav(-1) }, '‹') : null, pos, ids.length > 1 ? h('button', { class: 'btn sm', 'aria-label': 'Próxima', onClick: () => nav(1) }, '›') : null),
      h('div', { class: 'row tight' }, h('button', { class: 'btn sm', 'aria-label': 'Diminuir', onClick: () => { zoom = Math.max(1, zoom - 0.5); aplicarZoom(); } }, '−'), h('button', { class: 'btn sm', 'aria-label': 'Aumentar', onClick: () => { zoom = Math.min(4, zoom + 0.5); aplicarZoom(); } }, '＋'))),
    cont, h('p', { class: 'small muted center' }, 'Use ＋ e − para ampliar; arraste para ver o resto.'));
  abrirModal(corpo, { titulo: 'Página da tarefa', larga: true });
  mostrar();
}
