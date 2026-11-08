import { useMemo, useState } from 'react';
import { CORES, renderBoardSvg, SVG_KINDS } from '../../shared/board.js';
import type { ApiErro, BoardState } from '../types';
import { ErrorBox } from './ErrorBox';

interface Props {
  state: BoardState | null;
  loading: string | null;
  erro: ApiErro | null;
  highlights: string[];
  temPaginas: boolean;
  onRetry: () => void;
  onShowPage: (p: number) => void;
}

const STATUS_REVISAO: Record<string, { txt: string; cls: string }> = {
  aprovado: { txt: 'Conferido pela revisão automática', cls: 'ok' },
  corrigido: { txt: 'Corrigido pela revisão automática', cls: 'ok' },
  corrigido_com_avisos: { txt: 'Corrigido, com avisos', cls: 'warn' },
  texto_alternativo: { txt: 'Desenho não confiável: explicação em texto', cls: 'warn' },
  nao_revisado: { txt: 'Não foi possível revisar este quadro', cls: 'warn' },
};

export function BoardView({ state, loading, erro, highlights, temPaginas, onRetry, onShowPage }: Props) {
  const [verRevisao, setVerRevisao] = useState(false);
  const board = state?.board;
  const hl = new Set(highlights);
  const svg = useMemo(() => (board && SVG_KINDS.includes(board.tipo) ? renderBoardSvg(board, { highlights }) : ''), [board, highlights]);

  return (
    <section className="chalkboard" aria-label="Quadro" aria-busy={!!loading}>
      <div className="chalkboard-inner">
        {!board && !loading && !erro && <p className="chalk-empty">Escolha um conceito no caderno para começar.</p>}
        {!board && loading && (
          <div className="chalk-loading">
            <span className="spinner light" /> {loading}
          </div>
        )}
        {erro && !loading && (
          <div className="chalk-error">
            <ErrorBox erro={erro} onRetry={onRetry} dark />
          </div>
        )}
        {board && (
          <div className={`board-content ${loading ? 'is-updating' : ''}`}>
            <header className="board-head">
              <p className="board-question">{board.pergunta}</p>
              <h2 className="board-title">{board.titulo}</h2>
            </header>

            {svg && <div className="board-svg" dangerouslySetInnerHTML={{ __html: svg }} />}

            {board.tipo === 'comparacao' && board.comparacao && (
              <div className="board-compare" role="table">
                <div className="cmp-row cmp-head" role="row" style={{ gridTemplateColumns: `minmax(120px,0.8fr) repeat(${board.comparacao.colunas.length}, 1fr)` }}>
                  <span role="columnheader" />
                  {board.comparacao.colunas.map((c) => (
                    <span key={c.id} role="columnheader" className={`cmp-col ${hl.has(c.id) ? 'hl' : ''}`} style={{ color: CORES[c.cor], borderColor: CORES[c.cor] }}>
                      {c.titulo}
                    </span>
                  ))}
                </div>
                {board.comparacao.aspectos.map((a) => (
                  <div key={a.id} role="row" className={`cmp-row ${hl.has(a.id) ? 'hl' : ''}`} style={{ gridTemplateColumns: `minmax(120px,0.8fr) repeat(${board.comparacao!.colunas.length}, 1fr)` }}>
                    <span role="rowheader" className="cmp-aspect">{a.aspecto}</span>
                    {board.comparacao!.colunas.map((c, i) => (
                      <span key={c.id} role="cell" className={`cmp-cell ${hl.has(c.id) ? 'hl' : ''}`}>
                        {a.valores[i] ?? '—'}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {board.tipo === 'texto' && board.texto && (
              <div className="board-text">
                {board.texto.blocos.map((b) => (
                  <div key={b.id} className={`text-block ${hl.has(b.id) ? 'hl' : ''}`}>
                    <h3>{b.titulo}</h3>
                    <p>{b.texto}</p>
                  </div>
                ))}
              </div>
            )}

            <p className="board-explanation">{board.explicacao}</p>

            {board.cartoes.length > 0 && (
              <div className="board-cards">
                {board.cartoes.map((c) => (
                  <div key={c.id} className={`chalk-card ${hl.has(c.id) ? 'hl' : ''}`}>
                    <strong>{c.titulo}</strong>
                    <span>{c.texto}</span>
                  </div>
                ))}
              </div>
            )}

            <footer className="board-foot">
              {board.fontes.length > 0 && (
                <span className="sources">
                  Fonte no material:{' '}
                  {board.fontes.map((f, i) => {
                    const m = temPaginas ? /p\.?\s*(\d+)/i.exec(f) : null;
                    return m ? (
                      <button key={i} className="link-chalk" onClick={() => onShowPage(Number(m[1]))}>
                        {f}
                      </button>
                    ) : (
                      <span key={i} className="source-tag">{f}</span>
                    );
                  })}
                </span>
              )}
              {board.figuraOriginal && temPaginas && (
                <button className="btn-chalk" onClick={() => onShowPage(board.figuraOriginal!.pagina)}>
                  Ver figura original (p. {board.figuraOriginal.pagina})
                </button>
              )}
              {state?.revisao && (
                <button className={`review-badge ${STATUS_REVISAO[state.revisao.status]?.cls || ''}`} onClick={() => setVerRevisao((v) => !v)} aria-expanded={verRevisao}>
                  {STATUS_REVISAO[state.revisao.status]?.txt || state.revisao.status}
                </button>
              )}
            </footer>
            {verRevisao && state?.revisao && (
              <div className="review-details">
                {state.revisao.aviso && <p>{state.revisao.aviso}</p>}
                {state.revisao.problemas.length > 0 ? (
                  <>
                    <p>A revisão automática encontrou e pediu a correção de:</p>
                    <ul>{state.revisao.problemas.map((p, i) => <li key={i}>{p}</li>)}</ul>
                  </>
                ) : (
                  <p>A revisão automática não encontrou problemas.</p>
                )}
                {state.revisao.avisos && state.revisao.avisos.length > 0 && (
                  <>
                    <p>Avisos que restaram:</p>
                    <ul>{state.revisao.avisos.map((p, i) => <li key={i}>{p}</li>)}</ul>
                  </>
                )}
                <p className="muted-chalk">A revisão é automática e serve como orientação; confira com o material.</p>
              </div>
            )}
            {loading && (
              <div className="board-updating">
                <span className="spinner light" /> {loading}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
