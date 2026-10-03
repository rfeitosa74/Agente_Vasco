// Shell do aplicativo: roteador por hash, dois modos (Luan e Pai) e navegação.
import { getState, subscribe, temPin, confereOPin, storageOk } from './store.js';
import { today } from './util/dates.js';
import { h, limpar } from './util/dom.js';
import { toast, abrirModal, banner } from './ui.js';
import { faseDe } from './core/phase.js';
import { resumoSemana, corrente } from './core/xp.js';
import * as sync from './sync.js';

const root = document.getElementById('app');

const ROTAS_ALUNO = {
  hoje: () => import('./views/aluno/hoje.js'),
  missao: () => import('./views/aluno/missao.js'),
  ginasio: () => import('./views/aluno/ginasio.js'),
  cartas: () => import('./views/aluno/cartas.js'),
  quadro: () => import('./views/aluno/quadro.js'),
  eu: () => import('./views/aluno/eu.js'),
  episodio: () => import('./views/aluno/episodio.js'),
  carta: () => import('./views/aluno/carta.js'),
  tarefas: () => import('./views/aluno/tarefas.js'),
  tarefa: () => import('./views/aluno/tarefa.js'),
  descobrir: () => import('./views/aluno/descobrir.js'),
};

export const MENU_PAI = [
  ['painel', 'Painel', '🏠'], ['hoje', 'Hoje do Luan', '☀️'], ['tarefas', 'Tarefas de casa', '📚'], ['pesquisar', 'Pesquisar', '🔎'], ['semana', 'Semana e provas', '📅'], ['erros', 'Erros e notas', '📝'],
  ['cartas', 'Cartas', '🃏'], ['matematica', 'Matemática', '🧮'], ['desafio', 'Desafio de sábado', '🏆'], ['progresso', 'Progresso', '📈'],
  ['atencao', 'Atenção', '👁️'], ['professoras', 'Professoras', '👩‍🏫'], ['guia', 'Guia do plano', '📖'], ['config', 'Configurações', '⚙️'],
];
// telas do pai: as do menu + as que se abrem a partir de outras (receber tarefa, detalhe/correção da tarefa)
const ROTAS_PAI = Object.fromEntries([...MENU_PAI.map(([id]) => id), 'receber', 'tarefa'].map((id) => [id, () => import(`./views/pai/${id}.js`)]));

let limpezas = [];
let seqRender = 0;

const modoSalvo = () => { try { return localStorage.getItem('missao6:modo'); } catch { return null; } };
const salvarModo = (m) => { try { localStorage.setItem('missao6:modo', m); } catch { /* ignore */ } };
const paiLiberado = () => { try { return sessionStorage.getItem('missao6:pai') === '1'; } catch { return false; } };
const liberarPai = (v) => { try { v ? sessionStorage.setItem('missao6:pai', '1') : sessionStorage.removeItem('missao6:pai'); } catch { /* ignore */ } };

export const go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };

function parseHash() {
  const [caminho, query = ''] = (location.hash || '').replace(/^#\/?/, '').split('?');
  const [modo = '', view = ''] = caminho.split('/');
  return { modo, view, params: Object.fromEntries(new URLSearchParams(query)) };
}

export function pedirPin(aoLiberar) {
  if (!temPin() || paiLiberado()) { liberarPai(true); salvarModo('pai'); aoLiberar(); return; }
  const campo = h('input', { type: 'password', inputmode: 'numeric', autocomplete: 'off', 'aria-label': 'PIN do pai', placeholder: 'PIN' });
  const erro = h('p', { class: 'small', style: { color: 'var(--bad)', minHeight: '1.2em' } });
  const tentar = () => {
    if (confereOPin(campo.value)) { liberarPai(true); salvarModo('pai'); fechar(); aoLiberar(); }
    else { erro.textContent = 'PIN incorreto.'; campo.value = ''; campo.focus(); }
  };
  campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') tentar(); });
  const fechar = abrirModal(h('div', { class: 'stack' },
    h('p', { class: 'muted' }, 'Esta área tem o registro de atenção, os gabaritos e as configurações. Digite o PIN do pai.'),
    campo, erro,
    h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, h('button', { class: 'btn primary', onClick: tentar }, 'Entrar'))), { titulo: '🔒 Área do pai' });
}

export const sairDoPai = () => { liberarPai(false); salvarModo('aluno'); go('#/aluno/hoje'); };

// ---------- shells ----------
function ctxBase(params) {
  return {
    params, hoje: today(), go,
    rerender: () => renderConteudo(),
    onCleanup: (fn) => limpezas.push(fn),
  };
}

let conteudoAtual = null; // { alvo, loader, params, modo, view }

