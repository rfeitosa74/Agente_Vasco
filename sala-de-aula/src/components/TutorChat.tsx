// Tutor por escrito (versão artefato do Claude: o microfone não é permitido).
// Usa o Claude da conta de quem abre a página, com ferramentas ligadas ao quadro.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { FunctionDeclaration } from '@google/genai';
import { erroDoClaude, getSample, limites } from '../artifact/backend';
import type { ApiErro } from '../types';
import { ErrorBox } from './ErrorBox';

interface Msg {
  id: number;
  papel: 'aluno' | 'tutor' | 'sistema';
  texto: string;
}
export interface TutorChatHandle {
  perguntar: (texto: string, imagens?: Blob[]) => void;
}
interface Props {
  contexto: () => string;
  ferramentas: FunctionDeclaration[];
  onToolCall: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

const NOMES: Record<string, string> = {
  mostrar_conceito: 'Trocou de conceito',
  destacar_no_quadro: 'Destacou no quadro',
  atualizar_quadro: 'Atualizou o quadro',
  criar_infografico: 'Pediu um infográfico',
  abrir_agora_eu_explico: 'Abriu “Agora eu explico”',
};
let seq = 0;

export const TutorChat = forwardRef<TutorChatHandle, Props>(function TutorChat({ contexto, ferramentas, onToolCall }, ref) {
  const [aberto, setAberto] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [parcial, setParcial] = useState('');
  const [erro, setErro] = useState<ApiErro | null>(null);
  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const ctlRef = useRef<AbortController | null>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const turnos = useRef<{ role: 'user' | 'assistant'; content: string }[]>([]);

  useEffect(() => {
    getSample().then((s) => setDisponivel(!!s));
  }, []);
  useEffect(() => {
    if (listaRef.current) listaRef.current.scrollTop = listaRef.current.scrollHeight;
  }, [msgs, parcial, aberto]);

  const add = (papel: Msg['papel'], t: string) => setMsgs((m) => [...m, { id: ++seq, papel, texto: t }]);

  const enviar = async (pergunta: string, imagens: Blob[] = []) => {
    const s = await getSample();
    if (!s || ocupado) return;
    setAberto(true);
    setErro(null);
    add('aluno', pergunta);
    turnos.current.push({ role: 'user', content: pergunta });
    turnos.current = turnos.current.slice(-12);
    if (turnos.current[0]?.role === 'assistant') turnos.current.shift();
    const lim = await limites();
    const tools = lim?.tools
      ? ferramentas.slice(0, lim.tools.maxCount).map((f) => ({
          name: f.name!,
          description: f.description!,
          inputSchema: (f.parametersJsonSchema as any) || { type: 'object', properties: {} },
          execute: async (input: Record<string, unknown>) => {
            const r = await onToolCall(f.name!, input);
            add('sistema', `${NOMES[f.name!] || f.name}: ${r.ok ? 'feito' : `não foi possível (${r.erro || 'erro'})`}.`);
            if (!r.ok) throw new Error(String(r.erro || 'não foi possível'));
            return r;
          },
        }))
      : undefined;
    const regras = `${contexto()}\n\nResponda por escrito, em 2 a 5 frases curtas. Use as ferramentas quando ajudarem e só diga que algo mudou na tela depois que a ferramenta confirmar.`;
    ctlRef.current = new AbortController();
    setOcupado(true);
    setParcial('');
    try {
      const imgs = imagens.length && lim?.images?.maxCount ? imagens.slice(0, lim.images.maxCount) : [];
      const r = await s([{ role: 'user', content: regras }, ...turnos.current], {
        cache: false,
        modelTier: 'quick',
        signal: ctlRef.current.signal,
        onText: ({ text }: { text: string }) => setParcial(text),
        ...(tools ? { tools } : {}),
        ...(imgs.length ? { images: imgs } : {}),
      });
      turnos.current.push({ role: 'assistant', content: r.text });
      add('tutor', r.text);
    } catch (e: any) {
      if (e?.text) add('tutor', `${e.text} (interrompido)`);
      if (e?.code !== 'cancelled') setErro(erroDoClaude(e, 'responder').erro);
      turnos.current.pop();
    } finally {
      setParcial('');
      setOcupado(false);
    }
  };

  useImperativeHandle(ref, () => ({ perguntar: (t, imgs) => void enviar(t, imgs) }));

  const submeter = (e: React.FormEvent) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setTexto('');
    void enviar(t);
  };

  if (disponivel === false)
    return (
      <div className="tutor-dock">
        <div className="dock-bar">
          <span className="dock-error">O tutor precisa do Claude: abra esta página pelo claude.ai.</span>
        </div>
      </div>
    );

  return (
    <div className="tutor-dock" role="region" aria-label="Tutor">
      {aberto && (
        <div className="transcript chat" ref={listaRef} aria-live="polite">
          {msgs.length === 0 && <p className="muted">Escreva uma pergunta sobre o conceito que está no quadro. O tutor pode trocar de conceito, destacar e redesenhar o quadro.</p>}
          {msgs.map((m) => (
            <p key={m.id} className={`tr tr-${m.papel}`}>
              <b>{m.papel === 'aluno' ? 'Você' : m.papel === 'tutor' ? 'Tutor' : '•'}</b> {m.texto}
            </p>
          ))}
          {ocupado && (
            <p className="tr tr-tutor">
              <b>Tutor</b> {parcial || <span className="muted"><span className="spinner" /> Pensando…</span>}
            </p>
          )}
          {erro && <ErrorBox erro={erro} />}
        </div>
      )}
      <div className="dock-bar">
        {!aberto ? (
          <button className="btn-tutor" onClick={() => setAberto(true)}>
            Conversar com o tutor
          </button>
        ) : (
          <form className="chat-form" onSubmit={submeter}>
            <input className="ask-input" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva para o tutor…" aria-label="Mensagem para o tutor" autoFocus />
            {ocupado ? (
              <button type="button" className="btn" onClick={() => ctlRef.current?.abort()}>
                Parar
              </button>
            ) : (
              <button className="btn btn-primary" disabled={!texto.trim()}>
                Enviar
              </button>
            )}
          </form>
        )}
        {aberto && (
          <button className="btn btn-link" onClick={() => setAberto(false)}>
            Ocultar conversa
          </button>
        )}
      </div>
    </div>
  );
});
