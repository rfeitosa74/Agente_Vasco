import { useEffect, useRef, useState } from 'react';
import { postForm, postJson, toErro } from '../api';
import type { ApiErro, Conceito } from '../types';
import { ErrorBox } from './ErrorBox';
import { blobToWav16k } from '../live/audio';
import { IS_ARTIFACT } from '../api';
import { Modal } from './Modal';

interface Avaliacao {
  entendeuCorretamente: string[];
  faltou: string[];
  confundiu: { trecho: string; problema: string }[];
  correcao: string;
  situacao: string;
  comentario: string;
}

interface Props {
  conceito: Conceito;
  withDoc: <T>(fn: (docId: string) => Promise<T>) => Promise<T>;
  onClose: () => void;
  onBeforeRecord: () => void;
  onResultado: (resumo: string) => void;
}

const SITUACAO: Record<string, string> = {
  completa: 'Explicação completa',
  boa_com_lacunas: 'Boa explicação, com algumas lacunas',
  parcial: 'Explicação parcial',
  com_confusoes: 'Há confusões para corrigir',
  fora_do_tema: 'A resposta fugiu do tema',
  sem_conteudo: 'Ainda não deu para avaliar',
};

export function ExplainModal({ conceito, withDoc, onClose, onBeforeRecord, onResultado }: Props) {
  const [pergunta, setPergunta] = useState('');
  const [erroPergunta, setErroPergunta] = useState<ApiErro | null>(null);
  const [resposta, setResposta] = useState('');
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [erroAudio, setErroAudio] = useState<ApiErro | null>(null);
  const [avaliando, setAvaliando] = useState(false);
  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null);
  const [erroAval, setErroAval] = useState<ApiErro | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const carregarPergunta = async () => {
    setErroPergunta(null);
    setPergunta('');
    try {
      const r = await withDoc((docId) => postJson<{ pergunta: string }>('/api/explain/question', { docId, conceito }));
      setPergunta(r.pergunta);
    } catch (e) {
      setErroPergunta(toErro(e));
    }
  };
  useEffect(() => {
    void carregarPergunta();
    return () => {
      recRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conceito.id]);

  const iniciarGravacao = async () => {
    setErroAudio(null);
    onBeforeRecord();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size < 1000) {
          setErroAudio({ tipo: 'audio', mensagem: 'A gravação ficou curta demais.', comoResolver: 'Grave de novo, falando por alguns segundos.' });
          return;
        }
        setTranscrevendo(true);
        try {
          const wav = await blobToWav16k(blob);
          const fd = new FormData();
          fd.append('audio', wav, 'explicacao.wav');
          const r = await postForm<{ texto: string }>('/api/transcribe', fd);
          if (!r.texto) setErroAudio({ tipo: 'audio', mensagem: 'Não consegui entender a fala na gravação.', comoResolver: 'Fale mais perto do microfone e tente de novo, ou escreva.' });
          else setResposta((prev) => (prev.trim() ? `${prev.trim()} ${r.texto}` : r.texto));
        } catch (e) {
          setErroAudio(toErro(e));
        } finally {
          setTranscrevendo(false);
        }
      };
      rec.start(250);
      recRef.current = rec;
      setGravando(true);
    } catch (e) {
      const name = (e as DOMException)?.name;
      setErroAudio({
        tipo: 'audio',
        mensagem: name === 'NotAllowedError' ? 'Permissão do microfone negada.' : 'Não foi possível usar o microfone.',
        comoResolver: 'Libere o microfone no navegador ou escreva sua explicação.',
      });
    }
  };
  const pararGravacao = () => {
    recRef.current?.stop();
    recRef.current = null;
    setGravando(false);
  };

  const avaliar = async () => {
    setAvaliando(true);
    setErroAval(null);
    try {
      const r = await withDoc((docId) => postJson<Avaliacao>('/api/explain/evaluate', { docId, conceito, pergunta, resposta }));
      setAvaliacao(r);
      onResultado(
        `Fez "Agora eu explico" sobre ${conceito.nome}. Resultado: ${SITUACAO[r.situacao] || r.situacao}. ` +
          `Faltou: ${r.faltou.join('; ') || 'nada'}. Confusões: ${r.confundiu.map((c) => c.problema).join('; ') || 'nenhuma'}.`
      );
    } catch (e) {
      setErroAval(toErro(e));
    } finally {
      setAvaliando(false);
    }
  };

  const tentarNovamente = () => {
    setAvaliacao(null);
    setResposta('');
  };

  return (
    <Modal title={`Agora eu explico: ${conceito.nome}`} onClose={onClose} wide>
      {!pergunta && !erroPergunta && (
        <p>
          <span className="spinner" /> Preparando uma pergunta…
        </p>
      )}
      {erroPergunta && <ErrorBox erro={erroPergunta} onRetry={carregarPergunta} />}
      {pergunta && (
        <>
          <p className="explain-question">{pergunta}</p>
          {!avaliacao && (
            <>
              <p className="muted">
                {IS_ARTIFACT ? 'Responda com as suas palavras, por escrito.' : 'Responda com as suas palavras. Pode falar ou escrever — e corrigir o texto antes de terminar.'}
              </p>
              {!IS_ARTIFACT && (
              <div className="explain-rec">
                {!gravando ? (
                  <button className="btn btn-blue" onClick={iniciarGravacao} disabled={transcrevendo || avaliando}>
                    🎙 {resposta ? 'Gravar mais' : 'Responder falando'}
                  </button>
                ) : (
                  <button className="btn btn-coral recording" onClick={pararGravacao}>
                    ■ Parar gravação
                  </button>
                )}
                {gravando && <span className="rec-dot">Gravando…</span>}
                {transcrevendo && (
                  <span>
                    <span className="spinner" /> Transcrevendo sua fala…
                  </span>
                )}
              </div>
              )}
              {erroAudio && <ErrorBox erro={erroAudio} />}
              <label className="explain-label" htmlFor="explicacao">
                Sua explicação (transcrição editável)
              </label>
              <textarea id="explicacao" className="explain-text" value={resposta} onChange={(e) => setResposta(e.target.value)} rows={7} placeholder="Escreva ou grave sua explicação…" />
              <div className="modal-actions">
                <button className="btn btn-primary btn-big" onClick={avaliar} disabled={!resposta.trim() || gravando || transcrevendo || avaliando}>
                  {avaliando ? 'Avaliando…' : 'Terminei minha explicação'}
                </button>
                <button className="btn" onClick={onClose}>
                  Voltar ao quadro
                </button>
              </div>
              {erroAval && <ErrorBox erro={erroAval} onRetry={avaliar} />}
            </>
          )}
          {avaliacao && (
            <div className="evaluation">
              <p className="eval-status">{SITUACAO[avaliacao.situacao] || avaliacao.situacao}</p>
              <p>{avaliacao.comentario}</p>
              <details className="eval-answer">
                <summary>Sua explicação</summary>
                <p>{resposta}</p>
              </details>
              {avaliacao.entendeuCorretamente.length > 0 && (
                <div className="eval-block ok">
                  <h3>O que você explicou corretamente</h3>
                  <ul>{avaliacao.entendeuCorretamente.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </div>
              )}
              {avaliacao.faltou.length > 0 && (
                <div className="eval-block miss">
                  <h3>O que faltou</h3>
                  <ul>{avaliacao.faltou.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </div>
              )}
              {avaliacao.confundiu.length > 0 && (
                <div className="eval-block wrong">
                  <h3>O que ficou confuso</h3>
                  <ul>
                    {avaliacao.confundiu.map((c, i) => (
                      <li key={i}>
                        <q>{c.trecho}</q> — {c.problema}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="eval-block fix">
                <h3>Correção</h3>
                <p>{avaliacao.correcao}</p>
              </div>
              <div className="modal-actions">
                <button className="btn btn-primary" onClick={tentarNovamente}>
                  Tentar novamente
                </button>
                <button className="btn" onClick={() => { setAvaliacao(null); setResposta(''); void carregarPergunta(); }}>
                  Outra pergunta
                </button>
                <button className="btn" onClick={onClose}>
                  Voltar ao quadro para revisar
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
