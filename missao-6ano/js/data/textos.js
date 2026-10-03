// Caça ao detalhe (Português, sexta): lê UMA vez, o texto fecha, responde sem voltar.
// Textos curtos de astronomia/História/Geografia — o conteúdo que ele já ama, treinando leitura atenta.
export const TEXTOS = [
  {
    id: 'eratostenes',
    titulo: 'Eratóstenes e o poço',
    texto: 'Há mais de 2.200 anos, na cidade de Alexandria, no Egito, vivia um sábio chamado Eratóstenes. Ele cuidava da grande biblioteca da cidade. Um dia, leu que, em Siena, ao meio-dia de um certo dia do ano, o Sol iluminava o fundo de um poço profundo, sem fazer sombra. No mesmo dia, em Alexandria, uma vara fincada no chão fazia sombra. Eratóstenes percebeu que isso só podia acontecer porque a superfície da Terra é curva. Medindo o ângulo da sombra e a distância entre as duas cidades, ele calculou o tamanho da Terra — e chegou muito perto do valor correto.',
    perguntas: [
      { p: 'Em que cidade Eratóstenes vivia?', o: ['Siena', 'Alexandria', 'Atenas', 'Roma'], c: 1 },
      { p: 'O que o Sol iluminava em Siena, ao meio-dia daquele dia?', o: ['O topo de uma pirâmide', 'Uma vara fincada no chão', 'O fundo de um poço', 'A biblioteca'], c: 2 },
      { p: 'O que Eratóstenes concluiu ao comparar as duas sombras?', o: ['Que o Sol é muito distante', 'Que a superfície da Terra é curva', 'Que Siena ficava ao norte', 'Que o poço era profundo'], c: 1 },
    ],
  },
  {
    id: 'sirius',
    titulo: 'Sirius e o Nilo',
    texto: 'No antigo Egito, quase tudo dependia do rio Nilo. Todo ano ele transbordava, deixando nas margens uma terra escura e fértil, ótima para plantar. Mas como saber quando a cheia ia chegar? Os egípcios olhavam para o céu. Em certa época do ano, Sirius, a estrela mais brilhante do céu noturno, voltava a aparecer no horizonte pouco antes do nascer do Sol. Logo depois, o Nilo começava a subir. Esse sinal ajudou a criar um calendário de 365 dias, com 12 meses de 30 dias e mais 5 dias extras no fim do ano.',
    perguntas: [
      { p: 'Qual estrela anunciava a cheia do Nilo?', o: ['Sirius', 'Vênus', 'Marte', 'Polaris'], c: 0 },
      { p: 'Quantos dias extras havia depois dos 12 meses de 30 dias?', o: ['3', '5', '6', '10'], c: 1 },
      { p: 'Por que a cheia era importante para os egípcios?', o: ['Fazia as pirâmides crescerem', 'Deixava a terra fértil para plantar', 'Trazia estrangeiros', 'Acabava com o calendário'], c: 1 },
    ],
  },
  {
    id: 'jupiter',
    titulo: 'Galileu e as luas de Júpiter',
    texto: 'Em janeiro de 1610, o italiano Galileu Galilei apontou seu telescópio para Júpiter. Perto do planeta, viu quatro pontinhos de luz alinhados. Nas noites seguintes, percebeu que os pontinhos mudavam de posição, mas nunca se afastavam de Júpiter. A conclusão foi uma surpresa: eram luas girando em volta do planeta. Isso mostrou que nem tudo no céu gira em torno da Terra. Hoje elas se chamam Io, Europa, Ganimedes e Calisto, e podem ser vistas até com um binóculo.',
    perguntas: [
      { p: 'Em que ano Galileu observou Júpiter?', o: ['1543', '1610', '1750', '1969'], c: 1 },
      { p: 'Quantos pontinhos de luz Galileu viu perto de Júpiter?', o: ['Dois', 'Três', 'Quatro', 'Cinco'], c: 2 },
      { p: 'O que Galileu percebeu nas noites seguintes?', o: ['Que os pontinhos sumiam para sempre', 'Que os pontinhos mudavam de posição, mas ficavam perto de Júpiter', 'Que Júpiter girava em volta da Terra', 'Que eram estrelas distantes'], c: 1 },
    ],
  },
  {
    id: 'marte',
    titulo: 'Marte e o Monte Olimpo',
    texto: 'Marte é um planeta frio e seco, com uma atmosfera muito fina. É chamado de planeta vermelho porque o solo é rico em óxido de ferro, a mesma “ferrugem” dos objetos de ferro velhos. Lá fica o Monte Olimpo, um vulcão extinto e o maior conhecido do Sistema Solar. Ele mede cerca de 22 km de altura, mais de duas vezes e meia a altura do Everest, a montanha mais alta da Terra, que tem 8,8 km.',
    perguntas: [
      { p: 'Por que Marte é chamado de planeta vermelho?', o: ['Porque é muito quente', 'Porque o solo tem óxido de ferro (ferrugem)', 'Porque tem muitos vulcões ativos', 'Porque reflete o Sol'], c: 1 },
      { p: 'O que é o Monte Olimpo?', o: ['Uma cratera de gelo', 'Um vulcão extinto', 'Uma lua de Marte', 'Um rio seco'], c: 1 },
      { p: 'Qual é a altura aproximada do Monte Olimpo?', o: ['8,8 km', '12 km', '22 km', '100 km'], c: 2 },
    ],
  },
  {
    id: 'estacoes',
    titulo: 'As estações do ano',
    texto: 'Muita gente acha que é verão quando a Terra está mais perto do Sol e inverno quando está mais longe. Isso não é verdade. A Terra gira em torno do Sol — a translação, que leva cerca de 365 dias — e seu eixo é inclinado cerca de 23,5°. Por causa dessa inclinação, ao longo do ano cada hemisfério recebe os raios do Sol de forma mais direta ou mais inclinada. Quando o hemisfério Sul está inclinado em direção ao Sol, lá é verão e, ao mesmo tempo, no hemisfério Norte é inverno. Perto da linha do Equador, como em São Luís, a diferença entre as estações é pequena.',
    perguntas: [
      { p: 'Qual é a verdadeira causa das estações do ano?', o: ['A distância da Terra ao Sol', 'A inclinação do eixo da Terra', 'A rotação da Terra', 'O tamanho da Lua'], c: 1 },
      { p: 'Quanto tempo dura, aproximadamente, a translação?', o: ['24 horas', '30 dias', '365 dias', '23,5 anos'], c: 2 },
      { p: 'Quando é verão no hemisfério Sul, o que acontece no hemisfério Norte?', o: ['Também é verão', 'É inverno', 'É sempre primavera', 'Não há estações'], c: 1 },
    ],
  },
  {
    id: 'roma',
    titulo: 'Roma e os planetas',
    texto: 'Os romanos davam nomes de deuses aos astros que viam no céu. Mercúrio, o mensageiro dos deuses, é o planeta que se move mais depressa. Vênus, deusa do amor, é o astro mais brilhante do céu depois do Sol e da Lua. Marte, deus da guerra, tem a cor do sangue. Júpiter era o rei dos deuses e por isso deu nome ao maior planeta. Saturno era o deus da agricultura. Esses nomes chegaram até nós: em espanhol, terça-feira é “martes” — o dia de Marte.',
    perguntas: [
      { p: 'Quem era Marte para os romanos?', o: ['Deus da agricultura', 'Deus da guerra', 'Mensageiro dos deuses', 'Rei dos deuses'], c: 1 },
      { p: 'Qual planeta recebeu o nome do rei dos deuses?', o: ['Saturno', 'Mercúrio', 'Júpiter', 'Vênus'], c: 2 },
      { p: 'Em espanhol, qual dia da semana vem de Marte?', o: ['Segunda (lunes)', 'Terça (martes)', 'Quinta (jueves)', 'Sexta (viernes)'], c: 1 },
    ],
  },
];
