// Botões para trazer imagens/PDF: tirar foto, escolher da galeria, PDF; também aceita colar e arrastar.
import { h } from '../util/dom.js';
import { salvarImagem, ehImagem, ehPdf } from '../anexos.js';
import { toast } from '../ui.js';

/**
 * @param {{aoImagens:(ids:string[])=>void, aoPdf?:(file:File)=>void, pdf?:boolean, rotuloFoto?:string, mostrarGaleria?:boolean}} o
 */
export function botoesAnexo({ aoImagens, aoPdf, pdf = false, rotuloFoto = '📷 Tirar foto', mostrarGaleria = true, compacto = false }) {
  const camera = h('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'hidden', 'aria-label': 'Tirar foto' });
  const galeria = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'hidden', 'aria-label': 'Escolher imagens' });
  const arqPdf = pdf ? h('input', { type: 'file', accept: 'application/pdf,.pdf', class: 'hidden', 'aria-label': 'Escolher PDF' }) : null;
  const estado = h('span', { class: 'small muted' }, '');

  async function receber(files) {
    const lista = [...files];
    if (!lista.length) return;
    const imgs = lista.filter(ehImagem);
    const pdfs = lista.filter(ehPdf);
    if (imgs.length) {
      estado.textContent = `Salvando ${imgs.length} imagem(ns)…`;
      try {
        const ids = [];
        for (const f of imgs) ids.push(await salvarImagem(f));
        aoImagens(ids);
      } catch (e) { toast('Não consegui salvar a imagem: ' + (e.message || e)); }
      estado.textContent = '';
    }
    if (pdfs.length && aoPdf) for (const f of pdfs) await aoPdf(f);
    else if (pdfs.length) toast('PDF não é aceito aqui — use uma foto.');
  }
  for (const inp of [camera, galeria, arqPdf].filter(Boolean)) inp.addEventListener('change', async () => { await receber(inp.files); inp.value = ''; });

  const el = h('div', { class: 'row' + (compacto ? ' tight' : '') },
    h('button', { class: 'btn' + (compacto ? ' sm' : ''), type: 'button', onClick: () => camera.click() }, rotuloFoto),
    mostrarGaleria ? h('button', { class: 'btn' + (compacto ? ' sm' : ''), type: 'button', onClick: () => galeria.click() }, '🖼️ Escolher imagens') : null,
    pdf ? h('button', { class: 'btn' + (compacto ? ' sm' : ''), type: 'button', onClick: () => arqPdf.click() }, '📄 Escolher PDF') : null,
    camera, galeria, arqPdf, estado);
  return { el, receber };
}

/** Faz uma área aceitar arquivos soltos (arrastar) e imagens coladas (Ctrl+V). */
export function aceitarSoltar(area, receber) {
  area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('arrastando'); });
  area.addEventListener('dragleave', () => area.classList.remove('arrastando'));
  area.addEventListener('drop', (e) => { e.preventDefault(); area.classList.remove('arrastando'); receber(e.dataTransfer?.files || []); });
  area.addEventListener('paste', (e) => {
    const arqs = [...(e.clipboardData?.files || [])];
    if (arqs.length) { e.preventDefault(); receber(arqs); }
  });
}
