// Instruções e esquemas JSON usados nas chamadas ao Gemini.
import { NOMES_CORES, KINDS } from '../shared/board.js';

export const PUBLICO =
  'O aluno tem cerca de 11 anos e está no fim do 6º ano do ensino fundamental, no Brasil. ' +
  'Escreva em português do Brasil, com frases curtas, vocabulário acessível e tom acolhedor, sem infantilizar. ' +
  'Seja preciso: nunca invente fatos que contradigam o material; quando usar conhecimento que não está no material, deixe isso claro.';

// ---------------------------------------------------------------------------
// Análise do documento
// ---------------------------------------------------------------------------

export const ANALISE_SCHEMA = {
  type: 'object',
  properties: {
    analisavel: { type: 'boolean', description: 'false se o material estiver ilegível, vazio ou não tiver conteúdo de estudo.' },
    motivoNaoAnalisavel: { type: 'string' },
    titulo: { type: 'string', description: 'Título curto do material, tirado do próprio conteúdo.' },
    disciplina: { type: 'string' },
    resumo: { type: 'string', description: 'Resumo breve (3 a 5 frases) do que o material ensina.' },
    secoes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          titulo: { type: 'string', description: 'Título da seção como aparece no material (ou descrição curta se não houver título).' },
          paginaInicio: { type: 'integer' },
          paginaFim: { type: 'integer' },
          inicio: { type: 'string', description: 'Só para áudio/vídeo: momento em que a parte começa, no formato mm:ss.' },
        },
        required: ['id', 'titulo'],
      },
    },
    conceitos: {
      type: 'array',
      minItems: 1,
      maxItems: 10,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'identificador curto, sem espaços (ex.: eclipse_solar)' },
          nome: { type: 'string' },
          resumo: { type: 'string', description: 'Uma ou duas frases simples.' },
          paginas: { type: 'array', items: { type: 'integer' }, description: 'Páginas do PDF onde o conceito aparece. Vazio se o material não tiver páginas.' },
          secoes: { type: 'array', items: { type: 'string' }, description: 'ids das seções onde o conceito aparece.' },
          conteudo: {
            type: 'string',
            description: 'O que o material diz sobre o conceito, fielmente: definições, dados, números, exemplos e relações (80 a 220 palavras).',
          },
          figuras: {
            type: 'array',
            items: {
              type: 'object',
              properties: { pagina: { type: 'integer' }, descricao: { type: 'string' } },
              required: ['descricao'],
            },
            description: 'Figuras do material relacionadas ao conceito.',
          },
          tempos: { type: 'array', items: { type: 'string' }, description: 'Só para áudio/vídeo: momentos (mm:ss) em que o conceito é explicado.' },
          perguntaCentral: { type: 'string', description: 'A pergunta principal que o aluno deve conseguir responder sobre o conceito.' },
          representacao: { type: 'string', enum: KINDS, description: 'Representação visual mais adequada.' },
          motivoRepresentacao: { type: 'string' },
        },
        required: ['id', 'nome', 'resumo', 'conteudo', 'perguntaCentral', 'representacao'],
      },
    },
  },
  required: ['analisavel', 'titulo', 'resumo', 'conceitos'],
};

const REFERENCIAS_MIDIA = {
  imagem:
    'O material é uma IMAGEM (por exemplo, foto de caderno, livro ou lousa). Leia todo o texto e os desenhos dela. Não há páginas: deixe "paginas" vazio e use as partes da imagem (títulos, quadros, tópicos) como seções. Se a foto estiver ilegível, responda analisavel=false.',
  audio:
    'O material é um ÁUDIO (por exemplo, aula gravada). Use o que é realmente falado. Não há páginas: deixe "paginas" vazio. Em "tempos", indique os momentos (mm:ss) em que cada conceito é explicado, e em cada seção o "inicio" (mm:ss). Não invente momentos fora da duração.',
  video:
    'O material é um VÍDEO (por exemplo, videoaula). Use o que é falado e o que aparece na tela (lousa, slides, desenhos). Não há páginas: deixe "paginas" vazio. Em "tempos", indique os momentos (mm:ss) em que cada conceito é explicado, e em cada seção o "inicio" (mm:ss). Não invente momentos fora da duração.',
};

