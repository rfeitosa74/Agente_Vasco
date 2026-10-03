// "Três perguntas ao contrário": quem formula a pergunta entende melhor que quem responde.
// À noite, no “me explica”, o pai responde — errando uma de propósito.
import { h, limpar } from '../util/dom.js';
import { getState, mutate, uid } from '../store.js';
import { toast } from '../ui.js';

export function montar({ hoje, disciplina }) {
  const raiz = h('div', { class: 'stack' });

  function desenhar() {
    limpar(raiz);
    const salvas = getState().perguntas.filter((p) => p.data === hoje && p.disciplina === disciplina);
    if (salvas.length) {
      raiz.append(h('div', { class: 'banner ok' }, h('h4', null, 'Suas perguntas de hoje'),
        h('ol', null, ...salvas.map((p) => h('li', null, p.texto))),
        h('p', { class: 'small' }, 'À noite o pai vai responder — e vai errar uma de propósito. Fique de olho!')));
      raiz.append(h('button', { class: 'btn sm', onClick: () => { mutate((s) => { s.perguntas = s.perguntas.filter((p) => !(p.data === hoje && p.disciplina === disciplina)); }); desenhar(); } }, 'Refazer minhas perguntas'));
      return;
    }
    const campos = [0, 1, 2].map((i) => h('input', { type: 'text', 'aria-label': `Pergunta ${i + 1}`, placeholder: `Pergunta de prova ${i + 1}…` }));
    raiz.append(
      h('p', { class: 'muted small' }, `Feche o livro e escreva 3 perguntas que poderiam cair na prova de ${disciplina}. Capriche: o pai vai respondê-las hoje à noite.`),
      ...campos,
      h('button', { class: 'btn amber', onClick: () => {
        const textos = campos.map((c) => c.value.trim()).filter(Boolean);
        if (!textos.length) { toast('Escreva pelo menos uma pergunta.'); return; }
        mutate((s) => { for (const t of textos) s.perguntas.push({ id: uid(), data: hoje, disciplina, texto: t, respondida: false }); });
        desenhar();
      } }, 'Guardar minhas perguntas'));
  }
  desenhar();
  return raiz;
}
