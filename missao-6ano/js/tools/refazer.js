// "O erro volta amanhã": refazer, do zero, o que errou antes. Vale XP quando acerta (1×/dia).
import { h, limpar } from '../util/dom.js';
import { getState } from '../store.js';
import { errosParaRefazer, concluirRefazer } from '../actions.js';
import { conferir, respostaTexto } from '../core/problems.js';

export function montar({ hoje, aoMudar }) {
  const raiz = h('div', { class: 'stack' });
  let fb = null;
  let veCorrecao = false;

  function desenhar() {
    limpar(raiz);
    const lista = errosParaRefazer(getState(), hoje);
    if (!lista.length) {
      raiz.append(h('div', { class: 'card b4 center stack' }, h('div', { class: 'big-emoji' }, '✨'), h('h3', null, 'Nenhum erro para refazer'), h('p', { class: 'muted' }, 'Quando você errar um problema, ele volta aqui no dia seguinte.')));
      return;
    }
    const e = lista[0];
    const p = e.problema;
    raiz.append(h('div', { class: 'row between' }, h('span', { class: 'chip warn' }, `Erro de ${e.data.slice(8)}/${e.data.slice(5, 7)}`), h('span', { class: 'chip' }, `${lista.length} para refazer`)));
    if (p) {
      if (fb) {
        raiz.append(h('div', { class: `banner ${fb.ok ? 'ok' : 'erro'}` }, h('h4', null, fb.ok ? 'Refeito! Agora você domina esse.' : 'Ainda não — ele volta amanhã de novo'),
          h('p', null, `Resposta: ${respostaTexto(p)}`), h('p', { class: 'small' }, p.solucao)),
        h('button', { class: 'btn amber block', onClick: () => { fb = null; desenhar(); aoMudar?.(); } }, 'Continuar'));
        return;
      }
      const input = h('input', { type: 'text', inputmode: 'text', autocomplete: 'off', 'aria-label': 'Sua resposta', placeholder: 'Refaça do zero e digite a resposta' });
      const ir = () => {
        if (!input.value.trim()) return;
        const ok = conferir(p, input.value);
        concluirRefazer(e.id, ok, hoje);
        fb = { ok };
        desenhar();
      };
      input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') ir(); });
      raiz.append(h('div', { class: 'card' }, h('p', { class: 'eyebrow' }, p.topico), h('p', { style: { fontSize: '1.25rem', fontWeight: 700, margin: 0 } }, p.texto)),
        h('div', { class: 'row' }, h('div', { class: 'grow' }, input), h('button', { class: 'btn amber', onClick: ir }, 'Conferir')));
      setTimeout(() => input.focus(), 30);
    } else {
      // erro anotado à mão (diário de erros): refaz no papel e confirma
      raiz.append(h('div', { class: 'card stack' }, h('p', { class: 'eyebrow' }, `${e.disciplina}${e.assunto ? ' · ' + e.assunto : ''}`),
        h('p', { style: { fontSize: '1.15rem', fontWeight: 600, margin: 0 } }, e.enunciado || e.assunto || '(sem texto)'),
        h('p', { class: 'muted small' }, 'Refaça no papel, do zero, sem olhar a correção.'),
        veCorrecao ? h('div', { class: 'banner info' }, h('h4', null, 'Correção'), h('p', null, e.correcao || '—')) : h('button', { class: 'btn sm', onClick: () => { veCorrecao = true; desenhar(); } }, 'Ver a correção')),
      h('div', { class: 'grid c2' },
        h('button', { class: 'btn lg danger', onClick: () => { concluirRefazer(e.id, false, hoje); veCorrecao = false; desenhar(); aoMudar?.(); } }, 'Ainda errei'),
        h('button', { class: 'btn lg ok', onClick: () => { concluirRefazer(e.id, true, hoje); veCorrecao = false; desenhar(); aoMudar?.(); } }, 'Refiz e acertei')));
    }
  }
  desenhar();
  return raiz;
}