export function analisePrompt({ temPaginas, numPaginas, nomeArquivo, midia = '', duracao = '' }) {
  return `Analise o material de estudo anexado${nomeArquivo ? ` ("${nomeArquivo}")` : ''} e prepare uma aula sobre ele.

${PUBLICO}

Regras:
- Use apenas o conteúdo REAL do material. Leia também as figuras, tabelas e legendas quando houver.
- Identifique de 3 a 8 conceitos principais (no máximo 10), na ordem em que fazem sentido para estudar.
- ${
    midia
      ? `${REFERENCIAS_MIDIA[midia]}${duracao ? ` Duração total: ${duracao}.` : ''}`
      : temPaginas
      ? `O material é um PDF com ${numPaginas} páginas. Indique em "paginas" os números reais das páginas (de 1 a ${numPaginas}) onde cada conceito aparece. Não invente páginas.`
      : 'O material NÃO tem páginas (são anotações em texto). Deixe "paginas" vazio e use as seções (títulos ou partes do texto) como referência. Não invente numeração de páginas.'
  }
- Em "conteudo", registre fielmente o que o material diz: é esse texto que o tutor vai usar depois.
- Escolha a representação visual que ajuda a responder à pergunta central:
  • "desenho": objetos, fenômenos físicos ou espaciais (posições, formas, partes com legendas);
  • "comparacao": quando o essencial é contrastar 2 a 4 coisas;
  • "processo": somente quando há uma sequência real de etapas no tempo ou de causa e efeito;
  • "grafico": quando o material traz dados numéricos;
  • "relacoes": conceitos ligados entre si (partes de um todo, causas, classificações);
  • "texto": apenas quando nenhuma das anteriores ajudaria.
  Conceitos relacionados NÃO são etapas de um processo.
- Se o material estiver ilegível, vazio ou não for material de estudo, responda analisavel=false e explique o motivo. Não preencha com conteúdo inventado.`;
}

// ---------------------------------------------------------------------------
// Representação do quadro
// ---------------------------------------------------------------------------

const ELEMENTO_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'id curto e único, ex.: sol, lua, umbra' },
    tipo: { type: 'string', enum: ['circulo', 'elipse', 'retangulo', 'linha', 'seta', 'poligono', 'texto'] },
    x: { type: 'number' },
    y: { type: 'number' },
    r: { type: 'number' },
    rx: { type: 'number' },
    ry: { type: 'number' },
    w: { type: 'number' },
    h: { type: 'number' },
    x2: { type: 'number' },
    y2: { type: 'number' },
    rotacao: { type: 'number' },
    pontos: { type: 'array', items: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, required: ['x', 'y'] } },
    texto: { type: 'string', description: 'Somente para tipo "texto".' },
    tamanho: { type: 'number', description: 'Tamanho da fonte do tipo "texto" (18 a 36).' },
    cor: { type: 'string', enum: NOMES_CORES },
    preenchido: { type: 'boolean' },
    tracejado: { type: 'boolean' },
    espessura: { type: 'number' },
    opacidade: { type: 'number' },
    camada: { type: 'integer', description: 'Ordem de desenho: valores maiores ficam por cima.' },
    rotulo: { type: 'string', description: 'Legenda curta (até 4 palavras).' },
    rotuloX: { type: 'number' },
    rotuloY: { type: 'number' },
    corRotulo: { type: 'string', enum: NOMES_CORES },
  },
  required: ['id', 'tipo'],
};

