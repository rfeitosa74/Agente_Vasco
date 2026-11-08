import { useEffect, useRef, useState } from 'react';
import type { LiveSnapshot } from '../live/LiveTutor';

const ROTULO: Record<string, string> = {
  desconectado: 'Desconectado',
  conectando: 'Conectando…',
  ouvindo: 'Ouvindo',
  respondendo: 'Respondendo',
  erro: 'Erro',
};

interface Props {
  snap: LiveSnapshot;
  onStart: () => void;
  onEnd: () => void;
  onMute: (m: boolean) => void;
  onRetry: () => void;
}

export function TutorDock({ snap, onStart, onEnd, onMute, onRetry }: Props) {
  const [aberto, setAberto] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const ativo = snap.status === 'ouvindo' || snap.status === 'respondendo';
  useEffect(() => {
    if (aberto && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [snap.transcript, aberto]);
  return (
    <div className="tutor-dock" role="region" aria-label="Tutor por voz">
      {aberto && (
        <div className="transcript" ref={listRef} aria-live="polite">
          {snap.transcript.length === 0 && <p className="muted">A transcrição da conversa aparecerá aqui.</p>}
          {snap.transcript.map((t) => (
            <p key={t.id} className={`tr tr-${t.papel}`}>
              <b>{t.papel === 'aluno' ? 'Você' : t.papel === 'tutor' ? 'Tutor' : '•'}</b> {t.texto}
            </p>
          ))}
        </div>
      )}
      <div className="dock-bar">
        {!ativo && snap.status !== 'conectando' && snap.status !== 'erro' && (
          <button className="btn-tutor" onClick={onStart}>
            <span className="mic-icon" aria-hidden>🎙</span> Conversar com o tutor
          </button>
        )}
        <span className={`status-pill st-${snap.status}`} aria-live="polite">
          <span className="dot" /> {ROTULO[snap.status]}
          {snap.ferramenta && <em> · {snap.ferramenta}…</em>}
          {snap.status === 'ouvindo' && snap.muted && <em> · microfone silenciado</em>}
        </span>
        {snap.status === 'erro' && (
          <span className="dock-error">
            {snap.erro} {snap.dica && <small>{snap.dica}</small>}
          </span>
        )}
        {snap.status === 'conectando' && <span className="spinner" />}
        <span className="dock-spacer" />
        {ativo && (
          <button className={`btn ${snap.muted ? 'btn-coral' : ''}`} onClick={() => onMute(!snap.muted)} aria-pressed={snap.muted}>
            {snap.muted ? 'Ativar microfone' : 'Silenciar microfone'}
          </button>
        )}
        {snap.status === 'erro' && (
          <button className="btn btn-primary" onClick={onRetry}>
            Tentar novamente
          </button>
        )}
        {(ativo || snap.status === 'conectando' || snap.status === 'erro') && (
          <button className="btn" onClick={onEnd}>
            Encerrar
          </button>
        )}
        <button className="btn btn-link" onClick={() => setAberto((a) => !a)} aria-expanded={aberto}>
          {aberto ? 'Ocultar transcrição' : `Transcrição${snap.transcript.length ? ` (${snap.transcript.filter((t) => t.papel !== 'sistema').length})` : ''}`}
        </button>
        {snap.modelo && <span className="dock-model" title="Modelo Live em uso">{snap.modelo}</span>}
      </div>
    </div>
  );
}
