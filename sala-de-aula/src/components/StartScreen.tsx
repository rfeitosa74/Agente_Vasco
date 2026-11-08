import { useEffect, useRef, useState } from 'react';
import { getAccessCode, getJson, setAccessCode, toErro } from '../api';
import type { ApiErro, Material } from '../types';
import { ErrorBox } from './ErrorBox';

interface Sample {
  id: string;
  titulo: string;
  texto: string;
}
interface Status {
  chaveConfigurada: boolean;
  exigeCodigo: boolean;
  modelos?: Record<string, { ok: boolean; modelo?: string; erro?: ApiErro }>;
}

interface Props {
  carregando: string | null;
  erro: ApiErro | null;
  onStart: (m: Material) => void;
  onRetry: () => void;
}

const PAPEL: Record<string, string> = { texto: 'Análise e explicações', live: 'Tutor por voz (Live)', imagem: 'Infográficos (Nano Banana Pro)' };

export function StartScreen({ carregando, erro, onStart, onRetry }: Props) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [texto, setTexto] = useState('');
  const [nome, setNome] = useState('');
  const [arrastando, setArrastando] = useState(false);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [erroStatus, setErroStatus] = useState<ApiErro | null>(null);
  const [codigo, setCodigo] = useState(getAccessCode());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getJson<Status>('/api/status').then(setStatus).catch((e) => setErroStatus(toErro(e)));
    getJson<Sample[]>('/api/samples').then(setSamples).catch(() => {});
  }, []);

  const verificar = async () => {
    setVerificando(true);
    setErroStatus(null);
    try {
      setStatus(await getJson<Status>('/api/status?verificar=1'));
    } catch (e) {
      setErroStatus(toErro(e));
    } finally {
      setVerificando(false);
    }
  };

  const escolher = (f: File | undefined | null) => {
    if (!f) return;
    setArquivo(f);
    setTexto('');
  };
  const pronto = !!arquivo || texto.trim().length >= 40;
  const comecar = () => {
    if (arquivo) onStart({ tipo: 'pdf', nome: arquivo.name, arquivo });
    else onStart({ tipo: 'texto', nome: nome.trim() || 'Minhas anotações', texto: texto.trim() });
  };

  return (
    <main className="start">
      <header className="start-head">
        <h1>Minha sala de aula</h1>
        <p>Envie a matéria em PDF ou cole suas anotações. O quadro, o caderno e o tutor vão trabalhar com esse material.</p>
      </header>

      {status && !status.chaveConfigurada && (
        <div className="setup-note" role="alert">
          <strong>Configuração pendente:</strong> o servidor ainda não tem a chave da API Gemini. Crie o arquivo <code>.env</code> com{' '}
          <code>GEMINI_API_KEY=…</code> (veja o README) e reinicie o servidor.
        </div>
      )}
      {status?.exigeCodigo && (
        <div className="setup-note">
          <label>
            Código de acesso desta sala:{' '}
            <input
              type="password"
              value={codigo}
              onChange={(e) => {
                setCodigo(e.target.value);
                setAccessCode(e.target.value);
              }}
            />
          </label>
        </div>
      )}

      <div className="start-grid">
        <section className="start-card">
          <h2>Enviar um PDF</h2>
          <div
            className={`dropzone ${arrastando ? 'over' : ''} ${arquivo ? 'has-file' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastando(false);
              escolher(e.dataTransfer.files?.[0]);
            }}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          >
            {arquivo ? (
              <>
                <strong>{arquivo.name}</strong>
                <span>{(arquivo.size / 1024 / 1024).toFixed(1)} MB · clique para trocar</span>
              </>
            ) : (
              <>
                <strong>Arraste o PDF aqui</strong>
                <span>ou clique para escolher (até 19 MB)</span>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => escolher(e.target.files?.[0])} />
        </section>

        <section className="start-card">
          <h2>Ou colar anotações</h2>
          <input className="ask-input" placeholder="Nome da matéria (opcional)" value={nome} onChange={(e) => setNome(e.target.value)} />
          <textarea
            className="paste"
            rows={8}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              if (e.target.value) setArquivo(null);
            }}
            placeholder="Cole aqui o texto da matéria…"
          />
        </section>
      </div>

      <div className="start-go">
        <button className="btn btn-primary btn-big" disabled={!pronto || !!carregando} onClick={comecar}>
          Começar aula com este documento
        </button>
        {carregando && (
          <p className="loading-line" aria-live="polite">
            <span className="spinner" /> {carregando}
          </p>
        )}
      </div>
      {erro && !carregando && <ErrorBox erro={erro} onRetry={onRetry} />}

      {samples.length > 0 && (
        <section className="samples">
          <h2>Materiais de exemplo</h2>
          <p className="muted">Textos curtos criados para demonstração. Eles passam pela mesma análise real que os seus arquivos.</p>
          <div className="sample-list">
            {samples.map((s) => (
              <button key={s.id} className="sample" disabled={!!carregando} onClick={() => onStart({ tipo: 'texto', nome: s.titulo, texto: s.texto, exemplo: true })}>
                <span className="badge-sample">Exemplo</span>
                <strong>{s.titulo.replace(/\s*\(material de exemplo\)\s*/i, '')}</strong>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="diagnostics">
        <button className="btn btn-link" onClick={verificar} disabled={verificando}>
          {verificando ? 'Verificando…' : 'Verificar configuração e modelos'}
        </button>
        {erroStatus && <ErrorBox erro={erroStatus} />}
        {status?.modelos && (
          <ul>
            {Object.entries(status.modelos).map(([papel, m]) => (
              <li key={papel} className={m.ok ? 'ok' : 'fail'}>
                <b>{PAPEL[papel] || papel}:</b> {m.ok ? <code>{m.modelo}</code> : `${m.erro?.mensagem} ${m.erro?.comoResolver || ''}`}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
