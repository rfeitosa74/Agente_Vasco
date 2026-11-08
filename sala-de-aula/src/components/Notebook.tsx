import type { Analise, Material } from '../types';
import { formatarTempo } from '../material';

interface Props {
  analise: Analise;
  material: Material;
  conceitoId: string;
  nivel: string;
  onNivel: (n: string) => void;
  onSelect: (id: string) => void;
  onVerOriginal: () => void;
  onTrocar: () => void;
  onExplicar: () => void;
  onInfografico: () => void;
  infograficoOcupado: boolean;
}

export function Notebook(p: Props) {
  const { analise } = p;
  const secaoNome = (id: string) => analise.secoes.find((s) => s.id === id)?.titulo || id;
  return (
    <aside className="notebook" aria-label="Caderno de estudos">
      <div className="notebook-paper">
        <div className="nb-head">
          <span className="nb-label">Caderno</span>
          {p.material.exemplo && <span className="badge-sample">Material de exemplo</span>}
        </div>
        <h2 className="nb-title">{analise.titulo}</h2>
        <p className="nb-meta">
          {p.material.nome}
          {analise.temPaginas
            ? ` · ${analise.numPaginas} página${analise.numPaginas > 1 ? 's' : ''}`
            : p.material.midia === 'audio'
            ? ` · áudio${p.material.duracao ? ` de ${formatarTempo(p.material.duracao)}` : ''}`
            : p.material.midia === 'video'
            ? ` · vídeo${p.material.duracao ? ` de ${formatarTempo(p.material.duracao)}` : ''}`
            : p.material.midia === 'imagem'
            ? ' · imagem'
            : p.material.origem === 'Word'
            ? ' · documento do Word'
            : ' · anotações em texto'}
        </p>
        <p className="nb-summary">{analise.resumo}</p>

        <h3 className="nb-sub">Conceitos</h3>
        <ol className="concept-list">
          {analise.conceitos.map((c) => (
            <li key={c.id}>
              <button className={`concept ${c.id === p.conceitoId ? 'active' : ''}`} onClick={() => p.onSelect(c.id)} aria-current={c.id === p.conceitoId}>
                <span className="concept-name">{c.nome}</span>
                <span className="concept-sum">{c.resumo}</span>
                <span className="concept-ref">
                  {c.paginas.length
                    ? `p. ${c.paginas.join(', ')}`
                    : c.tempos?.length
                    ? `▶ ${c.tempos.join(', ')}`
                    : c.secoes.length
                    ? c.secoes.map(secaoNome).join(' · ')
                    : ''}
                </span>
              </button>
            </li>
          ))}
        </ol>

        <label className="nb-level">
          Nível das explicações
          <select value={p.nivel} onChange={(e) => p.onNivel(e.target.value)}>
            <option value="">Normal (6º ano)</option>
            <option value="mais simples, com palavras do dia a dia">Mais simples</option>
            <option value="mais desafiador, com mais detalhes e termos científicos">Mais desafiador</option>
          </select>
        </label>

        <div className="nb-actions">
          <button className="btn btn-coral btn-big" onClick={p.onExplicar}>
            Agora eu explico
          </button>
          <button className="btn btn-blue" onClick={p.onInfografico} disabled={p.infograficoOcupado}>
            {p.infograficoOcupado ? 'Gerando infográfico…' : 'Criar infográfico'}
          </button>
          <button className="btn" onClick={p.onVerOriginal}>
            {p.material.midia === 'audio' ? 'Ouvir o áudio original' : p.material.midia === 'video' ? 'Ver o vídeo original' : 'Ver anotações originais'}
          </button>
          <button className="btn" onClick={p.onTrocar}>
            Trocar material
          </button>
        </div>
      </div>
    </aside>
  );
}
