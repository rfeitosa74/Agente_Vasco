// Baralho inicial: conteúdo clássico de História e Geografia do 6º ano, com as pontes da astronomia.
// O tutor completa com os capítulos reais do bimestre (aba Cartas). Aqui ficam só fatos consolidados.
const H = (tag, frente, verso) => ({ disciplina: 'História', tag, frente, verso });
const G = (tag, frente, verso) => ({ disciplina: 'Geografia', tag, frente, verso });
const M = (tag, frente, verso) => ({ disciplina: 'Matemática', tag, frente, verso });
const P = (tag, frente, verso) => ({ disciplina: 'Português', tag, frente, verso });

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

  // ----- Matemática · geometria (a matéria mudou de nomear para CALCULAR) -----
  M('Geometria', 'Como se calcula o perímetro de um retângulo?', '2 × (base + altura): é a soma de todos os lados (contorno). Unidade: cm, m…'),
  M('Geometria', 'Como se calcula a área de um retângulo? E de um quadrado?', 'Retângulo: base × altura. Quadrado: lado × lado (l²). Unidade: cm², m²…'),
  M('Geometria', 'Como se calcula a área de um triângulo?', 'base × altura ÷ 2. Exemplo: base 8 e altura 5 → 8 × 5 ÷ 2 = 20.'),
  M('Geometria', 'Qual a diferença entre perímetro e área?', 'Perímetro é o contorno (comprimento, em cm). Área é a superfície (em cm²).'),
  M('Geometria', 'Quanto somam os ângulos internos de um triângulo? E de um quadrilátero?', 'Triângulo: 180°. Quadrilátero: 360°.'),
  M('Geometria', 'Como classificar ângulos: reto, agudo, obtuso e raso?', 'Reto: 90°. Agudo: menor que 90°. Obtuso: entre 90° e 180°. Raso: 180°.'),
  M('Geometria', 'O que são ângulos complementares e suplementares?', 'Complementares somam 90°. Suplementares somam 180°.'),
  // ----- Matemática · números -----
  M('Números', 'O que é o mmc e o mdc?', 'mmc: menor múltiplo comum (diferente de zero). mdc: maior divisor comum. Ex.: mmc(6, 8) = 24; mdc(12, 18) = 6.'),
  M('Números', 'Critérios de divisibilidade por 2, 3, 5, 9 e 10', '2: termina em número par. 3: soma dos algarismos divisível por 3. 5: termina em 0 ou 5. 9: soma dos algarismos divisível por 9. 10: termina em 0.'),
  M('Números', 'O que é um número primo? O 1 é primo?', 'Tem exatamente dois divisores: 1 e ele mesmo (2, 3, 5, 7, 11, 13…). O 1 NÃO é primo.'),
  M('Números', 'Qual a ordem das operações em uma expressão?', 'Parênteses primeiro; depois potências; depois × e ÷ (da esquerda para a direita); por último + e −.'),
  M('Números', 'O que é potenciação? Quanto é a¹ e a⁰?', 'Multiplicar a base por ela mesma, o expoente de vezes: 2⁴ = 2×2×2×2 = 16. a¹ = a e a⁰ = 1 (a ≠ 0).'),
  M('Números', 'Equivalência entre unidades de medida', '1 km = 1.000 m · 1 m = 100 cm · 1 kg = 1.000 g · 1 L = 1.000 mL · 1 h = 60 min.'),
  // ----- Matemática · frações, decimais, porcentagem -----
  M('Frações', 'Como achar frações equivalentes?', 'Multiplique (ou divida) numerador e denominador pelo MESMO número. 1/2 = 2/4 = 3/6.'),
  M('Frações', 'Como somar frações?', 'Mesmo denominador: soma os numeradores e mantém o denominador (2/7 + 3/7 = 5/7). Denominadores diferentes: antes, iguale os denominadores (pelo mmc).'),
  M('Frações', 'Como calcular uma fração de um número? (3/4 de 48)', 'Divida pelo denominador e multiplique pelo numerador: 48 ÷ 4 = 12; 12 × 3 = 36.'),
  M('Frações', 'Como multiplicar frações?', 'Numerador × numerador e denominador × denominador: 2/3 × 4/5 = 8/15.'),
  M('Decimais', 'Como somar e subtrair números decimais?', 'Alinhe a vírgula embaixo da vírgula (complete com zeros se precisar) e some/subtraia normalmente.'),
  M('Decimais', 'O que acontece ao multiplicar ou dividir por 10, 100, 1.000?', 'Multiplicar: a vírgula anda para a DIREITA. Dividir: a vírgula anda para a ESQUERDA (uma casa por zero).'),
  M('Porcentagem', 'Como calcular 50%, 25% e 10% de um valor?', '50% = metade (÷2). 25% = um quarto (÷4). 10% = divide por 10. 1% = divide por 100.'),
  // ----- Português -----
  P('Classes de palavras', 'O que é substantivo? E adjetivo?', 'Substantivo nomeia seres, objetos, lugares, sentimentos (casa, Luan, alegria). Adjetivo dá característica ao substantivo (casa GRANDE).'),
  P('Classes de palavras', 'O que é verbo?', 'Palavra que indica ação, estado ou fenômeno da natureza (correr, estar, chover). Varia em tempo, modo, pessoa e número.'),
  P('Classes de palavras', 'Substantivo próprio × comum; concreto × abstrato', 'Próprio: nome específico, com maiúscula (São Luís). Comum: nome geral (cidade). Concreto: existe por si (mesa). Abstrato: depende de outro (saudade).'),
  P('Ortografia', 'Sílaba tônica: oxítona, paroxítona e proparoxítona', 'Oxítona: tônica é a última (café). Paroxítona: a penúltima (mesa). Proparoxítona: a antepenúltima (música) — todas levam acento.'),
  P('Ortografia', 'Ditongo, tritongo e hiato', 'Ditongo: vogal + semivogal na mesma sílaba (pai). Tritongo: três sons na mesma sílaba (Paraguai). Hiato: vogais em sílabas separadas (sa-ú-de).'),
  P('Texto', 'Narrador-observador × narrador-personagem', 'Observador: conta em 3ª pessoa, de fora (“ele foi”). Personagem: faz parte da história e conta em 1ª pessoa (“eu fui”).'),
  P('Texto', 'Sentido denotativo × conotativo', 'Denotativo: sentido literal, do dicionário. Conotativo: sentido figurado (“ele tem um coração de ouro”).'),
  P('Texto', 'Sinônimos e antônimos', 'Sinônimos têm significado parecido (rápido/veloz). Antônimos têm significado oposto (rápido/lento).'),
  P('Pontuação', 'Quando usar a vírgula?', 'Para separar itens de uma enumeração, o vocativo (“Luan, venha cá”), o aposto e expressões explicativas.'),
];
