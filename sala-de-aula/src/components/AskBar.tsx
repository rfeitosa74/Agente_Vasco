import { useEffect, useRef, useState } from 'react';
import type { Conceito, Mensagem } from '../types';
import { ErrorBox } from './ErrorBox';

export const ATALHOS: { acao: string; rotulo: string }[] = [
  { acao: 'nao_entendi', rotulo: 'Não entendi esta parte' },
  { acao: 'outra_maneira', rotulo: 'Explique de outra maneira' },
  { acao: 'exemplo', rotulo: 'Dê um exemplo do dia a dia' },
  { acao: 'e_se', rotulo: 'O que acontece se mudarmos isso?' },
];

interface Props {
  conceito: Conceito | null;
  mensagens: Mensagem[];
  ocupado: boolean;
  conceitoNome: (id: string) => string;
  onAsk: (acao: string, pergunta?: string) => void;
}

export function AskBar({ conceito, mensagens, ocupado, conceitoNome, onAsk }: Props) {
  const [texto, setTexto] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [mensagens.length, ocupado]);
  const enviar = () => {
    const t = texto.trim();
    if (!t || ocupado) return;
    onAsk('pergunta', t);
    setTexto('');
  };
  return (
    <section className="askbar" aria-label="Perguntas sobre o conceito">
      <div className="ask-row">
        <input
          className="ask-input"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && enviar()}
          placeholder={conceito ? `Escreva sua pergunta sobre “${conceito.nome}”…` : 'Escreva sua pergunta…'}
          disabled={!conceito}
          aria-label="Sua pergunta"
        />
        <button className="btn btn-primary" onClick={enviar} disabled={!conceito || ocupado || !texto.trim()}>
          Perguntar
        </button>
      </div>
      <div className="shortcuts">
        {ATALHOS.map((a) => (
          <button key={a.acao} className="chip" disabled={!conceito || ocupado} onClick={() => onAsk(a.acao)}>
            {a.rotulo}
          </button>
        ))}
      </div>
      {(mensagens.some((m) => m.acao !== 'agora_eu_explico') || ocupado) && (
        <div className="answers">
          {mensagens.filter((m) => m.acao !== 'agora_eu_explico').map((m) => (
            <div key={m.id} className={`msg msg-${m.papel}`}>
              {m.papel === 'aluno' ? (
                <p>
                  <span className="msg-who">Você</span> <span className="msg-ctx">({conceitoNome(m.conceitoId)})</span>: {m.texto}
                </p>
              ) : m.erro ? (
                <ErrorBox erro={m.erro} />
              ) : (
                <>
                  <p className="msg-who">Tutor</p>
                  <div className="msg-text">
                    {m.texto.split('\n').map((l, i) => (l.trim() ? <p key={i}>{l}</p> : null))}
                  </div>
                  {m.quadroAtualizado && <span className="tag-ok">O quadro foi atualizado para esta resposta</span>}
                </>
              )}
            </div>
          ))}
          {ocupado && (
            <div className="msg msg-tutor pending">
              <span className="spinner" /> Pensando sobre “{conceito?.nome}”…
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}
    </section>
  );
}
