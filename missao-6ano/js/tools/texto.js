// Caça ao detalhe (Português): lê UMA vez, o texto fecha, responde sem voltar — é o que a prova cobra.
import { h, limpar } from '../util/dom.js';
import { getState, mutate } from '../store.js';
import { TEXTOS } from '../data/textos.js';
import { hashStr, makeRng, shuffle } from '../core/rng.js';

export function montar({ hoje }) {
  const raiz = h('div', { class: 'stack' });
  const lidos = new Set(getState().leituras.slice(-TEXTOS.length + 1).map((l) => l.textoId));
  const candidatos = TEXTOS.filter((t) => !lidos.has(t.id));
  const texto = (candidatos.length ? candidatos : TEXTOS)[hashStr(hoje + getState().leituras.length) % (candidatos.length || TEXTOS.length)];
  let fase = 'ler';
  const respostas = [];
  const inicio = Date.now();
  const ordens = texto.perguntas.map((q) => shuffle(makeRng(hashStr(q.p)), q.o.map((_, i) => i)));

  function desenhar() {
    limpar(raiz);
    if (fase === 'ler') {
      raiz.append(h('div', { class: 'card stack' }, h('p', { class: 'eyebrow' }, 'Caça ao detalhe · leia UMA vez'), h('h3', null, texto.titulo),
        h('p', { style: { fontSize: '1.15rem', lineHeight: 1.7 } }, texto.texto),
        h('p', { class: 'muted small' }, 'Atenção a nomes, números e “por quê”. Quando terminar, o texto fecha e você responde sem voltar.'),
        h('button', { class: 'btn amber lg', onClick: () => { fase = 'perguntas'; desenhar(); } }, 'Li! Fechar o texto')));
      return;
    }
    const i = respostas.length;
    if (i >= texto.perguntas.length) {
      const acertos = respostas.filter((r) => r.ok).length;
      raiz.append(h('div', { class: 'card b4 center stack' }, h('div', { class: 'big-emoji' }, acertos === texto.perguntas.length ? '🏆' : '🔍'),
        h('h3', null, `${acertos} de ${texto.perguntas.length} detalhes caçados`),
        h('p', { class: 'muted' }, acertos === texto.perguntas.length ? 'Leitura de detetive!' : 'Quando errar, releia o trecho e descubra onde o detalhe estava escondido.'),
        h('details', { class: 'acc' }, h('summary', null, 'Ver o texto de novo'), h('div', { class: 'acc-body' }, h('p', null, texto.texto)))));
      return;
    }
    const q = texto.perguntas[i];
    const feito = respostas[i];
    raiz.append(h('div', { class: 'card stack' }, h('div', { class: 'row between' }, h('span', { class: 'chip info' }, `Pergunta ${i + 1} de ${texto.perguntas.length}`)), h('h3', null, q.p),
      ...ordens[i].map((k) => h('button', { class: 'opt', onClick: () => escolher(q, k) }, q.o[k]))));
  }

  function escolher(q, k) {
    const ok = k === q.c;
    respostas.push({ ok });
    if (respostas.length === texto.perguntas.length) {
      mutate((s) => { s.leituras.push({ data: hoje, textoId: texto.id, acertos: respostas.filter((r) => r.ok).length, total: texto.perguntas.length, seg: Math.round((Date.now() - inicio) / 1000) }); });
    }
    const resp = raiz;
    limpar(resp);
    resp.append(h('div', { class: 'card stack' }, h('h3', null, q.p),
      ...q.o.map((o, idx) => h('div', { class: 'opt ' + (idx === q.c ? 'ok' : idx === k ? 'bad' : '') }, o)),
      h('p', { class: 'small' }, ok ? 'Certo! 🎯' : `A resposta certa era: ${q.o[q.c]}.`),
      h('button', { class: 'btn amber', onClick: desenhar }, respostas.length >= texto.perguntas.length ? 'Ver resultado' : 'Próxima')));
  }

  desenhar();
  return raiz;
}
