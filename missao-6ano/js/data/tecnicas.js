// Técnicas por disciplina (página 5), rotação semanal (página 4) e estágios do ciclo D-3 (página 9).

export const REGRAS_SPRINT = [
  'Cronômetro visível na mesa',
  'Celular virado para baixo (ou fora da mesa)',
  'Caderno FECHADO antes de começar',
  'Uma folha e um lápis — nada mais',
  'Tocou? Para. Mesmo no meio, mesmo que esteja bom',
];

export const DISC_COR = {
  'História': '#8f3b2e', 'Geografia': '#0f6b8c', 'Matemática': '#6a3fa0', 'Português': '#118a5e',
  'Ciências': '#b8660b', 'Inglês': '#2f5db3', 'Outra': '#566074',
};

// ---------- modo padrão: a rotação da semana sem prova ----------
// ferramentas: ids dos mini-aplicativos dentro do sprint (ver js/tools/)
export const ROTACAO = {
  1: {
    disciplina: 'História', tecnica: 'Linha do tempo desenhada', ponte: 'História',
    sprints: [
      { titulo: 'Linha do tempo de memória', passos: [
        'Caderno e livro FECHADOS. Se está olhando a resposta, está copiando.',
        'Folha A4 deitada, uma seta atravessando.',
        'DESENHE (não escreva) os eventos que lembra da aula: a pirâmide, o soldado romano, o rio Nilo…',
        'Cada aula acrescenta um desenho — a linha vai crescer na parede.',
      ], ferramentas: [] },
      { titulo: 'Conferir no vermelho + 3 perguntas ao contrário', passos: [
        'Agora pode abrir o caderno. Compare e marque em VERMELHO o que faltou.',
        'Desenhe na linha só o que estava em vermelho.',
        'Feche o livro e escreva 3 perguntas de prova sobre o capítulo (quem pergunta aprende mais que quem responde).',
        'À noite, no “me explica”, o pai responde as suas perguntas — e erra uma de propósito.',
      ], ferramentas: [{ id: 'perguntas', disciplina: 'História' }] },
    ],
  },
  2: {
    disciplina: 'Geografia', tecnica: 'Mapa de mão livre, de memória', ponte: 'Geografia',
    sprints: [
      { titulo: 'Mapa de memória', passos: [
        'Caderno e livro FECHADOS.',
        'Desenhe o mapa (ou o esquema) de memória, sem copiar.',
        'Ponha os nomes, as linhas e a legenda que você lembrar.',
      ], ferramentas: [] },
      { titulo: 'Abre, marca o vermelho e vai ao Google Earth', passos: [
        'Abra o livro. Marque em VERMELHO o que faltou — o vermelho é o conteúdo da próxima sessão.',
        'Modo Ferramenta (celular fora da mesa): 5 minutos de Google Earth. Localize o que estudou e tire um print.',
        'Se der tempo: corte da Terra colorido — camadas, relevo e clima, com legenda.',
      ], ferramentas: [{ id: 'perguntas', disciplina: 'Geografia' }] },
    ],
  },
  3: {
    disciplina: 'Matemática', tecnica: '5 problemas cronometrados', ponte: null,
    sprints: [
      { titulo: '5 problemas, não 30 exercícios', passos: [
        'Cinco feitos com atenção ensinam mais que trinta no automático.',
        'Antes de calcular: as três perguntas do enunciado (o que pedem? que dados tenho? o que liga os dois?).',
        'Cronômetro rodando; sem calculadora.',
      ], ferramentas: [{ id: 'problemas' }] },
      { titulo: 'O erro volta amanhã', passos: [
        'Refaça DO ZERO cada problema que errou (sem olhar a resolução).',
        'O que errar hoje volta amanhã na tela — e vale XP quando você acertar.',
        'Sobrou tempo? Mais problemas escritos, com as três perguntas.',
      ], ferramentas: [{ id: 'refazer' }, { id: 'enunciados' }] },
    ],
  },
  4: {
    disciplina: 'História + Geografia', tecnica: 'Cartas-relâmpago', ponte: 'Geografia',
    sprints: [
      { titulo: 'Cartas-relâmpago de História', passos: [
        'Leia a frente da carta, tente lembrar (em voz alta!) e só então vire.',
        'Lembrou? Sobe de caixa. Errou? Volta amanhã — errar aqui é ganhar ponto.',
      ], ferramentas: [{ id: 'cartas', disciplina: 'História' }] },
      { titulo: 'Cartas-relâmpago de Geografia', passos: [
        'Mesma regra: tente lembrar antes de virar.',
        'O que errar entra no Desafio do Pai de sábado.',
      ], ferramentas: [{ id: 'cartas', disciplina: 'Geografia' }] },
    ],
  },
  5: {
    disciplina: 'Português', tecnica: 'Caça ao detalhe', ponte: null,
    sprints: [
      { titulo: 'Caça ao detalhe', passos: [
        'Leia o texto UMA vez, atento aos detalhes (nomes, números, “por quê”).',
        'Quando o texto fechar, responda sem voltar: é o que a prova cobra.',
      ], ferramentas: [{ id: 'texto' }] },
      { titulo: 'Uma página do livro, 3 perguntas suas', passos: [
        'Leia uma página do livro da escola.',
        'Feche o livro e escreva 3 perguntas suas sobre ela — e responda de cabeça.',
        'Caligrafia continua: está funcionando, não mexa.',
      ], ferramentas: [{ id: 'perguntas', disciplina: 'Português' }] },
    ],
  },
};

