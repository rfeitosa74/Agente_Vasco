import { useEffect, useMemo, useState } from 'react';
import type { ApiErro, Direcao, ImagemGerada } from '../types';
import { ErrorBox } from './ErrorBox';
import { Modal } from './Modal';

export interface ObservacaoRevisao {
  categoria: string;
  descricao: string;
  sugestaoDeCorrecao?: string;
}

export interface InfoState {
  fase: 'direcao' | 'imagem' | 'pronto' | 'erro' | 'corrigindo';
  conceitoNome: string;
  duvida: string;
  origem: 'botao' | 'voz';
  direcao?: Direcao;
  versoes: ImagemGerada[];
  atual: number;
  erro?: ApiErro;
  etapaErro?: 'direcao' | 'imagem' | 'correcao';
  revisao?: { carregando: boolean; observacoes?: ObservacaoRevisao[]; resumo?: string; erro?: ApiErro };
}

const CAT: Record<string, string> = {
  legendas: 'Legendas',
  ortografia: 'Ortografia',
  posicoes: 'Posições',
  coerencia_cientifica: 'Coerência científica',
  legibilidade: 'Legibilidade',
  outro: 'Outro',
};

interface Props {
  st: InfoState;
  liveAtivo: boolean;
  onRetry: () => void;
  onCorrigir: (instrucao: string) => void;
  onRevisar: () => void;
  onPerguntarTutor: () => void;
  onFechar: () => void;
}

function useBlobUrl(img?: ImagemGerada) {
  const url = useMemo(() => {
    if (!img) return '';
    const bin = atob(img.data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: img.mimeType }));
  }, [img]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  return url;
}

