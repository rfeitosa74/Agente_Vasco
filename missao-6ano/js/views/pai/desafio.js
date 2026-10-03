// Desafio do Pai (sábado, 25 min): quiz em clima de brincadeira, misturando a semana inteira.
// Truque que funciona: errar de propósito UMA vez e deixar o Luan corrigir.
import { h, limpar } from '../../util/dom.js';
import { getState, getDay, mutate, uid } from '../../store.js';
import { makeRng, shuffle, pick, hashStr } from '../../core/rng.js';
import { gerarConta } from '../../core/problems.js';
import { respostaTexto } from '../../core/problems.js';
import { PONTES } from '../../data/ponte.js';
import { avaliarCarta, alternarCampo } from '../../actions.js';
import { chip, toast } from '../../ui.js';
import { weekStart, addDays, fmtDiaLongo } from '../../util/dates.js';
import { abrirFechamento } from '../compartilhado.js';
import { resumoSemana } from '../../core/xp.js';
import { planoDoDia } from '../../core/dayplan.js';

const CONTAS = ['areaRet', 'perimetroRet', 'areaTri', 'fracaoDe', 'mmc', 'decSoma', 'potencia', 'porcento'];

function montarQuiz(state, hoje) {
  const rng = makeRng(hashStr(hoje) ^ state.cartas.length);
  const ini = weekStart(hoje);
  const semana = (d) => d >= ini && d <= addDays(ini, 6);
  const itens = [];
  // cartas fracas ou da semana
  const fracas = state.cartas.filter((c) => c.caixa <= 2 || c.erros > c.acertos || semana(c.criada || '')).sort(() => rng() - 0.5).slice(0, 8);
  for (const c of fracas) itens.push({ tipo: 'carta', rotulo: `${c.disciplina}${c.tag ? ' · ' + c.tag : ''}`, pergunta: c.frente, resposta: c.verso, cartaId: c.id });
  // perguntas do próprio Luan
  for (const p of state.perguntas.filter((x) => !x.respondida).slice(-4)) itens.push({ tipo: 'luan', rotulo: `Pergunta do Luan · ${p.disciplina}`, pergunta: p.texto, resposta: '(você responde — e ele confere)', perguntaId: p.id });
  // erros tipo A da semana (que não viraram carta)
  for (const e of state.erros.filter((x) => x.tipo === 'A' && semana(x.data) && (x.enunciado || x.assunto)).slice(0, 3)) itens.push({ tipo: 'erro', rotulo: `Erro de prova · ${e.disciplina}`, pergunta: e.enunciado || e.assunto, resposta: e.correcao || '—' });
  // pontes
  for (const p of shuffle(rng, PONTES).slice(0, 2)) itens.push({ tipo: 'ponte', rotulo: `Ponte da astronomia · ${p.topico}`, pergunta: p.pergunta, resposta: p.deixa });
  // matemática
  for (let i = 0; i < 3; i++) { const p = gerarConta(rng, pick(rng, CONTAS)); itens.push({ tipo: 'conta', rotulo: 'Matemática de cabeça', pergunta: p.texto, resposta: respostaTexto(p) }); }
  return shuffle(rng, itens);
}