export const BOARD_SCHEMA = {
  type: 'object',
  properties: {
    tipo: { type: 'string', enum: KINDS },
    pergunta: { type: 'string', description: 'A pergunta específica que esta representação ajuda a responder.' },
    titulo: { type: 'string', description: 'Título específico (nada genérico como "Entendendo o conceito").' },
    explicacao: { type: 'string', description: '2 a 4 frases que acompanham o quadro e explicam o que ele mostra.' },
    legendaGeral: { type: 'string', description: 'Ex.: "Fora de escala" quando tamanhos e distâncias não são reais.' },
    fontes: { type: 'array', items: { type: 'string' }, description: 'Referências ao material: "p. 3" (só se houver páginas) ou o nome da seção.' },
    desenho: { type: 'object', properties: { elementos: { type: 'array', items: ELEMENTO_SCHEMA } } },
    comparacao: {
      type: 'object',
      properties: {
        colunas: {
          type: 'array',
          items: { type: 'object', properties: { id: { type: 'string' }, titulo: { type: 'string' }, cor: { type: 'string', enum: NOMES_CORES } }, required: ['id', 'titulo'] },
        },
        aspectos: {
          type: 'array',
          items: {
            type: 'object',
            properties: { id: { type: 'string' }, aspecto: { type: 'string' }, valores: { type: 'array', items: { type: 'string' } } },
            required: ['id', 'aspecto', 'valores'],
          },
        },
      },
    },
    processo: {
      type: 'object',
      properties: {
        ciclico: { type: 'boolean' },
        etapas: {
          type: 'array',
          items: { type: 'object', properties: { id: { type: 'string' }, titulo: { type: 'string' }, detalhe: { type: 'string' } }, required: ['id', 'titulo', 'detalhe'] },
        },
      },
    },
    grafico: {
      type: 'object',
      properties: {
        tipo: { type: 'string', enum: ['barras', 'linha'] },
        eixoX: { type: 'string' },
        eixoY: { type: 'string' },
        unidade: { type: 'string' },
        dadosIlustrativos: { type: 'boolean', description: 'true se os valores não vierem do material.' },
        series: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              nome: { type: 'string' },
              cor: { type: 'string', enum: NOMES_CORES },
              pontos: { type: 'array', items: { type: 'object', properties: { x: { type: 'string' }, y: { type: 'number' } }, required: ['x', 'y'] } },
            },
            required: ['id', 'nome', 'pontos'],
          },
        },
      },
    },
    relacoes: {
      type: 'object',
      properties: {
        nos: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, rotulo: { type: 'string' }, central: { type: 'boolean' } }, required: ['id', 'rotulo'] } },
        ligacoes: {
          type: 'array',
          items: { type: 'object', properties: { id: { type: 'string' }, de: { type: 'string' }, para: { type: 'string' }, rotulo: { type: 'string' } }, required: ['id', 'de', 'para'] },
        },
      },
    },
    texto: {
      type: 'object',
      properties: {
        blocos: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, titulo: { type: 'string' }, texto: { type: 'string' } }, required: ['id', 'titulo', 'texto'] } },
      },
    },
    cartoes: {
      type: 'array',
      maxItems: 3,
      items: { type: 'object', properties: { id: { type: 'string' }, titulo: { type: 'string' }, texto: { type: 'string' } }, required: ['id', 'titulo', 'texto'] },
      description: 'Até 3 cartões curtos que COMPLEMENTAM a representação (não a substituem).',
    },
    figuraOriginal: {
      type: 'object',
      properties: { pagina: { type: 'integer' }, motivo: { type: 'string' } },
      description: 'Página do PDF com uma figura original útil para conferir este conceito.',
    },
  },
  required: ['tipo', 'pergunta', 'titulo', 'explicacao'],
};

export const REGRAS_QUADRO = `Regras do quadro (lousa verde, área de 1000 x 560; x cresce para a direita e y para baixo):
- Escolha a representação que melhor responde à pergunta: desenho com legendas, comparação, processo, gráfico, esquema de relações ou texto (último recurso). Não transforme tudo em cartões de texto. Não apresente conceitos relacionados como se fossem etapas.
- Preencha apenas o objeto correspondente ao tipo escolhido ("desenho", "comparacao", "processo", "grafico", "relacoes" ou "texto").
- Se o pedido do aluno for por uma explicação visual, use um desenho ou esquema; cartões só complementam.
- Precisão acima de decoração. Confira posições, ordem dos objetos, sentido das setas, legendas e relações com o material.
- Física e geometria corretas: a luz parte da fonte luminosa; uma sombra fica ATRÁS do objeto que bloqueia a luz, no sentido oposto ao da fonte, partindo das bordas do objeto. Regiões diferentes (ex.: umbra e penumbra) devem ser polígonos diferentes, com cores diferentes ("sombraEscura" para a sombra total, "sombraClara" para a parcial) e legendas próprias. A sombra parcial envolve a total.
- Quando tamanhos ou distâncias não estão em escala, coloque legendaGeral "Fora de escala".
- Desenho: use no máximo 16 elementos, grandes e bem distribuídos por toda a área (evite espaços vazios). Margem mínima de 30 em todas as bordas. Legendas curtas (até 4 palavras); defina rotuloX/rotuloY quando a posição automática (logo abaixo do elemento) puder sobrepor outra legenda ou objeto. Legendas não podem se sobrepor nem sair da área.
- Use "camada" para a ordem: fundo (0), sombras (1–2), objetos (3), setas e textos (4).
- Ângulos e inclinações: desenhe a inclinação de verdade (ex.: duas órbitas como elipses com "rotacao" diferente, ou linhas com ângulo marcado), não apenas um cartão com a definição.
- Comparação: 2 a 4 colunas; cada aspecto tem exatamente um valor por coluna.
- Processo: só para sequências reais; cíclico apenas se a última etapa leva de volta à primeira.
- Gráfico: use dados do material; se precisar de valores ilustrativos, marque dadosIlustrativos=true.
- "pergunta" e "titulo" devem ser específicos do conceito. Nada de frases de preenchimento.
- Fontes: "p. N" apenas se o material tiver páginas; para áudio/vídeo, o momento no formato mm:ss; caso contrário, o nome da seção. Não invente numeração nem momentos.
- Use figuraOriginal quando houver no PDF uma figura que ajude a conferir o conceito.`;

