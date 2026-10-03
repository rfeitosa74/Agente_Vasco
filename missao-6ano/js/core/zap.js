// Interpreta o texto de uma mensagem de tarefa (WhatsApp do grupo dos pais, texto de PDF/foto lido por OCR…)
// e propõe tarefas: disciplina, prazo, descrição e questões. É uma ajuda: o pai sempre revisa antes de salvar.
import { addDays, dow, iso, isWeekday } from '../util/dates.js';
import { acharTemasDePesquisa } from './fontes.js';

const norm = (s) => s.normalize('NFC').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// [disciplina canônica, apelidos (sem acento, minúsculos)]
const APELIDOS = [
  ['Matemática', ['matematica', 'matem', 'mat']],
  ['Português', ['lingua portuguesa', 'portugues', 'port', 'lp', 'gramatica', 'ortografia', 'redacao', 'producao de texto', 'producao de textos', 'producao textual', 'interpretacao de texto', 'interpretacao textual', 'leitura', 'literatura']],
  ['História', ['historia', 'hist']],
  ['Geografia', ['geografia', 'geo']],
  ['Ciências', ['ciencias', 'cienc', 'cien']],
  ['Inglês', ['ingles', 'english', 'ing']],
  ['Outra', ['artes', 'arte', 'educacao fisica', 'ed fisica', 'ed. fisica', 'ensino religioso', 'religiao', 'filosofia', 'informatica', 'espanhol', 'projeto de vida', 'pesquisa']],
];
const TODOS = APELIDOS.flatMap(([d, as]) => as.map((a) => [a, d])).sort((a, b) => b[0].length - a[0].length);
const RE_CABECALHO = new RegExp(`^(${TODOS.map(([a]) => a.replace(/[.]/g, '\\.')).join('|')})(?=$|[\\s:.\\-–—)])`);
const RE_NOME_COMPLETO = /\b(matem[aá]tica|portugu[eê]s|hist[oó]ria|geografia|ci[eê]ncias|ingl[eê]s)\b/gi;

const SEMANA = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };

