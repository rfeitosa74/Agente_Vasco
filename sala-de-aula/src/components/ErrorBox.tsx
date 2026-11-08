import { useState } from 'react';
import type { ApiErro } from '../types';

const TITULOS: Record<string, string> = {
  faturamento: 'Faturamento necessário',
  permissao: 'Sem permissão',
  cota: 'Cota esgotada',
  modelo_indisponivel: 'Modelo indisponível',
  chave: 'Chave inválida',
  configuracao: 'Configuração pendente',
  rede: 'Sem conexão',
  sem_imagem: 'Nenhuma imagem recebida',
  nao_analisavel: 'Material não analisado',
  acesso: 'Acesso negado',
  login: 'Entre novamente',
};

export function ErrorBox({ erro, onRetry, dark = false, retryLabel = 'Tentar novamente' }: { erro: ApiErro; onRetry?: () => void; dark?: boolean; retryLabel?: string }) {
  const [det, setDet] = useState(false);
  return (
    <div className={`error-box ${dark ? 'dark' : ''}`} role="alert">
      <strong>{TITULOS[erro.tipo] || 'Algo deu errado'}</strong>
      <p>{erro.mensagem}</p>
      {erro.comoResolver && <p className="error-fix">{erro.comoResolver}</p>}
      <div className="error-actions">
        {onRetry && (
          <button className="btn btn-primary" onClick={onRetry}>
            {retryLabel}
          </button>
        )}
        {erro.detalhe && (
          <button className="btn btn-link" onClick={() => setDet((d) => !d)}>
            {det ? 'Ocultar detalhe técnico' : 'Detalhe técnico'}
          </button>
        )}
      </div>
      {det && erro.detalhe && <pre className="error-detail">{erro.detalhe}</pre>}
    </div>
  );
}