export function boardPrompt({ conceito, temPaginas, pedido, quadroAtual, contextoExtra }) {
  return `Crie a representação do quadro para o conceito abaixo, a partir do material anexado.

${PUBLICO}

CONCEITO: ${conceito.nome}
Resumo: ${conceito.resumo}
O que o material diz: ${conceito.conteudo}
Pergunta central: ${conceito.perguntaCentral}
${conceito.figuras?.length ? `Figuras do material: ${conceito.figuras.map((f) => `${f.pagina ? `p. ${f.pagina}: ` : ''}${f.descricao}`).join('; ')}` : ''}
${temPaginas ? `Páginas: ${(conceito.paginas || []).join(', ') || 'não informadas'}` : conceito.tempos?.length ? `O material é um áudio/vídeo; momentos em que o conceito aparece: ${conceito.tempos.join(', ')}. Nas fontes, use esses momentos (mm:ss).` : 'O material não tem páginas.'}
Representação sugerida na análise: ${conceito.representacao}
${quadroAtual ? `\nQUADRO ATUAL (o aluno já viu este):\n${quadroAtual}\n` : ''}
${pedido ? `PEDIDO DO ALUNO/TUTOR PARA ESTA ATUALIZAÇÃO: ${pedido}\nAtenda ao pedido mantendo a precisão. Se o pedido for de uma visão diferente, mude a abordagem.` : ''}
${contextoExtra || ''}

${REGRAS_QUADRO}`;
}

export const REVISAO_SCHEMA = {
  type: 'object',
  properties: {
    aprovado: { type: 'boolean', description: 'true se o quadro estiver correto e legível como está.' },
    confiavel: { type: 'boolean', description: 'false se não for possível ter uma representação visual confiável deste conceito.' },
    problemas: { type: 'array', items: { type: 'string' }, description: 'Cada problema com a correção necessária, de forma específica.' },
  },
  required: ['aprovado', 'confiavel', 'problemas'],
};

export function revisaoPrompt({ conceito, descricao, problemasAuto, temImagem }) {
  return `Você é um revisor rigoroso de material didático. Confira se a representação do quadro está correta em relação ao material anexado e ao conceito.

CONCEITO: ${conceito.nome}
O que o material diz: ${conceito.conteudo}

REPRESENTAÇÃO (dados):
${descricao}
${temImagem ? '\nA imagem anexada mostra como o quadro está sendo desenhado agora.' : ''}
${problemasAuto.length ? `\nProblemas detectados automaticamente:\n- ${problemasAuto.join('\n- ')}` : ''}

Confira:
1. As posições e a ordem dos objetos correspondem ao fenômeno e ao material?
2. Setas e sombras apontam no sentido correto (sombras atrás do objeto que bloqueia a luz, no sentido oposto à fonte)?
3. Cada legenda está no elemento certo, sem se sobrepor a outras e sem ficar cortada?
4. Regiões diferentes aparecem como regiões diferentes, com legendas coerentes?
5. A explicação escrita bate com o desenho? A pergunta e o título são específicos?
6. É o tipo de representação adequado (conceitos relacionados não são etapas)?

Se houver qualquer erro, aprovado=false e liste cada problema junto com a correção necessária (ex.: "a umbra deve começar na Lua e ir em direção à Terra, não ao Sol"). Se estiver tudo certo, aprovado=true e problemas vazio. Se não for possível desenhar este conceito de forma confiável, confiavel=false.
Não aponte problemas inexistentes.

${REGRAS_QUADRO}`;
}

