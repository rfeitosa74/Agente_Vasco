// Alertas e leituras para o painel do pai. Tudo derivado dos registros — nada é inventado.
import { addDays, isWeekday, diffDays, weekStart } from '../util/dates.js';
import { planoDoDia, planoDasProvas } from './dayplan.js';
import { diaCompleto, corrente } from './xp.js';
import { faseDe } from './phase.js';
import { sequenciaMeta, FAIXAS } from './ginasio.js';
import { aConferir, tarefasAFazer, situacaoDe, cargaMinutos } from './tarefas.js';

export const TIPOS_ERRO = {
  A: { nome: 'Não sabia', quando: 'Lacuna real de conteúdo', acao: 'Vira carta-relâmpago e reaparece no Desafio do Pai.' },
  B: { nome: 'Sabia e errei', quando: 'Pressa, enunciado mal lido, conta trocada', acao: 'Não se resolve estudando mais: resolve-se com as três perguntas do enunciado.' },
  C: { nome: 'Fiquei em branco', quando: 'Ansiedade ou sono — não falta de estudo', acao: 'Olhe o horário de dormir antes do caderno.' },
};

export function distribuicaoErros(erros) {
  const d = { A: 0, B: 0, C: 0 };
  for (const e of erros) if (d[e.tipo] != null) d[e.tipo]++;
  const total = d.A + d.B + d.C;
  return { ...d, total };
}

/** Leitura do diário de erros, no espírito da página 9 do plano. */
export function diagnosticoErros(erros) {
  const d = distribuicaoErros(erros);
  if (d.total < 6) return { suficiente: false, d, texto: `Com ${d.total} erro${d.total === 1 ? '' : 's'} classificado${d.total === 1 ? '' : 's'} ainda é cedo para concluir. Em um mês de provas semanais você terá 15 a 20 e o desenho aparece sozinho.` };
  const top = ['A', 'B', 'C'].sort((x, y) => d[y] - d[x])[0];
  const pct = Math.round((d[top] / d.total) * 100);
  const frases = {
    B: `Maioria B (${pct}%): o problema nunca foi estudo — aumentar a matéria só teria piorado. Foque nas três perguntas do enunciado e na leitura ativa.`,
    A: `Maioria A (${pct}%): o método está certo e falta cobertura de conteúdo. Mais cartas-relâmpago e o Desafio do Pai.`,
    C: `Maioria C (${pct}%): o assunto é sono e ansiedade, não estudo. Cheque o horário de dormir, o celular fora do quarto e a véspera de prova.`,
  };
  return { suficiente: true, d, top, texto: frases[top] };
}

