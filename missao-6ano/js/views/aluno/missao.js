// Missão do Dia: sprints com cronômetro, passos da técnica e ferramentas embutidas.
import { h, svgDe } from '../../util/dom.js';
import { getState, getDay, mutateDay } from '../../store.js';
import { planoDoDia } from '../../core/dayplan.js';
import { REGRAS_SPRINT, DISC_COR } from '../../data/tecnicas.js';
import { ESTAGIOS } from '../../core/planner.js';
import { marcarSprint } from '../../actions.js';
import { atual, iniciar, cancelar, aoTick, aoFim, restante } from '../../sprintTimer.js';
import { mmss } from '../../timer.js';
import { confirmar, banner, chip } from '../../ui.js';
import { montar as tCartas } from '../../tools/cartas.js';
import { montar as tProblemas } from '../../tools/problemas.js';
import { montar as tRefazer } from '../../tools/refazer.js';
import { montar as tPerguntas } from '../../tools/perguntas.js';
import { montar as tTexto } from '../../tools/texto.js';
import { montar as tProva } from '../../tools/prova.js';

const R = 54, C = 2 * Math.PI * R;

function relogio() {
  const svg = svgDe(`<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="trk" cx="60" cy="60" r="${R}" stroke-width="9"/><circle class="prg" cx="60" cy="60" r="${R}" stroke-width="9" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="0"/></svg>`);
  const prg = svg.querySelector('.prg');
  const txt = h('b', { role: 'timer', 'aria-live': 'off' }, '00:00');
  const rot = h('span', null, '');
  const el = h('div', { class: 'ring' }, svg, h('div', { class: 'tx' }, h('div', null, txt, rot)));
  return { el, atualizar: (r, total, rotulo) => { txt.textContent = mmss(r); prg.setAttribute('stroke-dashoffset', (C * (1 - r / total)).toFixed(2)); rot.textContent = rotulo || ''; } };
}

/** Barra de tempo compacta e fixa no topo: o relógio gigante empurraria a ferramenta para fora da tela. */
function barraTempo() {
  const txt = h('b', { class: 'tb-time', role: 'timer', 'aria-live': 'off' }, '00:00');
  const fill = h('i', { style: { width: '100%' } });
  const el = h('div', { class: 'timer-bar' }, h('div', { class: 'row between' }, h('span', { class: 'small muted' }, '⏱ Sprint em andamento'), txt), h('div', { class: 'bar' }, fill));
  return { el, atualizar: (r, total) => { txt.textContent = mmss(r); fill.style.width = `${Math.max(0, (r / total) * 100)}%`; } };
}

function ferramenta(f, sprint, data, ctx) {
  switch (f.id) {
    case 'cartas': return tCartas({ hoje: data, filtro: (c) => c.disciplina === f.disciplina });
    case 'problemas': return tProblemas({ hoje: data, modo: 'cinco' });
    case 'enunciados': return tProblemas({ hoje: data, modo: 'enunciados' });
    case 'refazer': return tRefazer({ hoje: data, aoMudar: () => {} });
    case 'perguntas': return tPerguntas({ hoje: data, disciplina: f.disciplina });
    case 'texto': return tTexto({ hoje: data });
    case 'prova': return tProva({ hoje: data, provaId: f.provaId, estagio: f.estagio, disciplina: f.disciplina });
    default: return null;
  }
}

