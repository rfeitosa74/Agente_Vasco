// Receber tarefa: (1) colar a mensagem / enviar fotos ou PDF → (2) conferir o que o app entendeu → (3) salvar.
import { h } from '../../util/dom.js';
import { getState } from '../../store.js';
import { analisarMensagem, proximoDiaUtil } from '../../core/zap.js';
import { criarTarefas } from '../../actionsTarefas.js';
import { abrirPdf, pdfParaAnexos, lerTexto, apagar as apagarAnexo, urlDe, pegarCompartilhado, salvarImagem, ehImagem, ehPdf, ehTexto } from '../../anexos.js';
import { botoesAnexo, aceitarSoltar } from '../anexoPicker.js';
import { miniatura, abrirLightbox } from '../galeria.js';
import { editorTarefa } from './editorTarefa.js';
import { abrirModal, banner, chip, confirmar, toast } from '../../ui.js';
import { fmtDia } from '../../util/dates.js';

const CHAVE = 'missao6:rascunho-tarefa';
const vazio = () => ({ passo: 1, texto: '', anexos: [], tarefas: [], avisos: [], origemPadrao: null, salvas: [] });
let rasc = (() => { try { return JSON.parse(sessionStorage.getItem(CHAVE)) || vazio(); } catch { return vazio(); } })();
const guardar = () => { try { sessionStorage.setItem(CHAVE, JSON.stringify(rasc)); } catch { /* ignore */ } };

/** “1-3, 5” → [1,2,3,5] (limitado a `max` páginas e 20 no total). */
export function lerIntervalo(txt, max) {
  const out = new Set();
  for (const parte of String(txt).split(/[,;\s]+/).filter(Boolean)) {
    const m = parte.match(/^(\d+)(?:\s*[-–a]\s*(\d+))?$/);
    if (!m) continue;
    const a = Math.max(1, Number(m[1])), b = Math.min(max, Number(m[2] || m[1]));
    for (let p = a; p <= b && out.size < 20; p++) out.add(p);
  }
  return [...out].sort((x, y) => x - y);
}

