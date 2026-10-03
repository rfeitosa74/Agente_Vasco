// Episódio do canal: 1 minuto, no máximo 2 takes, sem olhar o caderno. Escrever o roteiro JÁ é estudar.
import { h } from '../../util/dom.js';
import { getState, mutate, getDay, uid } from '../../store.js';
import { FORMATO_EPISODIO } from '../../data/episodios.js';
import { chip, toast, perguntarTexto } from '../../ui.js';
import { alternarCampo } from '../../actions.js';
import { faseDe } from '../../core/phase.js';

const ROTULO = { ideia: 'ideia', roteiro: 'roteiro pronto', gravado: 'gravado', publicado: 'publicado' };

export default function episodio(ctx) {
  const s = getState();
  const hoje = ctx.hoje;
  const id = ctx.params.id;
  const fase = faseDe(hoje, s.config);

  // ------- detalhe de um episódio -------
  if (id) {
    const ep = s.episodios.find((e) => e.id === id);
    if (!ep) return h('p', null, 'Episódio não encontrado.');
    const meu = ep.meuRoteiro || { gancho: '', fatos: ['', '', ''], fecho: '' };
    const g = h('textarea', { 'aria-label': 'Gancho' }, meu.gancho);
    const fs = [0, 1, 2].map((i) => h('textarea', { 'aria-label': `Fato ${i + 1}`, style: { minHeight: '64px' } }, meu.fatos[i] || ''));
    const fc = h('textarea', { 'aria-label': 'Fecho' }, meu.fecho);
    const salvarRoteiro = (status) => {
      mutate((st) => {
        const e = st.episodios.find((x) => x.id === id);
        e.meuRoteiro = { gancho: g.value, fatos: fs.map((f) => f.value), fecho: fc.value };
        if (status) { e.status = status; if (status === 'gravado') e.gravadoEm = hoje; }
        else if (e.status === 'ideia' && (g.value || fs.some((f) => f.value))) e.status = 'roteiro';
      });
    };
    return h('div', { class: 'stack lg' },
      h('a', { href: '#/aluno/episodio', class: 'small' }, '← todos os episódios'),
      h('div', { class: 'card b3 stack sm' }, h('p', { class: 'eyebrow tint-b3' }, `Episódio · ${ep.materias.join(' + ')}`), h('h1', { style: { margin: 0 } }, ep.titulo), h('div', { class: 'row tight' }, chip(ROTULO[ep.status], ep.status === 'gravado' ? 'ok' : ''), ...ep.materias.map((m) => chip(m)))),
      h('div', { class: 'card stack' }, h('h3', null, 'Formato: 1 minuto'),
        ...FORMATO_EPISODIO.map((f) => h('div', { class: 'row top' }, h('b', { class: 'nowrap', style: { width: '5.5em' } }, f.tempo), h('div', null, h('b', null, f.titulo + ': '), f.texto))),
        h('p', { class: 'small muted', style: { margin: 0 } }, 'No máximo 2 takes. Sem olhar o caderno na gravação. Vale mesmo que você não publique.')),
      h('details', { class: 'acc', open: true }, h('summary', null, '💡 Ideia do pai (para você reescrever com as suas palavras)'), h('div', { class: 'acc-body stack sm' },
        h('p', null, h('b', null, 'Gancho: '), ep.gancho), h('ol', null, ...ep.fatos.map((f) => h('li', null, f))), h('p', null, h('b', null, 'Fecho: '), ep.fecho), h('p', { class: 'small muted' }, 'Cai na prova: ' + ep.conteudo6))),
      h('div', { class: 'card stack' }, h('h3', null, '✍️ O meu roteiro'), h('p', { class: 'small muted' }, 'Escreva do seu jeito. Depois feche o caderno e grave sem olhar.'),
        h('div', null, h('label', null, 'Gancho (10 s)'), g), ...fs.map((f, i) => h('div', null, h('label', null, `Fato ${i + 1}`), f)), h('div', null, h('label', null, 'Fecho (10 s)'), fc),
        h('div', { class: 'row' },
          h('button', { class: 'btn', onClick: () => { salvarRoteiro(); toast('Roteiro salvo'); ctx.rerender(); } }, 'Salvar roteiro'),
          h('button', { class: 'btn ok', onClick: () => {
            salvarRoteiro('gravado');
            if (!getDay(hoje).episodio) alternarCampo(hoje, 'episodio', 'Episódio gravado');
            toast('Episódio gravado! 🎬'); ctx.rerender();
          } }, '🎬 Gravei! (máx. 2 takes)'),
          ep.status === 'gravado' ? h('button', { class: 'btn', onClick: () => { salvarRoteiro('publicado'); ctx.rerender(); } }, 'Publiquei no canal') : null)));
  }

  // ------- lista -------
  const lista = s.episodios.slice().sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0));
  return h('div', { class: 'stack lg' },
    h('div', null, h('p', { class: 'eyebrow' }, 'Bloco 3 · seg/qua/sex'), h('h1', { style: { margin: 0 } }, 'Episódio do canal'), h('p', { class: 'muted' }, `Uma série nova no seu canal ligando o céu à matéria do 6º ano. ${fase.episodios.length ? '' : 'O episódio entra na semana 2 da rampa — mas você já pode ir escrevendo roteiros!'}`)),
    h('div', { class: 'grid c2' }, ...lista.map((e) => h('a', { class: 'card stack sm', href: `#/aluno/episodio?id=${e.id}`, style: { textDecoration: 'none', color: 'inherit' } },
      h('div', { class: 'row between' }, h('b', null, e.titulo), chip(ROTULO[e.status], e.status === 'gravado' || e.status === 'publicado' ? 'ok' : '')),
      h('div', { class: 'row tight' }, ...e.materias.map((m) => chip(m))),
      e.destaque ? h('span', { class: 'small', style: { color: 'var(--amber)' } }, '⭐ O mais fácil de gravar: cobre três matérias') : h('span', { class: 'small muted' }, e.gancho)))),
    h('button', { class: 'btn', onClick: async () => {
      const t = await perguntarTexto('Título do seu episódio novo', { titulo: 'Nova ideia' });
      if (t && t.trim()) { mutate((st) => st.episodios.push({ id: uid(), titulo: t.trim(), materias: ['Outra'], status: 'ideia', gancho: '', fatos: ['', '', ''], fecho: '', conteudo6: '' })); ctx.rerender(); }
    } }, '＋ Minha própria ideia'));
}
