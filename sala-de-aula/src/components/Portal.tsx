// Área de cada usuário: as suas salas (uma por disciplina, curso ou módulo),
// os materiais de cada sala, a administração de usuários e a conta.
import { useEffect, useState } from 'react';
import App from '../App';
import { getJson, postJson, request, toErro } from '../api';
import type { ApiErro, Material, ResumoMaterial, Sala, TipoSala, Usuario } from '../types';
import { ErrorBox } from './ErrorBox';
import { Modal } from './Modal';
import { StartScreen } from './StartScreen';

type Tela =
  | { t: 'salas' }
  | { t: 'sala'; sala: Sala }
  | { t: 'aula'; sala: Sala; abrir?: string; novo?: Material }
  | { t: 'usuarios' }
  | { t: 'conta' };

const TIPOS: { v: TipoSala; rotulo: string }[] = [
  { v: 'disciplina', rotulo: 'Disciplina' },
  { v: 'curso', rotulo: 'Curso' },
  { v: 'modulo', rotulo: 'Módulo' },
  { v: 'outro', rotulo: 'Outro' },
];
const rotuloTipo = (t: string) => TIPOS.find((x) => x.v === t)?.rotulo || 'Sala';
const data = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

async function sair() {
  await postJson('/api/logout', {}).catch(() => {});
}

