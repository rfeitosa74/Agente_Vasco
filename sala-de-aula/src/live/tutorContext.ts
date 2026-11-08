import type { FunctionDeclaration } from '@google/genai';
import { describeBoard } from '../../shared/board.js';
import type { Analise, BoardState, Conceito, Mensagem } from '../types';

export const TUTOR_TOOLS: FunctionDeclaration[] = [
  {
    name: 'mostrar_conceito',
    description: 'Seleciona outro conceito do caderno; o quadro e o contexto passam a ser desse conceito. Use quando o aluno quiser estudar outro conceito da lista.',
    parametersJsonSchema: {
      type: 'object',
      properties: { conceito_id: { type: 'string', description: 'id do conceito (da lista de conceitos do material)' } },
      required: ['conceito_id'],
    },
  },
  {
    name: 'destacar_no_quadro',
    description: 'Destaca (faz brilhar) elementos que JÁ EXISTEM no quadro atual, para apontar algo enquanto explica.',
    parametersJsonSchema: {
      type: 'object',
      properties: { ids: { type: 'array', items: { type: 'string' }, description: 'ids dos elementos do quadro atual' } },
      required: ['ids'],
    },
  },
  {
    name: 'atualizar_quadro',
    description:
      'Gera uma nova representação no quadro para o conceito atual (desenho, comparação, processo, gráfico ou esquema). Demora alguns segundos. Só diga que o quadro mudou depois de receber ok=true.',
    parametersJsonSchema: {
      type: 'object',
      properties: { pedido: { type: 'string', description: 'O que o novo quadro deve mostrar, de forma específica.' } },
      required: ['pedido'],
    },
  },
  {
    name: 'criar_infografico',
    description:
      'Inicia a geração de um infográfico (imagem) com o Nano Banana Pro sobre a dúvida do aluno. A geração continua em segundo plano; o aplicativo avisará quando a imagem estiver pronta ou se der erro. Não diga que ficou pronto antes desse aviso.',
    parametersJsonSchema: {
      type: 'object',
      properties: { duvida: { type: 'string', description: 'A dúvida ou o foco do infográfico.' } },
      required: ['duvida'],
    },
  },
  {
    name: 'abrir_agora_eu_explico',
    description: 'Abre a atividade "Agora eu explico", em que o aluno explica o conceito atual com as próprias palavras e recebe uma avaliação.',
    parametersJsonSchema: { type: 'object', properties: {} },
  },
];

export interface TutorCtx {
  analise: Analise | null;
  conceito: Conceito | null;
  boardState: BoardState | null;
  highlights: string[];
  mensagens: Mensagem[];
  infografico: string; // descrição do infográfico atual, se houver
  nivel: string;
}

export function buildSystemInstruction(c: TutorCtx): string {
  const a = c.analise;
  const linhas: string[] = [
    'Você é o tutor por voz da "Minha sala de aula". Fala com um aluno de cerca de 11 anos, do fim do 6º ano do ensino fundamental, no Brasil.',
    'Fale SEMPRE em português do Brasil, com respostas BREVES (2 a 4 frases), didáticas e acolhedoras. Faça uma pergunta de cada vez para checar a compreensão. Adapte o nível se o aluno pedir algo mais simples ou mais avançado.',
    'Baseie-se no material de estudo descrito abaixo. Se usar algo que não está no material, diga isso. Não invente fatos.',
    'Você NÃO vê a tela. Tudo o que está na tela é descrito aqui e atualizado pelo aplicativo.',
    'Ferramentas: use destacar_no_quadro para apontar elementos existentes; atualizar_quadro para mudar o desenho; mostrar_conceito para trocar de conceito; criar_infografico quando o aluno pedir um infográfico; abrir_agora_eu_explico quando ele quiser explicar com as próprias palavras.',
    'Só diga que algo mudou na tela depois que a ferramenta devolver ok=true. Se devolver erro, explique de forma simples que não deu certo.',
    'Mensagens que começam com "[Aplicativo]" são avisos do sistema, não falas do aluno.',
  ];
  if (c.nivel) linhas.push(`Nível de explicação pedido pelo aluno: ${c.nivel}.`);
  if (a) {
    linhas.push('', `MATERIAL: "${a.titulo}"${a.disciplina ? ` (${a.disciplina})` : ''}`, `Resumo: ${a.resumo}`);
    linhas.push('Conceitos do caderno (id — nome):');
    for (const k of a.conceitos) linhas.push(`- ${k.id} — ${k.nome}${k.paginas.length ? ` (p. ${k.paginas.join(', ')})` : ''}`);
  }
  if (c.conceito) {
    const k = c.conceito;
    linhas.push(
      '',
      `CONCEITO SELECIONADO AGORA: ${k.nome} (id ${k.id})`,
      `Pergunta central: ${k.perguntaCentral}`,
      `O que o material diz: ${k.conteudo}`
    );
    if (k.figuras.length) linhas.push(`Figuras no material: ${k.figuras.map((f) => `${f.pagina ? `p. ${f.pagina}: ` : ''}${f.descricao}`).join('; ')}`);
  }
  linhas.push('', 'QUADRO NA TELA AGORA:', c.boardState ? describeBoard(c.boardState.board) : 'Ainda carregando ou vazio.');
  if (c.highlights.length) linhas.push(`Elementos destacados agora: ${c.highlights.join(', ')}`);
  if (c.infografico) linhas.push('', `INFOGRÁFICO NA TELA: ${c.infografico}`);
  const recentes = c.mensagens.slice(-6);
  if (recentes.length) {
    linhas.push('', 'AÇÕES RECENTES DO ALUNO NA TELA (por escrito ou pelos atalhos):');
    for (const m of recentes) linhas.push(`- ${m.papel === 'aluno' ? 'Aluno' : 'Resposta mostrada'}: ${m.texto.slice(0, 400)}`);
  }
  return linhas.join('\n');
}