export function insights(state, hoje) {
  const out = [];
  const cfg = state.config;
  const fase = faseDe(hoje, cfg);
  const add = (nivel, titulo, texto, acao) => out.push({ nivel, titulo, texto, acao });

  // --- provas ---
  const futuras = state.provas.filter((p) => !p.cancelada && p.data >= hoje);
  if (!futuras.length) add('aviso', 'Nenhuma prova cadastrada', 'Envie a agenda de provas das próximas semanas: o aplicativo monta o ciclo D-3 sozinho.', { rotulo: 'Cadastrar provas', hash: '#/pai/semana' });
  const { avisos } = planoDasProvas(state);
  for (const p of futuras) if (avisos[p.id]) add('aviso', `Prova de ${p.disciplina} (${p.data.slice(8)}/${p.data.slice(5, 7)}): pouco tempo`, avisos[p.id].join(' '), { rotulo: 'Ver o plano', hash: '#/pai/semana' });
  const semNota = state.provas.filter((p) => !p.cancelada && p.data < hoje && !p.classificada);
  if (semNota.length) add('info', `${semNota.length} prova${semNota.length > 1 ? 's' : ''} para classificar no diário de erros`, 'Quando a prova voltar corrigida: 5 minutos, 15 XP, e o diagnóstico melhora.', { rotulo: 'Abrir o diário', hash: '#/pai/erros' });

  // --- tarefas de casa ---
  const tarefas = state.tarefas || [];
  const conferirLista = aConferir(state);
  if (conferirLista.length) add('info', `${conferirLista.length} tarefa${conferirLista.length > 1 ? 's' : ''} esperando a sua conferência`, 'O Luan já enviou. Conferir rápido mantém o ritmo e alimenta o diário de erros.', { rotulo: 'Conferir agora', hash: '#/pai/tarefas?aba=conferir' });
  const atrasadas = tarefasAFazer(state, hoje).filter((t) => situacaoDe(t, hoje) === 'atrasada');
  if (atrasadas.length) add('aviso', `${atrasadas.length} tarefa${atrasadas.length > 1 ? 's' : ''} atrasada${atrasadas.length > 1 ? 's' : ''}`, atrasadas.slice(0, 3).map((t) => `${t.disciplina}: ${t.titulo}`).join(' · '), { rotulo: 'Ver tarefas', hash: '#/pai/tarefas?aba=fazer' });
  const carga = cargaMinutos(state, hoje);
  if (carga > (cfg.tetoTarefaMin || 60)) add('aviso', `Noite pesada: cerca de ${carga} min de tarefa`, `Passa do teto de ${cfg.tetoTarefaMin || 60} min. O plano pede para não aumentar as horas — priorize o que vale nota e converse com as professoras sobre a carga.`, { rotulo: 'Ver tarefas', hash: '#/pai/tarefas' });
  if (!tarefas.length && isWeekday(hoje)) add('info', 'As tarefas da escola ainda não estão no app', 'Cole a mensagem do WhatsApp (ou mande uma foto/PDF da apostila): o Luan vê no aplicativo dele.', { rotulo: 'Receber tarefa', hash: '#/pai/receber' });

  // --- matemática ---
  if (!state.testesMat.length) add('info', 'Falta o teste de 10 minutos de Matemática', 'É o marco zero: diz onde atacar primeiro e serve para comparar daqui a um mês.', { rotulo: 'Aplicar o teste', hash: '#/pai/matematica' });
  const matErros = state.erros.filter((e) => e.origem === 'matematica');
  const leit = matErros.filter((e) => e.leitura);
  if (matErros.length >= 5 && leit.length / matErros.length >= 0.4) add('info', 'Muitos erros de Matemática são de leitura do enunciado', `${leit.length} de ${matErros.length} erros vieram de dado/operação mal escolhido. É o mesmo problema de História e Geografia: treine as três perguntas.`);
  const faixa = state.ginasio.faixa;
  const seq = sequenciaMeta(state.ginasio.historico, faixa, hoje, cfg.diasLivres);
  if (FAIXAS[faixa - 1].meta != null && seq === 2) add('ok', 'Quase subindo de faixa', `Mais 1 dia na meta e o Luan sobe para a faixa ${faixa + 1} do Ginásio.`);

  // --- diário de erros ---
  const classif = state.erros.filter((e) => e.tipo);
  if (classif.length >= 8) { const dg = diagnosticoErros(classif); add('info', 'O que o diário de erros está mostrando', dg.texto, { rotulo: 'Ver o diário', hash: '#/pai/erros' }); }

  // --- rotina ---
  const ontem = addDays(hoje, -1);
  let d = ontem;
  while (!isWeekday(d)) d = addDays(d, -1);
  if (d >= state.criadoEm && !cfg.diasLivres.includes(d) && corrente(state, hoje) === 0 && !(state.days[d] && diaCompleto(state.days[d], planoDoDia(state, d)))) {
    add('info', 'A corrente está zerada', 'Em dia ruim, corte para 5 minutos — mas não pule. Sem cobrança: é só retomar hoje.');
  }
  if (fase.conversa) add('aviso', 'Semana 4: hora de conversar com as professoras', 'Pergunte se mudou a FORMA de responder dele (não se a nota subiu: nota demora um bimestre). E avalie reduzir o reforço de 5 para 3 dias.', { rotulo: 'Roteiro da conversa', hash: '#/pai/professoras' });
  const cartasDevidas = state.cartas.filter((c) => c.due <= hoje).length;
  if (cartasDevidas > 40) add('info', `${cartasDevidas} cartas acumuladas`, 'Muitas cartas vencidas: o Desafio do Pai de sábado é um bom momento para limpar a fila.');

  // --- atenção ---
  const diasAtencao = new Set(state.atencao.map((a) => a.data)).size;
  if (diasAtencao >= 15) add('ok', 'Registro de atenção com dados suficientes', 'Três semanas de registro respondem duas perguntas: qual o melhor horário do dia dele e se a distração é geral ou só em certas matérias.', { rotulo: 'Ver a análise', hash: '#/pai/atencao' });
  const ini = state.config.inicioBimestre4;
  if (ini && diffDays(hoje, weekStart(ini)) >= 6 * 7) add('info', 'Passaram 6 a 8 semanas de rotina', 'Se com rotina estável, sono de 9 horas, celular fora do quarto e esforço presente nada mudou, leve o registro de atenção ao pediatra — não como rótulo, mas porque a dificuldade persistente tem causas identificáveis e tratáveis.', { rotulo: 'Ver o registro', hash: '#/pai/atencao' });

  // --- backup ---
  const temDados = Object.keys(state.days).length >= 3;
  if (temDados && (!cfg.ultimoBackup || diffDays(hoje, cfg.ultimoBackup) > 14)) add('aviso', 'Faça um backup', 'Os dados ficam só neste aparelho. Exporte um arquivo de backup de vez em quando.', { rotulo: 'Configurações', hash: '#/pai/config' });

  const ordem = { erro: 0, aviso: 1, info: 2, ok: 3 };
  return out.sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
}

/** Checklist de primeiros passos (página 12). */
export function primeirosPassos(state) {
  const f = state.flags;
  return [
    { id: 'pin', feito: !!state.config.pinHash, texto: 'Criar um PIN para a área do pai', hash: '#/pai/config' },
    { id: 'bim', feito: !!state.config.inicioBimestre4, texto: 'Informar quando começa o 4º bimestre (início da rampa)', hash: '#/pai/config' },
    { id: 'provas', feito: state.provas.length > 0, texto: 'Cadastrar as provas das próximas semanas', hash: '#/pai/semana' },
    { id: 'teste', feito: state.testesMat.length > 0, texto: 'Aplicar o teste de 10 minutos de Matemática (marco zero)', hash: '#/pai/matematica' },
    { id: 'carta', feito: !!f.cartaLida, texto: 'Ler a carta com o Luan, sem pressa', hash: '#/aluno/carta' },
    { id: 'cartas', feito: state.cartas.some((c) => c.origem === 'tutor'), texto: 'Montar as cartas-relâmpago dos capítulos do bimestre', hash: '#/pai/cartas' },
    { id: 'prof', feito: Object.keys(state.professoras.respostas).length > 0 || state.professoras.notas.length > 0, texto: 'Conversar com as professoras (reduzir o reforço de 5 para 3 dias?)', hash: '#/pai/professoras' },
  ];
}
