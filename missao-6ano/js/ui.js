// Componentes compartilhados de interface.
import { h, limpar } from './util/dom.js';

// ---------- toasts ----------
export function toast(msg, { xp = false, ms = 2600 } = {}) {
  const host = document.getElementById('toasts');
  if (!host) return;
  const t = h('div', { class: 'toast' + (xp ? ' xp' : ''), role: 'status' }, msg);
  host.append(t);
  setTimeout(() => t.remove(), ms);
}
export const toastXP = (xp, motivo) => toast(`+${xp} XP · ${motivo}`, { xp: true, ms: 3200 });

// ---------- modal ----------
export function abrirModal(conteudo, { titulo, aoFechar, larga = false } = {}) {
  const host = document.getElementById('overlay');
  const anterior = document.activeElement;
  const fechar = () => {
    fundo.remove();
    document.removeEventListener('keydown', esc);
    if (anterior && anterior.focus) anterior.focus();
    aoFechar?.();
  };
  const esc = (e) => { if (e.key === 'Escape') fechar(); };
  const caixa = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo || 'Janela', style: larga ? { width: 'min(820px,100%)' } : null },
    titulo && h('div', { class: 'card-title' }, h('h2', null, titulo), h('button', { class: 'btn ghost sm', 'aria-label': 'Fechar', onClick: fechar }, '✕')),
    conteudo);
  const fundo = h('div', { class: 'modal-back', onMousedown: (e) => { if (e.target === fundo) fechar(); } }, caixa);
  host.append(fundo);
  document.addEventListener('keydown', esc);
  setTimeout(() => (caixa.querySelector('input,textarea,select,button.primary,button.amber') || caixa).focus?.(), 30);
  return fechar;
}

export function confirmar(mensagem, { ok = 'Confirmar', cancelar = 'Cancelar', perigo = false, titulo = 'Confirmar' } = {}) {
  return new Promise((resolve) => {
    let fechar;
    const fim = (v) => { resolve(v); fechar(); };
    const corpo = h('div', { class: 'stack' },
      h('p', null, mensagem),
      h('div', { class: 'row', style: { justifyContent: 'flex-end' } },
        h('button', { class: 'btn ghost', onClick: () => fim(false) }, cancelar),
        h('button', { class: 'btn ' + (perigo ? 'danger' : 'primary'), onClick: () => fim(true) }, ok)));
    fechar = abrirModal(corpo, { titulo, aoFechar: () => resolve(false) });
  });
}

export function perguntarTexto(rotulo, { valor = '', titulo = 'Digite', multilinha = false, ok = 'Salvar', tipo = 'text' } = {}) {
  return new Promise((resolve) => {
    let fechar;
    const campo = multilinha ? h('textarea', { 'aria-label': rotulo }, valor) : h('input', { type: tipo, value: valor, 'aria-label': rotulo });
    const salvar = () => { resolve(campo.value); fechar(); };
    if (!multilinha) campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') salvar(); });
    const corpo = h('div', { class: 'stack' }, h('label', null, rotulo), campo,
      h('div', { class: 'row', style: { justifyContent: 'flex-end' } },
        h('button', { class: 'btn ghost', onClick: () => { resolve(null); fechar(); } }, 'Cancelar'),
        h('button', { class: 'btn primary', onClick: salvar }, ok)));
    fechar = abrirModal(corpo, { titulo, aoFechar: () => resolve(null) });
  });
}

// ---------- peças ----------
export const chip = (texto, cls = '') => h('span', { class: `chip ${cls}` }, texto);
export const banner = (tipo, titulo, ...filhos) => h('div', { class: `banner ${tipo}` }, titulo && h('h4', null, titulo), ...filhos.map((f) => (typeof f === 'string' ? h('p', null, f) : f)));

export function barra(valor, max, marcas = []) {
  const pct = Math.max(0, Math.min(100, (valor / max) * 100));
  return h('div', null,
    h('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': valor, 'aria-valuemin': 0, 'aria-valuemax': max },
      h('i', { style: { width: pct + '%' } }),
      ...marcas.map((m) => h('span', { class: 'mark', style: { left: (m.v / max) * 100 + '%' } }))),
    marcas.length ? h('div', { class: 'bar-labels' }, ...marcas.map((m) => h('span', { style: { left: (m.v / max) * 100 + '%' } }, m.rotulo))) : null);
}

export const secao = (titulo, ...filhos) => h('section', { class: 'stack' }, titulo && h('h2', null, titulo), ...filhos);

export function abas(opcoes, atual, aoMudar) {
  return h('div', { class: 'tabs', role: 'tablist' }, ...opcoes.map(([id, rotulo]) =>
    h('button', { role: 'tab', 'aria-selected': String(id === atual), onClick: () => aoMudar(id) }, rotulo)));
}

export function seg(opcoes, atual, aoMudar) {
  return h('div', { class: 'seg' }, ...opcoes.map(([id, rotulo]) => h('button', { 'aria-pressed': String(id === atual), onClick: () => aoMudar(id) }, rotulo)));
}

export function vazio(texto) {
  return h('div', { class: 'card flat center muted' }, texto);
}

export function baixarArquivo(nome, conteudo, tipo = 'application/json') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = h('a', { href: url, download: nome });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export { h, limpar };
