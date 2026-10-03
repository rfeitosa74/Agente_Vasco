// "Eu": nível, corrente, cartela do mês (página 16), trilha da astronomia e a carta.
import { h } from '../../util/dom.js';
import { getState, mutate } from '../../store.js';
import { resumoSemana, corrente, semanasOuroSeguidas, NIVEL_NOME } from '../../core/xp.js';
import { faseDe } from '../../core/phase.js';
import { FAIXAS } from '../../core/ginasio.js';
import { chip, perguntarTexto, toast } from '../../ui.js';
import { weekStart, addDays, fmtCurto } from '../../util/dates.js';

const TRILHA = [
  { id: 'quintal', nome: 'Noite de observação no quintal', det: 'De graça: um mapa do céu no celular e uma noite sem nuvens.' },
  { id: 'planetario', nome: 'Planetário (UFMA ou planetário móvel da SECTI)', det: 'Passeio com o pai.' },
  { id: 'mirante', nome: 'Telescópio no Mirante da Cidade', det: 'Eventos de observação da Prefeitura — confirmar a agenda antes de ir.' },
  { id: 'binoculo', nome: 'Binóculo 10×50: as luas de Júpiter', det: 'Conquista do Mês — mostra as quatro luas que você sabe nomear de cor.' },
];

export default function eu(ctx) {
  const s = getState();
  const hoje = ctx.hoje;
  const fase = faseDe(hoje, s.config);
  const nome = s.config.aluno.split(' ')[0];
  const f = FAIXAS[s.ginasio.faixa - 1];
  const melhores = s.ginasio.historico.filter((x) => x.faixa === s.ginasio.faixa).map((x) => x.seg);
  const gravados = s.episodios.filter((e) => e.status === 'gravado' || e.status === 'publicado').length;
  const raiz = h('div', { class: 'stack lg' });

  raiz.append(h('div', null, h('p', { class: 'eyebrow' }, 'Perfil'), h('h1', { style: { margin: 0 } }, nome)));

  const stats = [h('div', { class: 'stat' }, h('span', null, 'Corrente'), h('b', null, `🔥 ${corrente(s, hoje)} dias`)),
    h('div', { class: 'stat' }, h('span', null, 'Ginásio'), h('b', null, `Faixa ${f.n}`), h('small', { class: 'muted' }, melhores.length ? `melhor: ${Math.min(...melhores).toFixed(1).replace('.', ',')} s` : 'ainda sem tempo')),
    h('div', { class: 'stat' }, h('span', null, 'Episódios gravados'), h('b', null, `🎬 ${gravados}`))];
  if (fase.xp) stats.unshift(h('div', { class: 'stat' }, h('span', null, 'XP da semana'), h('b', null, `⭐ ${resumoSemana(s, hoje).total}`)));
  raiz.append(h('div', { class: 'grid c4' }, ...stats));

  // ---- cartela do mês ----
  if (fase.xp) {
    const ini = weekStart(hoje);
    const semanas = [-3, -2, -1, 0].map((k) => addDays(ini, k * 7));
    const ouro = semanasOuroSeguidas(s);
    raiz.append(h('div', { class: 'card stack' }, h('h2', null, 'Cartela de XP'),
      h('div', { class: 'scroll-x' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'Semana'), h('th', null, 'XP'), h('th', null, 'Nível'), h('th', null, 'Recompensa'), h('th', null, 'Melhor momento'))),
        h('tbody', null, ...semanas.map((w) => {
          const reg = s.semanas[w];
          const r = resumoSemana(s, w);
          return h('tr', null, h('td', null, fmtCurto(w)), h('td', null, String(reg?.fechada ? reg.xp : r.total)), h('td', null, (reg?.nivel || r.nivel) ? NIVEL_NOME[reg?.nivel || r.nivel] : '—'), h('td', null, reg?.recompensa || '—'), h('td', null, reg?.melhor || '—'));
        })))),
      h('div', { class: 'banner ' + (ouro >= 4 ? 'ok' : 'info') }, h('h4', null, 'Conquista do Mês'), h('p', null, ouro >= 4 ? `🏅 Quatro semanas Ouro seguidas! ${s.config.conquistaMes || 'Combine a recompensa grande com o pai.'}` : `${ouro} de 4 semanas Ouro seguidas. ${s.config.conquistaMes ? 'Prêmio: ' + s.config.conquistaMes : ''}`))));
  }

  // ---- trilha da astronomia ----
  raiz.append(h('div', { class: 'card stack' }, h('h2', null, '🔭 Trilha da astronomia'), h('p', { class: 'muted small' }, 'O prêmio maior não é mais tela: é tempo com o pai fazendo o que você escolhe.'),
    ...TRILHA.map((t) => h('label', { class: 'check card flat', style: { padding: '10px 12px' } }, h('input', { type: 'checkbox', checked: !!s.trilha[t.id], onChange: (e) => { mutate((st) => { st.trilha[t.id] = e.target.checked ? hoje : null; }); toast(e.target.checked ? 'Conquistado! 🌌' : 'Desmarcado', {}); ctx.rerender(); } }), h('span', null, h('b', null, t.nome), h('br'), h('small', { class: 'muted' }, t.det))))));

  // ---- programas de domingo ----
  raiz.append(h('div', { class: 'card stack' }, h('h2', null, 'Minha lista de programas de domingo'), h('p', { class: 'muted small' }, 'Bola, bicicleta, praia, observação do céu… Quando você chegar ao Ouro, escolhe um.'),
    s.config.programasDomingo.length ? h('ul', null, ...s.config.programasDomingo.map((p, i) => h('li', null, p, ' ', h('button', { class: 'btn ghost sm', 'aria-label': 'Remover', onClick: () => { mutate((st) => st.config.programasDomingo.splice(i, 1)); ctx.rerender(); } }, '✕')))) : null,
    h('button', { class: 'btn sm', onClick: async () => { const t = await perguntarTexto('Que programa de domingo você quer na lista?', { titulo: 'Novo programa' }); if (t && t.trim()) { mutate((st) => st.config.programasDomingo.push(t.trim())); ctx.rerender(); } } }, '＋ Adicionar programa')));

  raiz.append(h('div', { class: 'row', style: { justifyContent: 'center' } }, h('a', { class: 'btn', href: '#/aluno/carta' }, '💌 Reler a carta do pai')));
  return raiz;
}
