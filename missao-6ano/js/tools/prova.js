// Ferramenta do ciclo D-3: muda conforme o estágio da prova.
//   D-3 fabricar a ferramenta (cartas + material)   D-2 puxar da memória (e marcar o vermelho)   D-1 só o vermelho
import { h, limpar } from '../util/dom.js';
import { getState, mutate } from '../store.js';
import { novaCarta } from '../core/leitner.js';
import { FERRAMENTA_DISC } from '../data/tecnicas.js';
import { adicionarVermelho, alternarVermelho, removerVermelho } from '../actions.js';
import { montar as montarCartas } from './cartas.js';
import { montar as montarPerguntas } from './perguntas.js';
import { fmtDia } from '../util/dates.js';
import { toast } from '../ui.js';

const provaPorId = (id) => getState().provas.find((p) => p.id === id);

export function montar({ hoje, provaId, estagio, disciplina }) {
  const raiz = h('div', { class: 'stack' });
  const prova = provaPorId(provaId);
  if (!prova) return h('p', { class: 'muted' }, 'Prova não encontrada.');

  const cab = h('div', { class: 'card flat stack sm' },
    h('div', { class: 'row between' }, h('b', null, `Prova de ${prova.disciplina} · ${fmtDia(prova.data)}`), h('span', { class: 'chip' }, `peso ${prova.peso || 1}`)),
    prova.conteudo ? h('p', { class: 'small muted', style: { margin: 0 } }, `Conteúdo: ${prova.conteudo}`) : h('p', { class: 'small muted', style: { margin: 0 } }, 'O pai pode informar o conteúdo da prova na aba “Semana e provas”.'));

  if (estagio === 'D3') raiz.append(cab, fabricar(), montarPerguntas({ hoje, disciplina }));
  else if (estagio === 'D2') raiz.append(cab, puxar());
  else raiz.append(cab, vermelho());
  return raiz;

  // ---------- D-3 ----------
  function fabricar() {
    const f = FERRAMENTA_DISC[disciplina] || FERRAMENTA_DISC.Outra;
    const caixa = h('div', { class: 'stack' });
    const frente = h('input', { type: 'text', 'aria-label': 'Frente da carta', placeholder: 'Frente: a pergunta / o termo' });
    const verso = h('textarea', { 'aria-label': 'Verso da carta', placeholder: 'Verso: a resposta', style: { minHeight: '64px' } });
    const lista = h('div', { class: 'stack sm' });
    const desenhaLista = () => {
      limpar(lista);
      const cs = getState().cartas.filter((c) => c.provaId === provaId);
      lista.append(h('p', { class: 'small muted' }, cs.length ? `Cartas fabricadas para esta prova: ${cs.length}` : 'Nenhuma carta ainda. Faça pelo menos 8–10 das ideias principais.'),
        ...cs.slice(-6).reverse().map((c) => h('div', { class: 'row between card flat', style: { padding: '8px 12px' } }, h('span', { class: 'small' }, c.frente),
          h('button', { class: 'btn ghost sm', 'aria-label': 'Apagar carta', onClick: () => { mutate((s) => { s.cartas = s.cartas.filter((x) => x.id !== c.id); }); desenhaLista(); } }, '✕'))));
    };
    const add = () => {
      if (!frente.value.trim() || !verso.value.trim()) { toast('Preencha a frente e o verso.'); return; }
      mutate((s) => s.cartas.push(novaCarta({ disciplina, frente: frente.value, verso: verso.value, tag: `Prova ${prova.data.slice(8)}/${prova.data.slice(5, 7)}`, origem: 'prova', provaId, hoje })));
      frente.value = ''; verso.value = ''; frente.focus(); desenhaLista();
    };
    caixa.append(
      h('div', { class: 'banner info' }, h('h4', null, 'D-3 · Fabricar a ferramenta'),
        h('p', null, `Esta é a única hora com o caderno ABERTO. Leia o conteúdo uma vez e produza: ${f.ferramenta}.`), h('p', { class: 'small' }, f.extra)),
      h('h3', null, 'Fábrica de cartas'), frente, verso, h('button', { class: 'btn amber', onClick: add }, '＋ Adicionar carta'), lista);
    desenhaLista();
    return caixa;
  }

  // ---------- D-2 ----------
  function puxar() {
    const vermelhoBox = h('div', { class: 'stack sm' });
    const desenhaVermelho = () => { limpar(vermelhoBox); vermelhoBox.append(...listaVermelho(provaId, desenhaVermelho, { editavel: true })); };
    const novo = h('input', { type: 'text', 'aria-label': 'O que falhou', placeholder: 'Algo que falhou (ex.: “data da fundação de Roma”)' });
    const addV = () => { if (!novo.value.trim()) return; adicionarVermelho(provaId, novo.value.trim()); novo.value = ''; desenhaVermelho(); };
    novo.addEventListener('keydown', (e) => { if (e.key === 'Enter') addV(); });
    const temCartas = getState().cartas.some((c) => c.provaId === provaId);
    desenhaVermelho();
    return h('div', { class: 'stack' },
      h('div', { class: 'banner info' }, h('h4', null, 'D-2 · Puxar da memória'), h('p', null, 'Caderno FECHADO. Tente lembrar, vire só depois. O que falhar vai para o VERMELHO — é isso que você vai revisar amanhã.')),
      temCartas ? montarCartas({ hoje, filtro: (c) => c.provaId === provaId, provaId, vermelho: true, todas: true })
        : h('p', { class: 'muted' }, 'Você não fabricou cartas no D-3. Use o material de papel e anote abaixo o que falhou.'),
      h('div', { class: 'card flat stack sm' }, h('h3', null, '🔴 Lista do vermelho'), vermelhoBox, h('div', { class: 'row' }, h('div', { class: 'grow' }, novo), h('button', { class: 'btn', onClick: addV }, 'Anotar'))));
  }

  // ---------- D-1 ----------
  function vermelho() {
    const box = h('div', { class: 'stack sm' });
    const desenha = () => {
      limpar(box);
      const itens = prova.vermelho || [];
      if (!itens.length) { box.append(h('div', { class: 'banner ok' }, h('h4', null, 'Nada no vermelho!'), h('p', null, 'Você não anotou nada que falhou. Descanse: amanhã é dia de prova.'))); return; }
      box.append(...listaVermelho(provaId, desenha, { editavel: false }));
    };
    desenha();
    return h('div', { class: 'stack' },
      h('div', { class: 'banner info' }, h('h4', null, 'D-1 · Só o vermelho'), h('p', null, 'Revise EXCLUSIVAMENTE o que falhou no D-2. Doze minutos e acabou. Nada de conteúdo novo na véspera.')), box);
  }
}

