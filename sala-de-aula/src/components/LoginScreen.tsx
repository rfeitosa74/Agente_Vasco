import { useState } from 'react';
import { postJson, toErro } from '../api';
import type { ApiErro } from '../types';
import { ErrorBox } from './ErrorBox';

interface Props {
  onOk: () => void;
  configuracaoPendente: boolean;
  /** Primeiro acesso no computador local: criar a conta de administrador. */
  primeiroAcesso?: boolean;
}

export function LoginScreen({ onOk, configuracaoPendente, primeiroAcesso = false }: Props) {
  const [usuario, setUsuario] = useState('');
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<ApiErro | null>(null);
  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      await postJson(primeiroAcesso ? '/api/setup' : '/api/login', { usuario, nome, senha });
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
        {primeiroAcesso && <p>Primeiro acesso: crie a conta de administrador. Depois você poderá criar a conta do Luan e de outras pessoas.</p>}
      </header>
      {configuracaoPendente ? (
        <div className="setup-note" role="alert">
          <strong>Falta a senha do administrador.</strong> O site está na internet sem senha, então foi bloqueado. No painel do Render, abra
          <b> Environment</b>, crie <code>APP_PASSWORD</code> com a senha que você quer usar e salve. O usuário será <code>admin</code>.
        </div>
      ) : (
        <form className="start-card login-card" onSubmit={entrar}>
          {primeiroAcesso && (
            <>
              <label htmlFor="nome">Seu nome</label>
              <input id="nome" className="ask-input" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
            </>
          )}
          <label htmlFor="usuario">Usuário</label>
          <input
            id="usuario"
            className="ask-input"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value.toLowerCase())}
            autoComplete="username"
            autoCapitalize="none"
            autoFocus
            placeholder={primeiroAcesso ? 'ex.: rubens' : ''}
          />
          <label htmlFor="senha">Senha</label>
          <input id="senha" className="ask-input" type="password" autoComplete={primeiroAcesso ? 'new-password' : 'current-password'} value={senha} onChange={(e) => setSenha(e.target.value)} />
          {primeiroAcesso && <p className="muted">Pelo menos 6 caracteres.</p>}
          <button className="btn btn-primary btn-big" disabled={!usuario || !senha || enviando}>
            {enviando ? 'Entrando…' : primeiroAcesso ? 'Criar conta e entrar' : 'Entrar'}
          </button>
          {erro && <ErrorBox erro={erro} />}
          {!primeiroAcesso && <p className="muted">Você continua conectado neste aparelho por 30 dias.</p>}
        </form>
      )}
    </main>
  );
}
