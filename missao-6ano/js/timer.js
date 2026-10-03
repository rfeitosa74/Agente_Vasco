// Cronômetro baseado em horário absoluto (continua certo mesmo se a aba dormir ou recarregar) + alarme.
const CHAVE = 'missao6:timer';

let ctxAudio = null;
export function prepararAudio() {
  try {
    ctxAudio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctxAudio.state === 'suspended') ctxAudio.resume();
  } catch { /* sem áudio */ }
}

export function alarme(vezes = 4) {
  try {
    prepararAudio();
    if (!ctxAudio) return;
    const t0 = ctxAudio.currentTime;
    for (let i = 0; i < vezes * 2; i++) {
      const o = ctxAudio.createOscillator();
      const g = ctxAudio.createGain();
      o.type = 'square';
      o.frequency.value = i % 2 ? 880 : 1175;
      g.gain.setValueAtTime(0.0001, t0 + i * 0.28);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + i * 0.28 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.28 + 0.24);
      o.connect(g).connect(ctxAudio.destination);
      o.start(t0 + i * 0.28);
      o.stop(t0 + i * 0.28 + 0.26);
    }
  } catch { /* ignore */ }
  try { if (navigator.userActivation?.hasBeenActive !== false) navigator.vibrate?.([300, 150, 300, 150, 300]); } catch { /* ignore */ }
}

export function bip() {
  try {
    prepararAudio();
    if (!ctxAudio) return;
    const o = ctxAudio.createOscillator();
    const g = ctxAudio.createGain();
    o.frequency.value = 660;
    g.gain.setValueAtTime(0.0001, ctxAudio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctxAudio.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctxAudio.currentTime + 0.15);
    o.connect(g).connect(ctxAudio.destination);
    o.start();
    o.stop(ctxAudio.currentTime + 0.17);
  } catch { /* ignore */ }
}

let wake = null;
export async function manterTelaLigada(ligar) {
  try {
    if (ligar && 'wakeLock' in navigator) wake = await navigator.wakeLock.request('screen');
    else if (wake) { await wake.release(); wake = null; }
  } catch { /* não suportado ou negado */ }
}

export const mmss = (seg) => {
  const s = Math.max(0, Math.ceil(seg));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/** Retorna e persiste um timer ativo, se houver (sobrevive a recarregar a página). */
export const timerSalvo = () => {
  try { return JSON.parse(sessionStorage.getItem(CHAVE) || 'null'); } catch { return null; }
};
export const salvarTimer = (t) => { try { t ? sessionStorage.setItem(CHAVE, JSON.stringify(t)) : sessionStorage.removeItem(CHAVE); } catch { /* ignore */ } };

/**
 * Contagem regressiva. `aoTick(restanteSeg)` roda ~4×/s; `aoFim()` uma única vez.
 * @returns {{parar:Function, restante:Function}}
 */
export function contagemRegressiva({ fimEm, aoTick, aoFim }) {
  let acabou = false;
  const resto = () => (fimEm - Date.now()) / 1000;
  const passo = () => {
    const r = resto();
    aoTick?.(Math.max(0, r));
    if (r <= 0 && !acabou) {
      acabou = true;
      clearInterval(id);
      aoFim?.();
    }
  };
  const id = setInterval(passo, 250);
  const vis = () => { if (!document.hidden) passo(); };
  document.addEventListener('visibilitychange', vis);
  passo();
  return { parar: () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); }, restante: resto };
}
