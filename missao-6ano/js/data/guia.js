// Guia do Pai — condensado fiel do PDF “Missão 6º Ano” (páginas 2–13) e do plano em Markdown.
// tipo dos destaques: info | aviso | erro | ok

export const GUIA = [
  {
    id: 'diagnostico', titulo: 'O que provavelmente está acontecendo',
    intro: 'Há seis coisas acontecendo ao mesmo tempo — e só uma delas é “falta de atenção”.',
    itens: [
      { t: '1. Jornada de adulto', d: 'Aula à tarde mais reforço todo dia útil, dever e caligrafia: 7 a 8 horas de demanda intelectual por dia, aos 11 anos. Nesse cenário a desatenção costuma ser consequência da saturação. Cérebro cansado não fixa conteúdo — só assiste ao conteúdo passar.' },
      { t: '2. Reforço é entrada; falta saída', d: 'As professoras reexplicam e corrigem — necessário, mas é sempre informação ENTRANDO. A nota sobe quando o aluno é obrigado a puxar a informação da memória sem consultar nada. É esse movimento que falta, e é só isso que o plano faz em casa.' },
      { t: '3. História e Geografia caíram por serem as mais vulneráveis à leitura passiva', d: '“Ler e achar que sabe” é a sensação mais enganosa de estudo. Essas matérias respondem melhor a desenhar mapas, desenhar linhas do tempo e explicar em voz alta — o que ele já gosta de fazer.' },
      { t: '4. A caligrafia já provou o ponto', d: 'Ele treina todos os dias e a letra melhorou: sustenta hábito diário quando a tarefa é curta, clara e com progresso visível. O plano repete essa fórmula nas outras matérias.' },
      { t: '5. A astronomia respondeu a pergunta mais importante', d: 'Ele sabe de cor os planetas, as luas e a história de cada um, e mantém um canal no YouTube. Nome próprio, número e cronologia são exatamente o tipo de conteúdo que ele “não consegue guardar” em História e Geografia. A memória funciona, ele sustenta projeto longo sozinho e sabe explicar em voz alta. O problema é de VIA DE ENTRADA, não de capacidade nem de atenção.' },
      { t: '6. A queda em Matemática não é de conteúdo', d: 'Frações e decimais estão de pé. São três problemas de execução: velocidade perdida por desuso; geometria que mudou de nomear para calcular; e erro de enunciado — o mesmo problema de leitura passiva de História e Geografia. Corrigir leitura ativa melhora três disciplinas de uma vez.' },
    ],
    destaques: [
      { tipo: 'aviso', titulo: 'Recomendação para conversar com as professoras', texto: 'Avalie reduzir o reforço de 5 para 3 dias (por exemplo segunda, quarta e sexta) e liberar terça e quinta para o método de casa e para ele simplesmente ser criança. Reforço todos os dias há meses, com melhora insuficiente, é sinal de que o problema não é falta de horas — é o tipo de trabalho feito nessas horas. Mais do mesmo tende a piorar, porque adiciona cansaço sem adicionar método.' },
      { tipo: 'info', titulo: 'A meta real das primeiras 4 semanas', texto: 'Não é subir nota. É o Luan chegar ao fim de quatro semanas achando que o esquema é fácil, justo e divertido. Nota é consequência de rotina estabelecida — e a rotina se estabelece com repetição curta e vitória frequente.' },
    ],
  },
  {
    id: 'blocos', titulo: 'Os quatro blocos do dia',
    intro: 'De segunda a sexta: 45 a 50 minutos por dia, fora o reforço. Parece pouco — é de propósito: é o volume que ele consegue fazer bem feito todos os dias sem briga.',
    itens: [
      { t: 'Bloco 1 · Aquecimento · 15 min · todo dia', d: 'Caligrafia + 5 minutos do Ginásio de Cálculo. É o ritual que avisa ao cérebro que a sessão começou. Mesmo horário e mesmo lugar todos os dias. Intocável, inclusive em dia de prova: é a âncora de todo o resto.' },
      { t: 'Bloco 2 · Missão do Dia · 2 × 12 min + 5 de pausa', d: 'Uma matéria por dia, com a técnica da disciplina. Regras do sprint: cronômetro visível; celular fora da mesa, virado para baixo; uma folha e um lápis; sem apagar e refazer por estética. Quando toca, ele para — mesmo que esteja no meio. Parar no auge é o que faz ele querer voltar amanhã. Pausa de 5 minutos: água, banheiro, andar. Nunca tela.' },
      { t: 'Bloco 3 · Episódio do canal · 10 min · seg/qua/sex', d: 'Ele já tem um canal e já sabe fazer isso. Uma série nova dentro do canal, ligando o céu à matéria do 6º ano. 1 minuto, no máximo 2 takes, sem olhar o caderno. Explicar em voz alta é a forma mais forte de recuperação ativa; o roteiro É a revisão. Vale mesmo que ele não publique.' },
      { t: 'Bloco 4 · Desafio do Pai · 25 min · sábado', d: 'Você pergunta, ele responde, em clima de quiz — não de prova. Misture a semana inteira. Truque que funciona: erre de propósito uma vez (“O Egito fica na Ásia, né?”) e deixe ele te corrigir. Corrigir o pai dá prazer enorme e exige domínio real. Fecha com a soma do XP e a escolha da recompensa.' },
    ],
    destaques: [
      { tipo: 'erro', titulo: 'O erro mais comum dos pais nesse ponto', texto: 'Não fique sentado ao lado dele durante os sprints. Adulto vigiando aumenta a ansiedade, interrompe o raciocínio e ensina que estudar só acontece sob supervisão. Fique disponível no ambiente ao lado, com a porta aberta. Sua hora de entrar é depois — nos 5 minutos do “me explica”.' },
    ],
  },
  {
    id: 'tecnica', titulo: 'Técnica por disciplina',
    intro: 'Regra única em todas as matérias: o caderno fecha antes de o estudo começar. Se ele está olhando a resposta, está copiando, não estudando.',
    itens: [
      { t: 'História (prioridade máxima)', d: 'Linha do tempo desenhada (folha A4 deitada, uma seta; ele DESENHA os eventos; cada aula acrescenta um desenho e a linha cresce na parede). Repórter do passado: no episódio, grava como jornalista no local (“estou aqui no Egito, ano 2500 antes de Cristo…”). Três perguntas ao contrário: depois de ler, fecha o livro e escreve 3 perguntas de prova — quem formula entende melhor que quem responde. À noite você responde as dele, errando uma de propósito.' },
      { t: 'Geografia (prioridade máxima)', d: 'Mapa de mão livre, de memória, sem copiar; depois abre o livro e marca em vermelho o que faltou (o vermelho é o conteúdo da próxima sessão). Cinco minutos de Google Earth no Modo Ferramenta. Corte da Terra colorido: camadas, relevo e clima, com legenda.' },
      { t: 'Matemática', d: '5 problemas, não 30 exercícios: cinco feitos com atenção ensinam mais que trinta no automático. O erro volta amanhã: o que ele errar hoje é refeito, do zero, no dia seguinte — vale XP e é a sensação de progresso mais concreta que existe.' },
      { t: 'Português', d: 'Caça ao detalhe: lê uma página e, com o livro fechado, responde 3 perguntas suas — é o que a prova cobra. A caligrafia continua: está funcionando, não mexa; só mude o lugar (vira o Aquecimento).' },
    ],
    destaques: [
      { tipo: 'erro', titulo: 'A técnica que parece a melhor e é a pior', texto: 'Reler o caderno e passar a limpo. Dá a maior sensação de estudo e o menor resultado — a matéria parece familiar, e familiaridade não é conhecimento. Se ele diz “já estudei, li tudo”, feche o caderno e peça para explicar. A diferença entre os dois momentos é o tamanho do problema.' },
    ],
  },
  {
    id: 'ponte', titulo: 'A ponte da astronomia',
    intro: 'As pontes não são enfeite motivacional: são o conteúdo do 6º ano entrando pela porta que já está aberta. Ele não vai estudar astronomia em vez de História e Geografia — vai estudar História e Geografia pelo lado que já lhe interessa.',
    itens: [
      { t: 'Geografia', d: 'Coordenadas geográficas ↔ coordenadas celestes · rotação, translação, estações e fusos ↔ astronomia pura · camadas da Terra ↔ Mercúrio, Vênus e Marte · atmosfera e clima ↔ Vênus (efeito estufa) e Marte (atmosfera que escapou) · relevo e hidrografia ↔ Monte Olimpo e água em Europa e Encélado.' },
      { t: 'História', d: 'Mesopotâmia ↔ 360°, base 60, eclipses · Egito ↔ Sirius e a cheia do Nilo, calendário de 365 dias · Grécia ↔ Eratóstenes e Aristarco · Roma ↔ os nomes dos planetas (e dos dias da semana em outras línguas) são deuses romanos · Pré-História ↔ Stonehenge e o primeiro calendário.' },
    ],
    destaques: [
      { tipo: 'info', titulo: 'Regra dos 2 minutos', texto: 'Você não precisa estudar astronomia. No início da Missão do Dia de História ou Geografia, gaste 2 minutos fazendo UMA pergunta de ponte e deixe ele falar: “de onde será que veio o nome do planeta Marte?”, “por que o minuto tem 60 segundos e não 100?”. Ele vai querer responder — e a aula já começou sozinha. Seu papel não é ensinar: é dar a deixa.' },
    ],
  },
  {
    id: 'matematica', titulo: 'Matemática: o que caiu e por quê',
    intro: 'Ele fazia multiplicação de dois dígitos de cabeça e conhecia as figuras planas. Hoje: caiu a velocidade de cálculo, a geometria com conta trava, e ele erra o que o enunciado pede. Nenhuma das três é “não saber matemática”.',
    itens: [
      { t: 'A velocidade caiu por desuso, não por perda', d: 'No 6º ano a escola passa a exigir o algoritmo armado; o cálculo mental sai de circulação e enferruja em semanas, como tocar um instrumento. Recupera-se praticando poucos minutos por dia, todos os dias — não estudando.' },
      { t: 'A geometria mudou de natureza sem avisar', d: 'Até o 5º ano era reconhecer e nomear figuras. No 6º vira medir e calcular: perímetro, área, ângulo. Quem era bom na primeira frequentemente tropeça na segunda.' },
      { t: 'Erro de enunciado = leitura passiva', d: 'Errar o que a questão pede, sabendo fazer a conta, é o mesmo problema que ele tem em História e Geografia. Uma única correção resolve um pedaço de três disciplinas.' },
      { t: 'Ginásio de Cálculo', d: '5 min/dia dentro do Bloco 1. Anote o TEMPO, não o acerto. Sobe de faixa quem bate a meta 3 dias seguidos: 1 Base (20 produtos em 60 s) · 2 Ponte (5 contas em 90 s) · 3 Retomada (5 contas em 3 min) · 4 Atalhos (5 em 2 min) · 5 Misto (manter).' },
      { t: 'As três perguntas do enunciado', d: '1. O que estão pedindo? (sublinha a pergunta, escreve em 4 palavras) · 2. Que dados eu tenho? (circula os números e risca o que sobra) · 3. O que liga um ao outro? (só então escolhe a operação). Vale para Matemática, História e Geografia.' },
      { t: 'Armas de cálculo mental (uma por semana)', d: 'Decompor 34×27 = 34×20 + 34×7 · Diferença de quadrados 48×52 = 50² − 2² · Vezes 11: 45×11 → 4 (9) 5 = 495 · Dobrar e partir: 16×25 = 8×50 = 4×100 · Quadrado terminado em 5: 35² → 3×4=12, cola 25 → 1.225.' },
    ],
    destaques: [
      { tipo: 'ok', titulo: 'Aqui você tem uma vantagem que quase nenhum pai tem', texto: 'Você deu aula de Matemática e Física por anos. O Ginásio de Cálculo é literalmente a sua praia — são 5 minutos por dia, dentro de um bloco que já existe.' },
      { tipo: 'info', titulo: 'A ponte perfeita: Eratóstenes', texto: 'Mediu a Terra com ângulos alternos e semelhança de triângulos — geometria do 6º ano usada de verdade para responder uma pergunta de astronomia, dentro de um conteúdo de História. Uma única história cobre as três matérias críticas e é o episódio de canal mais fácil de gravar.' },
    ],
  },
  {
    id: 'provas', titulo: 'Semana de prova: o ciclo D-3',
    intro: 'Com prova semanal, a rotação fixa vira modo padrão (só nas semanas sem prova). Havendo prova, quem manda na Missão do Dia é o ciclo. A linha central nunca muda: o que muda é só o conteúdo do Bloco 2.',
    itens: [
      { t: 'D-3 · Fabricar a ferramenta', d: 'Lê o conteúdo UMA vez e produz o material de recuperação ativa: linha do tempo, mapa de memória, cartas-relâmpago, lista de fórmulas. Ainda não é estudar — é construir com o que vai estudar. Caderno aberto só aqui.' },
      { t: 'D-2 · Puxar da memória', d: 'Usa o material do D-3 SEM consultar nada e marca em vermelho o que falhou. É o dia que produz nota — e o que parece pior, porque é onde os erros aparecem.' },
      { t: 'D-1 · Só o vermelho', d: 'Revisa exclusivamente o que falhou no D-2. Doze minutos e acabou. Nada de conteúdo novo na véspera: não fixa e só produz insegurança.' },
      { t: 'Dia D · Não estudar', d: 'Só o Aquecimento. Revisar antes da prova aumenta a ansiedade e não acrescenta — o que ia entrar já entrou. Se ele insistir, só o vermelho, 3 minutos.' },
      { t: 'Duas provas na mesma semana', d: 'No máximo dois estágios ativos por dia, e nunca dois D-2 juntos (é o estágio mais pesado). Conflito: prioridade para História/Geografia, depois a de maior peso. Uma prova preparada direito vale mais que duas preparadas pela metade. O aplicativo faz essa distribuição automaticamente.' },
    ],
    destaques: [
      { tipo: 'ok', titulo: 'Diário de erros — a peça que quase todo mundo esquece', texto: 'Quando a prova voltar corrigida (5 min, 15 XP): ele copia num caderno próprio só as questões que errou, com a correção ao lado, e classifica cada erro. A: não sabia (lacuna real → vira carta-relâmpago). B: sabia e errei (pressa, enunciado mal lido, conta trocada → não se resolve estudando mais; resolve-se com as três perguntas do enunciado). C: fiquei em branco (ansiedade ou sono → olhe o horário de dormir antes do caderno). Em um mês você terá 15 a 20 erros classificados e o desenho aparece sozinho: maioria B, o problema nunca foi estudo; maioria A, o método está certo e falta cobertura; maioria C, o assunto é sono e ansiedade. Três diagnósticos opostos, com tratamentos opostos — você passa a decidir com dado, não com impressão.' },
    ],
  },
  {
    id: 'celular', titulo: 'Protocolo do celular',
    intro: 'Confiscar gera guerra diária e ensina que estudo é castigo. O celular tem dois empregos — ferramenta de estudo e recompensa conquistada — e perde o emprego de babá.',
    itens: [
      { t: '1. Base de carregamento na sala', d: 'O celular dorme FORA do quarto, todos os dias, às 20h30, sem exceção e sem negociação — inclusive fim de semana e férias. Vale para a casa toda: se o celular do pai dorme na sala também, a regra deixa de ser punição e passa a ser cultura da família. Compre um carregador só para isso e chame de “base”.' },
      { t: '2. Dois modos, anunciados em voz alta', d: 'Modo Ferramenta (durante os blocos): só cronômetro, câmera e Google Earth; aparelho fora da mesa, virado para baixo, em cima de um móvel; ele mesmo anuncia “modo ferramenta”. Modo Diversão: depois dos blocos, no tempo conquistado. Nunca os dois ao mesmo tempo. Celular na mesa durante o estudo derruba o rendimento mesmo desligado, só pela presença.' },
      { t: '3. Trinta minutos de janela limpa antes de estudar', d: 'Nada de tela nos 30 minutos que antecedem o Bloco 1. Jogo e vídeo curto deixam o cérebro acostumado ao estímulo rápido; estudar logo depois é quase impossível para qualquer criança — e é daí que nasce boa parte da “falta de atenção”. Na janela: café, banho, arrumar a mochila, conversar.' },
      { t: 'Tempo de tela: conquistado, não concedido', d: '30 minutos por dia são garantidos (piso garantido remove o desespero que faz criança esconder celular). O resto se conquista com XP. Sábado é o dia grande de jogo, com duração definida pelo nível alcançado. NUNCA retire tempo já conquistado como punição — se isso acontecer uma vez, o sistema morre. Consequência de mau comportamento existe, mas tem que vir de outra moeda, nunca do XP.' },
    ],
    destaques: [
      { tipo: 'info', titulo: 'Combine isto na primeira conversa, antes de valer', texto: 'Apresente o protocolo como regra da casa que vale a partir de segunda-feira, não como reação a boletim. E deixe ele negociar UMA coisa: o horário do Bloco 2, a cor do quadro, qual jogo vale no sábado. Criança que participou da montagem da regra cumpre a regra; criança que só recebeu a regra testa a regra.' },
    ],
  },
  {
    id: 'xp', titulo: 'Sistema de XP e recompensas',
    intro: 'O XP não mede acerto — mede esforço e comportamento de estudo. Pontua por ter feito, não por ter acertado. Nota não se controla; esforço, sim.',
    itens: [
      { t: 'Tabela', d: 'Caligrafia do dia 5 · cada sprint concluído sentado 10 · Missão do Dia completa +10 · episódio gravado 15 · explicar sem olhar 20 · refazer e acertar um erro de ontem 10 · prova classificada no diário de erros 15 · Desafio do Pai no sábado 25 · semana com 5 dias completos +30.' },
      { t: 'Níveis (ajustáveis em Config)', d: 'Bronze 150 XP: +30 min de jogo no sábado. Prata 200 XP: +1 h de jogo e escolhe o jantar de domingo. Ouro 250 XP: programa de domingo escolhido por ele, com você (bola, bicicleta, praia, observação do céu). 4 semanas Ouro seguidas: Conquista do Mês — recompensa grande combinada antes.' },
      { t: 'A trilha da astronomia', d: 'O prêmio maior não deve ser mais tela: é tempo com você fazendo o que ele escolhe. Grátis: noite de observação no quintal com um mapa do céu. Passeio: planetário da UFMA e planetário móvel da SECTI; noites de observação com telescópio no Mirante da Cidade (confirme a agenda antes de prometer). Conquista do Mês: um binóculo 10×50 — custa uma fração de um telescópio e já mostra as quatro luas de Júpiter.' },
      { t: 'Seus 10 minutos por dia', d: 'Antes (1 min): escrever a Missão do Dia (Recado do dia). Durante (0 min): não estar por perto — disponível no ambiente ao lado. Depois (5 min): “me explica” — você só pergunta “por quê?” e “e daí?”; não corrija na hora, anote e devolva como pergunta no dia seguinte. Sábado (25 min): Desafio do Pai, soma do XP e escolha da recompensa. Sempre: elogie o processo, não a inteligência — “você ficou os 12 minutos sentado, isso é difícil” constrói persistência; “você é inteligente” constrói medo de errar.' },
    ],
  },
  {
    id: 'implantacao', titulo: 'Implantação: as primeiras semanas',
    intro: 'Não comece tudo na segunda-feira. Plano que estreia completo morre na segunda semana — a rampa é o que faz ele durar.',
    itens: [
      { t: 'Antes da rampa (fim do 3º bimestre)', d: 'Não se instala sistema novo em cima das provas finais. Rode apenas duas coisas: o Bloco 1 (caligrafia + Ginásio de Cálculo) e o ciclo D-3 da prova da semana. Sem XP, sem quadro, sem Desafio do Pai.' },
      { t: 'Semana 1 · a semana fácil', d: 'Só o Aquecimento e UM sprint de 12 minutos. Nada de vídeo, de Desafio do Pai, de XP ainda. Apresente o quadro e o jogo, deixe ele escolher onde colar na parede. Objetivo único: ele terminar a semana pensando “é só isso?”.' },
      { t: 'Semana 2 · entra o jogo', d: 'Dois sprints de 12 minutos. Começa o XP e entra a base de carregamento na sala. Episódio do canal 2× na semana. Primeiro fechamento de sábado, com recompensa de verdade — pequena, mas entregue na hora e sem discussão. A credibilidade do sistema nasce aqui.' },
      { t: 'Semana 3 · aumenta a carga', d: 'Sprints passam de 12 para 15 minutos. Episódio 3×. Entra o Desafio do Pai no sábado. Aqui você já vê qual matéria trava e qual horário rende mais.' },
      { t: 'Semana 4 · rotina completa', d: 'Tudo rodando. Primeira avaliação: converse com as duas professoras e pergunte especificamente se mudou a FORMA de responder dele — não se a nota subiu: nota demora um bimestre, comportamento de estudo muda em três semanas.' },
      { t: 'Para começar na segunda', d: 'Comprar ou separar: cronômetro de cozinha (melhor que o celular, não tem notificação), um carregador só para a “base” da sala, folhas A4 avulsas e lápis de cor, fita crepe. Combinar antes de valer: ler a carta junto com ele, sem pressa; deixá-lo escolher onde colar o quadro e uma regra para negociar; definir juntos a Conquista do Mês; anunciar a base de carregamento como regra da casa toda.' },
    ],
    destaques: [],
  },
  {
    id: 'acompanhamento', titulo: 'Acompanhar, evitar e perguntar',
    intro: 'Cinco coisas para não fazer, o registro de atenção e o que perguntar às professoras.',
    itens: [
      { t: 'Não fazer · 1. Aumentar as horas', d: 'Já está no limite. Mais tempo agora só piora rendimento e relação.' },
      { t: 'Não fazer · 2. Usar estudo como castigo', d: '“Vai estudar porque foi mal” ensina que estudar é punição — o oposto deste plano.' },
      { t: 'Não fazer · 3. Retirar XP conquistado', d: 'Quebra o contrato uma vez e ele nunca mais confia no jogo. XP só sobe.' },
      { t: 'Não fazer · 4. Comparar com irmão, colega ou primo', d: 'A única comparação legítima é com o XP dele da semana passada.' },
      { t: 'Não fazer · 5. Deixar cair no dia difícil', d: 'Em dia ruim, corte para 5 minutos — mas não pule. A corrente não pode quebrar.' },
    ],
    destaques: [
      { tipo: 'info', titulo: 'Se depois de 6 a 8 semanas nada mudar', texto: 'Com rotina estável, sono de 9 horas, celular fora do quarto e esforço presente, a maioria das crianças melhora de forma perceptível nesse prazo. Se não melhorar, vale levar o registro de atenção ao pediatra e conversar sobre uma avaliação mais completa — não como rótulo, mas porque dificuldade de atenção persistente em criança que se esforça tem causas identificáveis e tratáveis. Vale lembrar que a astronomia já pesa contra essa hipótese.' },
      { tipo: 'ok', titulo: 'Por que 9 horas de sono não é detalhe', texto: 'Aos 11 anos o recomendado é de 9 a 11 horas, e é durante o sono que a memória do dia se consolida. Criança que dorme tarde com o celular no quarto costuma apresentar exatamente o quadro descrito. Antes de qualquer outra hipótese, garanta o sono por três semanas e observe.' },
    ],
  },
];