// ---------------------------------------------------------------------------
// Perguntas e atalhos
// ---------------------------------------------------------------------------

export const ACOES = {
  nao_entendi:
    'O aluno disse "Não entendi esta parte". Explique de novo o conceito atual de forma mais simples, em pequenos passos, partindo do que ele provavelmente já sabe. Identifique o ponto que costuma causar confusão.',
  outra_maneira:
    'O aluno pediu "Explique de outra maneira". Use uma abordagem DIFERENTE das explicações anteriores (analogia, outra perspectiva, outro tipo de representação). Não repita a mesma explicação com outras palavras.',
  exemplo:
    'O aluno pediu "Dê um exemplo do dia a dia". Dê um exemplo concreto, do cotidiano de uma criança brasileira de 11 anos, que mostre o conceito atual funcionando, e ligue o exemplo de volta ao conceito.',
  e_se:
    'O aluno perguntou "O que acontece se mudarmos isso?". Escolha UMA variável importante do conceito atual (posição, tamanho, quantidade, ordem, etc.), diga claramente o que muda e explique a consequência. Atualizar o quadro costuma ajudar aqui.',
  pergunta: 'Responda à pergunta do aluno sobre o conceito atual.',
};

export const RESPOSTA_SCHEMA = {
  type: 'object',
  properties: {
    resposta: { type: 'string', description: 'Resposta para o aluno (3 a 7 frases curtas; pode usar listas simples com "- ").' },
    atualizarQuadro: { type: 'boolean', description: 'true se uma nova representação no quadro ajudaria a entender esta resposta.' },
    pedidoParaQuadro: { type: 'string', description: 'Se atualizarQuadro=true, descreva o que o novo quadro deve mostrar.' },
    destacar: { type: 'array', items: { type: 'string' }, description: 'ids de elementos do quadro ATUAL que vale destacar (se não houver atualização).' },
  },
  required: ['resposta', 'atualizarQuadro'],
};

export function perguntaPrompt({ conceito, acao, pergunta, historico, quadroAtual, temPaginas, nivel }) {
  const hist = (historico || [])
    .slice(-8)
    .map((h) => `${h.papel === 'aluno' ? 'Aluno' : 'Tutor'}: ${h.texto}`)
    .join('\n');
  return `Você é o tutor de uma sala de aula virtual.

${PUBLICO}

CONCEITO ATUAL: ${conceito.nome}
O que o material diz: ${conceito.conteudo}
${temPaginas && conceito.paginas?.length ? `Páginas: ${conceito.paginas.join(', ')}` : ''}

QUADRO ATUAL:
${quadroAtual || 'vazio'}

${hist ? `CONVERSA ANTERIOR SOBRE ESTE MATERIAL:\n${hist}\n` : ''}
TAREFA: ${ACOES[acao] || ACOES.pergunta}
${pergunta ? `Pergunta/fala do aluno: "${pergunta}"` : ''}

${nivel ? `NÍVEL PEDIDO PELO ALUNO: ${nivel}.\n` : ''}Responda de forma breve e didática, sobre o conceito atual. Baseie-se no material; se usar algo que não está nele, diga isso.
Não diga que alterou o quadro: a aplicação mostrará isso se o quadro for realmente atualizado.
Indique atualizarQuadro=true somente se um novo desenho ou esquema ajudar de verdade a entender a resposta.`;
}

// ---------------------------------------------------------------------------
// Agora eu explico
// ---------------------------------------------------------------------------

export const PERGUNTA_ABERTA_SCHEMA = {
  type: 'object',
  properties: { pergunta: { type: 'string' } },
  required: ['pergunta'],
};

export function perguntaAbertaPrompt({ conceito }) {
  return `Crie UMA pergunta aberta para que o aluno explique, com as próprias palavras, o conceito "${conceito.nome}".
O que o material diz: ${conceito.conteudo}
${PUBLICO}
A pergunta deve pedir explicação (como/por quê), não uma definição decorada nem uma resposta de sim/não. Uma ou duas frases.`;
}

