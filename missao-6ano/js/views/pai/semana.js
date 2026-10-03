// Semana e provas: cadastro da agenda de provas e o Plano da Semana com o ciclo D-3 já distribuído.
import { h } from '../../util/dom.js';
import { getState, mutate } from '../../store.js';
import { planoDoDia, planoDaSemana, planoDasProvas } from '../../core/dayplan.js';
import { ESTAGIOS, DISCIPLINAS } from '../../core/planner.js';
import { salvarProva } from '../../actions.js';
import { chip, confirmar, toast, banner, abrirModal } from '../../ui.js';
import { weekStart, addDays, fmtCurto, fmtDia, DIAS_CURTO } from '../../util/dates.js';
import { lerAgenda } from '../../core/agenda.js';
import { DISC_COR } from '../../data/tecnicas.js';

const estCor = { D3: 'info', D2: 'warn', D1: 'bad', D: 'ok' };

export default function semana(ctx) {
  const s = getState();
  const hoje = ctx.hoje;
  const ini = ctx.params.s ? weekStart(ctx.params.s) : weekStart(hoje);
  const re = () => ctx.rerender();
  const raiz = h('div', { class: 'stack lg' });
  const plano = planoDaSemana(s, ini);

  raiz.append(h('div', { class: 'row between' }, h('div', null, h('p', { class: 'eyebrow' }, 'Plano da Semana'), h('h1', { style: { margin: 0 } }, `${fmtCurto(ini)} a ${fmtCurto(addDays(ini, 6))}`)),
    h('div', { class: 'row tight no-print' }, h('a', { class: 'btn sm', href: `#/pai/semana?s=${addDays(ini, -7)}` }, '◀'), h('a', { class: 'btn sm', href: '#/pai/semana' }, 'Esta semana'), h('a', { class: 'btn sm', href: `#/pai/semana?s=${addDays(ini, 7)}` }, '▶'), h('button', { class: 'btn sm', onClick: () => window.print() }, '🖨 Imprimir'))));

  // ---- tabela da semana ----
  raiz.append(h('div', { class: 'card pad0 scroll-x' }, h('table', { class: 'tbl' },
    h('thead', null, h('tr', null, h('th', null, 'Dia'), h('th', null, 'Missão do Dia (Bloco 2)'), h('th', null, 'Estágios de prova'), h('th', null, 'Outros blocos'))),
    h('tbody', null, ...plano.map((p) => {
      const nome = DIAS_CURTO[p.dow];
      return h('tr', { style: p.data === hoje ? { background: 'var(--brand-soft)' } : null },
        h('td', { class: 'nowrap' }, h('b', null, nome), h('br'), h('small', { class: 'muted' }, fmtCurto(p.data))),
        h('td', null, p.tipo === 'folga' ? h('span', { class: 'muted' }, 'Folga total') : p.tipo === 'livre' ? h('span', { class: 'muted' }, 'Dia livre') : p.tipo === 'sabado' ? 'Desafio do Pai' : p.tipo === 'diaD' ? 'Só o Aquecimento' : p.tipo === 'sem-missao' ? h('span', { class: 'muted' }, 'Só o Aquecimento (antes da rampa)') : [h('b', null, p.titulo), h('br'), h('small', { class: 'muted' }, `${p.sprints.length} sprint${p.sprints.length === 1 ? '' : 's'} de ${p.fase.sprintMin} min · modo ${p.tipo === 'ciclo' ? 'prova' : 'padrão'}`)]),
        h('td', null, h('div', { class: 'row tight' }, ...p.estagios.map((e) => h('span', { class: `chip ${estCor[e.estagio]}`, title: ESTAGIOS[e.estagio].nome }, `${e.disciplina} ${ESTAGIOS[e.estagio].rotulo}${e.comprimido ? ' ⚠' : ''}`)))),
        h('td', { class: 'small muted' }, p.blocos.filter((b) => !['aquecimento', 'missao'].includes(b.id)).map((b) => b.nome).join(' · ') || '—'));
    })))));

  const { avisos } = planoDasProvas(s);
  const avs = s.provas.filter((p) => avisos[p.id] && !p.cancelada && p.data >= hoje);
  if (avs.length) raiz.append(banner('aviso', 'Pouco tempo para algumas provas', h('ul', null, ...avs.map((p) => h('li', null, `${p.disciplina} (${fmtDia(p.data)}): ${avisos[p.id].join(' ')}`)))));
  raiz.append(h('div', { class: 'row tight small muted' }, 'Legenda:', chip('D-3 fabricar', 'info'), chip('D-2 puxar', 'warn'), chip('D-1 só o vermelho', 'bad'), chip('Dia D não estudar', 'ok'), '· no máx. 2 estágios por dia · nunca dois D-2 juntos · História e Geografia têm prioridade.'));

  // ---- formulário ----
  const campos = formularioProva(null);
  raiz.append(h('div', { class: 'card stack no-print' }, h('h2', { style: { margin: 0 } }, 'Cadastrar prova'), campos.el,
    h('div', { class: 'row' }, h('button', { class: 'btn primary', onClick: () => { const v = campos.ler(); if (!v) return; salvarProva(v); toast('Prova cadastrada'); re(); } }, 'Adicionar prova'),
      h('button', { class: 'btn', onClick: abrirImportacao }, 'Colar a agenda de várias provas'))));

  // ---- lista ----
  const futuras = s.provas.filter((p) => !p.cancelada && p.data >= hoje).sort((a, b) => (a.data < b.data ? -1 : 1));
  const passadas = s.provas.filter((p) => p.data < hoje || p.cancelada).sort((a, b) => (a.data < b.data ? 1 : -1));
  const tabela = (lista, vazio) => (lista.length ? h('div', { class: 'scroll-x' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'Data'), h('th', null, 'Disciplina'), h('th', null, 'Peso'), h('th', null, 'Conteúdo'), h('th', null, ''))),
    h('tbody', null, ...lista.map((p) => h('tr', { style: p.cancelada ? { opacity: .5 } : null },
      h('td', { class: 'nowrap' }, fmtDia(p.data)), h('td', null, h('span', { class: 'dot', style: { '--c': DISC_COR[p.disciplina] } }), ' ', p.disciplina), h('td', null, '●'.repeat(p.peso || 1)), h('td', null, p.conteudo || '—', p.cancelada ? chip('cancelada') : null, p.nota != null ? chip(`nota ${p.nota}`, 'ok') : null),
      h('td', { class: 'right nowrap' },
        h('button', { class: 'btn sm', onClick: () => editar(p) }, 'Editar'), ' ',
        h('button', { class: 'btn sm ghost', onClick: async () => { mutate(() => { p.cancelada = !p.cancelada; }); re(); } }, p.cancelada ? 'Reativar' : 'Cancelar'), ' ',
        h('button', { class: 'btn sm danger', 'aria-label': 'Excluir', onClick: async () => { if (await confirmar(`Excluir a prova de ${p.disciplina} (${fmtDia(p.data)})?`, { ok: 'Excluir', perigo: true })) { mutate((st) => { st.provas = st.provas.filter((x) => x.id !== p.id); }); re(); } } }, '✕'))))))) : h('p', { class: 'muted' }, vazio));
  raiz.append(h('div', { class: 'card stack no-print' }, h('h2', { style: { margin: 0 } }, 'Próximas provas'), tabela(futuras, 'Nenhuma prova futura cadastrada.')));
  if (passadas.length) raiz.append(h('details', { class: 'acc no-print' }, h('summary', null, `Provas anteriores e canceladas (${passadas.length})`), h('div', { class: 'acc-body' }, tabela(passadas, ''), h('p', { class: 'small muted' }, 'Para registrar nota e erros, use “Erros e notas”.'))));
  return raiz;

  function formularioProva(p) {
    const disc = h('select', { 'aria-label': 'Disciplina' }, ...DISCIPLINAS.map((d) => h('option', { value: d, selected: p?.disciplina === d }, d)));
    const data = h('input', { type: 'date', 'aria-label': 'Data da prova', value: p?.data || addDays(hoje, 3) });
    const peso = h('select', { 'aria-label': 'Peso' }, h('option', { value: 1, selected: (p?.peso || 1) === 1 }, '1 · normal'), h('option', { value: 2, selected: p?.peso === 2 }, '2 · importante'), h('option', { value: 3, selected: p?.peso === 3 }, '3 · peso alto'));
    const cont = h('input', { type: 'text', 'aria-label': 'Conteúdo', placeholder: 'Ex.: Egito e Mesopotâmia (cap. 4)', value: p?.conteudo || '' });
    return {
      el: h('div', { class: 'form-row' }, h('div', { class: 'field' }, h('label', null, 'Disciplina'), disc), h('div', { class: 'field' }, h('label', null, 'Data'), data), h('div', { class: 'field' }, h('label', null, 'Peso na nota'), peso), h('div', { class: 'field', style: { gridColumn: '1 / -1' } }, h('label', null, 'Conteúdo da prova'), cont)),
      ler: () => { if (!data.value) { toast('Informe a data.'); return null; } return { ...(p ? { id: p.id } : {}), disciplina: disc.value, data: data.value, peso: Number(peso.value), conteudo: cont.value.trim() }; },
    };
  }

  function editar(p) {
    const f = formularioProva(p);
    let fechar;
    fechar = abrirModal(h('div', { class: 'stack' }, f.el, h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, h('button', { class: 'btn ghost', onClick: () => fechar() }, 'Cancelar'), h('button', { class: 'btn primary', onClick: () => { const v = f.ler(); if (!v) return; salvarProva(v); fechar(); re(); } }, 'Salvar'))), { titulo: 'Editar prova' });
  }

  function abrirImportacao() {
    const ano = Number(hoje.slice(0, 4));
    const area = h('textarea', { 'aria-label': 'Agenda de provas', placeholder: '08/10 História 2 Egito e Mesopotâmia\n09/10 Matemática 1 Frações\n13/10 Geografia', style: { minHeight: '140px' } });
    const previa = h('div', { class: 'small' });
    const atualizar = () => {
      const { itens, erros } = lerAgenda(area.value, ano);
      previa.replaceChildren(h('p', { style: { margin: 0 } }, `${itens.length} prova(s) reconhecida(s)${erros.length ? ` · ${erros.length} linha(s) não entendida(s)` : ''}`), ...itens.map((i) => h('div', null, `✓ ${fmtDia(i.data)} · ${i.disciplina} · peso ${i.peso}${i.conteudo ? ' · ' + i.conteudo : ''}`)), ...erros.map((e) => h('div', { style: { color: 'var(--bad)' } }, `✗ ${e}`)));
    };
    area.addEventListener('input', atualizar);
    let fechar;
    fechar = abrirModal(h('div', { class: 'stack' }, h('p', { class: 'muted small' }, 'Uma prova por linha: data (dd/mm), disciplina, peso opcional (1 a 3) e conteúdo opcional.'), area, previa,
      h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, h('button', { class: 'btn ghost', onClick: () => fechar() }, 'Cancelar'), h('button', { class: 'btn primary', onClick: () => {
        const { itens } = lerAgenda(area.value, ano);
        if (!itens.length) { toast('Nada reconhecido.'); return; }
        for (const i of itens) salvarProva(i);
        toast(`${itens.length} prova(s) cadastrada(s)`); fechar(); re();
      } }, 'Cadastrar todas'))), { titulo: 'Colar a agenda', larga: true });
  }
}
