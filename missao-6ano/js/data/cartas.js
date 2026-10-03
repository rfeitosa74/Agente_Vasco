// Baralho inicial: conteúdo clássico de História e Geografia do 6º ano, com as pontes da astronomia.
// O tutor completa com os capítulos reais do bimestre (aba Cartas). Aqui ficam só fatos consolidados.
const H = (tag, frente, verso) => ({ disciplina: 'História', tag, frente, verso });
const G = (tag, frente, verso) => ({ disciplina: 'Geografia', tag, frente, verso });

export const CARTAS_INICIAIS = [
  // ----- História · Pré-História -----
  H('Pré-História', 'O que mudou da Pré-História do Paleolítico para o Neolítico?', 'Paleolítico: nômades, caça e coleta, pedra lascada. Neolítico: agricultura e pecuária, povoados fixos (sedentarização), pedra polida.'),
  H('Pré-História', 'Qual foi a “revolução” que fez o ser humano parar de ser nômade?', 'A agricultura (Neolítico): plantar permite ficar no mesmo lugar.'),
  H('Pré-História', 'Por que Stonehenge é chamado de “calendário de pedra”?', 'Suas pedras se alinham ao nascer/pôr do Sol nos solstícios. Foi construído há cerca de 5 mil anos, na Inglaterra.'),
  // ----- Mesopotâmia -----
  H('Mesopotâmia', 'O que significa “Mesopotâmia” e onde ela ficava?', '“Terra entre rios”: entre os rios Tigre e Eufrates (onde hoje é, em grande parte, o Iraque).'),
  H('Mesopotâmia', 'Qual foi a escrita dos sumérios e em que material era feita?', 'Escrita cuneiforme (em forma de cunha), feita em tabletes de argila.'),
  H('Mesopotâmia', 'O que foi o Código de Hamurábi?', 'Um dos primeiros conjuntos de leis escritas (~1750 a.C., Babilônia). Previa punições proporcionais ao crime (“olho por olho”).'),
  H('Mesopotâmia', 'O que os mesopotâmicos deixaram de herança para o nosso relógio e para a geometria?', 'Contagem em base 60 (60 min, 60 s) e o círculo de 360°. Também registraram eclipses por séculos.'),
  // ----- Egito -----
  H('Egito', 'Por que se diz que o Egito foi “uma dádiva do Nilo”?', 'As cheias anuais deixavam o solo fértil: a agricultura (e a civilização) dependia do rio.'),
  H('Egito', 'Como os egípcios sabiam que o Nilo ia encher?', 'Pelo céu: a reaparição da estrela Sirius antes do nascer do Sol anunciava a cheia.'),
  H('Egito', 'Como era o calendário egípcio?', '365 dias: 12 meses de 30 dias + 5 dias extras.'),
  H('Egito', 'O que eram as pirâmides e quem mandava construí-las?', 'Túmulos monumentais dos faraós (como a de Quéops, em Gizé). Faraó: rei considerado filho dos deuses.'),
  H('Egito', 'Que escrita os egípcios usavam?', 'Hieróglifos (escrita com símbolos/desenhos), em paredes e em papiro.'),
  // ----- Grécia -----
  H('Grécia', 'O que era uma pólis?', 'Uma cidade-Estado grega, com governo e leis próprios (Atenas, Esparta…).'),
  H('Grécia', 'Qual a diferença entre Atenas e Esparta?', 'Atenas: democracia, arte e filosofia. Esparta: sociedade militarizada, treino de guerra desde criança.'),
  H('Grécia', 'Quem foi Eratóstenes e o que ele fez?', 'Grego de Alexandria (~240 a.C.) que mediu a circunferência da Terra com a sombra de uma vara e a distância entre duas cidades.'),
  H('Grécia', 'Quem foi Aristarco de Samos?', 'Grego que propôs que a Terra gira em torno do Sol (heliocentrismo), ~1.800 anos antes de Copérnico.'),
  H('Grécia', 'Que jogos criados na Grécia existem até hoje?', 'Os Jogos Olímpicos (em Olímpia, em homenagem a Zeus; os primeiros registrados são de 776 a.C.).'),
  // ----- Roma -----
  H('Roma', 'Quais foram as três fases da história política de Roma?', 'Monarquia → República → Império.'),
  H('Roma', 'De onde vêm os nomes dos planetas Mercúrio, Vênus, Marte, Júpiter e Saturno?', 'São nomes de deuses romanos (mensageiro, amor, guerra, rei dos deuses, agricultura).'),
  H('Roma', 'Que língua falada hoje vem do latim dos romanos?', 'O português (e também espanhol, italiano, francês, romeno…).'),
  // ----- Geografia · Coordenadas -----
  G('Coordenadas', 'O que é latitude e qual linha marca o 0°?', 'Distância em graus ao norte ou ao sul do Equador (0°). Vai até 90° nos polos. As linhas são os paralelos.'),
  G('Coordenadas', 'O que é longitude e qual linha marca o 0°?', 'Distância em graus a leste ou a oeste do Meridiano de Greenwich (0°). As linhas são os meridianos.'),
  G('Coordenadas', 'Como o sistema de coordenadas do céu se parece com o da Terra?', 'Declinação ≈ latitude e ascensão reta ≈ longitude.'),
  G('Coordenadas', 'A que distância do Equador fica São Luís (MA)?', 'Cerca de 2,5° ao sul do Equador (latitude ~2°32′ S).'),
  // ----- Rotação e translação -----
  G('Rotação e translação', 'O que é o movimento de rotação e o que ele causa?', 'A Terra girando em torno do próprio eixo (~24 h). Causa o dia e a noite.'),
  G('Rotação e translação', 'O que é o movimento de translação e quanto tempo dura?', 'A Terra girando em volta do Sol: ~365 dias e 6 horas (por isso existe o ano bissexto).'),
  G('Rotação e translação', 'Por que existem as estações do ano?', 'Pelo eixo da Terra inclinado (~23,5°) durante a translação — NÃO pela distância ao Sol.'),
  G('Rotação e translação', 'Quantos fusos horários a Terra tem e de quantos graus é cada um?', '24 fusos de 15° cada (360° ÷ 24).'),
  // ----- Camadas da Terra -----
  G('Camadas da Terra', 'Quais são as camadas da Terra, de fora para dentro?', 'Crosta → manto → núcleo externo (líquido) → núcleo interno (sólido).'),
  G('Camadas da Terra', 'O que o núcleo externo tem a ver com o campo magnético?', 'É líquido e metálico; seu movimento gera o campo magnético da Terra.'),
  // ----- Atmosfera e clima -----
  G('Atmosfera e clima', 'O que é efeito estufa e em qual planeta ele é extremo?', 'Gases da atmosfera prendem calor. Em Vênus (atmosfera de gás carbônico) a superfície passa de 400 °C.'),
  G('Atmosfera e clima', 'Qual a diferença entre tempo e clima?', 'Tempo: condição atmosférica de um momento. Clima: padrão médio de muitos anos num lugar.'),
  // ----- Relevo e hidrografia -----
  G('Relevo e hidrografia', 'Qual é a maior montanha do Sistema Solar?', 'O Monte Olimpo, em Marte (~22 km): mais de duas vezes e meia o Everest (8,8 km).'),
  G('Relevo e hidrografia', 'Quais luas têm oceanos de água líquida sob o gelo?', 'Europa (de Júpiter) e Encélado (de Saturno).'),
  G('Relevo e hidrografia', 'O que é uma bacia hidrográfica?', 'Área drenada por um rio principal e seus afluentes.'),
];
