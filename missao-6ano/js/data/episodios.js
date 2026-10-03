// Série do canal: “Astronomia na Escola” (nome sugerido — o Luan escolhe o dele).
// Formato: 1 minuto, no máximo 2 takes, sem olhar o caderno. Escrever o roteiro JÁ é estudar.
export const FORMATO_EPISODIO = [
  { tempo: '0–10 s', titulo: 'Gancho', texto: 'Uma pergunta ou uma frase que prende (“Dá pra medir a Terra com uma vara?”).' },
  { tempo: '10–50 s', titulo: '3 fatos', texto: 'Três coisas, na ordem. Se der, uma data ou um número — é o que mais cai em prova.' },
  { tempo: '50–60 s', titulo: 'Fecho', texto: 'Uma pergunta para quem assiste e “isso cai em História/Geografia/Matemática porque…”.' },
];

export const EPISODIOS_IDEIAS = [
  {
    id: 'eratostenes', titulo: 'Eratóstenes mediu a Terra com uma vara', materias: ['Matemática', 'História', 'Geografia'], destaque: true,
    gancho: 'Há mais de 2.200 anos, um grego mediu a Terra sem sair da cidade. Como?',
    fatos: [
      'Eratóstenes vivia em Alexandria (Egito). Em Siena, no dia do solstício de verão, o Sol ao meio-dia iluminava o fundo de um poço — sem sombra.',
      'No mesmo dia, em Alexandria, uma vara fazia sombra: o raio de sol formava cerca de 7,2° com a vertical. Isso é 1/50 de um círculo (360°).',
      'Com ângulos alternos entre retas paralelas e a distância entre as cidades (~5.000 estádios), ele multiplicou por 50: ~250.000 estádios, perto dos ~40.000 km reais.',
    ],
    fecho: 'Foi geometria do 6º ano usada de verdade. Que outra coisa dá para medir com uma sombra?',
    conteudo6: 'Ângulos, retas paralelas, proporção (Matemática) · Grécia/Alexandria (História) · circunferência e coordenadas (Geografia).',
  },
  {
    id: 'minuto60', titulo: 'Por que o minuto tem 60 segundos?', materias: ['História', 'Matemática'],
    gancho: 'Dez dedos, base 10… então por que o relógio não tem 100 minutos?',
    fatos: [
      'Os povos da Mesopotâmia contavam em base 60 (sexagesimal), há mais de 4 mil anos.',
      '60 é divisível por 1, 2, 3, 4, 5, 6, 10, 12, 15, 20 e 30: fácil de dividir sem fração.',
      'Herdamos isso: 60 segundos, 60 minutos e o círculo de 360° (6 × 60).',
    ],
    fecho: 'Quantos graus tem meio círculo? E um quarto?',
    conteudo6: 'Mesopotâmia (História) · múltiplos e divisores, ângulos (Matemática).',
  },
  {
    id: 'sirius', titulo: 'Sirius avisava quando o Nilo ia encher', materias: ['História', 'Geografia'],
    gancho: 'No Egito antigo ninguém tinha calendário de parede. Como sabiam quando a água ia subir?',
    fatos: [
      'O Nilo enchia todo ano e deixava o solo fértil — por isso o Egito é “dádiva do Nilo”.',
      'Quando Sirius, a estrela mais brilhante do céu noturno, reaparecia antes do nascer do Sol, a cheia chegava.',
      'Dessa observação nasceu um calendário de 365 dias: 12 meses de 30 dias + 5 extras.',
    ],
    fecho: 'Que fenômeno da sua cidade dá para “prever” olhando o céu?',
    conteudo6: 'Egito e rio Nilo (História) · hidrografia e agricultura (Geografia).',
  },
  {
    id: 'deuses', titulo: 'Os planetas são deuses romanos', materias: ['História', 'Português'],
    gancho: 'Você sabe todos os planetas de cor. Mas sabia que quase todos têm nome de deus?',
    fatos: [
      'Mercúrio (mensageiro), Vênus (amor), Marte (guerra), Júpiter (rei dos deuses) e Saturno (agricultura) são deuses romanos.',
      'Em espanhol, terça é “martes” (Marte) e quarta é “miércoles” (Mercúrio). Em inglês, Saturday é o “dia de Saturno”.',
      'O português vem do latim, a língua dos romanos — por isso os nomes chegaram até nós.',
    ],
    fecho: 'Você consegue achar outro dia da semana com nome de astro?',
    conteudo6: 'Roma antiga e latim (História) · origem das palavras (Português).',
  },
  {
    id: 'cepdoceu', titulo: 'O CEP do céu: latitude e longitude', materias: ['Geografia'],
    gancho: 'Todo lugar da Terra tem um endereço de números. E o céu também!',
    fatos: [
      'Latitude: distância ao norte/sul do Equador (0°), medida por paralelos. São Luís fica a ~2,5° ao sul.',
      'Longitude: distância a leste/oeste do Meridiano de Greenwich (0°), medida por meridianos.',
      'No céu: declinação ≈ latitude e ascensão reta ≈ longitude. É assim que um telescópio acha um planeta.',
    ],
    fecho: 'Qual é o “CEP” da sua escola no Google Earth?',
    conteudo6: 'Coordenadas geográficas, paralelos e meridianos (Geografia).',
  },
  {
    id: 'estacoes', titulo: 'Por que existem as estações do ano?', materias: ['Geografia'],
    gancho: 'Muita gente acha que é verão porque a Terra está mais perto do Sol. É mentira!',
    fatos: [
      'A Terra leva ~365 dias para dar uma volta no Sol: é a translação.',
      'O eixo da Terra é inclinado ~23,5°: ao longo do ano, cada hemisfério recebe luz mais direta ou mais inclinada.',
      'Quando é verão no Sul, é inverno no Norte. Perto do Equador, como em São Luís, as estações quase não se notam.',
    ],
    fecho: 'Em que mês a Terra está mais perto do Sol? (Dica: janeiro!)',
    conteudo6: 'Rotação, translação, estações e fusos (Geografia).',
  },
  {
    id: 'venusmarte', titulo: 'Vênus × Marte: duas atmosferas, dois destinos', materias: ['Geografia'],
    gancho: 'Um planeta é um forno. O outro é um deserto congelado. Por quê?',
    fatos: [
      'Vênus tem atmosfera de gás carbônico muito densa: efeito estufa extremo, ~465 °C na superfície.',
      'Marte tem atmosfera fina e perdeu quase toda a sua: é frio (média de ~−60 °C).',
      'A Terra está no meio: atmosfera e efeito estufa na medida certa para a água líquida.',
    ],
    fecho: 'O que aconteceria na Terra se o efeito estufa aumentasse demais?',
    conteudo6: 'Atmosfera, clima e efeito estufa (Geografia).',
  },
  {
    id: 'olimpo', titulo: 'O Monte Olimpo é maior que o Everest', materias: ['Geografia', 'Matemática'],
    gancho: 'A maior montanha da Terra tem 8,8 km. A de Marte tem muito mais.',
    fatos: [
      'O Monte Olimpo (Marte) é um vulcão extinto com ~22 km de altura.',
      '22 ÷ 8,8 = 2,5: cabe mais de duas vezes e meia o Everest dentro dele.',
      'Também existem oceanos de água líquida escondidos sob o gelo de Europa e Encélado.',
    ],
    fecho: 'Quantos Everests cabem em 100 km? (Ajuda: faça a conta de cabeça!)',
    conteudo6: 'Relevo e hidrografia (Geografia) · divisão com decimais (Matemática).',
  },
  {
    id: 'stonehenge', titulo: 'Stonehenge: o calendário de pedra', materias: ['História'],
    gancho: 'Há 5 mil anos, ninguém tinha relógio. Mas já sabiam quando era o dia mais longo do ano.',
    fatos: [
      'Stonehenge fica na Inglaterra e foi construído por povos pré-históricos.',
      'Suas pedras se alinham ao nascer do Sol no solstício de verão e ao pôr do Sol no de inverno.',
      'Saber a época certa era vital para a agricultura (Neolítico): o primeiro calendário foi construído olhando o céu.',
    ],
    fecho: 'Como você marcaria o dia mais longo do ano no seu quintal?',
    conteudo6: 'Pré-História, Neolítico e agricultura (História).',
  },
  {
    id: 'aristarco', titulo: 'Aristarco: o grego que pôs o Sol no centro', materias: ['História'],
    gancho: 'Todo mundo achava que o Sol girava em volta da Terra. Um grego discordou — 1.800 anos antes de Copérnico.',
    fatos: [
      'Aristarco de Samos (~270 a.C.) propôs que a Terra gira em torno do Sol.',
      'Quase ninguém acreditou: ninguém sentia a Terra se mover.',
      'Só em 1543 Copérnico retomou a ideia — e Galileu, em 1610, achou as provas com o telescópio.',
    ],
    fecho: 'Por que é tão difícil mudar uma ideia que “todo mundo sabe”?',
    conteudo6: 'Grécia antiga e o nascimento da ciência (História).',
  },
];
