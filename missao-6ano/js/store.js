// Estado do aplicativo + persistência local (localStorage) + backup (exportar/importar).
// Tudo fica no aparelho: nenhum dado é enviado para lugar nenhum.
import { uid, hashStr } from './core/rng.js';
import { today } from './util/dates.js';
import { CARTAS_INICIAIS } from './data/cartas.js';
import { EPISODIOS_IDEIAS } from './data/episodios.js';
import { novaCarta } from './core/leitner.js';

const KEY = 'missao6:v1';
export const VERSAO = 1;

export const CONFIG_PADRAO = {
  aluno: 'Luan',
  tutor: 'Rubens',
  pinHash: null,
  inicioBimestre4: '2026-10-12', // 1ª segunda-feira da rampa (4º bimestre); editável em Configurações
  faseForcada: null,
  sprintMin: {},
  horarios: { dever: '18:30', acordar: '07:00', aquecimento: '07:30', missao: '07:45', episodio: '08:15', escola: '12:30', explica: '20:00', base: '20:30', dormir: '21:00', desafio: '09:00' },
  tetoTarefaMin: 60, // acima disso o app avisa que a noite está pesada (o plano recomenda NÃO aumentar as horas)
  fontes: { habilitadas: ['wikipedia', 'wiktionary', 'nasa', 'ibge'], pesquisaLivreAluno: false, linksExternosAluno: true }, // fontes online confiáveis (só com internet)
  xpTarefa: 0, // XP por tarefa de casa concluída (0 = desligado: o XP do plano não prevê tarefas)
  niveis: { bronze: 150, prata: 200, ouro: 250 },
  recompensas: {
    bronze: '+30 min de jogo no sábado',
    prata: '+1 h de jogo no sábado e ele escolhe o jantar de domingo',
    ouro: 'Programa de domingo escolhido por ele, com o pai (bola, bicicleta, praia, observação do céu)',
    conquista: '',
  },
  diasLivres: [],
  programasDomingo: [],
  conquistaMes: '',
  canal: 'Canal de astronomia do Luan',
};

export function novoDia() {
  return {
    caligrafia: false, ginasio: null, sprints: {}, diaDificil: false,
    episodio: false, explicou: false, explicouTema: '', refezErro: false, desafio: false, base: false,
    provasClassificadas: 0, recado: '', notaExplica: '', ponteFeita: false, ponteOffset: 0, xpExtra: [],
    janelaLimpa: false,
  };
}

function estadoInicial() {
  const hoje = today();
  return {
    v: VERSAO,
    criadoEm: hoje,
    config: structuredClone(CONFIG_PADRAO),
    days: {},
    provas: [],
    erros: [],
    // ids fixos: aparelhos diferentes geram o MESMO baralho inicial (senão a sincronização duplicaria as cartas)
    cartas: CARTAS_INICIAIS.map((c, i) => ({ ...novaCarta({ ...c, origem: 'inicial', hoje }), id: `ini-${i}` })),
    perguntas: [],
    episodios: EPISODIOS_IDEIAS.map((e) => ({ ...e, status: 'ideia', gravadoEm: null })),
    ginasio: { faixa: 1, historico: [] },
    testesMat: [],
    semanas: {},
    atencao: [],
    professoras: { notas: [], respostas: {} },
    leituras: [],
    desafios: [],
    tarefas: [],
    biblioteca: [], // resultados de pesquisa guardados (funcionam sem internet)
    sugestoes: [], // temas que o pai sugere ao aluno pesquisar
    trilha: {},
    flags: { cartaLida: false, boasVindasPai: false },
  };
}

function mesclar(alvo, padrao) {
  for (const [k, v] of Object.entries(padrao)) {
    if (!(k in alvo)) alvo[k] = structuredClone(v);
    else if (v && typeof v === 'object' && !Array.isArray(v) && alvo[k] && typeof alvo[k] === 'object') mesclar(alvo[k], v);
  }
  return alvo;
}

let state;
let armazenamentoOk = true;
let ultimoSalvo = null; // texto exato do que está no localStorage (para detectar mudanças vindas de outra aba)
const ouvintes = new Set();

function carregar() {
  try {
    const bruto = localStorage.getItem(KEY);
    if (bruto) {
      const s = JSON.parse(bruto);
      if (s && s.v) { ultimoSalvo = bruto; return mesclar(s, estadoInicial()); }
    }
  } catch (e) {
    armazenamentoOk = false;
  }
  return estadoInicial();
}

function salvar() {
  try {
    const json = JSON.stringify(state);
    localStorage.setItem(KEY, json);
    ultimoSalvo = json;
    armazenamentoOk = true;
  } catch (e) {
    armazenamentoOk = false;
  }
}

/** Se outra aba/janela salvou algo novo, adota esse estado (evita uma aba sobrescrever a outra). */
function sincronizar() {
  try {
    const bruto = localStorage.getItem(KEY);
    if (bruto && bruto !== ultimoSalvo) {
      const s = JSON.parse(bruto);
      if (s && s.v) { state = mesclar(s, estadoInicial()); ultimoSalvo = bruto; return true; }
    }
  } catch (e) { /* ignora */ }
  return false;
}

state = carregar();
salvar();

export const getState = () => state;
export const storageOk = () => armazenamentoOk;
export const subscribe = (fn) => (ouvintes.add(fn), () => ouvintes.delete(fn));
const avisar = (info) => ouvintes.forEach((fn) => fn(state, info));

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === KEY && sincronizar()) avisar({ externo: true }); });
}

/** Altera o estado, salva e avisa os ouvintes. */
export function mutate(fn) {
  sincronizar();
  const r = fn(state);
  salvar();
  avisar();
  return r;
}

const DIA_VAZIO = Object.freeze(novoDia());
export const getDay = (data) => state.days[data] || DIA_VAZIO;

export function mutateDay(data, fn) {
  return mutate((s) => {
    const d = (s.days[data] ||= novoDia());
    for (const [k, v] of Object.entries(novoDia())) if (!(k in d)) d[k] = v;
    return fn(d, s);
  });
}

/** Troca o estado inteiro (usado pela sincronização). Não dispara nova sincronização. */
export function substituirEstado(novo) {
  state = mesclar(structuredClone(novo), estadoInicial());
  salvar();
  avisar({ sync: true });
}

export const hashPin = (pin) => String(hashStr(`missao6|${pin}`));
export const temPin = () => !!state.config.pinHash;
export const confereOPin = (pin) => !state.config.pinHash || state.config.pinHash === hashPin(pin);

// ---------- backup ----------
export function exportarJson() {
  return JSON.stringify({ ...state, exportadoEm: new Date().toISOString() }, null, 2);
}

export function importarJson(texto) {
  const s = JSON.parse(texto);
  if (!s || typeof s !== 'object' || !s.v || !s.config || !s.days) throw new Error('Arquivo inválido: não parece um backup da Missão 6º Ano.');
  state = mesclar(s, estadoInicial());
  salvar();
  avisar();
}

export function apagarTudo() {
  state = estadoInicial();
  salvar();
  avisar();
}

export { uid };
