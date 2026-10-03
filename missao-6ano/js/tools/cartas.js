// Sessão de cartas-relâmpago (Leitner). Regra de ouro: tentar lembrar ANTES de virar.
import { h, limpar } from '../util/dom.js';
import { getState } from '../store.js';
import { devidas } from '../core/leitner.js';
import { avaliarCarta, adicionarVermelho } from '../actions.js';
import { toast } from '../ui.js';

/**
 * @param {{hoje:string, filtro?:Function, provaId?:string, titulo?:string, vermelho?:boolean, max?:number}} opts
 *   vermelho: erros nesta sessão entram na lista do vermelho da prova (estágio D-2).
 */
export function montar({ hoje, filtro = () => true, provaId = null, vermelho = false, max = 40, todas = false }) {
  const raiz = h('div', { class: 'stack' });
  // `todas`: ignora a data de revisão (usado no ciclo de prova, em que o objetivo é puxar tudo de novo)
  const inicial = todas ? getState().cartas.filter(filtro).sort((a, b) => a.caixa - b.caixa) : devidas(getState().cartas, hoje, filtro);
  let fila = inicial.slice(0, max).map((c) => c.id);
  let verso = false;
  const stats = { ok: 0, erro: 0 };
  const refeitas = new Set();
  let extra = false;

  const carta = () => getState().cartas.find((c) => c.id === fila[0]);

  function responder(lembrou) {
    const c = carta();
    if (!c) return;
    avaliarCarta(c.id, lembrou, hoje);
    if (lembrou) stats.ok++;
    else {
      stats.erro++;
      if (!refeitas.has(c.id)) { fila.push(c.id); refeitas.add(c.id); } // volta uma vez ainda nesta sessão
      if (vermelho && provaId) adicionarVermelho(provaId, c.frente, 'carta', c.id);
    }
    fila.shift();
    verso = false;
    desenhar();
  }

  function revisarMesmoAssim() {
    const todas = getState().cartas.filter(filtro).sort((a, b) => a.caixa - b.caixa).slice(0, 10);
    fila = todas.map((c) => c.id);
    extra = true;
    desenhar();
  }

  function desenhar() {
    limpar(raiz);
    const c = carta();
    if (!c) {
      const total = stats.ok + stats.erro;
      raiz.append(h('div', { class: 'card b4 center stack' },
        h('div', { class: 'big-emoji' }, total ? '🎉' : '📭'),
        h('h3', null, total ? 'Cartas de hoje terminadas!' : 'Nenhuma carta para hoje'),
        total ? h('p', null, `Você lembrou ${stats.ok} e errou ${stats.erro}. As que você errou voltam amanhã — errar aqui é ganhar ponto.`)
          : h('p', { class: 'muted' }, 'Tudo em dia! As cartas voltam quando for a hora certa de revisar.'),
        !extra && getState().cartas.some(filtro) ? h('button', { class: 'btn', onClick: revisarMesmoAssim }, 'Revisar as mais fracas mesmo assim') : null));
      return;
    }
    raiz.append(
      h('div', { class: 'row between' },
        h('span', { class: 'chip' }, `${c.disciplina}${c.tag ? ' · ' + c.tag : ''}`),
        h('span', { class: 'chip' }, `Faltam ${fila.length}`),
        h('div', { class: 'caixas', title: `Caixa ${c.caixa} de 5`, 'aria-label': `Caixa ${c.caixa} de 5` }, ...[1, 2, 3, 4, 5].map((n) => h('i', { class: n <= c.caixa ? 'on' : '' })))),
      h('div', { class: 'flash' + (verso ? ' verso' : ''), 'aria-live': 'polite' }, verso ? c.verso : c.frente),
      verso
        ? h('div', { class: 'grid c2' },
          h('button', { class: 'btn lg danger', onClick: () => responder(false) }, '😅 Errei'),
          h('button', { class: 'btn lg ok', onClick: () => responder(true) }, '✅ Lembrei'))
        : h('div', { class: 'stack sm' },
          h('p', { class: 'center muted small' }, 'Primeiro tente lembrar — em voz alta! Só depois vire.'),
          h('button', { class: 'btn lg amber block', onClick: () => { verso = true; desenhar(); } }, 'Virar a carta')));
  }

  desenhar();
  return raiz;
}

export const avisoSemCartas = () => toast('Sem cartas para revisar por enquanto.');
