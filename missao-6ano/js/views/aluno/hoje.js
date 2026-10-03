// "Hoje": a linha do dia do Luan, em blocos. Tudo claro e com um toque.
import { h } from '../../util/dom.js';
import { getState, getDay, mutateDay } from '../../store.js';
import { planoDoDia } from '../../core/dayplan.js';
import { resumoSemana, corrente, proximoNivel, NIVEL_NOME, diaCompleto } from '../../core/xp.js';
import { alternarCampo, errosParaRefazer } from '../../actions.js';
import { FAIXAS } from '../../core/ginasio.js';
import { abrirModal, barra, chip, banner, toast } from '../../ui.js';
import { montar as tRefazer } from '../../tools/refazer.js';
import { fmtDiaLongo, parse, diffDays, fmtDia } from '../../util/dates.js';
import { ESTAGIOS } from '../../core/planner.js';
import { configFontes } from '../../pesquisa.js';
import { tarefasDeHoje } from '../../core/tarefas.js';
import { DISCIPLINAS } from '../../core/planner.js';

const saudacao = () => { const hr = new Date().getHours(); return hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite'; };

export default function hoje(ctx) {
  const s = getState();
  const data = ctx.hoje;
  const plano = planoDoDia(s, data);
  const dia = getDay(data);
  const fase = plano.fase;
  const nome = s.config.aluno.split(' ')[0];
  const raiz = h('div', { class: 'stack lg' });

  // ---- cabeçalho ----
  raiz.append(h('div', { class: 'stack sm' },
    h('p', { class: 'eyebrow' }, fmtDiaLongo(data)),
    h('h1', { class: 'hero', style: { fontSize: '2rem' } }, `${saudacao()}, `, h('em', null, nome), '!')));

  if (dia.recado) raiz.append(h('div', { class: 'banner aviso' }, h('h4', null, `Recado do ${s.config.tutor === 'Rubens' ? 'pai' : 'pai'}`), h('p', { style: { fontSize: '1.1rem' } }, dia.recado)));

  // ---- progresso da semana ----
  if (fase.xp) {
    const r = resumoSemana(s, data);
    const n = s.config.niveis;
    const prox = proximoNivel(r.total, n);
    raiz.append(h('div', { class: 'card stack sm' },
      h('div', { class: 'row between' }, h('h3', { style: { margin: 0 } }, 'Sua semana'), h('b', { style: { color: 'var(--amber)', fontSize: '1.2rem' } }, `⭐ ${r.total} XP`)),
      barra(r.total, Math.max(n.ouro * 1.1, r.total), [{ v: n.bronze, rotulo: `🥉 ${n.bronze}` }, { v: n.prata, rotulo: `🥈 ${n.prata}` }, { v: n.ouro, rotulo: `🥇 ${n.ouro}` }]),
      h('p', { class: 'small muted', style: { margin: 0 } }, r.nivel ? `Nível ${NIVEL_NOME[r.nivel]} conquistado!${prox ? ` Faltam ${prox.falta} XP para o ${NIVEL_NOME[prox.chave]}.` : ' Semana Ouro!'}` : `Faltam ${prox.falta} XP para o Bronze.`)));
  }

  // ---- dias sem blocos ----
  if (plano.tipo === 'folga' || plano.tipo === 'livre') {
    raiz.append(h('div', { class: 'card center stack' }, h('div', { class: 'big-emoji' }, plano.tipo === 'folga' ? '😴' : '🌴'),
      h('h2', null, plano.titulo), h('p', { class: 'muted' }, plano.tipo === 'folga' ? 'Folga de verdade — faz parte do plano. Rua, bola, desenho, brincar. À noite, que tal olhar o céu?' : 'Sem Missão hoje. Aproveite!')));
    if (fase.base) raiz.append(blocoSimples('base', 'Celular na base', 'O celular dorme na sala às 20h30. Todo dia, sem exceção.', 'base', dia, data, ctx, 'b4', '🔌', s.config.horarios.base));
    return raiz;
  }

  // ---- linha do dia ----
  raiz.append(h('h2', null, 'Seu dia'));
  const blocos = h('div', { class: 'stack sm' });
  let n = 0;
  for (const b of plano.blocos) {
    n++;
    blocos.append(blocoEl(b, n));
  }
  raiz.append(blocos);

  // ---- erros de ontem ----
  const erros = errosParaRefazer(s, data);
  if (erros.length) {
    raiz.append(h('div', { class: 'card b2 stack sm' }, h('h3', { style: { margin: 0 } }, '🔁 O erro volta hoje'),
      h('p', { class: 'small muted', style: { margin: 0 } }, `${erros.length} problema${erros.length > 1 ? 's' : ''} para refazer do zero${fase.xp ? ' (+10 XP quando acertar)' : ''}.`),
      h('button', { class: 'btn amber', onClick: () => { const fechar = abrirModal(tRefazer({ hoje: data, aoMudar: () => {} }), { titulo: 'Refazer do zero', aoFechar: () => ctx.rerender() }); } }, 'Refazer agora')));
  }

  // ---- próximas provas ----
  const provas = s.provas.filter((p) => !p.cancelada && p.data >= data).sort((a, b) => (a.data < b.data ? -1 : 1)).slice(0, 3);
  if (provas.length) {
    raiz.append(h('div', { class: 'card flat stack sm' }, h('h3', { style: { margin: 0 } }, '📅 Próximas provas'),
      ...provas.map((p) => { const d = diffDays(p.data, data); return h('div', { class: 'row between' }, h('span', null, `${p.disciplina} · ${fmtDia(p.data)}`), chip(d === 0 ? 'hoje' : d === 1 ? 'amanhã' : `em ${d} dias`, d <= 1 ? 'warn' : '')); })));
  }

  // ---- dia difícil ----
  if (!dia.diaDificil && plano.sprints.length) raiz.append(h('p', { class: 'center muted small' }, 'Dia pesado? Na tela “Missão” há o modo 5 minutos — a corrente não pode quebrar.'));

  return raiz;

  // ===== helpers de bloco =====
  function blocoEl(b, num) {
    const cls = { dever: 'b3', janela: 'b4', aquecimento: 'b1', missao: 'b2', episodio: 'b3', desafio: 'b4', explica: 'b4', base: 'b1' }[b.id] || 'b1';
    const feito = estaFeito(b.id);
    const el = h('div', { class: `bloco ${cls}${feito ? ' done' : ''}` },
      h('span', { class: 'hora' }, b.hora),
      h('div', null, h('h3', null, b.nome), h('p', null, b.detalhe || ''), extra(b)),
      h('div', { class: 'row tight' }, ...acoes(b, feito)));
    return el;
  }

  function estaFeito(id) {
    if (id === 'dever') return !tarefasDeHoje(s, data).length;
    if (id === 'janela') return dia.janelaLimpa;
    if (id === 'aquecimento') return dia.caligrafia;
    if (id === 'missao') return plano.sprints.length > 0 && plano.sprints.filter((x) => dia.sprints[x.idx]?.ok).length >= (dia.diaDificil ? 1 : plano.sprints.length);
    if (id === 'episodio') return dia.episodio;
    if (id === 'explica') return dia.explicou;
    if (id === 'desafio') return dia.desafio;
    if (id === 'base') return dia.base;
    return false;
  }

  function extra(b) {
    if (b.id === 'aquecimento') {
      const g = dia.ginasio;
      return h('div', { class: 'row tight', style: { marginTop: '6px' } },
        chip(dia.caligrafia ? '✓ caligrafia' : 'caligrafia', dia.caligrafia ? 'ok' : ''),
        chip(g ? `✓ Ginásio: ${g.seg}s · faixa ${g.faixa}` : `Ginásio · faixa ${s.ginasio.faixa}`, g ? 'ok' : ''));
    }
    if (b.id === 'missao') {
      const feitos = plano.sprints.filter((x) => dia.sprints[x.idx]?.ok).length;
      return h('p', { style: { fontWeight: 700, color: 'var(--ink)' } }, `${plano.titulo} · ${feitos}/${dia.diaDificil ? 1 : plano.sprints.length} sprints`);
    }
    return null;
  }

  function acoes(b, feito) {
    const xp = fase.xp;
    switch (b.id) {
      case 'aquecimento':
        return [
          h('button', { class: 'btn sm' + (dia.caligrafia ? '' : ' amber'), onClick: () => { alternarCampo(data, 'caligrafia', 'Caligrafia'); ctx.rerender(); } }, dia.caligrafia ? 'Desfazer' : `Caligrafia ✓${xp ? ' +5' : ''}`),
          h('a', { class: 'btn sm amber', href: '#/aluno/ginasio' }, 'Ginásio'),
        ];
      case 'missao':
        return [h('a', { class: 'btn sm amber', href: '#/aluno/missao' }, feito ? 'Rever' : 'Começar')];
      case 'episodio':
        return [
          h('a', { class: 'btn sm', href: '#/aluno/episodio' }, 'Roteiro'),
          configFontes().pesquisaLivreAluno ? h('a', { class: 'btn sm', href: '#/aluno/descobrir?d=Ci%C3%AAncias' }, '🔎 Conferir fatos') : null,
          h('button', { class: 'btn sm' + (feito ? '' : ' amber'), onClick: () => { alternarCampo(data, 'episodio', 'Episódio gravado'); ctx.rerender(); } }, feito ? 'Desfazer' : `Gravei! ${xp ? '+15' : ''}`),
        ];
      case 'explica':
        return [h('button', { class: 'btn sm' + (feito ? '' : ' amber'), onClick: () => (feito ? (alternarCampo(data, 'explicou', ''), ctx.rerender()) : escolherTema()) }, feito ? 'Desfazer' : `Expliquei sem olhar +20`)];
      case 'desafio':
        return [h('button', { class: 'btn sm' + (feito ? '' : ' amber'), onClick: () => { alternarCampo(data, 'desafio', 'Desafio do Pai'); ctx.rerender(); } }, feito ? 'Desfazer' : `Fiz o desafio${xp ? ' +25' : ''}`)];
      case 'dever':
        return [h('a', { class: 'btn sm amber', href: '#/aluno/tarefas' }, feito ? 'Ver' : 'Ver tarefas')];
      case 'janela':
        return [h('button', { class: 'btn sm' + (feito ? '' : ' amber'), onClick: () => { alternarCampo(data, 'janelaLimpa', ''); ctx.rerender(); } }, feito ? 'Desfazer' : 'Fiquei sem tela ✓')];
      case 'base':
        return [h('button', { class: 'btn sm' + (feito ? '' : ' amber'), onClick: () => { alternarCampo(data, 'base', ''); ctx.rerender(); } }, feito ? 'Desfazer' : 'Celular na base ✓')];
      default: return [];
    }
  }

  function escolherTema() {
    let fechar;
    const escolher = (d) => {
      mutateDay(data, (x) => { x.explicouTema = d; });
      alternarCampo(data, 'explicou', 'Expliquei sem olhar');
      fechar();
      ctx.rerender();
    };
    fechar = abrirModal(h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Você explicou a matéria para o pai sem olhar o caderno. Sobre o quê?'),
      h('div', { class: 'row' }, ...DISCIPLINAS.slice(0, 5).map((d) => h('button', { class: 'btn', onClick: () => escolher(d) }, d)), h('button', { class: 'btn ghost', onClick: () => escolher('Astronomia') }, 'Astronomia'))), { titulo: 'Me explica' });
  }
}

function blocoSimples(id, nome, detalhe, campo, dia, data, ctx, cls, ico, hora) {
  const feito = dia[campo];
  return h('div', { class: `bloco ${cls}${feito ? ' done' : ''}` }, h('span', { class: 'hora' }, hora), h('div', null, h('h3', null, nome), h('p', null, detalhe)),
    h('button', { class: 'btn sm' + (feito ? '' : ' amber'), onClick: () => { alternarCampo(data, campo, ''); ctx.rerender(); } }, feito ? 'Desfazer' : 'Feito ✓'));
}
