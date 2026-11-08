// Identifica o arquivo escolhido e o prepara para a aula.
import { ApiError, IS_ARTIFACT } from './api';
import type { Material, TipoMidia } from './types';

const EXT_MIDIA: Record<string, TipoMidia> = {
  png: 'imagem', jpg: 'imagem', jpeg: 'imagem', webp: 'imagem', heic: 'imagem', heif: 'imagem',
  mp3: 'audio', wav: 'audio', m4a: 'audio', aac: 'audio', ogg: 'audio', oga: 'audio', flac: 'audio', aiff: 'audio', opus: 'audio',
  mp4: 'video', m4v: 'video', mov: 'video', avi: 'video', webm: 'video', mpeg: 'video', mpg: 'video', wmv: 'video', '3gp': 'video', flv: 'video',
};

export const FORMATOS_ACEITOS = IS_ARTIFACT
  ? '.pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp'
  : '.pdf,.docx,.txt,.md,' + Object.keys(EXT_MIDIA).map((e) => `.${e}`).join(',') + ',application/pdf,image/*,audio/*,video/*';

export const DESCRICAO_FORMATOS = IS_ARTIFACT
  ? 'PDF, Word (.docx), texto (.txt) ou foto (JPG, PNG, WebP)'
  : 'PDF, Word (.docx), texto (.txt), foto, áudio (MP3, WAV, M4A…) ou vídeo (MP4, MOV, WebM…)';

const LIMITE_MB = { pdf: 19, midia: 100 };

function erro(mensagem: string, comoResolver = '') {
  return new ApiError({ tipo: 'formato', mensagem, comoResolver }, 400);
}

/** Duração de um áudio/vídeo em segundos (0 se o navegador não souber ler). */
function duracaoDe(file: File, tipo: 'audio' | 'video'): Promise<number> {
  return new Promise((ok) => {
    const el = document.createElement(tipo);
    const url = URL.createObjectURL(file);
    const fim = (v: number) => {
      URL.revokeObjectURL(url);
      ok(Number.isFinite(v) ? Math.round(v) : 0);
    };
    el.preload = 'metadata';
    el.onloadedmetadata = () => fim(el.duration);
    el.onerror = () => fim(0);
    setTimeout(() => fim(0), 8000);
    el.src = url;
  });
}

export async function prepararArquivo(file: File): Promise<Material> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const nome = file.name;
  if (ext === 'pdf' || file.type === 'application/pdf') {
    if (file.size > LIMITE_MB.pdf * 1024 * 1024) throw erro(`O PDF é grande demais (limite de ${LIMITE_MB.pdf} MB).`, 'Divida o PDF ou envie só as páginas da matéria.');
    return { tipo: 'pdf', nome, arquivo: file };
  }
  if (ext === 'docx') {
    const mammoth: any = await import('mammoth');
    let texto = '';
    try {
      const r = await (mammoth.default || mammoth).extractRawText({ arrayBuffer: await file.arrayBuffer() });
      texto = String(r.value || '').replace(/\n{3,}/g, '\n\n').trim();
    } catch {
      throw erro('Não foi possível ler este documento do Word.', 'Abra no Word e salve de novo como .docx, ou exporte como PDF.');
    }
    if (texto.length < 40) throw erro('O documento do Word está vazio ou só tem imagens.', 'Exporte o documento como PDF para que as imagens também sejam lidas.');
    return { tipo: 'texto', nome, texto, origem: 'Word' };
  }
  if (ext === 'doc') throw erro('Arquivos .doc (Word antigo) não são aceitos.', 'Abra no Word e use "Salvar como" → "Documento do Word (.docx)", ou exporte como PDF.');
  if (ext === 'txt' || ext === 'md' || file.type.startsWith('text/')) {
    const texto = (await file.text()).trim();
    if (texto.length < 40) throw erro('O arquivo de texto está vazio ou curto demais.');
    return { tipo: 'texto', nome, texto, origem: 'arquivo de texto' };
  }
  const midia: TipoMidia | undefined =
    EXT_MIDIA[ext] || (file.type.startsWith('image/') ? 'imagem' : file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('video/') ? 'video' : undefined);
  if (midia) {
    if (IS_ARTIFACT && midia !== 'imagem')
      throw new ApiError(
        {
          tipo: 'indisponivel',
          mensagem: 'Áudios e vídeos não funcionam na versão de artefato do Claude.',
          comoResolver: 'Use o site no Render (versão com Gemini), que entende áudio e vídeo. Aqui você pode enviar PDF, Word, texto ou foto.',
        },
        400
      );
    if (file.size > LIMITE_MB.midia * 1024 * 1024)
      throw erro(`O arquivo é grande demais (limite de ${LIMITE_MB.midia} MB).`, 'Envie um arquivo menor, ou corte só a parte da matéria.');
    const duracao = midia === 'imagem' ? 0 : await duracaoDe(file, midia);
    return { tipo: 'midia', nome, arquivo: file, midia, duracao };
  }
  throw erro('Este tipo de arquivo não é aceito.', `Envie ${DESCRICAO_FORMATOS}.`);
}

export function formatarTempo(seg: number) {
  const s = Math.max(0, Math.round(seg || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}
export function segundosDe(t: string): number | null {
  const m = /^\s*(?:(\d+):)?(\d{1,2}):(\d{2})\s*$/.exec(t);
  return m ? Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
}