/** Prefixo de exportação do WhatsApp: "[05/10/2026 10:32] Nome: ", "05/10/2026 10:32 - Nome: ", "[10:32, 05/10/2026] Nome: ". */
export function tirarPrefixoWhatsApp(linha) {
  const pads = [
    /^\[(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?,?\s+\d{1,2}[:h]\d{2}(?::\d{2})?\]\s*[^:\n]{1,50}:\s*/,
    /^\[\d{1,2}[:h]\d{2}(?::\d{2})?,\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\]\s*[^:\n]{1,50}:\s*/,
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+\d{1,2}[:h]\d{2}(?::\d{2})?\s*[-–]\s*[^:\n]{1,50}:\s*/,
  ];
  for (const p of pads) {
    const m = linha.match(p);
    if (m) return { linha: linha.slice(m[0].length), dia: Number(m[1]), mes: Number(m[2]), ano: m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : null };
  }
  return { linha, dia: null };
}

const dataValida = (a, m, d) => {
  const t = new Date(a, m - 1, d);
  return t.getFullYear() === a && t.getMonth() === m - 1 && t.getDate() === d ? iso(t) : null;
};

/**
 * Procura um prazo no texto: “para amanhã”, “entregar quinta”, “até 08/10”, “dia 8”.
 * `ref` = data de referência (AAAA-MM-DD). Devolve AAAA-MM-DD ou null.
 */
export function acharPrazo(texto, ref) {
  const t = norm(texto);
  const [ay, am, ad] = ref.split('-').map(Number);
  const gatilho = '(?:para|pra|entregar|entrega|ate|prazo|devolver|devolucao|ate o dia|para o dia|no dia|dia)';
  // dd/mm(/aa)
  let m = t.match(new RegExp(`${gatilho}\\s*(?:o\\s+|a\\s+)?(\\d{1,2})[\\/.](\\d{1,2})(?:[\\/.](\\d{2,4}))?`));
  if (m) {
    const ano = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : ay;
    let d = dataValida(ano, Number(m[2]), Number(m[1]));
    if (d && !m[3] && d < ref && Number(m[2]) < am - 6) d = dataValida(ano + 1, Number(m[2]), Number(m[1])); // virou o ano
    if (d) return d;
  }
  if (new RegExp(`${gatilho}\\s*(?:o\\s+)?depois de amanha`).test(t)) return addDays(ref, 2);
  if (new RegExp(`${gatilho}\\s*(?:o\\s+)?amanha`).test(t)) return addDays(ref, 1);
  if (new RegExp(`${gatilho}\\s*hoje`).test(t)) return ref;
  m = t.match(new RegExp(`${gatilho}\\s*(?:o\\s+|a\\s+)?(segunda|terca|quarta|quinta|sexta|sabado|domingo)`));
  if (m) {
    let d = addDays(ref, 1);
    for (let i = 0; i < 8 && dow(d) !== SEMANA[m[1]]; i++) d = addDays(d, 1);
    return d;
  }
  m = t.match(new RegExp(`${gatilho}\\s*(?:o\\s+)?(?:dia\\s+)?(\\d{1,2})(?![\\d/.:h])`));
  if (m && /\bdia\b/.test(m[0])) {
    const dia = Number(m[1]);
    let d = dataValida(ay, am, dia);
    if (!d || d < ref) { const prox = am === 12 ? [ay + 1, 1] : [ay, am + 1]; d = dataValida(prox[0], prox[1], dia); }
    if (d) return d;
  }
  return null;
}

/** Próximo dia de aula depois de `data` (pula fim de semana e dias livres). */
export function proximoDiaUtil(data, livres = []) {
  let d = addDays(data, 1);
  for (let i = 0; i < 14 && (!isWeekday(d) || livres.includes(d)); i++) d = addDays(d, 1);
  return d;
}

const RE_MARCADOR_EMOJI = /^[\s\-•·▪▫◦►➡>#*_~]*(?:[\p{Extended_Pictographic}️‍]+[\s\-•*_~]*)*/u;
const limparLinha = (l) => l.replace(/ /g, ' ').replace(/[*_~]+/g, '').replace(/\s+/g, ' ').trim();

const tipoPelaFrase = (f) => {
  const t = norm(f);
  if (/redacao|producao (de )?textos?|producao textual|(escreva|elabore|produza|crie|redija) (um|uma) (texto|carta|paragrafo|resumo|conto|historia|poema|bilhete|relato|narrativa)/.test(t)) return 'redacao';
  if (/verdadeiro ou falso|\(\s*v\s*\)|\(\s*f\s*\)/.test(t)) return 'vf';
  if (/\d\s*[x×*+÷\/-]\s*\d|calcule|resolva|efetue|quanto (e|vale|da|sao)/.test(t)) return 'calculo';
  return 'aberta';
};

let _n = 0;
const idItem = () => `i${Date.now().toString(36)}${(_n++).toString(36)}`;

/** Transforma linhas em questões: “1) …”, “2. …”, “a) …” (alternativas) e listas com marcador. */
export function extrairItens(linhas) {
  const itens = [];
  const sobra = [];
  let atual = null;
  const novo = (txt) => { atual = { id: idItem(), enunciado: txt, tipo: 'aberta', opcoes: [], gabarito: '', resposta: '', anexos: [], correcao: { res: null, comentario: '', tipoErro: null } }; itens.push(atual); };
  const numeradas = linhas.filter((l) => /^\d{1,3}\s*[)\.\-–:º°]+\s*\S/.test(l)).length;
  const marcadas = linhas.filter((l) => /^[-•·▪▫◦►➡✔✅☑]+\s*\S/.test(l)).length;
  for (const l of linhas) {
    let m;
    if ((m = l.match(/^(\d{1,3})\s*[)\.\-–:º°]+\s*(\S.*)$/))) novo(m[2]);
    else if ((m = l.match(/^([a-hA-H])\s*[)\.]\s*(\S.*)$/)) && atual && numeradas) atual.opcoes.push(m[2]);
    else if ((m = l.match(/^([a-hA-H])\s*[)\.]\s*(\S.*)$/)) && !numeradas) novo(m[2]);
    else if (marcadas >= 2 && (m = l.match(/^[-•·▪▫◦►➡✔✅☑]+\s*(\S.*)$/))) novo(m[1]);
    else if (atual && (numeradas || marcadas >= 2) && !/^(p[aá]g|cap|livro|apostila)/i.test(l)) atual.enunciado += ' ' + l;
    else sobra.push(l);
  }
  for (const it of itens) {
    it.tipo = it.opcoes.length >= 2 ? 'objetiva' : tipoPelaFrase(it.enunciado);
    it.enunciado = it.enunciado.trim();
  }
  return { itens, sobra };
}

/** Tira do fim da frase o “para sexta”, “entregar dia 8”… (o prazo vai para o campo próprio). */
const tirarFraseDePrazo = (l) => l.replace(/[\s,;(]*\b(?:para|pra|entregar|entrega|até|ate)\s+(?:o\s+dia\s+|dia\s+)?(?:amanhã|amanha|hoje|depois de amanhã|segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|\d{1,2}[\/.]\d{1,2}(?:[\/.]\d{2,4})?|\d{1,2})\)?[\s.!]*$/i, '').trim();

const resumo = (t, max = 70) => { const s = t.replace(/[.:;,\s]+$/, ''); return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s; };

/**
 * @param {string} texto  mensagem colada
 * @param {string} hoje   AAAA-MM-DD
 * @param {{livres?: string[]}} opts
 * @returns {{tarefas: Array, dataMensagem: string|null, avisos: string[]}}
 */