export default function desafio(ctx) {
  const s = getState();
  const hoje = ctx.hoje;
  const re = () => ctx.rerender();
  const raiz = h('div', { class: 'stack lg' });
  const plano = planoDoDia(s, hoje);
  const ini = weekStart(hoje);
  const feito = getDay(hoje).desafio;

  raiz.append(h('div', null, h('p', { class: 'eyebrow' }, 'Bloco 4 · sábado · 25 min'), h('h1', { style: { margin: 0 } }, 'Desafio do Pai'),
    h('p', { class: 'muted' }, 'Você pergunta, ele responde, em clima de quiz — não de prova. Mistura a semana inteira. Fecha com a soma do XP e a escolha da recompensa.')));

  if (!plano.fase.desafio) raiz.append(h('div', { class: 'banner aviso' }, h('h4', null, 'Ainda não é a hora'), h('p', null, `O Desafio do Pai entra na semana 3 da rampa (fase atual: ${plano.fase.rotulo}). Você pode usar o quiz mesmo assim, se quiser.`)));

  let quiz = null, i = 0, mostrou = false;
  const res = { acertos: 0, total: 0, propositos: { ok: 0, total: 0 } };
  const area = h('div', { class: 'card stack' });
  raiz.append(area);

  function inicio() {
    limpar(area);
    area.append(h('h2', { style: { margin: 0 } }, 'Montar o quiz de hoje'), h('p', { class: 'muted small' }, 'O aplicativo mistura: cartas fracas, perguntas que o Luan escreveu, erros de prova, pontes da astronomia e contas de cabeça.'),
      h('div', { class: 'row' }, h('button', { class: 'btn primary lg', onClick: () => { quiz = montarQuiz(getState(), hoje); i = 0; res.acertos = 0; res.total = 0; res.propositos = { ok: 0, total: 0 }; mostrar(); } }, '▶ Começar o quiz'),
        h('button', { class: 'btn', onClick: () => abrirFechamento(ini, re) }, 'Só fechar a semana')));
  }

  function mostrar() {
    limpar(area);
    if (i >= quiz.length) return fim();
    const it = quiz[i];
    mostrou = false;
    const resp = h('div', { class: 'banner info hidden' }, h('h4', null, 'Resposta'), h('p', null, it.resposta));
    const botoes = h('div', { class: 'grid c2 hidden' }, h('button', { class: 'btn lg danger', onClick: () => responder(false) }, '✗ Errou'), h('button', { class: 'btn lg ok', onClick: () => responder(true) }, '✓ Acertou'));
    area.append(h('div', { class: 'row between' }, chip(`${i + 1} de ${quiz.length}`, 'info'), chip(it.rotulo)),
      h('div', { class: 'flash', style: { fontSize: '1.4rem' } }, it.pergunta), resp,
      h('button', { class: 'btn amber block', onClick: (e) => { resp.classList.remove('hidden'); botoes.classList.remove('hidden'); e.target.classList.add('hidden'); } }, 'Mostrar a resposta'), botoes,
      h('div', { class: 'row between' }, h('button', { class: 'btn ghost sm', onClick: () => { i++; mostrar(); } }, 'Pular'),
        h('div', { class: 'row tight' }, h('span', { class: 'small muted' }, 'Errei de propósito:'), h('button', { class: 'btn sm', title: 'O Luan percebeu e corrigiu', onClick: () => { res.propositos.total++; res.propositos.ok++; toast('Ele corrigiu o pai! 😎'); } }, '✓ corrigiu'), h('button', { class: 'btn sm', onClick: () => { res.propositos.total++; toast('Não percebeu — anote para revisar'); } }, '✗ não percebeu'))));
  }

  function responder(ok) {
    const it = quiz[i];
    res.total++;
    if (ok) res.acertos++;
    if (it.cartaId) avaliarCarta(it.cartaId, ok, hoje);
    if (it.perguntaId) mutate((st) => { const p = st.perguntas.find((x) => x.id === it.perguntaId); if (p) p.respondida = true; });
    i++;
    mostrar();
  }

  function fim() {
    limpar(area);
    mutate((st) => { st.desafios ||= []; st.desafios.push({ id: uid(), data: hoje, acertos: res.acertos, total: res.total, propositos: res.propositos }); });
    if (!getDay(hoje).desafio) alternarCampo(hoje, 'desafio', 'Desafio do Pai');
    const r = resumoSemana(getState(), hoje);
    area.append(h('div', { class: 'center stack' }, h('div', { class: 'big-emoji' }, '🏆'), h('h2', { style: { margin: 0 } }, `${res.acertos} de ${res.total} certas`),
      res.propositos.total ? h('p', null, `Você errou de propósito ${res.propositos.total}× e o Luan corrigiu ${res.propositos.ok}.`) : null,
      h('p', { class: 'muted' }, `XP da semana até agora: ⭐ ${r.total}. As cartas que ele errou voltam amanhã.`),
      h('div', { class: 'row', style: { justifyContent: 'center' } }, h('button', { class: 'btn primary', onClick: () => abrirFechamento(ini, re) }, 'Fechar a semana e escolher a recompensa'), h('button', { class: 'btn', onClick: inicio }, 'Outro quiz'))));
  }

  inicio();

  // histórico
  const hist = (s.desafios || []).slice(-6).reverse();
  if (hist.length) raiz.append(h('div', { class: 'card flat stack sm' }, h('h3', { style: { margin: 0 } }, 'Desafios anteriores'), ...hist.map((d) => h('div', { class: 'row between' }, h('span', null, fmtDiaLongo(d.data)), chip(`${d.acertos}/${d.total}`, d.acertos / (d.total || 1) >= .7 ? 'ok' : '')))));
  return raiz;
}
