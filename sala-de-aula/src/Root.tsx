import { useEffect, useState } from 'react';
import App from './App';
import { EVENTO_LOGIN, getJson, IS_ARTIFACT } from './api';
import { LoginScreen } from './components/LoginScreen';
import { Portal } from './components/Portal';
import type { Usuario } from './types';

interface Sessao {
  logado: boolean;
  usuario: Usuario | null;
  precisaConfigurar: boolean;
  configuracaoPendente: boolean;
}

/** Login (ou primeiro acesso) e depois as salas do usuário. */
export function Root() {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [erro, setErro] = useState('');
  const carregar = () =>
    getJson<Sessao>('/api/session')
      .then((s) => {
        setSessao(s);
        setErro('');
      })
      .catch((e) => setErro(e instanceof Error ? e.message : String(e)));
  useEffect(() => {
    if (IS_ARTIFACT) return;
    void carregar();
    const pedirLogin = () => void carregar();
    window.addEventListener(EVENTO_LOGIN, pedirLogin);
    return () => window.removeEventListener(EVENTO_LOGIN, pedirLogin);
  }, []);
  // Artefato do Claude: a conta do Claude já identifica quem abre.
  if (IS_ARTIFACT) return <App />;
  if (erro)
    return (
      <main className="start">
        <p className="error-inline">{erro}</p>
        <button className="btn" onClick={carregar}>
          Tentar novamente
        </button>
      </main>
    );
  if (!sessao) return null;
  if (sessao.configuracaoPendente || sessao.precisaConfigurar || !sessao.logado || !sessao.usuario)
    return <LoginScreen configuracaoPendente={sessao.configuracaoPendente} primeiroAcesso={sessao.precisaConfigurar} onOk={carregar} />;
  return <Portal usuario={sessao.usuario} onSair={carregar} />;
}
