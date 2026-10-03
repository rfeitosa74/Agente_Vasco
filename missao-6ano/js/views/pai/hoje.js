// Hoje do Luan (cockpit): o dia inteiro, com marcações, pergunta-ponte, "me explica" e registro de atenção.
import { h } from '../../util/dom.js';
import { getState, getDay, mutate, mutateDay, uid } from '../../store.js';
import { planoDoDia } from '../../core/dayplan.js';
import { itensDoDia, xpDoDia } from '../../core/xp.js';
import { alternarCampo, marcarSprint } from '../../actions.js';
import { ESTAGIOS } from '../../core/planner.js';
import { tarefasDeHoje, cargaMinutos, statusDe, ROTULO_STATUS } from '../../core/tarefas.js';
import { chip, toast, perguntarTexto } from '../../ui.js';
import { addDays, fmtDiaLongo, nowHM } from '../../util/dates.js';

export default function hojePai(ctx) {
  const s = getState();
  const data = ctx.params.d || ctx.hoje;
  const plano = planoDoDia(s, data);
  const dia = getDay(data);
  const raiz = h('div', { class: 'stack lg' });
  const livre = s.config.diasLivres.includes(data);
  const re = () => ctx.rerender();

  raiz.append(h('div', { class: 'row between' },
    h('div', null, h('p', { class: 'eyebrow' }, 'Hoje do Luan'), h('h1', { style: { margin: 0 } }, fmtDiaLongo(data))),
    h('div', { class: 'row tight' }, h('a', { class: 'btn sm', href: `#/pai/hoje?d=${addDays(data, -1)}` }, '◀'), h('a', { class: 'btn sm', href: '#/pai/hoje' }, 'Hoje'), h('a', { class: 'btn sm', href: `#/pai/hoje?d=${addDays(data, 1)}` }, '▶'))));

  raiz.append(h('div', { class: 'card b1 stack sm' },
    h('div', { class: 'row between' }, h('h2', { style: { margin: 0 } }, plano.titulo), chip(plano.fase.rotulo, 'info')),
    h('div', { class: 'row tight' }, ...plano.estagios.map((e) => chip(`${ESTAGIOS[e.estagio].rotulo} · ${e.disciplina}`, e.estagio === 'D' ? 'warn' : 'info'))),
    plano.avisos.length ? h('p', { class: 'small muted', style: { margin: 0 } }, plano.avisos.join(' ')) : null,
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: livre, onChange: (e) => { mutate((st) => { const l = st.config.diasLivres; if (e.target.checked) { if (!l.includes(data)) l.push(data); } else st.config.diasLivres = l.filter((x) => x !== data); }); re(); } }), 'Dia livre (feriado, sem aula/reforço): não conta para a corrente nem para o bônus')));

  if (plano.tipo === 'folga' || plano.tipo === 'livre') { raiz.append(h('div', { class: 'card center muted' }, plano.tipo === 'folga' ? 'Domingo é folga total — faz parte do método.' : 'Dia livre.')); return raiz; }

  // ---- 10 minutos do pai ----
  const recado = h('textarea', { 'aria-label': 'Recado do dia', style: { minHeight: '64px' }, placeholder: 'Missão do Dia / recado para o Luan…' }, dia.recado);
  const ontem = getDay(addDays(data, -1)).notaExplica;
  const perguntasLuan = s.perguntas.filter((p) => p.data === addDays(data, -1) || p.data === data);
  raiz.append(h('div', { class: 'grid c3' },
    h('div', { class: 'card stack sm b2' }, h('h3', { style: { margin: 0 } }, 'Antes · 1 min'), h('p', { class: 'small', style: { margin: 0 } }, 'Escreva a Missão do Dia no quadro (ou aqui).'),
      ontem ? h('p', { class: 'small', style: { margin: 0 } }, h('b', null, 'Pergunta de ontem: '), ontem) : null, recado,
      h('button', { class: 'btn sm', onClick: () => { mutateDay(data, (d) => { d.recado = recado.value.trim(); }); toast('Recado salvo'); } }, 'Salvar recado')),
    h('div', { class: 'card stack sm' }, h('h3', { style: { margin: 0 } }, 'Durante · 0 min'), h('p', { style: { margin: 0 } }, 'Não esteja por perto. Fique disponível no ambiente ao lado, com a porta aberta.'), h('p', { class: 'small muted', style: { margin: 0 } }, 'Adulto vigiando aumenta a ansiedade e ensina que estudar só acontece sob supervisão.')),
    h('div', { class: 'card stack sm b4' }, h('h3', { style: { margin: 0 } }, 'Depois · 5 min'), h('p', { class: 'small', style: { margin: 0 } }, 'Só pergunte: “por quê?” e “e daí?”. Não corrija na hora: anote e devolva como pergunta amanhã.'),
      h('textarea', { 'aria-label': 'Anotação do me explica', placeholder: 'Para devolver amanhã como pergunta…', style: { minHeight: '64px' } }, dia.notaExplica),
      h('button', { class: 'btn sm', onClick: (e) => { const t = e.target.parentElement.querySelector('textarea').value.trim(); mutateDay(data, (d) => { d.notaExplica = t; }); toast('Anotado'); } }, 'Salvar anotação'))));

  if (perguntasLuan.length) {
    raiz.append(h('div', { class: 'card stack sm' }, h('h3', { style: { margin: 0 } }, 'Perguntas que o Luan escreveu (responda à noite — erre uma de propósito)'),
      ...perguntasLuan.map((p) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.respondida, onChange: (e) => { mutate((st) => { st.perguntas.find((x) => x.id === p.id).respondida = e.target.checked; }); re(); } }), h('span', null, h('b', null, p.disciplina + ': '), p.texto)))));
  }

  // ---- ponte ----
  if (plano.ponte) {
    raiz.append(h('div', { class: 'card b3 stack sm' }, h('p', { class: 'eyebrow tint-b3' }, `Regra dos 2 minutos · ${plano.ponte.disciplina} · ${plano.ponte.topico}`),
      h('h2', { style: { margin: 0 } }, plano.ponte.pergunta), h('p', { class: 'small', style: { margin: 0 } }, h('b', null, 'Para você: '), plano.ponte.deixa), h('p', { class: 'small muted', style: { margin: 0 } }, 'Seu papel não é ensinar: é dar a deixa. Faça a pergunta e deixe ele falar.'),
      h('div', { class: 'row tight' }, h('button', { class: 'btn sm', onClick: () => { mutateDay(data, (d) => { d.ponteOffset = (d.ponteOffset || 0) + 1; }); re(); } }, 'Outra pergunta'), h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: dia.ponteFeita, onChange: (e) => { mutateDay(data, (d) => { d.ponteFeita = e.target.checked; }); re(); } }), 'Já fizemos a pergunta'))));
  }

  // ---- marcações ----
  const t = (campo, rotulo, xp) => h('label', { class: 'check card flat', style: { padding: '10px 12px' } }, h('input', { type: 'checkbox', checked: !!dia[campo], onChange: () => { alternarCampo(data, campo, rotulo); re(); } }), h('span', null, rotulo, plano.fase.xp && xp ? h('span', { class: 'chip', style: { marginLeft: '8px' } }, `+${xp} XP`) : null));
  const marcas = [t('caligrafia', 'Caligrafia', 5), t('janelaLimpa', '30 min sem tela antes do Bloco 1'), t('base', 'Celular na base às 20h30'), t('explicou', 'Explicou sem olhar nada (“me explica”)', 20), t('refezErro', 'Refez e acertou o erro de ontem', 10)];
  if (plano.blocos.some((b) => b.id === 'episodio')) marcas.push(t('episodio', 'Episódio do canal gravado', 15));
  if (plano.blocos.some((b) => b.id === 'desafio')) marcas.push(t('desafio', 'Desafio do Pai feito', 25));
  const sprintMarcas = plano.sprints.map((sp) => h('label', { class: 'check card flat', style: { padding: '10px 12px' } }, h('input', { type: 'checkbox', checked: !!dia.sprints[sp.idx]?.ok, onChange: (e) => { marcarSprint(data, sp.idx, e.target.checked, { manual: true }); re(); } }), h('span', null, `Sprint ${sp.idx} · ${sp.rotulo || sp.titulo}`, dia.sprints[sp.idx]?.manual ? h('span', { class: 'chip', style: { marginLeft: '8px' } }, 'manual') : null)));
  raiz.append(h('div', { class: 'card stack sm' }, h('h2', { style: { margin: 0 } }, 'Marcações do dia'), h('div', { class: 'grid c2' }, ...sprintMarcas, ...marcas),
    h('p', { class: 'small muted', style: { margin: 0 } }, 'Use para corrigir marcações esquecidas ou feitas por engano. XP não é tirado como castigo — só se desfaz o que foi marcado sem querer.'),
    dia.diaDificil ? chip('Dia difícil (modo 5 minutos) ativado', 'warn') : null));

  // ---- Missão (conteúdo) ----
  if (plano.sprints.length) {
    raiz.append(h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, 'A Missão do Dia'),
      ...plano.sprints.map((sp) => h('div', { class: 'stack sm' }, h('h3', { style: { margin: 0 } }, `Sprint ${sp.idx} · ${sp.titulo}`), h('ol', { class: 'steps' }, ...sp.passos.map((p) => h('li', null, p)))))));
  }

  // ---- tarefas desta noite ----
  const tHoje = tarefasDeHoje(getState(), data);
  const enviadas = getState().tarefas.filter((x) => !x.cancelada && x.feitaEm === data);
  if (tHoje.length || enviadas.length) {
    raiz.append(h('div', { class: 'card stack sm' }, h('div', { class: 'row between' }, h('h2', { style: { margin: 0 } }, '📚 Tarefas desta noite'), h('a', { class: 'btn sm', href: '#/pai/tarefas' }, 'Abrir tarefas')),
      h('p', { class: 'small muted', style: { margin: 0 } }, tHoje.length ? `${tHoje.length} para entregar até o próximo dia de aula · cerca de ${cargaMinutos(getState(), data)} min` : 'Tudo enviado.'),
      ...[...tHoje, ...enviadas.filter((x) => !tHoje.includes(x))].map((x) => h('a', { class: 'row between card flat', style: { padding: '8px 12px', textDecoration: 'none', color: 'inherit' }, href: `#/pai/tarefa?id=${x.id}` }, h('span', null, h('b', null, x.disciplina), ' · ', x.titulo), chip(ROTULO_STATUS[statusDe(x)], statusDe(x) === 'feita' ? 'warn' : statusDe(x) === 'conferida' ? 'ok' : '')))));
  }

  // ---- XP do dia ----
  if (plano.fase.xp) {
    const itens = itensDoDia(getState(), data);
    raiz.append(h('div', { class: 'card stack sm' }, h('div', { class: 'row between' }, h('h2', { style: { margin: 0 } }, 'XP do dia'), h('b', { style: { fontSize: '1.4rem' } }, `⭐ ${xpDoDia(getState(), data)}`)),
      itens.length ? h('table', { class: 'tbl' }, h('tbody', null, ...itens.map((i) => h('tr', null, h('td', null, i.label), h('td', { class: 'right' }, `+${i.xp}`))))) : h('p', { class: 'muted' }, 'Nada marcado ainda.'),
      h('button', { class: 'btn sm', onClick: async () => { const l = await perguntarTexto('Motivo do XP extra (ex.: ajudou a irmã com o dever)', { titulo: 'Bônus de XP' }); if (!l || !l.trim()) return; const x = Number(await perguntarTexto('Quantos XP?', { valor: '10', tipo: 'number', titulo: 'Bônus de XP' })); if (x > 0) { mutateDay(data, (d) => { d.xpExtra.push({ id: uid(), label: l.trim(), xp: x }); }); re(); } } }, '＋ Bônus manual de XP')));
  }

  // ---- registro de atenção ----
  const registro = s.atencao.find((a) => a.data === data);
  const horario = h('input', { type: 'time', 'aria-label': 'Horário do bloco', value: registro?.horario || s.config.horarios.missao });
  const inter = h('input', { type: 'number', min: 0, max: 30, 'aria-label': 'Quantas vezes se levantou', value: registro?.interrupcoes ?? 0 });
  const term = h('select', { 'aria-label': 'Terminou?' }, h('option', { value: 'sim', selected: registro ? registro.terminou : true }, 'Terminou'), h('option', { value: 'nao', selected: registro && !registro.terminou }, 'Não terminou'));
  const sono = h('input', { type: 'number', min: 0, max: 14, step: 0.5, 'aria-label': 'Horas de sono na noite anterior', value: registro?.sono ?? '', placeholder: 'ex.: 9' });
  const disc = plano.sprints[0]?.disciplina || '';
  raiz.append(h('div', { class: 'card stack sm' }, h('h2', { style: { margin: 0 } }, '👁️ Registro de atenção (10 segundos, só para você)'),
    h('p', { class: 'small muted', style: { margin: 0 } }, 'Não mostre ao Luan. Em 3 semanas você responde: qual o melhor horário dele e se a distração é geral ou só em certas matérias.'),
    h('div', { class: 'form-row' }, h('div', { class: 'field' }, h('label', null, 'Horário do bloco'), horario), h('div', { class: 'field' }, h('label', null, 'Vezes que se levantou'), inter), h('div', { class: 'field' }, h('label', null, 'Terminou?'), term), h('div', { class: 'field' }, h('label', null, 'Sono (h)'), sono)),
    h('div', null, h('button', { class: 'btn sm primary', onClick: () => {
      mutate((st) => {
        st.atencao = st.atencao.filter((a) => a.data !== data);
        st.atencao.push({ id: uid(), data, horario: horario.value, interrupcoes: Number(inter.value) || 0, terminou: term.value === 'sim', disciplina: disc, sono: sono.value === '' ? null : Number(sono.value) });
      });
      toast('Registro salvo'); re();
    } }, registro ? 'Atualizar registro' : 'Salvar registro'))));
  return raiz;
}
