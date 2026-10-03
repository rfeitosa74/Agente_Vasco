// Ações que alteram o estado, com feedback de XP. Telas chamam estas funções em vez de mexer no estado direto.
import { getState, mutate, mutateDay, getDay, uid, novoDia } from './store.js';
import { xpDoDia, xpAtivo, TABELA_XP, resumoSemana } from './core/xp.js';
import { planoDoDia } from './core/dayplan.js';
import { addDays, isWeekday, weekStart, today } from './util/dates.js';
import { toast, toastXP } from './ui.js';
import { deveSubir, FAIXAS } from './core/ginasio.js';
import { avaliar } from './core/leitner.js';

/** Executa `fn` sobre o dia e avisa quando o XP do dia aumentou (só se o XP já estiver ativo na fase). */
export function comXP(data, fn, motivo) {
  const antes = xpDoDia(getState(), data);
  const r = fn();
  const depois = xpDoDia(getState(), data);
  if (xpAtivo(getState(), data) && depois > antes) toastXP(depois - antes, motivo);
  return r;
}

export function alternarCampo(data, campo, motivo) {
  const novo = !getDay(data)[campo];
  comXP(data, () => mutateDay(data, (d) => { d[campo] = novo; }), motivo);
  return novo;
}

export function marcarSprint(data, idx, ok, extra = {}) {
  comXP(data, () => mutateDay(data, (d) => {
    if (ok) d.sprints[idx] = { ok: true, em: new Date().toISOString(), ...extra };
    else delete d.sprints[idx];
  }), 'Sprint concluído');
  // missão completa?
  const plano = planoDoDia(getState(), data);
  const feitos = plano.sprints.filter((s) => getDay(data).sprints[s.idx]?.ok).length;
  if (ok && plano.sprints.length && feitos === plano.sprints.length && xpAtivo(getState(), data) && !getDay(data).diaDificil) toast('Missão do Dia completa! 🎉', { ms: 2400 });
}

export function ativarDiaDificil(data, ligar = true) {
  mutateDay(data, (d) => { d.diaDificil = ligar; });
}

// ---------- erros e "o erro volta amanhã" ----------
export function proximoDiaDeMissao(data, livres = getState().config.diasLivres) {
  let d = addDays(data, 1);
  for (let i = 0; i < 14 && (!isWeekday(d) || livres.includes(d)); i++) d = addDays(d, 1);
  return d;
}

export function registrarErro(e) {
  const hoje = e.data || today();
  mutate((s) => {
    s.erros.push({
      id: uid(), origem: 'matematica', data: hoje, disciplina: 'Matemática', assunto: '', tipo: null, provaId: null, problema: null, leitura: null,
      redoOn: proximoDiaDeMissao(hoje, s.config.diasLivres), redoDone: false, redoOk: false, ...e,
    });
  });
}

export const errosParaRefazer = (state, hoje) =>
  state.erros.filter((e) => e.redoOn && e.redoOn <= hoje && !e.redoDone).sort((a, b) => (a.data < b.data ? -1 : 1)).slice(0, 5);

export function concluirRefazer(erroId, acertou, data) {
  comXP(data, () => {
    mutate((s) => {
      const e = s.erros.find((x) => x.id === erroId);
      if (!e) return;
      if (acertou) { e.redoDone = true; e.redoOk = true; e.refeitoEm = data; }
      else e.redoOn = proximoDiaDeMissao(data, s.config.diasLivres); // errou de novo: volta amanhã
    });
    if (acertou) mutateDay(data, (d) => { d.refezErro = true; }); // 10 XP, no máximo 1×/dia
  }, 'Refez o erro de ontem');
}

// ---------- provas ----------
export function salvarProva(p) {
  return mutate((s) => {
    if (p.id) {
      const i = s.provas.findIndex((x) => x.id === p.id);
      if (i >= 0) { s.provas[i] = { ...s.provas[i], ...p }; return p.id; }
    }
    const id = uid();
    s.provas.push({ id, criadaEm: today(), peso: 1, vermelho: [], nota: null, notaMax: 10, classificada: false, ...p });
    return id;
  });
}