export default function missao(ctx) {
  const state = getState();
  const data = ctx.hoje;
  const plano = planoDoDia(state, data);
  const dia = getDay(data);
  const raiz = h('div', { class: 'stack lg' });

  // ----- dias sem Missão -----
  const aviso = {
    folga: ['😴', 'Domingo é folga total', 'Não se estuda domingo — e isso é regra do método. Descansar é o que consolida a semana. Rua, bola, desenho, o céu à noite…'],
    livre: ['🌴', 'Hoje é dia livre', 'Sem Missão hoje. Aproveite.'],
    sabado: ['🏆', 'Sábado é dia de Desafio do Pai', plano.fase.desafio ? 'Hoje a Missão é um quiz com o pai (25 min). Depois a gente soma o XP da semana!' : 'Hoje só o Aquecimento. O Desafio do Pai entra na semana 3.'],
    diaD: ['🍀', 'Hoje é dia de prova — não estude!', 'Só o Aquecimento. Revisar antes da prova aumenta a ansiedade e não acrescenta: o que ia entrar, já entrou. Se insistir, só o vermelho, 3 minutos.'],
    'sem-missao': ['🧘', 'Hoje só o Aquecimento', 'Caligrafia e o Ginásio de Cálculo. Missão do Dia volta quando o plano avançar.'],
  }[plano.tipo];
  if (aviso) {
    return h('div', { class: 'stack lg' }, h('div', { class: 'card center stack' }, h('div', { class: 'big-emoji' }, aviso[0]), h('h1', null, aviso[1]), h('p', { class: 'muted' }, aviso[2]),
      plano.tipo === 'diaD' ? h('div', { class: 'row', style: { justifyContent: 'center' } }, ...plano.estagios.filter((e) => e.estagio === 'D').map((e) => chip(`Prova de ${e.disciplina}`, 'info'))) : null,
      h('a', { class: 'btn amber', href: '#/aluno/hoje' }, 'Voltar ao Hoje')));
  }

  // ----- sprints (modo 5 minutos no dia difícil) -----
  const dificil = dia.diaDificil;
  const sprints = (dificil ? plano.sprints.slice(0, 1) : plano.sprints).map((s) => ({ ...s, minutos: dificil ? 5 : s.minutos }));
  const feito = (s) => !!dia.sprints[s.idx]?.ok;
  const proximo = sprints.find((s) => !feito(s));
  const timer = atual();
  const timerHoje = timer && timer.data === data ? timer : null;

  // Cabeçalho
  const cor = DISC_COR[sprints[0]?.disciplina] || 'var(--brand)';
  raiz.append(h('div', { class: 'card b2 stack sm', style: { borderLeft: `6px solid ${cor}` } },
    h('p', { class: 'eyebrow tint-b2' }, plano.tipo === 'ciclo' ? 'Semana de prova · ciclo D-3' : 'Missão do Dia'),
    h('h1', { style: { margin: 0 } }, plano.titulo),
    h('div', { class: 'row tight' },
      ...plano.estagios.filter((e) => e.estagio !== 'D').map((e) => chip(`${ESTAGIOS[e.estagio].rotulo} · ${ESTAGIOS[e.estagio].nome} · ${e.disciplina}`, 'info')),
      ...plano.estagios.filter((e) => e.estagio === 'D').map((e) => chip(`Prova de ${e.disciplina} hoje`, 'warn')),
      dificil ? chip('Modo 5 minutos', 'warn') : null,
      chip(`${sprints.length} sprint${sprints.length > 1 ? 's' : ''} de ${sprints[0].minutos} min`)),
    plano.avisos.length ? h('p', { class: 'small muted' }, plano.avisos.join(' ')) : null));

  // Regra dos 2 minutos: pergunta-ponte
  if (plano.ponte && !dia.ponteFeita && !timerHoje && !Object.keys(dia.sprints).length) {
    raiz.append(h('div', { class: 'card b3 stack' },
      h('p', { class: 'eyebrow tint-b3' }, 'Antes de começar · 2 minutos com o pai'),
      h('h2', { style: { margin: 0 } }, plano.ponte.pergunta),
      h('p', { class: 'muted small' }, 'O pai faz uma pergunta e você fala. Ele só dá a deixa — quem explica é você.'),
      h('div', { class: 'row' },
        h('button', { class: 'btn amber', onClick: () => { mutateDay(data, (d) => { d.ponteFeita = true; }); ctx.rerender(); } }, 'Respondi em voz alta ✓'),
        h('button', { class: 'btn ghost sm', onClick: () => { mutateDay(data, (d) => { d.ponteOffset = (d.ponteOffset || 0) + 1; }); ctx.rerender(); } }, 'Outra pergunta'))));
  }

  // Todos feitos
  if (!proximo) {
    raiz.append(h('div', { class: 'card b4 center stack' }, h('div', { class: 'big-emoji' }, '🎉'), h('h1', null, dificil ? 'Dia difícil vencido!' : 'Missão completa!'),
      h('p', null, dificil ? 'Em dia ruim, 5 minutos já mantêm a corrente. Isso é persistência.' : 'Você ficou os minutos todos sentado — isso é difícil. Descanse a cabeça.'),
      h('p', { class: 'muted small' }, plano.fase.xp ? 'À noite: “me explica” com o pai e o celular na base.' : 'Amanhã tem mais.'),
      h('a', { class: 'btn amber', href: '#/aluno/hoje' }, 'Voltar ao Hoje')));
  }

  // Cartões de sprint
  const relogios = [];
  sprints.forEach((s, i) => {
    const ativo = proximo && s.idx === proximo.idx;
    const rodando = timerHoje && timerHoje.kind === 'sprint' && timerHoje.idx === s.idx;
    const pausando = ativo && timerHoje && timerHoje.kind === 'pausa';
    const corpo = h('div', { class: 'stack' });
    const cartao = h('section', { class: 'card stack' + (ativo ? '' : ' flat'), 'aria-label': `Sprint ${s.idx}`, style: ativo ? { boxShadow: '0 0 0 2px var(--amber)' } : null },
      h('div', { class: 'row between' },
        h('div', null, h('p', { class: 'eyebrow' }, `Sprint ${s.idx} de ${sprints.length}`), h('h2', { style: { margin: 0 } }, s.titulo)),
        feito(s) ? chip('✓ feito', 'ok') : ativo ? chip(`${s.minutos} min`, 'warn') : chip('depois')),
      corpo);
    if (feito(s)) { raiz.append(cartao); return; }
    if (!ativo) { raiz.append(cartao); return; }

    // ---- sprint ativo ----
    if (pausando) {
      const r = relogio();
      relogios.push((seg) => r.atualizar(seg, timerHoje.total, 'pausa'));
      corpo.append(h('div', { class: 'timer-wrap' }, r.el, h('p', { class: 'muted center' }, 'Água, banheiro, andar. Nunca tela.')),
        h('button', { class: 'btn block', onClick: () => { cancelar(); ctx.rerender(); } }, 'Pular a pausa'));
    } else if (rodando) {
      const r = barraTempo();
      relogios.push((seg) => r.atualizar(seg, timerHoje.total));
      const fer = (s.ferramentas || []).map((f) => ferramenta(f, s, data, ctx)).filter(Boolean);
      corpo.append(r.el,
        fer.length ? h('div', { class: 'stack lg' }, ...fer) : null,
        h('details', { class: 'acc', open: !fer.length }, h('summary', null, 'Os passos deste sprint'), h('div', { class: 'acc-body' }, h('ol', { class: 'steps' }, ...s.passos.map((p) => h('li', null, p))))),
        h('p', { class: 'muted center small' }, 'Celular virado para baixo. Tocou? Você para — mesmo no meio.'),
        h('button', { class: 'btn ghost sm', onClick: async () => { if (await confirmar('Interromper o sprint? Ele não conta como concluído.', { ok: 'Interromper', perigo: true })) { cancelar(); ctx.rerender(); } } }, 'Interromper o sprint'));
    } else {
      corpo.append(
        h('ol', { class: 'steps' }, ...s.passos.map((p) => h('li', null, p))),
        h('details', { class: 'acc', open: i === 0 && !Object.keys(dia.sprints).length }, h('summary', null, 'As 5 regras do sprint'), h('div', { class: 'acc-body' }, h('ul', null, ...REGRAS_SPRINT.map((x) => h('li', null, x))))),
        timerHoje ? banner('aviso', null, 'Há outro cronômetro em andamento. Termine-o primeiro.') : h('button', { class: 'btn amber lg block', onClick: () => { iniciar('sprint', data, s.idx, s.minutos, sprints.some((x) => x.idx > s.idx && !feito(x))); ctx.rerender(); } }, `▶ Começar o sprint ${s.idx} · ${s.minutos} min`),
        h('div', { class: 'row', style: { justifyContent: 'center' } },
          h('button', { class: 'btn ghost sm', onClick: () => { marcarSprint(data, s.idx, true, { manual: true }); ctx.rerender(); } }, 'Usei o cronômetro de cozinha ✓')));
    }
    raiz.append(cartao);
  });

  if (proximo && !dificil) {
    raiz.append(h('div', { class: 'row', style: { justifyContent: 'center' } },
      h('button', { class: 'btn ghost sm', onClick: async () => { if (await confirmar('Hoje está difícil? O modo 5 minutos mantém a corrente: 1 sprint curto e pronto. Não vale pular — mas vale encurtar.', { ok: 'Modo 5 minutos' })) { mutateDay(data, (d) => { d.diaDificil = true; }); ctx.rerender(); } } }, 'Dia difícil? Modo 5 minutos')));
  }

  // atualização dos relógios + fim
  const offTick = aoTick((seg) => relogios.forEach((f) => f(seg)));
  const offFim = aoFim(() => ctx.rerender());
  ctx.onCleanup(() => { offTick(); offFim(); });
  if (timerHoje) relogios.forEach((f) => f(restante()));

  return raiz;
}
