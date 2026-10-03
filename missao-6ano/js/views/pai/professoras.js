// Conversa com as professoras: as 4 perguntas que rendem informação (em vez do “como ele está indo?”).
import { h } from '../../util/dom.js';
import { getState, mutate, uid } from '../../store.js';
import { PERGUNTAS_PROFESSORAS } from '../../data/guia.js';
import { diagnosticoErros } from '../../core/insights.js';
import { FAIXAS } from '../../core/ginasio.js';
import { toast, banner } from '../../ui.js';
import { fmtCurto } from '../../util/dates.js';
import { faseDe } from '../../core/phase.js';

export default function professoras(ctx) {
  const s = getState();
  const hoje = ctx.hoje;
  const re = () => ctx.rerender();
  const fase = faseDe(hoje, s.config);
  const p = s.professoras;
  p.decisao ||= { conversou: false, texto: '' };
  const raiz = h('div', { class: 'stack lg' });

  raiz.append(h('div', null, h('p', { class: 'eyebrow' }, 'Semana 4 · primeira avaliação'), h('h1', { style: { margin: 0 } }, 'Conversa com as professoras'),
    h('p', { class: 'muted' }, '“Como ele está indo?” rende uma resposta gentil e inútil. As quatro perguntas abaixo rendem informação que muda a rotina de casa.')));

  if (fase.conversa) raiz.append(banner('aviso', 'É agora', 'Você está na semana 4. Pergunte especificamente se mudou a FORMA de responder dele — não se a nota subiu: nota demora um bimestre; comportamento de estudo muda em três semanas.'));

  raiz.append(banner('aviso', 'Recomendação do plano', 'Avalie reduzir o reforço de 5 para 3 dias (por exemplo segunda, quarta e sexta) e liberar terça e quinta para o método de casa e para ele simplesmente ser criança. Reforço todos os dias há meses, com melhora insuficiente, é sinal de que o problema não é falta de horas — é o tipo de trabalho feito nessas horas. Mais do mesmo tende a piorar, porque adiciona cansaço sem adicionar método.'));

  raiz.append(h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, 'As quatro perguntas'),
    ...PERGUNTAS_PROFESSORAS.map((q, i) => {
      const ta = h('textarea', { 'aria-label': `Resposta: ${q.p}`, placeholder: 'Anote o que ouviu…', style: { minHeight: '64px' } }, p.respostas[i] || '');
      ta.addEventListener('change', () => mutate(() => { p.respostas[i] = ta.value; }));
      return h('div', { class: 'stack sm' }, h('h3', { style: { margin: 0 } }, `${i + 1}. ${q.p}`), h('p', { class: 'small muted', style: { margin: 0 } }, `O que a resposta revela: ${q.revela}`), ta);
    })));

  // O que levar
  const dg = diagnosticoErros(s.erros.filter((e) => e.tipo));
  const comNota = s.provas.filter((x) => x.nota != null && !x.cancelada).sort((a, b) => (a.data < b.data ? -1 : 1));
  const f = FAIXAS[s.ginasio.faixa - 1];
  raiz.append(h('div', { class: 'card stack sm' }, h('h2', { style: { margin: 0 } }, 'O que levar para a conversa'),
    h('ul', { style: { margin: 0 } },
      h('li', null, `Diário de erros: ${dg.d.total ? `${dg.d.A} tipo A (não sabia), ${dg.d.B} tipo B (sabia e errei), ${dg.d.C} tipo C (em branco). ${dg.texto}` : 'ainda sem erros classificados.'}`),
      h('li', null, comNota.length ? `Notas recentes: ${comNota.slice(-5).map((x) => `${x.disciplina} ${String(x.nota).replace('.', ',')} (${fmtCurto(x.data)})`).join(' · ')}.` : 'Sem notas registradas ainda.'),
      h('li', null, `Ginásio de Cálculo: faixa ${f.n} (${f.nome}).`),
      h('li', null, 'O que funcionou em casa: desenhar linha do tempo/mapa, cartas-relâmpago e explicar em voz alta.'))));

  const dec = h('textarea', { 'aria-label': 'Decisão', placeholder: 'Ex.: Reforço reduzido para seg/qua/sex a partir de 10/11.', style: { minHeight: '64px' } }, p.decisao.texto);
  raiz.append(h('div', { class: 'card stack sm' }, h('h2', { style: { margin: 0 } }, 'Decisão'),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.decisao.conversou, onChange: (e) => { mutate(() => { p.decisao.conversou = e.target.checked; }); re(); } }), 'Já conversei com as professoras'),
    dec, h('button', { class: 'btn sm', onClick: () => { mutate(() => { p.decisao.texto = dec.value.trim(); }); toast('Decisão salva'); } }, 'Salvar decisão')));

  // diário de conversas
  const nota = h('input', { type: 'text', 'aria-label': 'Nova anotação', placeholder: 'Anotação rápida (ex.: Profa. de História disse que ele participa mais)…' });
  const add = () => { if (!nota.value.trim()) return; mutate(() => { p.notas.push({ id: uid(), data: hoje, texto: nota.value.trim() }); }); re(); };
  nota.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
  raiz.append(h('div', { class: 'card stack sm' }, h('h2', { style: { margin: 0 } }, 'Anotações'), h('div', { class: 'row' }, h('div', { class: 'grow' }, nota), h('button', { class: 'btn', onClick: add }, 'Adicionar')),
    ...p.notas.slice().reverse().map((n) => h('div', { class: 'row between card flat', style: { padding: '8px 12px' } }, h('span', null, h('b', null, fmtCurto(n.data) + ' · '), n.texto), h('button', { class: 'btn ghost sm', 'aria-label': 'Remover', onClick: () => { mutate(() => { p.notas = p.notas.filter((x) => x.id !== n.id); }); re(); } }, '✕')))));
  return raiz;
}