export function InfographicPanel({ st, liveAtivo, onRetry, onCorrigir, onRevisar, onPerguntarTutor, onFechar }: Props) {
  const img = st.versoes[st.atual];
  const url = useBlobUrl(img);
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(false);
  const [real, setReal] = useState(false);
  const [instrucao, setInstrucao] = useState('');
  const [verDirecao, setVerDirecao] = useState(false);
  const ext = img?.mimeType.includes('jpeg') ? 'jpg' : img?.mimeType.split('/')[1] || 'png';
  const nomeArquivo = `infografico-${st.conceitoNome.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')}-v${st.atual + 1}.${ext}`;

  return (
    <section className="infographic" aria-label="Infográfico">
      <header className="info-head">
        <h2>Infográfico: {st.conceitoNome}</h2>
        <button className="btn-icon" onClick={onFechar} aria-label="Fechar infográfico" disabled={st.fase === 'direcao' || st.fase === 'imagem' || st.fase === 'corrigindo'}>
          ✕
        </button>
      </header>
      <p className="muted">
        Pedido {st.origem === 'voz' ? 'pelo tutor por voz' : 'pelo botão'}: “{st.duvida}”
      </p>

      <ol className="info-steps">
        <li className={st.direcao ? 'done' : st.fase === 'direcao' ? 'active' : st.etapaErro === 'direcao' ? 'fail' : ''}>Direção visual</li>
        <li className={img ? 'done' : st.fase === 'imagem' ? 'active' : st.etapaErro === 'imagem' ? 'fail' : ''}>Geração da imagem (Nano Banana Pro)</li>
      </ol>

      {(st.fase === 'direcao' || st.fase === 'imagem' || st.fase === 'corrigindo') && (
        <p className="info-wait">
          <span className="spinner" />{' '}
          {st.fase === 'direcao' ? 'Preparando a direção visual a partir do material…' : st.fase === 'imagem' ? 'Gerando a imagem — isso pode levar até um minuto…' : 'Aplicando a correção na imagem…'}
          {liveAtivo && ' Você pode continuar conversando com o tutor.'}
        </p>
      )}
      {st.fase === 'erro' && st.erro && (
        <ErrorBox
          erro={st.erro}
          onRetry={onRetry}
          retryLabel={st.etapaErro === 'correcao' ? 'Tentar a correção de novo' : 'Tentar novamente'}
        />
      )}

      {st.direcao && (
        <div className="info-direction">
          <button className="btn btn-link" onClick={() => setVerDirecao((v) => !v)} aria-expanded={verDirecao}>
            {verDirecao ? 'Ocultar direção visual' : 'Ver direção visual usada'}
          </button>
          {verDirecao && (
            <dl>
              <dt>Pergunta principal</dt>
              <dd>{st.direcao.perguntaPrincipal}</dd>
              <dt>Título</dt>
              <dd>{st.direcao.titulo}</dd>
              <dt>Ilustração principal</dt>
              <dd>{st.direcao.ilustracaoPrincipal}</dd>
              <dt>Seções</dt>
              <dd>{st.direcao.secoes.map((s) => `${s.titulo}: ${s.conteudo}`).join(' · ')}</dd>
              <dt>Legendas</dt>
              <dd>{st.direcao.legendas.join(' · ')}</dd>
              <dt>Conclusão</dt>
              <dd>{st.direcao.conclusao}</dd>
              {st.direcao.notaEscala && (
                <>
                  <dt>Nota</dt>
                  <dd>{st.direcao.notaEscala}</dd>
                </>
              )}
              <dt>Cuidados científicos</dt>
              <dd>{st.direcao.cuidadosCientificos.join(' · ')}</dd>
            </dl>
          )}
        </div>
      )}

      {img && (
        <>
          <figure className="info-figure">
            <button className="info-img-btn" onClick={() => setZoom(true)} aria-label="Ampliar infográfico">
              <img src={url} alt={`Infográfico: ${st.direcao?.titulo || st.conceitoNome}`} onLoad={(e) => setDim({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
            </button>
            <figcaption>
              Modelo usado: <b>{img.modelo}</b>
              {img.modelo !== img.modeloPedido && ` (pedido: ${img.modeloPedido})`}
              {dim && ` · ${dim.w}×${dim.h} px`}
              {` · pedido: ${img.configUsada.aspectRatio || '—'}${img.configUsada.imageSize ? `, ${img.configUsada.imageSize}` : ' (o tamanho 2K foi recusado pela API)'}`}
            </figcaption>
          </figure>
          {st.versoes.length > 1 && (
            <p className="muted">
              Versão {st.atual + 1} de {st.versoes.length} (a mais recente inclui as correções pedidas).
            </p>
          )}
          <div className="info-actions">
            <button className="btn" onClick={() => setZoom(true)}>
              Ampliar
            </button>
            <a className="btn" href={url} download={nomeArquivo}>
              Baixar (resolução original)
            </a>
            <button className="btn btn-blue" onClick={onPerguntarTutor}>
              Perguntar ao tutor sobre este infográfico
            </button>
            <button className="btn" onClick={onRevisar} disabled={st.revisao?.carregando || st.fase === 'corrigindo'}>
              {st.revisao?.carregando ? 'Revisando…' : 'Revisar o infográfico'}
            </button>
          </div>
          <div className="info-fix">
            <label htmlFor="correcao">Pedir uma correção específica</label>
            <div className="ask-row">
              <input
                id="correcao"
                className="ask-input"
                value={instrucao}
                onChange={(e) => setInstrucao(e.target.value)}
                placeholder="Ex.: aumente o tamanho das legendas"
                onKeyDown={(e) => e.key === 'Enter' && instrucao.trim() && st.fase === 'pronto' && onCorrigir(instrucao.trim())}
              />
              <button className="btn btn-primary" disabled={!instrucao.trim() || st.fase === 'corrigindo'} onClick={() => onCorrigir(instrucao.trim())}>
                Corrigir imagem
              </button>
            </div>
          </div>
          {st.revisao && !st.revisao.carregando && (
            <div className="info-review">
              {st.revisao.erro ? (
                <ErrorBox erro={st.revisao.erro} onRetry={onRevisar} />
              ) : (
                <>
                  <h3>Revisão visual (orientação, não garantia de precisão)</h3>
                  {st.revisao.resumo && <p>{st.revisao.resumo}</p>}
                  {st.revisao.observacoes?.length ? (
                    <ul>
                      {st.revisao.observacoes.map((o, i) => (
                        <li key={i}>
                          <b>{CAT[o.categoria] || o.categoria}:</b> {o.descricao}{' '}
                          {o.sugestaoDeCorrecao && (
                            <button className="btn btn-link" onClick={() => setInstrucao(o.sugestaoDeCorrecao!)}>
                              usar como correção
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>A revisão não apontou problemas. Ainda assim, confira com o material.</p>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
      {zoom && img && (
        <Modal title={st.direcao?.titulo || 'Infográfico'} onClose={() => setZoom(false)} wide>
          <div className="zoom-wrap">
            <img src={url} alt="Infográfico ampliado" className={real ? 'zoom-img real' : 'zoom-img'} onClick={() => setReal((r) => !r)} />
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setReal((r) => !r)}>
              {real ? 'Ajustar à tela' : 'Ver em 100% (pixels reais)'}
            </button>
            <a className="btn btn-primary" href={url} download={nomeArquivo}>
              Baixar (resolução original{dim ? `, ${dim.w}×${dim.h}` : ''})
            </a>
            <a className="btn" href={url} target="_blank" rel="noreferrer">
              Abrir em tamanho real numa nova aba
            </a>
          </div>
        </Modal>
      )}
    </section>
  );
}