export const PERGUNTAS_PROFESSORAS = [
  { p: 'Em que minuto da aula ele desliga?', revela: 'Nos primeiros 10 minutos, é conteúdo; depois de 30, é fadiga.' },
  { p: 'Quando ele erra, é por não saber ou por não ler o enunciado até o fim?', revela: 'Separa lacuna de conteúdo de pressa — são problemas opostos.' },
  { p: 'Ele explica a matéria em voz alta, sem o caderno?', revela: 'É o teste real do aprendizado.' },
  { p: 'Em História e Geografia, o que falha: ler, lembrar ou relacionar?', revela: 'Cada um pede uma técnica diferente.' },
];

export const CARTA_LUAN = [
  'Antes das regras, uma coisa que talvez você nunca tenha parado para pensar: você sabe de cor todos os planetas, quantas luas cada um tem e a história de cada um. Isso é um montão de nome e de número — exatamente o tipo de coisa que “não entra” na sua cabeça em História e Geografia.',
  'Quer dizer que o problema nunca foi a sua memória. Sua memória é ótima. O que acontece é que a escola te entrega a matéria pelo lado chato, e ninguém guarda nada assim. Então a gente vai trocar o lado — e você vai descobrir que metade da matéria de História já está dentro das suas coisas de astronomia. Os nomes dos planetas, por exemplo, são todos deuses romanos. Você já sabia Roma e não sabia que sabia.',
];

