// Tarefas de casa: modelo, estado (pendente → andamento → feita → conferida), prazos e carga.
import { uid } from './rng.js';
import { proximoDiaUtil } from './zap.js';
import { parseResp, igual } from './ginasio.js';

export const TIPOS_ITEM = {
  aberta: 'Pergunta aberta',
  objetiva: 'Múltipla escolha',
  calculo: 'Cálculo',
  vf: 'Verdadeiro ou falso',
  redacao: 'Redação / texto',
};

export const ORIGENS = {
  whatsapp: 'Mensagem do WhatsApp',
  apostila: 'Apostila',
  livro: 'Livro',
  foto: 'Foto',
  pdf: 'PDF',
  digitada: 'Digitada',
};

export const novoItem = (p = {}) => ({
  id: uid(), enunciado: '', tipo: 'aberta', opcoes: [], gabarito: '', resposta: '', anexos: [],
  correcao: { res: null, comentario: '', tipoErro: null }, ...p,
  correcao: { res: null, comentario: '', tipoErro: null, ...(p.correcao || {}) },
});

/** @param p campos da tarefa; `hoje` e `livres` definem a data atribuída e o prazo padrão */
export function novaTarefa(p, hoje, livres = []) {
  const data = p.data || hoje;
  return {
    id: uid(), criadaEm: new Date().toISOString(), data,
    entrega: p.entrega || proximoDiaUtil(data, livres),
    disciplina: p.disciplina || 'Outra', rotuloOriginal: p.rotuloOriginal || '',
    titulo: (p.titulo || '').trim() || 'Tarefa', descricao: p.descricao || '',
    origem: p.origem || 'digitada', fonteTexto: p.fonteTexto || '',
    anexos: p.anexos || [], itens: (p.itens || []).map(novoItem),
    minutos: p.minutos || null,
    iniciadaEm: null, feitaEm: null, conferidaEm: null, fotosCaderno: [], respondeuNoCaderno: false,
    tempoGasto: 0, comentarioPai: '', nota: null, cancelada: false,
  };
}

const MIN_ITEM = { redacao: 25, calculo: 3, aberta: 4, objetiva: 2, vf: 2 };

/** Estimativa de tempo (min): a do pai, se houver; senão pela soma dos itens. */
export function estimarMinutos(t) {
  if (t.minutos) return t.minutos;
  if (!t.itens.length) return /reda[cç][aã]o|produ[cç][aã]o/i.test(`${t.titulo} ${t.descricao}`) ? 30 : 20;
  return Math.max(5, t.itens.reduce((a, i) => a + (MIN_ITEM[i.tipo] || 4), 0));
}

const respondido = (i) => !!(String(i.resposta || '').trim() || (i.anexos || []).length);

export function statusDe(t) {
  if (t.conferidaEm) return 'conferida';
  if (t.feitaEm) return 'feita';
  if (t.iniciadaEm || t.respondeuNoCaderno || (t.fotosCaderno || []).length || t.itens.some(respondido)) return 'andamento';
  return 'pendente';
}

export const ROTULO_STATUS = { pendente: 'a fazer', andamento: 'em andamento', feita: 'aguardando conferência', conferida: 'conferida' };

export function progressoDe(t) {
  const total = t.itens.length;
  return { feitos: t.itens.filter(respondido).length, total };
}

/** Situação em relação ao prazo, para quem ainda não terminou. */
export function situacaoDe(t, hoje) {
  if (t.feitaEm || t.cancelada) return 'ok';
  if (t.entrega < hoje) return 'atrasada';
  if (t.entrega === hoje) return 'hoje';
  if (t.entrega === proximoDiaUtil(hoje)) return 'amanha';
  return 'futura';
}

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/** Correção automática de questões com gabarito (múltipla escolha, V/F, números). null = não dá para decidir. */
export function conferirAuto(item) {
  const g = String(item.gabarito || '').trim();
  const r = String(item.resposta || '').trim();
  if (!g || !r) return null;
  if (item.tipo === 'calculo') {
    const a = parseResp(r), b = parseResp(g);
    return a && b ? (igual(a, b) ? 'certo' : 'errado') : null;
  }
  if (item.tipo === 'objetiva' || item.tipo === 'vf') return norm(r)[0] === norm(g)[0] && norm(r).slice(0, 1) !== '' ? 'certo' : 'errado';
  return null;
}

export function resumoConferencia(t) {
  const c = { certo: 0, parcial: 0, errado: 0, aberto: 0 };
  for (const i of t.itens) {
    const r = i.correcao?.res;
    if (r) c[r]++;
    else c.aberto++;
  }
  return c;
}

/** Para a tela do Luan: a fazer, ordenadas por urgência. */
export function tarefasAFazer(state, hoje) {
  const peso = { atrasada: 0, hoje: 1, amanha: 2, futura: 3 };
  return state.tarefas
    .filter((t) => !t.cancelada && !t.feitaEm)
    .sort((a, b) => peso[situacaoDe(a, hoje)] - peso[situacaoDe(b, hoje)] || (a.entrega < b.entrega ? -1 : 1));
}

/** Tarefas que o Luan deveria fazer HOJE à noite (entrega até o próximo dia de aula). */
export function tarefasDeHoje(state, hoje) {
  const limite = proximoDiaUtil(hoje, state.config.diasLivres);
  return tarefasAFazer(state, hoje).filter((t) => t.entrega <= limite);
}

export const cargaMinutos = (state, hoje) => tarefasDeHoje(state, hoje).reduce((a, t) => a + estimarMinutos(t), 0);

export const aConferir = (state) => state.tarefas.filter((t) => !t.cancelada && t.feitaEm && !t.conferidaEm);

/** Todos os ids de anexos usados por uma tarefa (para apagar/sincronizar). */
export function anexosDaTarefa(t) {
  return [...new Set([...(t.anexos || []), ...(t.fotosCaderno || []), ...t.itens.flatMap((i) => i.anexos || [])])];
}
