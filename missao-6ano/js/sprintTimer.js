// Cronômetro global do sprint/pausa. Vive fora das telas: toca o alarme e registra o sprint
// mesmo que o Luan troque de tela, e sobrevive a recarregar a página (horário absoluto em sessionStorage).
import { h } from './util/dom.js';
import { timerSalvo, salvarTimer, alarme, prepararAudio, manterTelaLigada } from './timer.js';
import { marcarSprint } from './actions.js';
import { abrirModal } from './ui.js';

let t = timerSalvo(); // { kind: 'sprint'|'pausa', data, idx, fimEm, total, temProximo }
let id = null;
const ouvTick = new Set();
const ouvFim = new Set();

export const atual = () => t;
export const aoTick = (fn) => (ouvTick.add(fn), () => ouvTick.delete(fn));
export const aoFim = (fn) => (ouvFim.add(fn), () => ouvFim.delete(fn));
export const restante = () => (t ? Math.max(0, (t.fimEm - Date.now()) / 1000) : 0);

function ligar() {
  if (id) return;
  id = setInterval(passo, 250);
}

function passo() {
  if (!t) { clearInterval(id); id = null; return; }
  const r = (t.fimEm - Date.now()) / 1000;
  ouvTick.forEach((f) => f(Math.max(0, r), t));
  if (r <= 0) finalizar();
}

function finalizar() {
  if (!t) return;
  const feito = t;
  t = null;
  salvarTimer(null);
  clearInterval(id);
  id = null;
  manterTelaLigada(false);
  alarme(feito.kind === 'sprint' ? 5 : 3);
  if (feito.kind === 'sprint') marcarSprint(feito.data, feito.idx, true, { min: Math.round(feito.total / 60) });
  mostrarAviso(feito);
  ouvFim.forEach((f) => f(feito));
}

function mostrarAviso(feito) {
  let fechar;
  const sprint = feito.kind === 'sprint';
  const corpo = h('div', { class: 'stack center', style: { padding: '8px' } },
    h('div', { class: 'big-emoji' }, sprint ? '✋' : '⏰'),
    h('h2', { style: { fontSize: '2rem' } }, sprint ? 'PARA! O cronômetro tocou.' : 'Acabou a pausa!'),
    h('p', null, sprint ? `Sprint ${feito.idx} concluído sentado. Parar no auge é o que faz você querer voltar amanhã.` : 'Hora de voltar para o próximo sprint.'),
    sprint && feito.temProximo
      ? h('div', { class: 'stack sm' },
        h('p', { class: 'muted small' }, 'Pausa de 5 minutos: água, banheiro, andar. Nunca tela.'),
        h('button', { class: 'btn amber lg block', onClick: () => { iniciar('pausa', feito.data, feito.idx, 5, true); fechar(); } }, '☕ Começar a pausa (5 min)'),
        h('button', { class: 'btn ghost block', onClick: () => fechar() }, 'Pular a pausa'))
      : h('button', { class: 'btn amber lg block', onClick: () => fechar() }, 'Ok!'));
  fechar = abrirModal(corpo, {});
}

/** Inicia um sprint (kind='sprint') ou pausa. Precisa ser chamado a partir de um clique (áudio e tela ligada). */
export function iniciar(kind, data, idx, minutos, temProximo = false) {
  prepararAudio();
  manterTelaLigada(true);
  t = { kind, data, idx, fimEm: Date.now() + minutos * 60000, total: minutos * 60, temProximo };
  salvarTimer(t);
  ligar();
  passo();
}

export function cancelar() {
  t = null;
  salvarTimer(null);
  manterTelaLigada(false);
  clearInterval(id);
  id = null;
  ouvTick.forEach((f) => f(0, null));
}

// Se a página foi recarregada com um timer em andamento, retoma (ou fecha, se já expirou).
if (t) {
  if (t.fimEm <= Date.now()) setTimeout(finalizar, 0);
  else ligar();
}
