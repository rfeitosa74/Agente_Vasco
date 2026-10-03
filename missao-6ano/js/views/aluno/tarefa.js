// Fazer uma tarefa de casa: ver as páginas, responder as questões (ou fazer no caderno e mandar foto) e enviar.
import { h } from '../../util/dom.js';
import { getState } from '../../store.js';
import { tarefaPorId, atualizarTarefa, iniciarTarefa, responderItem, anexarAoItem, adicionarFotosCaderno, marcarFeita, desfazerFeita } from '../../actionsTarefas.js';
import { statusDe, estimarMinutos, progressoDe, ROTULO_STATUS, situacaoDe } from '../../core/tarefas.js';
import { galeria } from '../galeria.js';
import { botoesAnexo } from '../anexoPicker.js';
import { banner, chip, confirmar, toast } from '../../ui.js';
import { FONTES } from '../../core/fontes.js';
import { fmtDia } from '../../util/dates.js';
import { DISC_COR } from '../../data/tecnicas.js';

const CHECK_REDACAO = [['titulo', 'Dei um título'], ['voz', 'Reli em voz alta'], ['pontuacao', 'Conferi a pontuação'], ['limpo', 'Passei a limpo no caderno']];
const palavras = (t) => (String(t).trim().match(/\S+/g) || []).length;

function debounce(fn, ms = 500) { let id; return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); }; }

