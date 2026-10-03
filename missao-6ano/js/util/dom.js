// Construtor mínimo de DOM. Texto sempre entra como nó de texto (seguro contra injeção de HTML).
// O append/prepend/replaceChildren nativos transformam null/false em texto ("null") e listas em "a,b". Aqui ignoram vazios e achatam listas.
for (const metodo of ['append', 'prepend', 'replaceChildren']) {
  const original = Element.prototype[metodo];
  Element.prototype[metodo] = function (...nos) {
    return original.apply(this, nos.flat(Infinity).filter((n) => n != null && n !== false));
  };
}

export function h(tag, props, ...filhos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  adicionar(el, filhos);
  return el;
}

export function adicionar(el, filhos) {
  for (const f of filhos.flat(Infinity)) {
    if (f == null || f === false) continue;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return el;
}

export const limpar = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Cria elemento SVG a partir de uma string de marcação confiável (já escapada). */
export function svgDe(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
}

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