async function renderConteudo() {
  if (!conteudoAtual) return;
  limpezas.forEach((f) => { try { f(); } catch { /* ignore */ } });
  limpezas = [];
  const { alvo, loader, params, modo, view } = conteudoAtual;
  const meu = ++seqRender;
  let mod;
  try { mod = await loader(); } catch (e) { console.error(e); limpar(alvo).append(banner('erro', 'Erro ao carregar a tela', String(e.message || e))); return; }
  if (meu !== seqRender) return;
  const scrollY = window.scrollY;
  const ctx = { ...ctxBase(params), modo, view };
  let el;
  try { el = mod.default(ctx); } catch (e) { console.error(e); el = banner('erro', 'Algo deu errado nesta tela', String(e.message || e)); }
  limpar(alvo).append(el);
  window.scrollTo(0, conteudoAtual.manterScroll ? scrollY : 0);
  conteudoAtual.manterScroll = true;
  atualizarChrome();
}

const NAV_ALUNO = [
  ['hoje', 'Hoje', '🏠'], ['tarefas', 'Tarefas', '📚'], ['missao', 'Missão', '🎯'], ['ginasio', 'Cálculo', '🧮'], ['cartas', 'Cartas', '🃏'], ['eu', 'Eu', '⭐'],
];

function shellAluno(view) {
  const hoje = today();
  const fase = faseDe(hoje, getState().config);
  const itens = NAV_ALUNO;
  const xpChip = h('span', { class: 'xp-chip', id: 'xpchip', hidden: !fase.xp });
  const conteudo = h('main', { class: 'container', id: 'conteudo' });
  const shell = h('div', { class: 'shell-aluno' },
    h('header', { class: 'topbar' },
      h('a', { class: 'brand', href: '#/aluno/hoje' }, h('img', { src: 'assets/icon.svg', alt: '' }), h('span', null, 'Missão 6º Ano')),
      h('span', { class: 'grow' }), h('a', { class: 'btn ghost sm', href: '#/aluno/descobrir', 'aria-label': 'Descobrir: pesquisar em fontes confiáveis', title: 'Descobrir', 'aria-current': view === 'descobrir' ? 'page' : null }, '🔎'), h('span', { class: 'chip', id: 'synchip', hidden: true }), xpChip, h('span', { class: 'chip', id: 'corrente', hidden: true }),
      h('button', { class: 'btn ghost sm', 'aria-label': 'Área do pai', title: 'Área do pai', onClick: () => pedirPin(() => go('#/pai/painel')) }, '🔒')),
    !storageOk() ? h('div', { class: 'container' }, banner('aviso', 'Atenção', 'O navegador não está deixando salvar os dados neste modo. Feche a janela anônima ou libere o armazenamento.')) : null,
    conteudo,
    h('nav', { class: 'bottomnav', 'aria-label': 'Principal' }, h('div', { class: 'bottomnav-in' },
      ...itens.map(([id, rotulo, ico]) => h('a', { href: `#/aluno/${id}`, 'aria-current': (id === view || (id === 'tarefas' && view === 'tarefa') || (id === 'eu' && view === 'quadro')) ? 'page' : null }, h('span', { class: 'ico', 'aria-hidden': 'true' }, ico), rotulo)))));
  return { shell, conteudo };
}

function shellPai(view) {
  const conteudo = h('main', { class: 'container', id: 'conteudo' });
  const shell = h('div', { class: 'shell-pai' },
    h('aside', { class: 'side', 'aria-label': 'Menu do pai' },
      h('a', { class: 'brand', href: '#/pai/painel' }, h('img', { src: 'assets/icon.svg', alt: '', width: 32, height: 32 }), h('span', null, 'Área do pai')),
      h('a', { class: 'side-cta', href: '#/pai/receber' }, h('span', { 'aria-hidden': 'true' }, '＋'), 'Receber tarefa'),
      ...MENU_PAI.map(([id, rotulo, ico]) => h('a', { href: `#/pai/${id}`, 'aria-current': (id === view || (id === 'tarefas' && ['tarefa', 'receber'].includes(view))) ? 'page' : null }, h('span', { 'aria-hidden': 'true' }, ico), rotulo)),
      h('div', { class: 'sep' }),
      h('a', { href: '#/aluno/hoje', onClick: (e) => { e.preventDefault(); salvarModo('aluno'); go('#/aluno/hoje'); } }, h('span', { 'aria-hidden': 'true' }, '🚀'), 'Ver como Luan'),
      h('a', { href: '#', onClick: (e) => { e.preventDefault(); sairDoPai(); } }, h('span', { 'aria-hidden': 'true' }, '🔒'), 'Sair (bloquear)'),
      h('div', { class: 'small', id: 'synctxt', style: { padding: '8px 12px', color: '#9fb0dc' } })),
    h('div', { class: 'pai-main' }, conteudo));
  return { shell, conteudo };
}

