// A ponte da astronomia (página 6): a regra dos 2 minutos.
// O pai abre a Missão do Dia de História/Geografia com UMA pergunta e deixa o Luan falar.
// O papel do pai é dar a deixa, não ensinar.

export const PONTES = [
  // ---- História ----
  { disciplina: 'História', topico: 'Mesopotâmia', pergunta: 'Por que o minuto tem 60 segundos e não 100?', deixa: 'Os mesopotâmicos contavam em base 60 (sexagesimal) e dividiram o círculo em 360°. O relógio de hoje herdou isso.' },
  { disciplina: 'História', topico: 'Mesopotâmia', pergunta: 'Como os povos antigos conseguiam prever um eclipse sem computador?', deixa: 'Registraram eclipses por séculos e perceberam que se repetiam num ciclo (o ciclo de Saros, ~18 anos).' },
  { disciplina: 'História', topico: 'Egito', pergunta: 'Como o egípcio sabia que o Nilo ia encher, sem calendário?', deixa: 'Pelo céu: quando a estrela Sirius reaparecia antes do nascer do Sol, a cheia vinha logo depois.' },
  { disciplina: 'História', topico: 'Egito', pergunta: 'Por que o ano tem 365 dias? Quem foi que inventou essa conta?', deixa: 'O calendário egípcio: 12 meses de 30 dias + 5 dias extras, ligado ao ciclo de Sirius e do Nilo.' },
  { disciplina: 'História', topico: 'Egito', pergunta: 'As pirâmides apontam para algum lugar do céu? Por que será?', deixa: 'Os egípcios alinharam as construções com os pontos cardeais e com as estrelas; o céu era parte da religião e do calendário.' },
  { disciplina: 'História', topico: 'Grécia', pergunta: 'Dá para medir o tamanho da Terra só com uma vara e uma sombra? Alguém já fez isso?', deixa: 'Eratóstenes (~240 a.C.): sombra em Alexandria + poço sem sombra em Siena + a distância entre as cidades.' },
  { disciplina: 'História', topico: 'Grécia', pergunta: 'Quem foi o primeiro a dizer que a Terra gira em volta do Sol?', deixa: 'Aristarco de Samos, uns 1.800 anos antes de Copérnico. Quase ninguém acreditou nele.' },
  { disciplina: 'História', topico: 'Roma', pergunta: 'De onde será que veio o nome do planeta Marte?', deixa: 'Marte era o deus romano da guerra — a cor vermelha lembrava sangue. Mercúrio, Vênus, Júpiter e Saturno também são deuses romanos.' },
  { disciplina: 'História', topico: 'Roma', pergunta: 'Em espanhol, terça-feira é “martes”. Em inglês, sábado é “Saturday”. O que isso tem a ver com planetas?', deixa: 'Os dias da semana em várias línguas vêm dos deuses/astros romanos: martes = Marte, Saturday = Saturno.' },
  { disciplina: 'História', topico: 'Roma', pergunta: 'Se os romanos deram nome a cinco planetas, por que Urano e Netuno têm nome diferente?', deixa: 'Os cinco primeiros se enxergam a olho nu; Urano e Netuno só foram descobertos com telescópio (1781 e 1846).' },
  { disciplina: 'História', topico: 'Pré-História', pergunta: 'Quem construiu Stonehenge, e por que as pedras estão alinhadas com o nascer do Sol?', deixa: 'Povos pré-históricos da Inglaterra, há ~5 mil anos. O alinhamento marca solstícios: era um calendário de pedra.' },
  { disciplina: 'História', topico: 'Pré-História', pergunta: 'Antes de existir calendário, como o homem pré-histórico sabia a hora de plantar?', deixa: 'Observando a Lua, o Sol e as estrelas: com a agricultura (Neolítico), saber a época certa virou questão de sobrevivência.' },
  // ---- Geografia ----
  { disciplina: 'Geografia', topico: 'Coordenadas', pergunta: 'Como o céu tem “endereço”? Como você acha um planeta no telescópio?', deixa: 'Coordenadas celestes (declinação ≈ latitude, ascensão reta ≈ longitude) funcionam como o sistema de latitude e longitude da Terra.' },
  { disciplina: 'Geografia', topico: 'Coordenadas', pergunta: 'São Luís está a quantos graus do Equador? O que isso muda para quem olha o céu daqui?', deixa: 'São Luís fica a ~2,5° ao sul do Equador: dá para ver quase todo o céu, dos dois hemisférios, ao longo do ano.' },
  { disciplina: 'Geografia', topico: 'Rotação e translação', pergunta: 'Por que existe dia e noite? E por que existem estações?', deixa: 'Dia/noite: rotação (~24 h). Estações: translação (~365 dias) + eixo inclinado (~23,5°) — NÃO é a distância ao Sol.' },
  { disciplina: 'Geografia', topico: 'Rotação e translação', pergunta: 'Quando é meio-dia aqui, que horas são no Japão? Por quê?', deixa: 'Fusos horários: 24 fusos de 15° (360° ÷ 24), e a Terra gira de oeste para leste.' },
  { disciplina: 'Geografia', topico: 'Camadas da Terra', pergunta: 'Por que só a Terra tem um campo magnético forte? O que o núcleo tem a ver com isso?', deixa: 'O núcleo externo é líquido e metálico; seu movimento gera o campo magnético que protege a atmosfera do vento solar.' },
  { disciplina: 'Geografia', topico: 'Atmosfera e clima', pergunta: 'Vênus está mais perto do Sol que a Terra, mas por que é mais quente até que Mercúrio?', deixa: 'Efeito estufa extremo: atmosfera densa de gás carbônico prende o calor (~465 °C na superfície).' },
  { disciplina: 'Geografia', topico: 'Atmosfera e clima', pergunta: 'Marte já teve rios e oceanos. Para onde foi a água, e o que aconteceu com a atmosfera?', deixa: 'Marte perdeu quase toda a atmosfera; sem ela a água líquida não se mantém na superfície. Contraste com a Terra.' },
  { disciplina: 'Geografia', topico: 'Relevo', pergunta: 'Qual é a maior montanha do Sistema Solar? Quantas vezes o Everest cabe nela?', deixa: 'Monte Olimpo (Marte), ~22 km — mais de duas vezes e meia o Everest (8,8 km).' },
  { disciplina: 'Geografia', topico: 'Hidrografia', pergunta: 'Onde, fora da Terra, existe água líquida? Como isso se compara com os nossos rios e oceanos?', deixa: 'Oceanos sob o gelo de Europa (lua de Júpiter) e Encélado (lua de Saturno).' },
];

/** Pergunta do dia: estável para a data (e para a disciplina). `desloc` permite “outra pergunta”. */
export function pontesPara(disciplina) {
  if (!disciplina) return PONTES;
  const d = disciplina.includes('+') ? null : disciplina;
  return d ? PONTES.filter((p) => p.disciplina === d) : PONTES;
}