export function analisarMensagem(texto, hoje, { livres = [] } = {}) {
  const avisos = [];
  const bruto = String(texto || '').replace(/\r/g, '').split('\n');
  let dataMensagem = null;
  const linhas = [];
  for (const b of bruto) {
    const p = tirarPrefixoWhatsApp(b.trim());
    if (p.dia && !dataMensagem) { const d = dataValida(p.ano || Number(hoje.slice(0, 4)), p.mes, p.dia); if (d) dataMensagem = d; }
    const l = limparLinha(p.linha);
    if (l) linhas.push({ original: p.linha, limpa: l.replace(RE_MARCADOR_EMOJI, (m) => (/\d|[a-zA-Z]/.test(m) ? m : '')).trim() || l });
  }
  if (!linhas.length) return { tarefas: [], dataMensagem, avisos: ['Nada para analisar: cole o texto da mensagem.'] };
  const ref = dataMensagem || hoje;

  // 1) divide em blocos por cabeçalho de disciplina
  const blocos = [];
  let atual = { disc: null, discTexto: '', linhas: [] };
  const preambulo = [];
  for (const { limpa } of linhas) {
    const m = norm(limpa).match(RE_CABECALHO);
    if (m) {
      const disc = TODOS.find(([a]) => a === m[1])[1];
      if (atual.linhas.length || atual.disc) blocos.push(atual);
      const resto = limpa.slice(m[1].length).replace(/^[\s:.\-–—)]+/, '');
      atual = { disc, discTexto: limpa.slice(0, m[1].length), linhas: resto ? [resto] : [] };
    } else if (!atual.disc && !blocos.length) preambulo.push(limpa);
    else atual.linhas.push(limpa);
  }
  if (atual.disc || atual.linhas.length) blocos.push(atual);

  // sem cabeçalhos: um bloco só, com a disciplina mencionada (se houver uma só)
  if (!blocos.length || (blocos.length === 1 && !blocos[0].disc)) {
    const todas = linhas.map((l) => l.limpa);
    const citadas = new Set((todas.join(' ').match(RE_NOME_COMPLETO) || []).map((x) => APELIDOS.find(([, as]) => as.includes(norm(x)))?.[0]).filter(Boolean));
    blocos.length = 0;
    blocos.push({ disc: citadas.size === 1 ? [...citadas][0] : null, discTexto: '', linhas: todas });
    preambulo.length = 0;
  }

  const prazoGeral = acharPrazo(preambulo.join(' '), ref);
  const tarefas = [];
  for (const b of blocos) {
    // linhas "para quinta / entregar dia 8" não são questões
    const meta = [];
    const corpo = [];
    for (const l of b.linhas) (/^(entrega|entregar|para|pra|prazo|ate|devolver)\b/i.test(norm(l)) && acharPrazo(l, ref) && l.length < 60 ? meta : corpo).push(l);
    const prazo = acharPrazo(meta.join(' ') + ' ' + corpo.join(' '), ref) || prazoGeral;
    const { itens, sobra } = extrairItens(corpo.map(tirarFraseDePrazo).filter(Boolean));
    const discNome = b.disc || 'Outra';
    const textoLivre = (itens.length ? sobra : corpo.map(tirarFraseDePrazo).filter(Boolean));
    const descricao = textoLivre.join('\n').trim();
    const ehRedacao = itens.some((i) => i.tipo === 'redacao') || norm(b.discTexto) === 'redacao' || (!itens.length && tipoPelaFrase(descricao) === 'redacao');
    let titulo;
    if (textoLivre[0]) titulo = resumo(textoLivre[0]);
    else titulo = itens.length === 1 ? '1 questão' : `${itens.length} questões`;
    if (ehRedacao && !/^reda/.test(norm(titulo))) titulo = `Redação: ${titulo}`;
    const tudo = norm([...corpo, ...meta].join(' '));
    const itensFinal = ehRedacao && !itens.length
      ? [{ id: idItem(), enunciado: descricao || titulo, tipo: 'redacao', opcoes: [], gabarito: '', resposta: '', anexos: [], correcao: { res: null, comentario: '', tipoErro: null } }]
      : itens;
    const t = {
      disciplina: discNome,
      rotuloOriginal: b.disc === 'Outra' ? b.discTexto : '', // ex.: “Artes”, “Ed. Física”
      titulo,
      descricao,
      itens: itensFinal,
      entrega: prazo || proximoDiaUtil(ref, livres),
      entregaDetectada: !!prazo,
      pesquisas: acharTemasDePesquisa([...corpo, ...meta].join('\n')),
      origem: /apostila/.test(tudo) ? 'apostila' : /livro|\bpag/.test(tudo) ? 'livro' : 'whatsapp',
    };
    if (!b.disc) avisos.push('Não reconheci a disciplina de uma das tarefas — escolha na revisão.');
    tarefas.push(t);
  }
  if (tarefas.length && !tarefas.some((t) => t.entregaDetectada)) avisos.push(`Não achei o prazo na mensagem: usei o próximo dia de aula (${tarefas[0].entrega.split('-').reverse().join('/')}). Confira.`);
  return { tarefas, dataMensagem, avisos: [...new Set(avisos)] };
}