export function classificarProva(provaId, erros, data = today()) {
  mutate((s) => {
    const prova = s.provas.find((p) => p.id === provaId);
    const jaClassificada = prova?.classificada;
    if (prova) prova.classificada = true;
    for (const e of erros) {
      s.erros.push({
        id: uid(), origem: 'prova', data, provaId, disciplina: prova?.disciplina || e.disciplina, assunto: e.assunto, enunciado: e.enunciado || '', correcao: e.correcao || '',
        tipo: e.tipo, problema: null, leitura: null,
        redoOn: prova?.disciplina === 'Matemática' && e.tipo !== 'C' ? proximoDiaDeMissao(data, s.config.diasLivres) : null, redoDone: false, redoOk: false,
      });
      // Erro tipo A (lacuna) vira carta-relâmpago
      if (e.tipo === 'A' && e.virarCarta !== false && (e.enunciado || e.assunto)) {
        s.cartas.push({
          id: uid(), disciplina: prova?.disciplina || 'Outra', frente: e.enunciado || e.assunto, verso: e.correcao || '(escreva a resposta correta)', tag: 'Erro de prova', origem: 'erro', provaId,
          caixa: 1, due: data, acertos: 0, erros: 0, criada: data,
        });
      }
    }
    if (!jaClassificada) {
      const d = (s.days[data] ||= novoDia());
      d.provasClassificadas = (d.provasClassificadas || 0) + 1;
    }
  });
  if (xpAtivo(getState(), data)) toastXP(TABELA_XP.provaClassificada.xp, 'Prova classificada');
}

// ---------- vermelho (D-2 → D-1) ----------
export function adicionarVermelho(provaId, txt, origem = 'manual', cartaId = null) {
  mutate((s) => {
    const p = s.provas.find((x) => x.id === provaId);
    if (!p) return;
    p.vermelho ||= [];
    if (cartaId && p.vermelho.some((v) => v.cartaId === cartaId)) return;
    p.vermelho.push({ id: uid(), txt, feito: false, origem, cartaId });
  });
}
export function alternarVermelho(provaId, itemId) {
  mutate((s) => {
    const it = s.provas.find((x) => x.id === provaId)?.vermelho?.find((v) => v.id === itemId);
    if (it) it.feito = !it.feito;
  });
}
export function removerVermelho(provaId, itemId) {
  mutate((s) => {
    const p = s.provas.find((x) => x.id === provaId);
    if (p) p.vermelho = (p.vermelho || []).filter((v) => v.id !== itemId);
  });
}

// ---------- cartas ----------
export function avaliarCarta(cartaId, lembrou, hoje = today()) {
  mutate((s) => {
    const i = s.cartas.findIndex((c) => c.id === cartaId);
    if (i >= 0) s.cartas[i] = avaliar(s.cartas[i], lembrou, hoje);
  });
}

// ---------- Ginásio ----------
export function registrarGinasio({ faixa, seg, erros, modo }, data = today()) {
  const def = FAIXAS[faixa - 1];
  const ok = def.meta != null ? seg <= def.meta : true;
  let subiu = false;
  mutate((s) => {
    s.ginasio.historico.push({ data, faixa, seg: Math.round(seg * 10) / 10, erros, ok, modo, em: new Date().toISOString() });
    const d = (s.days[data] ||= novoDia());
    const melhor = d.ginasio && d.ginasio.faixa === faixa && d.ginasio.seg <= seg ? d.ginasio : { faixa, seg, ok };
    d.ginasio = melhor;
    if (faixa === s.ginasio.faixa && deveSubir(s.ginasio.historico, faixa, data, s.config.diasLivres)) {
      s.ginasio.faixa = Math.min(5, faixa + 1);
      subiu = true;
    }
  });
  return { ok, subiu };
}

// ---------- semana ----------
export function fecharSemana(inicio, { recompensa, melhor }) {
  const r = resumoSemana(getState(), inicio);
  mutate((s) => {
    s.semanas[weekStart(inicio)] = { fechada: true, xp: r.total, nivel: r.nivel, recompensa: recompensa || '', melhor: melhor || '', fechadaEm: today() };
  });
}