export default function receber(ctx) {
  const s = getState();
  const hoje = ctx.hoje;
  const re = () => { guardar(); ctx.rerender(); };
  const raiz = h('div', { class: 'stack lg' });

  // ---------- chegada pelo “Compartilhar” do WhatsApp ----------
  if (ctx.params.compartilhado) {
    delete ctx.params.compartilhado; // só processa uma vez (o rerender reaproveita os mesmos parâmetros)
    (async () => {
      const c = await pegarCompartilhado().catch(() => null);
      history.replaceState(null, '', location.pathname + location.search + '#/pai/receber');
      if (!c) { re(); return; }
      const partes = [c.titulo, c.texto, c.url].filter(Boolean);
      for (const a of c.arquivos || []) {
        const f = new File([a.blob], a.name || 'arquivo', { type: a.type });
        if (ehImagem(f)) { try { rasc.anexos.push(await salvarImagem(f)); rasc.origemPadrao ||= 'foto'; } catch { /* ignora */ } }
        else if (ehTexto(f)) partes.push(await f.text());
        else if (ehPdf(f)) { rasc.pdfPendente = true; }
      }
      rasc.texto = [rasc.texto, ...partes].filter(Boolean).join('\n\n');
      if (rasc.texto.trim()) analisar();
      re();
      if (rasc.pdfPendente) { rasc.pdfPendente = false; toast('Recebi um PDF: use “Escolher PDF” para escolher as páginas.'); }
    })();
    return h('div', { class: 'card center stack' }, h('div', { class: 'big-emoji' }, '📥'), h('h2', null, 'Recebendo o que você compartilhou…'));
  }

  function analisar() {
    const r = analisarMensagem(rasc.texto, hoje, { livres: s.config.diasLivres });
    let tarefas = r.tarefas;
    if (!tarefas.length && rasc.anexos.length) {
      tarefas = [{ disciplina: 'Outra', titulo: 'Tarefa (ver as páginas)', descricao: '', itens: [], entrega: proximoDiaUtil(hoje, s.config.diasLivres), entregaDetectada: false, origem: rasc.origemPadrao || 'foto' }];
    }
    rasc.tarefas = tarefas.map((t) => ({ ...t, anexos: [...rasc.anexos], minutos: null }));
    if (rasc.origemPadrao) for (const t of rasc.tarefas) if (t.origem === 'whatsapp' && !rasc.texto.trim()) t.origem = rasc.origemPadrao;
    rasc.avisos = r.avisos;
    rasc.passo = 2;
  }

  // ============ passo 1 ============
  function passo1() {
    const texto = h('textarea', { id: 'texto-tarefa', 'aria-label': 'Mensagem da tarefa', placeholder: 'Cole aqui a mensagem do WhatsApp com as tarefas…\n\nExemplo:\nMatemática: livro pág. 54, ex. 1 a 3\nPortuguês: redação sobre as férias para sexta', style: { minHeight: '190px', fontSize: '1rem' } }, rasc.texto);
    texto.addEventListener('input', () => { rasc.texto = texto.value; guardar(); atualizarBotao(); });
    const lista = h('div', { class: 'stack sm' });
    const ocrStatus = new Map();

    const botao = h('button', { class: 'btn primary lg', type: 'button', onClick: () => { analisar(); re(); } }, 'Continuar →');
    function atualizarBotao() { botao.disabled = !rasc.texto.trim() && !rasc.anexos.length; }

    function anexar(ids, origem = 'foto') { rasc.anexos.push(...ids); rasc.origemPadrao ||= origem; guardar(); desenharAnexos(); atualizarBotao(); }

    async function ocr(id, rotulo) {
      const st = ocrStatus.get(id);
      st.textContent = 'Preparando o leitor de texto… (na primeira vez demora um pouco)';
      try {
        const r = await lerTexto(id, (p) => { st.textContent = `${p.fase} ${p.p ? Math.round(p.p * 100) + '%' : ''}`; });
        if (!r.texto) { st.textContent = 'Não achei texto nesta imagem. Tente uma foto mais nítida e de frente.'; return; }
        rasc.texto = [rasc.texto.trim(), `— ${rotulo} —\n${r.texto}`].filter(Boolean).join('\n\n');
        texto.value = rasc.texto; guardar(); atualizarBotao();
        st.textContent = r.confianca < 70 ? `✓ Texto adicionado, mas a leitura ficou incerta (${r.confianca}%). Confira e corrija.` : `✓ Texto adicionado (${r.confianca}% de certeza).`;
      } catch (e) { st.textContent = '⚠️ ' + (e.message || e); }
    }

    function desenharAnexos() {
      lista.replaceChildren();
      if (!rasc.anexos.length) return;
      lista.append(h('div', { class: 'row between' }, h('b', null, `Imagens (${rasc.anexos.length})`),
        rasc.anexos.length > 1 ? h('button', { class: 'btn sm', type: 'button', onClick: async () => { for (let i = 0; i < rasc.anexos.length; i++) await ocr(rasc.anexos[i], `Imagem ${i + 1}`); } }, '🔎 Ler o texto de todas') : null));
      rasc.anexos.forEach((id, i) => {
        const st = h('span', { class: 'small muted' }, 'Dica: se a imagem tem as questões, “Ler texto” copia para a caixa acima.');
        ocrStatus.set(id, st);
        lista.append(h('div', { class: 'card flat row top', style: { padding: '8px' } },
          miniatura(id, { aoClicar: () => abrirLightbox(rasc.anexos, i), aoRemover: async () => { rasc.anexos = rasc.anexos.filter((x) => x !== id); await apagarAnexo(id).catch(() => {}); guardar(); desenharAnexos(); atualizarBotao(); } }),
          h('div', { class: 'grow stack sm' }, h('div', { class: 'row tight' }, h('button', { class: 'btn sm', type: 'button', onClick: () => ocr(id, `Imagem ${i + 1}`) }, '🔎 Ler texto desta imagem')), st)));
      });
    }

    const pick = botoesAnexo({ pdf: true, aoImagens: (ids) => anexar(ids), aoPdf: abrirModalPdf });
    const zona = h('div', { class: 'card stack dropzone' },
      h('div', null, h('h3', { style: { margin: 0 } }, '1. O que chegou?'), h('p', { class: 'small muted', style: { margin: '4px 0 0' } }, 'Cole o texto do WhatsApp, tire foto da apostila/livro ou escolha um PDF. Pode misturar. Também dá para arrastar arquivos para cá ou colar uma imagem (Ctrl+V).')),
      texto, pick.el, lista);
    aceitarSoltar(zona, pick.receber);
    desenharAnexos(); atualizarBotao();

    function abrirModalPdf(file) {
      return new Promise((resolve) => {
        const corpo = h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Abrindo o PDF…'));
        let fechar;
        fechar = abrirModal(corpo, { titulo: 'Páginas do PDF', aoFechar: resolve });
        (async () => {
          try {
            const pdf = await abrirPdf(file);
            const faixa = h('input', { type: 'text', value: pdf.paginas <= 5 ? `1-${pdf.paginas}` : '1-3', 'aria-label': 'Páginas', placeholder: 'Ex.: 12-15, 18' });
            const previa = h('img', { alt: 'Prévia da página', style: { maxWidth: '100%', borderRadius: '10px', border: '1px solid var(--line)' } });
            const info = h('p', { class: 'small muted' }, '');
            const status = h('p', { class: 'small' }, '');
            const mostrar = async () => {
              const pgs = lerIntervalo(faixa.value, pdf.paginas);
              info.textContent = pgs.length ? `${pgs.length} página(s): ${pgs.join(', ')}` : 'Digite as páginas que têm a tarefa (ex.: 12-15).';
              if (pgs[0]) { const { blob } = await pdf.imagem(pgs[0], 0.9, 600); previa.src = URL.createObjectURL(blob); }
            };
            faixa.addEventListener('change', mostrar);
            const importar = h('button', { class: 'btn primary', type: 'button', onClick: async () => {
              const pgs = lerIntervalo(faixa.value, pdf.paginas);
              if (!pgs.length) { toast('Escolha ao menos uma página.'); return; }
              importar.disabled = true;
              try {
                const res = await pdfParaAnexos(pdf, pgs, (i, n) => { status.textContent = `Convertendo página ${Math.min(i + 1, n)} de ${n}…`; });
                rasc.anexos.push(...res.map((r) => r.id));
                rasc.origemPadrao ||= 'pdf';
                const textos = res.filter((r) => r.texto.replace(/\s/g, '').length > 20).map((r) => `— PDF, página ${r.pagina} —\n${r.texto}`);
                if (textos.length) { rasc.texto = [rasc.texto.trim(), ...textos].filter(Boolean).join('\n\n'); }
                guardar(); pdf.destruir(); fechar(); re();
                toast(textos.length ? 'Páginas e texto do PDF adicionados.' : 'Páginas adicionadas. Use “Ler texto” para copiar as questões.');
              } catch (e) { status.textContent = '⚠️ ' + (e.message || e); importar.disabled = false; }
            } }, 'Importar estas páginas');
            corpo.replaceChildren(h('p', null, `${file.name} · ${pdf.paginas} página(s)`), h('div', { class: 'field' }, h('label', null, 'Quais páginas têm a tarefa?'), faixa, h('span', { class: 'hint' }, 'Máximo de 20 páginas por vez. Ex.: 12-15 ou 3, 5, 8')), info, previa, status, h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, importar));
            mostrar();
          } catch (e) { corpo.replaceChildren(banner('erro', 'Não consegui abrir o PDF', String(e.message || e))); }
        })();
      });
    }

    return h('div', { class: 'stack lg' },
      zona,
      h('div', { class: 'row', style: { justifyContent: 'space-between' } }, rasc.texto || rasc.anexos.length ? h('button', { class: 'btn ghost', type: 'button', onClick: async () => { if (await confirmar('Descartar o que já foi colado/enviado?', { ok: 'Descartar', perigo: true })) { for (const id of rasc.anexos) await apagarAnexo(id).catch(() => {}); rasc = vazio(); re(); } } }, 'Limpar tudo') : h('span'), botao),
      h('details', { class: 'acc' }, h('summary', null, 'Como funciona?'), h('div', { class: 'acc-body stack sm' },
        h('p', null, h('b', null, 'Mensagem do WhatsApp: '), 'cole o texto. O app separa por disciplina (Matemática:, História -…), acha o prazo (“para sexta”, “até 15/10”) e as questões numeradas.'),
        h('p', null, h('b', null, 'Foto da apostila ou do livro: '), 'a foto fica na tarefa para o Luan ver. Se quiser o texto das questões, use “Ler texto” (funciona sem internet).'),
        h('p', null, h('b', null, 'PDF: '), 'escolha as páginas; elas viram imagens e o texto do PDF, quando existe, já vem junto.'),
        h('p', null, h('b', null, 'Compartilhar direto do WhatsApp: '), 'com o app instalado no celular (Android), use Compartilhar → Missão 6º Ano.'))));
  }

  // ============ passo 2 ============
  function passo2() {
    const cont = h('div', { class: 'stack lg' });
    const cartoes = h('div', { class: 'stack lg' });
    function desenhar() {
      cartoes.replaceChildren();
      rasc.tarefas.forEach((t, i) => cartoes.append(editorTarefa(t, { imagens: rasc.anexos, avisoPrazo: true, aoRemover: () => { rasc.tarefas.splice(i, 1); guardar(); desenhar(); } })));
      if (!rasc.tarefas.length) cartoes.append(h('div', { class: 'card flat center muted' }, 'Nenhuma tarefa. Adicione uma abaixo ou volte e cole a mensagem.'));
    }
    desenhar();
    const total = () => rasc.tarefas.length;
    cont.append(
      h('div', null, h('h3', { style: { margin: 0 } }, '2. Confira o que eu entendi'), h('p', { class: 'small muted', style: { margin: '4px 0 0' } }, 'Ajuste o que estiver errado. Nada é salvo até você tocar em “Salvar”.')),
      ...rasc.avisos.map((a) => banner('aviso', null, a)),
      cartoes,
      h('div', { class: 'row tight' }, h('button', { class: 'btn', type: 'button', onClick: () => { rasc.tarefas.push({ disciplina: 'Outra', titulo: '', descricao: '', itens: [], entrega: proximoDiaUtil(hoje, s.config.diasLivres), entregaDetectada: true, origem: 'digitada', anexos: [], minutos: null }); guardar(); desenhar(); } }, '＋ Outra tarefa')),
      h('div', { class: 'row', style: { justifyContent: 'space-between' } },
        h('button', { class: 'btn ghost', type: 'button', onClick: () => { rasc.passo = 1; re(); } }, '← Voltar'),
        h('button', { class: 'btn primary lg', type: 'button', onClick: async () => {
          const validas = rasc.tarefas.filter((t) => (t.titulo || '').trim() || (t.descricao || '').trim() || t.itens.length || t.anexos.length);
          if (!validas.length) { toast('Preencha ao menos o título de uma tarefa.'); return; }
          const ids = criarTarefas(validas.map((t) => ({ ...t, titulo: (t.titulo || '').trim() || (t.itens.length ? `${t.itens.length} questões` : 'Tarefa (ver as páginas)') })), { fonteTexto: rasc.texto, data: hoje });
          const usadas = new Set(validas.flatMap((t) => t.anexos));
          for (const a of rasc.anexos) if (!usadas.has(a)) await apagarAnexo(a).catch(() => {});
          rasc = { ...vazio(), passo: 3, salvas: ids };
          re();
        } }, `✓ Salvar ${total()} tarefa${total() === 1 ? '' : 's'}`)));
    return cont;
  }

  // ============ passo 3 ============
  function passo3() {
    const ts = rasc.salvas.map((id) => getState().tarefas.find((t) => t.id === id)).filter(Boolean);
    return h('div', { class: 'card b4 center stack' }, h('div', { class: 'big-emoji' }, '✅'), h('h2', { style: { margin: 0 } }, ts.length === 1 ? 'Tarefa salva!' : `${ts.length} tarefas salvas!`),
      h('div', { class: 'stack sm' }, ...ts.map((t) => h('div', { class: 'row between card flat', style: { padding: '8px 12px', textAlign: 'left' } }, h('span', null, h('b', null, t.disciplina), ' · ', t.titulo), chip(`para ${fmtDia(t.entrega)}`)))),
      h('p', { class: 'muted' }, 'O Luan já vê no aplicativo dele, na aba Tarefas e no Hoje.'),
      h('div', { class: 'row', style: { justifyContent: 'center' } }, h('a', { class: 'btn primary', href: '#/pai/tarefas' }, 'Ver as tarefas'), h('button', { class: 'btn', type: 'button', onClick: () => { rasc = vazio(); re(); } }, '＋ Receber outra')));
  }

  const passos = ['Receber', 'Conferir', 'Pronto'];
  raiz.append(h('div', null, h('p', { class: 'eyebrow' }, 'Tarefas de casa'), h('h1', { style: { margin: 0 } }, 'Receber tarefa')),
    h('div', { class: 'row tight' }, ...passos.map((p, i) => h('span', { class: 'chip ' + (rasc.passo === i + 1 ? 'info' : rasc.passo > i + 1 ? 'ok' : '') }, `${i + 1} · ${p}`))),
    rasc.passo === 1 ? passo1() : rasc.passo === 2 ? passo2() : passo3());
  return raiz;
}
