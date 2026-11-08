import { useEffect, useRef, useState } from 'react';
import { renderPage, type PdfDoc } from '../pdf';
import type { Analise, Material } from '../types';
import { Modal } from './Modal';

interface Props {
  material: Material;
  analise: Analise | null;
  pdf: PdfDoc | null;
  paginaInicial?: number;
  destacarPaginas: number[];
  onClose: () => void;
}

export function OriginalViewer({ material, analise, pdf, paginaInicial, destacarPaginas, onClose }: Props) {
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
    <Modal title={`Anotações originais — ${material.nome}`} onClose={onClose} wide>
      {material.tipo === 'pdf' ? (
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
          {analise && analise.secoes.length > 0 && <p className="muted">Seções identificadas: {analise.secoes.map((s) => s.titulo).join(' · ')}</p>}
          <pre>{material.texto}</pre>
        </div>
      )}
    </Modal>
  );
}