export default function tarefaAluno(ctx) {
  const t = tarefaPorId(ctx.params.id);
  const hoje = ctx.hoje;
  const re = () => ctx.rerender();
  if (!t) return h('div', { class: 'stack' }, banner('aviso', 'Tarefa não encontrada', 'Ela pode ter sido apagada.'), h('a', { class: 'btn amber', href: '#/aluno/tarefas' }, '← Tarefas'));
  iniciarTarefa(t.id); // marca que abriu (ajuda a medir o tempo)

  const st = statusDe(t);
  const conferida = st === 'conferida';
  const enviada = !!t.feitaEm;
  const salvo = h('span', { class: 'chip ok', style: { visibility: 'hidden' } }, '✓ salvo');
  const mostrarSalvo = () => { salvo.style.visibility = 'visible'; clearTimeout(mostrarSalvo.t); mostrarSalvo.t = setTimeout(() => { salvo.style.visibility = 'hidden'; }, 1500); };
  const raiz = h('div', { class: 'stack lg' });

  raiz.append(
    h('a', { href: '#/aluno/tarefas', class: 'small' }, '← tarefas'),
    h('div', { class: 'card stack sm', style: { borderLeft: `6px solid ${DISC_COR[t.disciplina] || 'var(--amber)'}` } },
      h('div', { class: 'row tight' }, chip(t.rotuloOriginal || t.disciplina), chip(`para ${fmtDia(t.entrega)}`, situacaoDe(t, hoje) === 'atrasada' ? 'bad' : ''), chip(`~${estimarMinutos(t)} min`), chip(ROTULO_STATUS[st], conferida ? 'ok' : enviada ? 'warn' : ''), salvo),
      h('h1', { style: { margin: 0 } }, t.titulo),
      t.descricao ? h('div', { class: 'quote' }, t.descricao) : null));

  if (conferida) {
    raiz.append(h('div', { class: 'banner ok' }, h('h4', null, 'O pai conferiu!'), t.comentarioPai ? h('p', { style: { fontSize: '1.05rem' } }, t.comentarioPai) : h('p', null, 'Veja abaixo como foi.'), t.nota != null ? h('p', { class: 'small' }, `Nota: ${String(t.nota).replace('.', ',')}`) : null));
  } else if (enviada) {
    raiz.append(h('div', { class: 'banner info' }, h('h4', null, 'Enviada!'), h('p', null, 'O pai vai conferir. Se quiser mexer em alguma resposta, toque em “Reabrir”.'), h('button', { class: 'btn sm', onClick: () => { desfazerFeita(t.id); re(); } }, 'Reabrir a tarefa')));
  }

  if (t.anexos?.length) raiz.append(h('div', { class: 'card stack sm' }, h('h3', { style: { margin: 0 } }, '📖 Páginas da tarefa'), h('p', { class: 'small muted', style: { margin: 0 } }, 'Toque na imagem para ampliar.'), galeria(t.anexos, { tamanho: 120 })));

  if ((t.referencias || []).length) raiz.append(h('div', { class: 'card stack sm' }, h('h3', { style: { margin: 0 } }, '📎 Material de apoio (indicado pelo pai)'),
    ...t.referencias.map((r) => h('details', { class: 'acc' }, h('summary', null, r.titulo), h('div', { class: 'acc-body stack sm' }, h('p', { style: { margin: 0, whiteSpace: 'pre-wrap' } }, r.resumo), h('p', { class: 'small muted', style: { margin: 0 } }, `Fonte: ${FONTES[r.fonte]?.nome || r.fonte} · ${r.licenca || ''}`), r.url ? h('a', { class: 'btn sm', href: r.url, target: '_blank', rel: 'noopener noreferrer' }, 'Ler na fonte ↗') : null)))));
  if ((t.pesquisas || []).length) raiz.append(h('div', { class: 'card stack sm' }, h('h3', { style: { margin: 0 } }, '🔎 Para pesquisar'), h('p', { class: 'small muted', style: { margin: 0 } }, 'Fontes confiáveis da internet (precisa de conexão).'),
    h('div', { class: 'row tight' }, ...t.pesquisas.map((p) => h('a', { class: 'btn sm', href: `#/aluno/descobrir?q=${encodeURIComponent(p)}&d=${encodeURIComponent(t.disciplina)}&t=${t.id}` }, '🔎 ', p)))));

  const travado = enviada; // depois de enviada, só lê (ou reabre)

  // ---------- fazer no caderno ----------
  if (!t.itens.length) {
    const fotos = h('div', { class: 'stack sm' });
    const desenhaFotos = () => { fotos.replaceChildren(galeria(getState().tarefas.find((x) => x.id === t.id).fotosCaderno, { tamanho: 100, aoRemover: travado ? null : (id) => { atualizarTarefa(t.id, (tt) => { tt.fotosCaderno = tt.fotosCaderno.filter((x) => x !== id); }); desenhaFotos(); } })); };
    desenhaFotos();
    const pick = botoesAnexo({ rotuloFoto: '📷 Foto do caderno', aoImagens: (ids) => { adicionarFotosCaderno(t.id, ids); desenhaFotos(); mostrarSalvo(); } });
    raiz.append(h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, '✏️ Faça no caderno'),
      h('p', { class: 'muted', style: { margin: 0 } }, 'Resolva no caderno, com calma. Depois tire uma foto bem nítida (a folha inteira, de frente) para o pai conferir.'),
      travado ? null : pick.el, fotos,
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!t.respondeuNoCaderno, disabled: travado, onChange: (e) => { atualizarTarefa(t.id, (tt) => { tt.respondeuNoCaderno = e.target.checked; }); mostrarSalvo(); } }), 'Fiz tudo no caderno')));
  }

  // ---------- questões ----------
  t.itens.forEach((i, idx) => raiz.append(cartaoItem(i, idx)));

  // ---------- enviar ----------
  if (!enviada) {
    const medido = t.iniciadaEm && new Date(t.iniciadaEm).toDateString() === new Date().toDateString() ? Math.round((Date.now() - new Date(t.iniciadaEm)) / 60000) : null;
    const min = h('input', { type: 'number', min: 1, max: 300, 'aria-label': 'Quanto tempo levou, em minutos', value: medido && medido < 240 ? medido : estimarMinutos(t), style: { maxWidth: '110px' } });
    raiz.append(h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, 'Terminou?'),
      h('div', { class: 'row' }, h('label', { style: { margin: 0 } }, 'Quanto tempo levou?'), min, h('span', { class: 'muted' }, 'minutos')),
      h('button', { class: 'btn amber lg block', onClick: async () => {
        const atual = tarefaPorId(t.id); // estado de agora (as respostas foram salvas depois de a tela ser desenhada)
        const pa = progressoDe(atual);
        const faltam = pa.total - pa.feitos;
        const semCaderno = !pa.total && !(atual.fotosCaderno || []).length && !atual.respondeuNoCaderno;
        if (faltam > 0 && !(await confirmar(`Faltam ${faltam} questão(ões) sem resposta. Enviar assim mesmo?`, { ok: 'Enviar assim mesmo' }))) return;
        if (semCaderno && !(await confirmar('Você ainda não mandou foto do caderno nem marcou que fez. Enviar assim mesmo?', { ok: 'Enviar assim mesmo' }))) return;
        marcarFeita(t.id, { minutos: Number(min.value) || null });
        toast('Tarefa enviada! 🎉');
        ctx.go('#/aluno/tarefas');
      } }, '✓ Terminei! Enviar para o pai')));
  }
  return raiz;

  // ================= questão =================
  function cartaoItem(i, idx) {
    const c = i.correcao || {};
    const salvar = debounce((v) => { responderItem(t.id, i.id, v); mostrarSalvo(); });
    const corpo = h('div', { class: 'stack sm' });

    if (i.tipo === 'objetiva' && i.opcoes?.length) {
      corpo.append(...i.opcoes.map((o, k) => {
        const letra = String.fromCharCode(97 + k);
        const sel = String(i.resposta || '').toLowerCase().startsWith(letra) && i.resposta;
        return h('button', { class: 'opt' + (sel ? ' sel' : ''), disabled: travado, onClick: () => { responderItem(t.id, i.id, letra); re(); } }, `${letra}) ${o}`);
      }));
    } else if (i.tipo === 'vf') {
      corpo.append(h('div', { class: 'grid c2' }, ...[['V', 'Verdadeiro'], ['F', 'Falso']].map(([k, r]) => h('button', { class: 'opt' + (String(i.resposta || '').toUpperCase().startsWith(k) ? ' sel' : ''), disabled: travado, onClick: () => { responderItem(t.id, i.id, k); re(); } }, r))));
    } else if (i.tipo === 'calculo') {
      const inp = h('input', { type: 'text', inputmode: 'decimal', value: i.resposta || '', disabled: travado, placeholder: 'Sua resposta', 'aria-label': `Resposta da questão ${idx + 1}`, onInput: (e) => salvar(e.target.value) });
      corpo.append(inp);
    } else if (i.tipo === 'redacao') {
      const ta = h('textarea', { class: 'texto-redacao', disabled: travado, placeholder: 'Escreva aqui. Primeiro o rascunho — depois você relê e melhora.', 'aria-label': `Texto da questão ${idx + 1}` }, i.resposta || '');
      const cont = h('span', { class: 'small muted' }, `${palavras(i.resposta)} palavras`);
      ta.addEventListener('input', () => { cont.textContent = `${palavras(ta.value)} palavras · ${ta.value.split('\n').filter((l) => l.trim()).length} linha(s)/parágrafo(s)`; salvar(ta.value); });
      const marcas = i.checklist || [];
      corpo.append(ta, cont, h('div', { class: 'stack sm' }, h('b', { class: 'small' }, 'Antes de enviar:'), ...CHECK_REDACAO.map(([k, r]) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: marcas.includes(k), disabled: travado, onChange: (e) => { atualizarTarefa(t.id, (tt) => { const it = tt.itens.find((x) => x.id === i.id); it.checklist = e.target.checked ? [...new Set([...(it.checklist || []), k])] : (it.checklist || []).filter((x) => x !== k); }); mostrarSalvo(); } }), r))));
    } else {
      const ta = h('textarea', { value: i.resposta || '', disabled: travado, placeholder: 'Escreva sua resposta com suas palavras', style: { minHeight: '90px' }, 'aria-label': `Resposta da questão ${idx + 1}`, onInput: (e) => salvar(e.target.value) }, i.resposta || '');
      corpo.append(ta);
    }

    const fotos = h('div', { class: 'stack sm' });
    const desenhaFotos = () => { const it = getState().tarefas.find((x) => x.id === t.id)?.itens.find((x) => x.id === i.id); fotos.replaceChildren(galeria(it?.anexos, { tamanho: 90, aoRemover: travado ? null : (id) => { atualizarTarefa(t.id, (tt) => { const q = tt.itens.find((x) => x.id === i.id); q.anexos = q.anexos.filter((a) => a !== id); }); desenhaFotos(); } })); };
    desenhaFotos();

    const resultado = conferida && c.res ? h('div', { class: `banner ${c.res === 'certo' ? 'ok' : c.res === 'parcial' ? 'aviso' : 'erro'}` }, h('h4', null, c.res === 'certo' ? '✓ Certo!' : c.res === 'parcial' ? '◐ Quase' : '✗ Vamos rever'),
      i.gabarito && c.res !== 'certo' ? h('p', null, h('b', null, 'Resposta certa: '), i.gabarito) : null, c.comentario ? h('p', null, c.comentario) : null, (c.pontos || []).length ? h('p', { class: 'small' }, 'Para melhorar: ' + c.pontos.join(', ')) : null) : null;

    const refazer = conferida && (c.res === 'errado' || c.res === 'parcial') ? (() => {
      const ta = h('textarea', { placeholder: 'Escreva de novo, do zero, sem olhar a correção', style: { minHeight: '70px' }, onInput: debounce((e) => { atualizarTarefa(t.id, (tt) => { tt.itens.find((x) => x.id === i.id).refeita = e.target.value; }); mostrarSalvo(); }) }, i.refeita || '');
      return h('div', { class: 'stack sm' }, h('b', { class: 'small' }, 'Tente de novo (puxar da memória):'), ta);
    })() : null;

    return h('div', { class: 'card stack' },
      h('div', { class: 'row tight' }, h('span', { class: 'chip' }, `Questão ${idx + 1}`)),
      h('p', { style: { margin: 0, fontSize: '1.1rem', fontWeight: 600, whiteSpace: 'pre-wrap' } }, i.enunciado),
      corpo,
      travado ? (i.anexos?.length ? fotos : null) : h('div', { class: 'stack sm' }, botoesAnexo({ compacto: true, rotuloFoto: '📷 Foto da resolução', mostrarGaleria: false, aoImagens: (ids) => { anexarAoItem(t.id, i.id, ids); desenhaFotos(); mostrarSalvo(); } }).el, fotos),
      resultado, refazer);
  }
}