// ---------- ciclo D-3: o que fazer em cada estágio, por disciplina ----------
export const FERRAMENTA_DISC = {
  'História': { ferramenta: 'linha do tempo desenhada com os eventos do capítulo', extra: 'Cartas para nomes, datas e “quem fez o quê”.' },
  'Geografia': { ferramenta: 'mapa/esquema de mão livre com legenda', extra: 'Cartas para conceitos (rotação × translação, camadas, coordenadas…).' },
  'Matemática': { ferramenta: 'lista de fórmulas com um exemplo resolvido de cada', extra: 'Cartas com a fórmula na frente e o exemplo no verso.' },
  'Português': { ferramenta: 'lista de regras e conceitos com um exemplo de cada', extra: 'Cartas com a regra e um exemplo no verso.' },
  'Ciências': { ferramenta: 'esquema desenhado com os termos-chave', extra: 'Cartas com termo na frente e definição no verso.' },
  'Inglês': { ferramenta: 'lista de vocabulário e estruturas do conteúdo', extra: 'Cartas português ↔ inglês.' },
  'Outra': { ferramenta: 'resumo desenhado do conteúdo', extra: 'Cartas com as perguntas mais prováveis.' },
};

export function sprintsDoEstagio(estagio, disciplina) {
  const f = FERRAMENTA_DISC[disciplina] || FERRAMENTA_DISC.Outra;
  const fer = (extra = {}) => ({ id: 'prova', ...extra });
  switch (estagio) {
    case 'D3':
      return [
        { titulo: 'Fabricar a ferramenta (1/2)', passos: [
          'Este é o ÚNICO momento em que o caderno fica aberto.',
          'Leia o conteúdo da prova UMA vez, lápis na mão.',
          `Comece a fabricar: ${f.ferramenta}.`,
          f.extra,
        ], ferramentas: [fer()] },
        { titulo: 'Fabricar a ferramenta (2/2)', passos: [
          'Termine a ferramenta e complete as cartas no aplicativo.',
          'Escreva 3 perguntas de prova com a resposta no verso (pergunta ao contrário).',
          'Guarde tudo junto: amanhã você vai usar SEM consultar o caderno.',
        ], ferramentas: [fer()] },
      ];
    case 'D2':
      return [
        { titulo: 'Puxar da memória (1/2)', passos: [
          'Caderno FECHADO. Use só a ferramenta que você fabricou.',
          'Tente lembrar tudo; vire a carta só depois de tentar.',
          'O que falhar vai para o VERMELHO — esse é o dia que produz nota, e parece pior porque é onde os erros aparecem.',
        ], ferramentas: [fer()] },
        { titulo: 'Puxar da memória (2/2)', passos: [
          'Refaça as cartas que errou na primeira rodada.',
          'Anote no aplicativo tudo que falhou (lista do vermelho).',
          'Não estude conteúdo novo.',
        ], ferramentas: [fer()] },
      ];
    case 'D1':
      return [
        { titulo: 'Só o vermelho', passos: [
          'Revise EXCLUSIVAMENTE o que falhou no D-2. Doze minutos e acabou.',
          'Nada de conteúdo novo na véspera: não fixa e só produz insegurança.',
          'Terminou? Pare. Descanse; amanhã é dia de prova.',
        ], ferramentas: [fer()] },
      ];
    default:
      return [];
  }
}

export const NOME_ESTAGIO_CURTO = { D3: 'Fabricar', D2: 'Puxar', D1: 'Vermelho', D: 'Prova' };