/** Itens do vermelho com “resolvi” e (para cartas) “ver a resposta”. */
export function listaVermelho(provaId, aoMudar, { editavel }) {
  const prova = provaPorId(provaId);
  const itens = prova?.vermelho || [];
  if (!itens.length) return [h('p', { class: 'small muted' }, 'Nada anotado ainda.')];
  return itens.map((v) => {
    const carta = v.cartaId ? getState().cartas.find((c) => c.id === v.cartaId) : null;
    const resp = h('div', { class: 'small hidden', style: { marginTop: '6px' } }, carta?.verso || '');
    return h('div', { class: 'card flat', style: { padding: '10px 12px' } },
      h('div', { class: 'row between' },
        h('label', { class: 'check', style: { margin: 0 } }, h('input', { type: 'checkbox', checked: v.feito, onChange: () => { alternarVermelho(provaId, v.id); aoMudar(); } }), h('span', { style: { textDecoration: v.feito ? 'line-through' : 'none' } }, v.txt)),
        h('div', { class: 'row tight' },
          carta ? h('button', { class: 'btn sm', onClick: () => resp.classList.toggle('hidden') }, 'Ver resposta') : null,
          editavel ? h('button', { class: 'btn ghost sm', 'aria-label': 'Remover', onClick: () => { removerVermelho(provaId, v.id); aoMudar(); } }, '✕') : null)),
      carta ? resp : null);
  });
}