export function Portal({ usuario, onSair }: { usuario: Usuario; onSair: () => void }) {
  const [tela, setTela] = useState<Tela>({ t: 'salas' });
  const irSala = async (sala: Sala) => {
    try {
      setTela({ t: 'sala', sala: await getJson<Sala>(`/api/salas/${sala.id}`) });
    } catch {
      setTela({ t: 'salas' });
    }
  };

  if (tela.t === 'aula')
    return (
      <App
        key={tela.abrir || 'novo'}
        podeSair
        contexto={{ sala: tela.sala, abrir: tela.abrir, novo: tela.novo, onVoltar: () => void irSala(tela.sala) }}
      />
    );

  return (
    <div className="portal">
      <header className="portal-bar">
        <button className="portal-marca" onClick={() => setTela({ t: 'salas' })}>
          Minha sala de aula
        </button>
        <nav className="portal-nav">
          <button className={`btn btn-link ${tela.t === 'salas' || tela.t === 'sala' ? 'ativo' : ''}`} onClick={() => setTela({ t: 'salas' })}>
            Minhas salas
          </button>
          {usuario.admin && (
            <button className={`btn btn-link ${tela.t === 'usuarios' ? 'ativo' : ''}`} onClick={() => setTela({ t: 'usuarios' })}>
              Usuários
            </button>
          )}
          <button className={`btn btn-link ${tela.t === 'conta' ? 'ativo' : ''}`} onClick={() => setTela({ t: 'conta' })}>
            Minha conta
          </button>
          <span className="portal-user">{usuario.nome}</span>
          <button className="btn" onClick={async () => (await sair(), onSair())}>
            Sair
          </button>
        </nav>
      </header>
      {tela.t === 'salas' && <SalasScreen usuario={usuario} onAbrir={irSala} />}
      {tela.t === 'sala' && (
        <SalaScreen
          sala={tela.sala}
          onVoltar={() => setTela({ t: 'salas' })}
          onAtualizada={(s) => setTela({ t: 'sala', sala: s })}
          onAbrirMaterial={(id) => setTela({ t: 'aula', sala: tela.sala, abrir: id })}
          onNovoMaterial={(m) => setTela({ t: 'aula', sala: tela.sala, novo: m })}
        />
      )}
      {tela.t === 'usuarios' && usuario.admin && <UsuariosScreen eu={usuario} />}
      {tela.t === 'conta' && <ContaScreen usuario={usuario} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
function FormSala({ inicial, onSalvar, onCancelar }: { inicial?: Partial<Sala>; onSalvar: (d: Partial<Sala>) => Promise<void>; onCancelar: () => void }) {
  const [nome, setNome] = useState(inicial?.nome || '');
  const [tipo, setTipo] = useState<TipoSala>(inicial?.tipo || 'disciplina');
  const [descricao, setDescricao] = useState(inicial?.descricao || '');
  const [erro, setErro] = useState<ApiErro | null>(null);
  const [salvando, setSalvando] = useState(false);
  return (
    <form
      className="form-sala"
      onSubmit={async (e) => {
        e.preventDefault();
        setSalvando(true);
        setErro(null);
        try {
          await onSalvar({ nome, tipo, descricao });
        } catch (err) {
          setErro(toErro(err));
        } finally {
          setSalvando(false);
        }
      }}
    >
      <label htmlFor="sala-nome">Nome da sala</label>
      <input id="sala-nome" className="ask-input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Ciências — 6º ano, Inglês, Módulo 3 do curso" autoFocus />
      <label htmlFor="sala-tipo">É uma…</label>
      <select id="sala-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoSala)}>
        {TIPOS.map((t) => (
          <option key={t.v} value={t.v}>
            {t.rotulo}
          </option>
        ))}
      </select>
      <label htmlFor="sala-desc">Descrição (opcional)</label>
      <input id="sala-desc" className="ask-input" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="ex.: professora Ana, provas em dezembro" />
      {erro && <ErrorBox erro={erro} />}
      <div className="modal-actions">
        <button className="btn btn-primary" disabled={!nome.trim() || salvando}>
          {salvando ? 'Salvando…' : inicial?.id ? 'Salvar' : 'Criar sala'}
        </button>
        <button type="button" className="btn" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Confirmar({ titulo, texto, onSim, onNao }: { titulo: string; texto: string; onSim: () => Promise<void>; onNao: () => void }) {
  const [erro, setErro] = useState<ApiErro | null>(null);
  return (
    <Modal title={titulo} onClose={onNao}>
      <p>{texto}</p>
      {erro && <ErrorBox erro={erro} />}
      <div className="modal-actions">
        <button className="btn btn-coral" onClick={() => onSim().catch((e) => setErro(toErro(e)))}>
          Excluir
        </button>
        <button className="btn" onClick={onNao}>
          Cancelar
        </button>
      </div>
    </Modal>
  );
}

function SalasScreen({ usuario, onAbrir }: { usuario: Usuario; onAbrir: (s: Sala) => void }) {
  const [salas, setSalas] = useState<Sala[] | null>(null);
  const [erro, setErro] = useState<ApiErro | null>(null);
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<Sala | null>(null);
  const [excluindo, setExcluindo] = useState<Sala | null>(null);
  const carregar = () =>
    getJson<Sala[]>('/api/salas')
      .then((s) => (setSalas(s), setErro(null)))
      .catch((e) => setErro(toErro(e)));
  useEffect(() => void carregar(), []);
  return (
    <main className="portal-main">
      <div className="portal-title">
        <div>
          <h1>Olá, {usuario.nome.split(' ')[0]}!</h1>
          <p className="muted">Crie uma sala para cada disciplina, curso ou módulo. Cada sala guarda os seus materiais e o progresso das aulas.</p>
        </div>
        <button className="btn btn-primary btn-big" onClick={() => setCriando(true)}>
          + Nova sala
        </button>
      </div>
      {erro && <ErrorBox erro={erro} onRetry={carregar} />}
      {salas && salas.length === 0 && (
        <div className="vazio">
          <p>Você ainda não tem salas.</p>
          <button className="btn btn-primary" onClick={() => setCriando(true)}>
            Criar a primeira sala
          </button>
        </div>
      )}
      <div className="salas-grid">
        {salas?.map((s) => (
          <article key={s.id} className="sala-card">
            <button className="sala-abrir" onClick={() => onAbrir(s)}>
              <span className="sala-tipo">{rotuloTipo(s.tipo)}</span>
              <strong className="sala-nome">{s.nome}</strong>
              {s.descricao && <span className="sala-desc">{s.descricao}</span>}
              <span className="sala-info">
                {s.totalMateriais || 0} material{s.totalMateriais === 1 ? '' : 'is'} · atualizada em {data(s.atualizadaEm)}
              </span>
            </button>
            <div className="sala-acoes">
              <button className="btn btn-link" onClick={() => setEditando(s)}>
                Editar
              </button>
              <button className="btn btn-link perigo" onClick={() => setExcluindo(s)}>
                Excluir
              </button>
            </div>
          </article>
        ))}
      </div>
      {criando && (
        <Modal title="Nova sala" onClose={() => setCriando(false)}>
          <FormSala
            onCancelar={() => setCriando(false)}
            onSalvar={async (d) => {
              const s = await postJson<Sala>('/api/salas', d);
              setCriando(false);
              onAbrir(s);
            }}
          />
        </Modal>
      )}
      {editando && (
        <Modal title="Editar sala" onClose={() => setEditando(null)}>
          <FormSala
            inicial={editando}
            onCancelar={() => setEditando(null)}
            onSalvar={async (d) => {
              await request(`/api/salas/${editando.id}`, 'PATCH', d);
              setEditando(null);
              void carregar();
            }}
          />
        </Modal>
      )}
      {excluindo && (
        <Confirmar
          titulo="Excluir sala"
          texto={`Excluir a sala “${excluindo.nome}” e todos os seus materiais e progresso? Isso não pode ser desfeito.`}
          onNao={() => setExcluindo(null)}
          onSim={async () => {
            await request(`/api/salas/${excluindo.id}`, 'DELETE');
            setExcluindo(null);
            void carregar();
          }}
        />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
const TIPO_MATERIAL = (m: ResumoMaterial) =>
  m.midia === 'audio' ? 'Áudio' : m.midia === 'video' ? 'Vídeo' : m.midia === 'imagem' ? 'Foto' : m.tipo === 'pdf' ? 'PDF' : m.origem === 'Word' ? 'Word' : 'Texto';

function SalaScreen({
  sala,
  onVoltar,
  onAtualizada,
  onAbrirMaterial,
  onNovoMaterial,
}: {
  sala: Sala;
  onVoltar: () => void;
  onAtualizada: (s: Sala) => void;
  onAbrirMaterial: (id: string) => void;
  onNovoMaterial: (m: Material) => void;
}) {
  const [excluindo, setExcluindo] = useState<ResumoMaterial | null>(null);
  const [adicionando, setAdicionando] = useState(!sala.materiais?.length);
  const materiais = [...(sala.materiais || [])].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
  return (
    <main className="portal-main">
      <button className="btn btn-link voltar" onClick={onVoltar}>
        ← Minhas salas
      </button>
      <div className="portal-title">
        <div>
          <span className="sala-tipo">{rotuloTipo(sala.tipo)}</span>
          <h1>{sala.nome}</h1>
          {sala.descricao && <p className="muted">{sala.descricao}</p>}
        </div>
        {!adicionando && (
          <button className="btn btn-primary btn-big" onClick={() => setAdicionando(true)}>
            + Adicionar material
          </button>
        )}
      </div>
      {materiais.length > 0 && (
        <section>
          <h2 className="secao-titulo">Materiais desta sala</h2>
          <ul className="materiais-lista">
            {materiais.map((m) => (
              <li key={m.id} className="material-item">
                <button className="material-abrir" onClick={() => onAbrirMaterial(m.id)}>
                  <span className="material-tipo">{TIPO_MATERIAL(m)}</span>
                  <span className="material-txt">
                    <strong>{m.titulo || m.nome}</strong>
                    <span className="muted">
                      {m.titulo && m.titulo !== m.nome ? `${m.nome} · ` : ''}
                      {m.totalConceitos ? `${m.totalConceitos} conceitos` : 'ainda não analisado'} · {data(m.atualizadoEm)}
                    </span>
                  </span>
                  <span className="material-ir">Abrir aula →</span>
                </button>
                <button className="btn btn-link perigo" onClick={() => setExcluindo(m)} aria-label={`Excluir ${m.nome}`}>
                  Excluir
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {adicionando && (
        <section className="adicionar">
          <div className="adicionar-head">
            <h2 className="secao-titulo">Adicionar material à sala</h2>
            {materiais.length > 0 && (
              <button className="btn btn-link" onClick={() => setAdicionando(false)}>
                Cancelar
              </button>
            )}
          </div>
          <StartScreen embutido carregando={null} erro={null} onStart={onNovoMaterial} onRetry={() => {}} />
        </section>
      )}
      {excluindo && (
        <Confirmar
          titulo="Excluir material"
          texto={`Excluir “${excluindo.titulo || excluindo.nome}” desta sala, com o progresso e os infográficos?`}
          onNao={() => setExcluindo(null)}
          onSim={async () => {
            await request(`/api/salas/${sala.id}/materiais/${excluindo.id}`, 'DELETE');
            setExcluindo(null);
            onAtualizada(await getJson<Sala>(`/api/salas/${sala.id}`));
          }}
        />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
function UsuariosScreen({ eu }: { eu: Usuario }) {
  const [lista, setLista] = useState<Usuario[] | null>(null);
  const [erro, setErro] = useState<ApiErro | null>(null);
  const [novo, setNovo] = useState({ nome: '', usuario: '', senha: '', admin: false });
  const [erroNovo, setErroNovo] = useState<ApiErro | null>(null);
  const [aviso, setAviso] = useState('');
  const [senhaDe, setSenhaDe] = useState<Usuario | null>(null);
  const [removendo, setRemovendo] = useState<Usuario | null>(null);
  const carregar = () =>
    getJson<Usuario[]>('/api/usuarios')
      .then((l) => (setLista(l), setErro(null)))
      .catch((e) => setErro(toErro(e)));
  useEffect(() => void carregar(), []);
  return (
    <main className="portal-main">
      <div className="portal-title">
        <div>
          <h1>Usuários</h1>
          <p className="muted">Cada pessoa entra com o próprio usuário e senha e vê só as próprias salas.</p>
        </div>
      </div>
      {erro && <ErrorBox erro={erro} onRetry={carregar} />}
      {aviso && <p className="tag-ok">{aviso}</p>}
      <table className="tabela">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Usuário</th>
            <th>Salas</th>
            <th>Perfil</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lista?.map((u) => (
            <tr key={u.id}>
              <td>{u.nome}</td>
              <td>
                <code>{u.usuario}</code>
              </td>
              <td>{u.totalSalas}</td>
              <td>{u.admin ? 'Administrador' : 'Aluno'}</td>
              <td className="tabela-acoes">
                <button className="btn btn-link" onClick={() => setSenhaDe(u)}>
                  Definir senha
                </button>
                {u.id !== eu.id && (
                  <button className="btn btn-link perigo" onClick={() => setRemovendo(u)}>
                    Remover
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="start-card novo-usuario">
        <h2>Criar usuário</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setErroNovo(null);
            try {
              const u = await postJson<Usuario>('/api/usuarios', novo);
              setNovo({ nome: '', usuario: '', senha: '', admin: false });
              setAviso(`Usuário “${u.usuario}” criado. Entregue o usuário e a senha para ${u.nome}.`);
              void carregar();
            } catch (err) {
              setErroNovo(toErro(err));
            }
          }}
          className="form-grid"
        >
          <label>
            Nome
            <input className="ask-input" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} placeholder="ex.: Luan" />
          </label>
          <label>
            Usuário (para entrar)
            <input className="ask-input" value={novo.usuario} onChange={(e) => setNovo({ ...novo, usuario: e.target.value.toLowerCase() })} placeholder="ex.: luan" autoCapitalize="none" />
          </label>
          <label>
            Senha (mín. 6 caracteres)
            <input className="ask-input" type="password" autoComplete="new-password" value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} />
          </label>
          <label className="check">
            <input type="checkbox" checked={novo.admin} onChange={(e) => setNovo({ ...novo, admin: e.target.checked })} /> Também é administrador
          </label>
          <button className="btn btn-primary" disabled={!novo.usuario || !novo.senha}>
            Criar usuário
          </button>
        </form>
        {erroNovo && <ErrorBox erro={erroNovo} />}
      </section>

      {senhaDe && (
        <Modal title={`Definir nova senha — ${senhaDe.nome}`} onClose={() => setSenhaDe(null)}>
          <NovaSenha
            onSalvar={async (senha) => {
              await request(`/api/usuarios/${senhaDe.id}`, 'PATCH', { senha });
              setSenhaDe(null);
              setAviso(`Senha de “${senhaDe.usuario}” alterada. As sessões abertas dessa pessoa foram encerradas.`);
            }}
          />
        </Modal>
      )}
      {removendo && (
        <Confirmar
          titulo="Remover usuário"
          texto={`Remover “${removendo.nome}” (${removendo.usuario}) e todas as salas e materiais dessa pessoa? Isso não pode ser desfeito.`}
          onNao={() => setRemovendo(null)}
          onSim={async () => {
            await request(`/api/usuarios/${removendo.id}`, 'DELETE');
            setRemovendo(null);
            void carregar();
          }}
        />
      )}
    </main>
  );
}

function NovaSenha({ onSalvar }: { onSalvar: (s: string) => Promise<void> }) {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<ApiErro | null>(null);
  return (
    <form
      className="form-sala"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await onSalvar(senha);
        } catch (err) {
          setErro(toErro(err));
        }
      }}
    >
      <label htmlFor="nova-senha">Nova senha (mín. 6 caracteres)</label>
      <input id="nova-senha" className="ask-input" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus />
      {erro && <ErrorBox erro={erro} />}
      <div className="modal-actions">
        <button className="btn btn-primary" disabled={senha.length < 6}>
          Salvar senha
        </button>
      </div>
    </form>
  );
}

function ContaScreen({ usuario }: { usuario: Usuario }) {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [ok, setOk] = useState(false);
  const [erro, setErro] = useState<ApiErro | null>(null);
  return (
    <main className="portal-main estreito">
      <h1>Minha conta</h1>
      <p>
        {usuario.nome} · usuário <code>{usuario.usuario}</code> · {usuario.admin ? 'administrador' : 'aluno'}
      </p>
      <form
        className="start-card form-sala"
        onSubmit={async (e) => {
          e.preventDefault();
          setErro(null);
          setOk(false);
          try {
            await request('/api/conta/senha', 'PUT', { atual, nova });
            setOk(true);
            setAtual('');
            setNova('');
          } catch (err) {
            setErro(toErro(err));
          }
        }}
      >
        <h2>Trocar senha</h2>
        <label htmlFor="senha-atual">Senha atual</label>
        <input id="senha-atual" className="ask-input" type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} />
        <label htmlFor="senha-nova">Nova senha (mín. 6 caracteres)</label>
        <input id="senha-nova" className="ask-input" type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} />
        <button className="btn btn-primary" disabled={!atual || nova.length < 6}>
          Trocar senha
        </button>
        {ok && <p className="tag-ok">Senha trocada. Os outros aparelhos conectados precisarão entrar de novo.</p>}
        {erro && <ErrorBox erro={erro} />}
      </form>
    </main>
  );
}