export const AVALIACAO_SCHEMA = {
  type: 'object',
  properties: {
    entendeuCorretamente: { type: 'array', items: { type: 'string' }, description: 'Ideias que o aluno explicou corretamente (pode ser vazio).' },
    faltou: { type: 'array', items: { type: 'string' }, description: 'Ideias importantes do material que não apareceram (pode ser vazio).' },
    confundiu: {
      type: 'array',
      items: {
        type: 'object',
        properties: { trecho: { type: 'string', description: 'O que o aluno disse' }, problema: { type: 'string' } },
        required: ['trecho', 'problema'],
      },
      description: 'Erros ou confusões presentes na resposta (pode ser vazio).',
    },
    correcao: { type: 'string', description: 'Correção breve e específica, ou um próximo passo se não houver erro.' },
    situacao: { type: 'string', enum: ['completa', 'boa_com_lacunas', 'parcial', 'com_confusoes', 'fora_do_tema', 'sem_conteudo'] },
    comentario: { type: 'string', description: 'Uma frase honesta sobre a explicação, sem elogio automático.' },
  },
  required: ['entendeuCorretamente', 'faltou', 'confundiu', 'correcao', 'situacao', 'comentario'],
};

export function avaliacaoPrompt({ conceito, pergunta, resposta }) {
  return `Avalie a explicação que um aluno deu, com as próprias palavras, sobre um conceito.

${PUBLICO}

CONCEITO: ${conceito.nome}
O que o material diz: ${conceito.conteudo}
PERGUNTA FEITA AO ALUNO: ${pergunta}
RESPOSTA DO ALUNO (pode ter vindo de transcrição de voz, ignore erros de digitação e de transcrição):
"""
${resposta}
"""

Regras:
- Avalie o SIGNIFICADO em relação ao material, não palavras exatas. Sinônimos e explicações informais corretas contam como certas.
- Liste apenas o que de fato está na resposta. Não invente erros; não elogie automaticamente.
- Se a resposta estiver vazia, sem sentido ou fora do tema, diga isso com gentileza (situacao "sem_conteudo" ou "fora_do_tema").
- "faltou" inclui só ideias centrais para responder à pergunta, não todos os detalhes do material.
- A correção deve ser curta, específica e no nível de um aluno do 6º ano.`;
}

// ---------------------------------------------------------------------------
// Infográfico
// ---------------------------------------------------------------------------

export const DIRECAO_SCHEMA = {
  type: 'object',
  properties: {
    perguntaPrincipal: { type: 'string' },
    titulo: { type: 'string', description: 'Título breve (até 7 palavras).' },
    ilustracaoPrincipal: { type: 'string', description: 'Descrição precisa da ilustração principal grande: objetos, posições, setas, regiões.' },
    secoes: {
      type: 'array',
      maxItems: 3,
      items: { type: 'object', properties: { titulo: { type: 'string' }, conteudo: { type: 'string' } }, required: ['titulo', 'conteudo'] },
    },
    legendas: { type: 'array', items: { type: 'string' }, description: 'Legendas curtas que devem aparecer na imagem (texto exato em português).' },
    conclusao: { type: 'string', description: 'Conclusão simples, uma frase curta.' },
    paleta: { type: 'string', description: 'Cores consistentes e o papel de cada uma.' },
    notaEscala: { type: 'string', description: 'Ex.: "Fora de escala", quando aplicável. Vazio se não se aplica.' },
    cuidadosCientificos: { type: 'array', items: { type: 'string' }, description: 'Pontos que a imagem precisa respeitar para estar correta.' },
  },
  required: ['perguntaPrincipal', 'titulo', 'ilustracaoPrincipal', 'secoes', 'legendas', 'conclusao', 'paleta', 'cuidadosCientificos'],
};

