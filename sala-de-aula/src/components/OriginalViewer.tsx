import { useEffect, useMemo, useRef, useState } from 'react';
import { formatarTempo, segundosDe } from '../material';
import { renderPage, type PdfDoc } from '../pdf';
import type { Analise, Material } from '../types';
import { Modal } from './Modal';

interface Props {
  material: Material;
  analise: Analise | null;
  pdf: PdfDoc | null;
  paginaInicial?: number;
  destacarPaginas: number[];
  tempoInicial?: number;
  temposConceito?: string[];
  onClose: () => void;
}

function MidiaOriginal({ material, analise, tempoInicial, temposConceito }: { material: Material; analise: Analise | null; tempoInicial?: number; temposConceito: string[] }) {
  const url = useMemo(() => (material.arquivo ? URL.createObjectURL(material.arquivo) : ''), [material.arquivo]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const ref = useRef<HTMLMediaElement | null>(null);
  const ir = (seg: number) => {
    const el = ref.current;
    if (!el) return;
    el.currentTime = seg;
    void el.play().catch(() => {});
  };
  useEffect(() => {
    const el = ref.current;
    if (!el || tempoInicial == null) return;
    const aplicar = () => (el.currentTime = tempoInicial);
    if (el.readyState >= 1) aplicar();
    else el.addEventListener('loadedmetadata', aplicar, { once: true });
  }, [tempoInicial, url]);
  if (!url) return <p>O arquivo não está mais disponível neste navegador. Use “Trocar material” e envie-o de novo.</p>;
  const marcas = [
    ...temposConceito.map((t) => ({ t, rotulo: `Conceito atual · ${t}` })),
    ...(analise?.secoes || []).filter((s) => s.inicio).map((s) => ({ t: s.inicio!, rotulo: `${s.inicio} · ${s.titulo}` })),
  ];
  return (
    <div className="midia-original">
      {material.midia === 'imagem' && <img src={url} alt={`Material: ${material.nome}`} className="midia-img" />}
      {material.midia === 'audio' && <audio ref={(el) => (ref.current = el)} src={url} controls className="midia-player" />}
      {material.midia === 'video' && <video ref={(el) => (ref.current = el)} src={url} controls className="midia-player" />}
      {material.midia !== 'imagem' && marcas.length > 0 && (
        <div className="pdf-jump">
          Ir para:{' '}
          {marcas.map((m, i) => (
            <button key={i} className="chip" onClick={() => ir(segundosDe(m.t) ?? 0)}>
              {m.rotulo}
            </button>
          ))}
        </div>
      )}
      {material.duracao ? <p className="muted">Duração: {formatarTempo(material.duracao)}</p> : null}
    </div>
  );
}

export function OriginalViewer({ material, analise, pdf, paginaInicial, destacarPaginas, tempoInicial, temposConceito = [], onClose }: Props) {
  const [pagina, setPagina] = useState(paginaInicial || destacarPaginas[0] || 1);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const total = pdf?.numPages || 0;

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    let cancel = false;
    setCarregando(true);
    setErro('');
    const w = Math.min(900, (wrapRef.current?.clientWidth || 800) - 8);
    renderPage(pdf, pagina, canvasRef.current, w)
      .catch((e) => !cancel && setErro(`Não foi possível mostrar a página ${pagina}: ${e?.message || e}`))
      .finally(() => !cancel && setCarregando(false));
    return () => {
      cancel = true;
    };
  }, [pdf, pagina]);

  return (
    <Modal title={`Material original — ${material.nome}`} onClose={onClose} wide>
      {material.tipo === 'midia' ? (
        <MidiaOriginal material={material} analise={analise} tempoInicial={tempoInicial} temposConceito={temposConceito} />
      ) : material.tipo === 'pdf' ? (
        pdf ? (
          <>
            <div className="pdf-nav">
              <button className="btn" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                ← Anterior
              </button>
              <span>
                Página {pagina} de {total}
              </span>
              <button className="btn" disabled={pagina >= total} onClick={() => setPagina((p) => p + 1)}>
                Próxima →
              </button>
              {destacarPaginas.length > 0 && (
                <span className="pdf-jump">
                  Páginas do conceito:{' '}
                  {destacarPaginas.map((p) => (
                    <button key={p} className={`chip ${p === pagina ? 'active' : ''}`} onClick={() => setPagina(p)}>
                      {p}
                    </button>
                  ))}
                </span>
              )}
            </div>
            {erro && <p className="error-inline">{erro}</p>}
            <div className="pdf-page" ref={wrapRef}>
              {carregando && <span className="spinner" />}
              <canvas ref={canvasRef} />
            </div>
          </>
        ) : (
          <p>O PDF não está mais disponível neste navegador. Use “Trocar material” e envie-o de novo.</p>
        )
      ) : (
        <div className="original-text">
          {material.origem === 'Word' && <p className="muted">Texto extraído do documento do Word (as imagens do documento não aparecem aqui).</p>}
          {analise && analise.secoes.length > 0 && <p className="muted">Seções identificadas: {analise.secoes.map((s) => s.titulo).join(' · ')}</p>}
          <pre>{material.texto}</pre>
        </div>
      )}
    </Modal>
  );
}
