// Ações sobre tarefas de casa (criar, responder, concluir, conferir) e seus efeitos no resto da plataforma.
import { getState, mutate, mutateDay, uid } from './store.js';
import { novaTarefa, anexosDaTarefa, conferirAuto } from './core/tarefas.js';
import { apagar as apagarAnexo } from './anexos.js';
import { toast, toastXP } from './ui.js';
import { today } from './util/dates.js';
import { proximoDiaDeMissao } from './actions.js';
import { xpAtivo } from './core/xp.js';

export function criarTarefas(lista, { fonteTexto = '', data = today() } = {}) {
  const ids = [];
  mutate((s) => {
    for (const p of lista) {
      const t = novaTarefa({ ...p, fonteTexto, data }, data, s.config.diasLivres);
      s.tarefas.push(t);
      ids.push(t.id);
    }
  });
  return ids;
}

export const tarefaPorId = (id) => getState().tarefas.find((t) => t.id === id);

export function atualizarTarefa(id, fn) {
  mutate((s) => { const t = s.tarefas.find((x) => x.id === id); if (t) fn(t, s); });
}

/** Apaga a tarefa e as imagens que mais ninguém usa. */
export async function excluirTarefa(id) {
  const t = tarefaPorId(id);
  if (!t) return;
  const dela = anexosDaTarefa(t);
  mutate((s) => { s.tarefas = s.tarefas.filter((x) => x.id !== id); });
  const emUso = new Set(getState().tarefas.flatMap(anexosDaTarefa));
  for (const a of dela) if (!emUso.has(a)) await apagarAnexo(a).catch(() => {});
}

export function iniciarTarefa(id) {
  atualizarTarefa(id, (t) => { t.iniciadaEm ||= new Date().toISOString(); });
}

export function responderItem(id, itemId, valor) {
  atualizarTarefa(id, (t) => {
    const i = t.itens.find((x) => x.id === itemId);
    if (i) { i.resposta = valor; t.iniciadaEm ||= new Date().toISOString(); }
  });
}

export function anexarAoItem(id, itemId, anexos) {
  atualizarTarefa(id, (t) => { const i = t.itens.find((x) => x.id === itemId); if (i) i.anexos = [...(i.anexos || []), ...anexos]; t.iniciadaEm ||= new Date().toISOString(); });
}

export function adicionarFotosCaderno(id, anexos) {
  atualizarTarefa(id, (t) => { t.fotosCaderno = [...(t.fotosCaderno || []), ...anexos]; t.iniciadaEm ||= new Date().toISOString(); });
}

export function marcarFeita(id, { minutos = null } = {}) {
  const hoje = today();
  atualizarTarefa(id, (t) => {
    t.feitaEm = hoje;
    t.feitaHora = new Date().toISOString();
    if (minutos != null) t.tempoGasto = minutos;
  });
  const xp = getState().config.xpTarefa;
  if (xp > 0 && xpAtivo(getState(), hoje)) toastXP(xp, 'Tarefa de casa feita');
}

export function desfazerFeita(id) {
  atualizarTarefa(id, (t) => { t.feitaEm = null; t.feitaHora = null; t.conferidaEm = null; });
}

/** Passa os erros da correção para o diário de erros (uma vez só por questão) e cria cartas dos erros tipo A. */
export function registrarErrosDaTarefa(id, { redoMatematica = true } = {}) {
  const hoje = today();
  mutate((s) => {
    const t = s.tarefas.find((x) => x.id === id);
    if (!t) return;
    for (const i of t.itens) {
      const c = i.correcao;
      if (c.res !== 'errado' || c.registrado) continue;
      c.registrado = true;
      s.erros.push({
        id: uid(), origem: 'tarefa', data: hoje, tarefaId: t.id, itemId: i.id, provaId: null, disciplina: t.disciplina,
        assunto: t.titulo, enunciado: i.enunciado, correcao: i.gabarito || c.comentario || '', tipo: c.tipoErro || null, problema: null, leitura: null,
        redoOn: redoMatematica && t.disciplina === 'Matemática' && c.tipoErro !== 'C' ? proximoDiaDeMissao(hoje, s.config.diasLivres) : null, redoDone: false, redoOk: false,
      });
      if (c.tipoErro === 'A' && i.gabarito) {
        s.cartas.push({ id: uid(), disciplina: t.disciplina, frente: i.enunciado, verso: i.gabarito, tag: 'Erro de tarefa', origem: 'erro', provaId: null, caixa: 1, due: hoje, acertos: 0, erros: 0, criada: hoje });
      }
    }
  });
}

/** Aplica a correção automática (múltipla escolha, V/F, cálculo) onde há gabarito e o pai ainda não decidiu. */
export function conferirAutomatico(id) {
  let n = 0;
  atualizarTarefa(id, (t) => {
    for (const i of t.itens) {
      if (i.correcao.res) continue;
      const r = conferirAuto(i);
      if (r) { i.correcao.res = r; i.correcao.auto = true; n++; }
    }
  });
  return n;
}

export function concluirConferencia(id, { comentario = '', nota = null } = {}) {
  atualizarTarefa(id, (t) => {
    t.conferidaEm = today();
    t.comentarioPai = comentario;
    t.nota = nota;
    t.feitaEm ||= today();
  });
  registrarErrosDaTarefa(id);
  toast('Conferência concluída');
}
