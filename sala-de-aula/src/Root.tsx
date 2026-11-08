import { useEffect, useState } from 'react';
import App from './App';
import { EVENTO_LOGIN, getJson } from './api';
import { LoginScreen } from './components/LoginScreen';

interface Sessao {
  exigeLogin: boolean;
  logado: boolean;
  configuracaoPendente: boolean;
}

/** Mostra o login quando o site exige senha; depois, a sala de aula. */
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
    void carregar();
    const pedirLogin = () => setSessao((s) => (s ? { ...s, logado: false } : s));
    window.addEventListener(EVENTO_LOGIN, pedirLogin);
    return () => window.removeEventListener(EVENTO_LOGIN, pedirLogin);
  }, []);
  if (erro)
    return (
      <main className="start">
        <p className="error-inline">{erro}</p>
        <button className="btn" onClick={carregar}>Tentar novamente</button>
      </main>
    );
  if (!sessao) return null;
  if (sessao.configuracaoPendente || !sessao.logado)
    return <LoginScreen configuracaoPendente={sessao.configuracaoPendente} onOk={() => setSessao({ ...sessao, logado: true })} />;
  return <App podeSair={sessao.exigeLogin} />;
}
