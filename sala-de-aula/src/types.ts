export type BoardKind = 'desenho' | 'comparacao' | 'processo' | 'grafico' | 'relacoes' | 'texto';

export interface Conceito {
  id: string;
  nome: string;
  resumo: string;
  conteudo: string;
  perguntaCentral: string;
  representacao: BoardKind;
  motivoRepresentacao?: string;
  paginas: number[];
  secoes: string[];
  figuras: { pagina?: number; descricao: string }[];
}

export interface Secao {
  id: string;
  titulo: string;
  paginaInicio?: number;
  paginaFim?: number;
}

export interface Analise {
  titulo: string;
  disciplina: string;
  resumo: string;
  temPaginas: boolean;
  numPaginas: number;
  secoes: Secao[];
  conceitos: Conceito[];
}

export interface Material {
  tipo: 'pdf' | 'texto';
  nome: string;
  arquivo?: File;
  texto?: string;
  exemplo?: boolean;
  numPaginas?: number;
}

// Representação do quadro (ver shared/board.js)
export interface Board {
  tipo: BoardKind;
  pergunta: string;
  titulo: string;
  explicacao: string;
  legendaGeral?: string;
  fontes: string[];
  desenho?: { elementos: any[] };
  comparacao?: { colunas: { id: string; titulo: string; cor: string }[]; aspectos: { id: string; aspecto: string; valores: string[] }[] };
  processo?: { ciclico: boolean; etapas: { id: string; titulo: string; detalhe: string }[] };
  grafico?: any;
  relacoes?: any;
  texto?: { blocos: { id: string; titulo: string; texto: string }[] };
  cartoes: { id: string; titulo: string; texto: string }[];
  figuraOriginal?: { pagina: number; motivo?: string };
}

export interface Revisao {
  status: 'aprovado' | 'corrigido' | 'corrigido_com_avisos' | 'texto_alternativo' | 'nao_revisado';
  problemas: string[];
  avisos?: string[];
  aviso?: string;
}

export interface BoardState {
  board: Board;
  revisao: Revisao;
  modelo?: string;
  origem: string; // o que gerou este quadro
}

export interface ApiErro {
  tipo: string;
  mensagem: string;
  comoResolver?: string;
  detalhe?: string;
}

export interface Mensagem {
  id: string;
  papel: 'aluno' | 'tutor';
  texto: string;
  conceitoId: string;
  acao?: string;
  quadroAtualizado?: boolean;
  erro?: ApiErro;
}

export interface Direcao {
  perguntaPrincipal: string;
  titulo: string;
  ilustracaoPrincipal: string;
  secoes: { titulo: string; conteudo: string }[];
  legendas: string[];
  conclusao: string;
  paleta: string;
  notaEscala?: string;
  cuidadosCientificos: string[];
}

export interface ImagemGerada {
  mimeType: string;
  data: string;
  modelo: string;
  modeloPedido: string;
  configUsada: { aspectRatio?: string; imageSize?: string };
  textoDoModelo?: string;
}