export function direcaoPrompt({ conceito, duvida, quadroAtual }) {
  return `Prepare a direção visual de um infográfico didático sobre o conceito abaixo, baseado no material anexado e na dúvida do aluno.

${PUBLICO}

CONCEITO: ${conceito.nome}
O que o material diz: ${conceito.conteudo}
DÚVIDA / PEDIDO DO ALUNO: ${duvida || conceito.perguntaCentral}
${quadroAtual ? `(Para referência, o quadro mostra: ${quadroAtual.slice(0, 600)}. NÃO copie o quadro nem faça uma captura de cartões.)` : ''}

Composição desejada: uma pergunta principal; um título breve; UMA ilustração principal grande; no máximo duas ou três seções; legendas legíveis; uma conclusão simples. Pouco texto, em português do Brasil, cores consistentes, qualidade editorial, clareza didática e composição equilibrada em formato horizontal 16:9.
Exemplo do nível de especificidade esperado (para um material sobre eclipse solar e a dúvida sobre umbra e penumbra): título "O mesmo eclipse, duas formas de vê-lo"; ordem Sol–Lua–Terra; sombras atrás da Lua, em direção à Terra; umbra e penumbra diferenciadas; um observador em cada região e duas visualizações grandes do que cada um observa (eclipse total e parcial); conclusão "O que você vê depende de onde está"; nota "Fora de escala". Adapte ao conceito e à dúvida reais — não use este exemplo se o tema for outro.
Liste em "cuidadosCientificos" o que a imagem precisa respeitar para estar correta.`;
}

export function imagemPrompt(d) {
  const secoes = (d.secoes || []).map((s, i) => `  ${i + 1}. "${s.titulo}": ${s.conteudo}`).join('\n');
  return `Crie um infográfico educacional horizontal (16:9) para um aluno de 11 anos, em português do Brasil.

TÍTULO (texto exato, grande, no topo): "${d.titulo}"
PERGUNTA PRINCIPAL (texto menor, abaixo do título): "${d.perguntaPrincipal}"

ILUSTRAÇÃO PRINCIPAL (grande, ocupando a maior parte da imagem):
${d.ilustracaoPrincipal}

SEÇÕES (no máximo três, curtas):
${secoes}

LEGENDAS (use exatamente estes textos, legíveis, com linhas guia até o elemento certo): ${(d.legendas || []).map((l) => `"${l}"`).join(', ')}
CONCLUSÃO (faixa inferior, texto exato): "${d.conclusao}"
${d.notaEscala ? `NOTA (pequena, num canto): "${d.notaEscala}"` : ''}

PALETA: ${d.paleta}

PRECISÃO CIENTÍFICA (obrigatório):
${(d.cuidadosCientificos || []).map((c) => `- ${c}`).join('\n')}

Estilo: ilustração editorial limpa e moderna, fundo claro, alto contraste, tipografia sem serifa grande e legível, pouco texto, ortografia correta em português do Brasil (com acentos), composição equilibrada, sem marcas d'água e sem texto em outros idiomas. Não faça uma colagem de cartões de texto.`;
}

export function correcaoImagemPrompt({ instrucao, direcao }) {
  return `Edite o infográfico anexado aplicando SOMENTE esta correção: "${instrucao}".
Preserve todo o resto exatamente como está: composição, ilustração, cores, textos e posições que não foram mencionados.
Mantenha o formato horizontal 16:9, os textos em português do Brasil com ortografia correta${direcao?.titulo ? ` e o título "${direcao.titulo}"` : ''}.`;
}

export const REVISAO_IMAGEM_SCHEMA = {
  type: 'object',
  properties: {
    observacoes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          categoria: { type: 'string', enum: ['legendas', 'ortografia', 'posicoes', 'coerencia_cientifica', 'legibilidade', 'outro'] },
          descricao: { type: 'string' },
          sugestaoDeCorrecao: { type: 'string', description: 'Instrução curta que poderia ser enviada para corrigir.' },
        },
        required: ['categoria', 'descricao'],
      },
    },
    resumo: { type: 'string' },
  },
  required: ['observacoes', 'resumo'],
};

export function revisaoImagemPrompt({ conceito, direcao }) {
  return `Revise o infográfico anexado comparando-o com o conteúdo do material.
CONCEITO: ${conceito.nome}
O que o material diz: ${conceito.conteudo}
${direcao ? `Direção visual planejada: título "${direcao.titulo}"; legendas ${JSON.stringify(direcao.legendas)}; conclusão "${direcao.conclusao}"; cuidados: ${(direcao.cuidadosCientificos || []).join('; ')}` : ''}

Verifique: legendas (no elemento certo?), ortografia em português, posições e sentido de setas/sombras, coerência científica com o material e legibilidade.
Relate apenas o que você realmente observa na imagem. Se não encontrar problemas numa categoria, não invente. Lembre que esta revisão é uma orientação, não uma garantia.`;
}
