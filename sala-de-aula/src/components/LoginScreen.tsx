import { useState } from 'react';
import { postJson, toErro } from '../api';
import type { ApiErro } from '../types';
import { ErrorBox } from './ErrorBox';

export function LoginScreen({ onOk, configuracaoPendente }: { onOk: () => void; configuracaoPendente: boolean }) {
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<ApiErro | null>(null);
  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      await postJson('/api/login', { senha });
      onOk();
    } catch (err) {
      setErro(toErro(err));
    } finally {
      setEnviando(false);
    }
  };
  return (
    <main className="start login">
      <header className="start-head">
        <h1>Minha sala de aula</h1>
      </header>
      {configuracaoPendente ? (
        <div className="setup-note" role="alert">
          <strong>Falta a senha do site.</strong> Ele está na internet sem senha, então foi bloqueado. No painel do Render, abra
          <b> Environment</b>, crie <code>APP_PASSWORD</code> com a senha que você quer usar e salve.
        </div>
      ) : (
        <form className="start-card login-card" onSubmit={entrar}>
          <label htmlFor="senha">Senha</label>
          <input id="senha" className="ask-input" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus />
          <button className="btn btn-primary btn-big" disabled={!senha || enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
          {erro && <ErrorBox erro={erro} />}
          <p className="muted">Você continua conectado neste aparelho por 30 dias.</p>
        </form>
      )}
    </main>
  );
}