const ROTULO_SYNC = { ok: '☁️ sincronizado', sincronizando: '☁️ sincronizando…', erro: '⚠️ sem sincronizar', desligado: '' };
function atualizarSync() {
  const st = sync.status();
  const ativa = sync.ativo();
  const chip = document.getElementById('synchip');
  if (chip) { chip.hidden = !ativa; chip.textContent = st.fase === 'erro' ? '⚠️' : '☁️'; chip.title = st.erro || ROTULO_SYNC[st.fase] || ''; }
  const txt = document.getElementById('synctxt');
  if (txt) txt.textContent = ativa ? (ROTULO_SYNC[st.fase] || '') + (st.fase === 'erro' ? ` (${st.erro})` : '') : 'Sem sincronização entre aparelhos';
}
sync.ouvir(atualizarSync);

function atualizarChrome() {
  atualizarSync();
  const chip = document.getElementById('xpchip');
  if (chip) {
    const s = getState();
    const fase = faseDe(today(), s.config);
    chip.hidden = !fase.xp;
    if (fase.xp) chip.textContent = `⭐ ${resumoSemana(s, today()).total} XP`;
    const c = document.getElementById('corrente');
    if (c) {
      const n = corrente(s, today());
      c.hidden = n < 2;
      c.textContent = `🔥 ${n} dias`;
    }
  }
}

// ---------- portão de entrada ----------
function gate() {
  document.body.className = 't-aluno';
  limpar(root).append(h('div', { class: 'gate' }, h('div', { class: 'gate-card stack lg' },
    h('img', { src: 'assets/icon.svg', alt: '', width: 96, height: 96, style: { margin: '0 auto', borderRadius: '24px' } }),
    h('div', null, h('p', { class: 'eyebrow' }, 'Plano de estudos · 6º ano'), h('h1', { class: 'hero' }, 'MISSÃO ', h('em', null, '6º ANO')),
      h('p', { class: 'muted' }, 'Curto, jogado em missões e entrando na matéria pela astronomia.')),
    h('div', { class: 'stack' },
      h('button', { class: 'btn amber lg block', onClick: () => { salvarModo('aluno'); go('#/aluno/hoje'); } }, `🚀 Sou o ${getState().config.aluno.split(' ')[0]}`),
      h('button', { class: 'btn lg block', onClick: () => pedirPin(() => go('#/pai/painel')) }, `🔒 Sou o pai (${getState().config.tutor})`)))));
}

// ---------- roteamento ----------
async function parear(codigo) {
  document.body.className = 't-aluno';
  limpar(root).append(h('div', { class: 'gate' }, h('div', { class: 'gate-card stack' }, h('div', { class: 'big-emoji' }, '☁️'), h('h1', null, 'Conectando este aparelho…'), h('p', { class: 'muted' }, 'Buscando os dados da família na nuvem.'))));
  try {
    await sync.habilitar(codigo, { entrar: true });
    toast('Aparelho conectado! Dados sincronizados.');
    location.replace(location.pathname + location.search + '#/entrada');
    render();
  } catch (e) {
    limpar(root).append(h('div', { class: 'gate' }, h('div', { class: 'gate-card stack' }, banner('erro', 'Não deu para conectar', String(e.message || e)), h('a', { class: 'btn amber', href: '#/entrada' }, 'Voltar'))));
  }
}

async function render() {
  const { modo, view, params } = parseHash();
  if (modo === 'parear') return parear(params.c);
  const salvo = modoSalvo();
  if (!modo || modo === 'entrada') {
    if (!modo && salvo === 'aluno') return go('#/aluno/hoje');
    if (!modo && salvo === 'pai' && paiLiberado()) return go('#/pai/painel');
    return gate();
  }
  if (modo === 'pai') {
    if (!paiLiberado() && temPin()) { gate(); pedirPin(() => go(location.hash)); return; }
    liberarPai(true);
    const v = ROTAS_PAI[view] ? view : 'painel';
    document.body.className = '';
    document.title = 'Pai · Missão 6º Ano';
    const { shell, conteudo } = shellPai(v);
    limpar(root).append(shell);
    conteudoAtual = { alvo: conteudo, loader: ROTAS_PAI[v], params, modo: 'pai', view: v };
  } else {
    let v = ROTAS_ALUNO[view] ? view : 'hoje';
    if (v === 'hoje' && !getState().flags.cartaLida) v = 'carta';
    document.body.className = 't-aluno';
    document.title = 'Missão 6º Ano';
    const { shell, conteudo } = shellAluno(v);
    limpar(root).append(shell);
    conteudoAtual = { alvo: conteudo, loader: ROTAS_ALUNO[v], params, modo: 'aluno', view: v };
  }
  await renderConteudo();
}

window.addEventListener('hashchange', render);
subscribe((_, info) => {
  atualizarChrome();
  // Outra aba mudou os dados: redesenha a tela (sem atrapalhar quem está digitando)
  if (info?.externo) {
    const a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
    renderConteudo();
  }
});
render();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline não disponível */ });
}
try { navigator.storage?.persist?.(); } catch { /* ignore */ }