export const REGRAS_LUAN = [
  { t: 'É curto.', d: 'Dois blocos de 12 minutos por dia. Quando o cronômetro toca, você para — mesmo que esteja no meio e mesmo que esteja bom. Nada de estudar duas horas.' },
  { t: 'O caderno fica fechado.', d: 'Estudar não é ler de novo. É tentar lembrar sem olhar, errar, e só então conferir. Se você errar bastante no começo, está certo — é assim que funciona. Errar e descobrir vale ponto neste jogo.' },
  { t: 'O canal entra no jogo.', d: 'Três vezes por semana, um episódio de 1 minuto — no seu canal mesmo, numa série nova que liga o céu com a matéria da escola. Máximo de 2 takes, sem olhar o caderno. Escrever o roteiro já é estudar, então esse é o jeito mais fácil de ganhar XP que existe neste plano.' },
  { t: 'Você desenha em vez de copiar.', d: 'Em História e Geografia, você vai desenhar: linha do tempo, mapa de memória, as camadas da Terra — e pode comparar com as de Marte, se quiser. Desenhar é permitido. Desenhar é o estudo.' },
  { t: 'Você ganha XP e sobe de nível.', d: 'Todo sábado a gente soma. Bronze, Prata, Ouro. E XP nunca é tirado de você, aconteça o que acontecer. O que você conquistou é seu.' },
  { t: 'Domingo é folga.', d: 'Folga de verdade, e faz parte do plano. Descansar é o que faz o cérebro guardar o que você aprendeu na semana.' },
];
export const FECHO_CARTA = 'Uma coisa só: quando o bloco começa, o celular sai da mesa e fica virado para baixo. Ele volta depois — e no sábado ele volta com folga, dependendo do seu nível. Vamos começar na segunda. — Pai';
