# Minha sala de aula

Sala de aula virtual para estudar a partir de um **PDF** ou de **anotações coladas**: um quadro verde com
representações visuais de cada conceito, um caderno de estudos com resumo e conceitos, um **tutor por voz em tempo
real** (API Live do Gemini), a atividade **“Agora eu explico”** e **infográficos** gerados com o Nano Banana Pro.

Tudo em português do Brasil, pensado para um aluno do fim do 6º ano.

## 1. O que você precisa

1. **Node.js 20 ou mais novo** (https://nodejs.org).
2. Uma **chave da API Gemini**: https://aistudio.google.com/apikey
3. **Faturamento ativado** no projeto dessa chave (Google AI Studio → *Billing*). O plano gratuito costuma bastar para
   análise e conversa, mas o **Nano Banana Pro** (infográficos) é um modelo pago: sem faturamento, o app mostra o erro
   “Faturamento necessário” e não gera imagem nenhuma.

## 2. Instalar e rodar

**Para publicar na internet com senha, siga [PUBLICAR-NA-INTERNET.md](PUBLICAR-NA-INTERNET.md)** (Render; você só cola a chave e a senha num formulário).

**No Windows, siga o [passo a passo sem comandos](PASSO-A-PASSO-WINDOWS.md)**: basta dar dois cliques em `INICIAR-SALA-DE-AULA.bat`.

Pelo terminal (qualquer sistema):

```bash
cd sala-de-aula
npm install
cp .env.example .env      # depois edite o .env e cole sua chave em GEMINI_API_KEY
npm run build
npm start
```

Abra **http://localhost:5173** no Chrome ou no Edge. Para desenvolver com recarga automática, use `npm run dev`.

Na tela inicial, clique em **“Verificar configuração e modelos”**: o app consulta a lista real de modelos da sua chave e
mostra qual modelo será usado em cada função (análise, tutor por voz e infográficos) ou o erro de cada uma.

### Segurança da chave

- A chave fica **só no servidor** (`.env`, que não vai para o Git). O navegador nunca recebe a chave.
- O tutor por voz usa um **token temporário de uso único** criado pelo servidor (válido por 30 minutos, e só pode
  iniciar uma sessão dentro de 2 minutos).
- **Login com senha** (`APP_PASSWORD`): obrigatório quando o site está na internet; sem senha, o servidor bloqueia todas
  as funções. A sessão fica num cookie seguro por 30 dias; 8 senhas erradas bloqueiam o endereço por 15 minutos.
- No computador local (`HOST=127.0.0.1`, o padrão) a senha é opcional.

## 3. Modelos usados

Os identificadores mudam com frequência; por isso o servidor **confere a lista real de modelos da sua chave** e escolhe
o primeiro disponível. Você pode fixar qualquer um no `.env`.

| Função | Variável | Ordem de preferência |
|---|---|---|
| Análise, quadro, respostas, avaliação, transcrição | `GEMINI_TEXT_MODEL` | `gemini-3.8-flash`, `gemini-3-flash-preview`, `gemini-2.5-flash` |
| Tutor por voz (API Live, áudio nativo) | `GEMINI_LIVE_MODEL` | `gemini-3.8-live`, `gemini-3.1-flash-live-preview`, `gemini-2.5-flash-native-audio-preview-*` |
| Infográficos (Nano Banana Pro) | `GEMINI_IMAGE_MODEL` | `gemini-3-pro-image`, `gemini-3-pro-image-preview` |

Para o infográfico **não há substituição por outro modelo**: se o Nano Banana Pro não estiver disponível, o app
mostra o erro. As imagens são pedidas em **16:9 e 2K** (`imageConfig: { aspectRatio: '16:9', imageSize: '2K' }`). A
legenda da imagem mostra o modelo que realmente respondeu e o tamanho real em pixels.

## 4. Formatos aceitos

| Formato | Site (Gemini) | Artefato do Claude |
|---|---|---|
| PDF | sim (texto e figuras) | sim (texto e imagens das páginas) |
| Word `.docx` | sim (o texto é extraído no navegador) | sim |
| Texto `.txt` / `.md` ou anotações coladas | sim | sim |
| Foto (JPG, PNG, WebP, HEIC) | sim | sim (JPG, PNG, WebP) |
| Áudio (MP3, WAV, M4A, AAC, OGG, FLAC) | sim, com momentos (mm:ss) de cada conceito | não (o artefato não envia áudio ao Claude) |
| Vídeo (MP4, MOV, WebM, AVI, MPEG) | sim, com momentos (mm:ss) de cada conceito | não |

- Limites: PDF até 19 MB; áudio, vídeo e foto até 100 MB (`LIMITE_MIDIA_MB`). Vídeos e arquivos acima de 15 MB vão
  pela API de arquivos do Gemini (ficam guardados lá por 48 horas).
- Word antigo (`.doc`) não é aceito: salve como `.docx` ou exporte como PDF. Imagens dentro do Word não são lidas;
  para elas, exporte como PDF.
- Em áudio e vídeo, os momentos citados pelo Gemini são conferidos com a duração real; os que não existem são
  descartados. Na janela “Material original”, botões levam o player direto ao momento de cada conceito.

## 5. Versão como artefato do Claude

`npm run build:artefato` gera, em `dist-artefato/`, uma versão que roda dentro do claude.ai, com a conta de quem abre,
sem chaves de API. Nessa versão o Claude faz a análise, o quadro, as respostas e a avaliação; o tutor e o “Agora eu
explico” são por escrito (o artefato não pode usar o microfone) e o infográfico é desenhado pelo Claude em SVG (o Nano
Banana Pro não pode ser chamado de dentro do artefato). Teste: `tests/artifact-e2e.mjs`.

## 6. Como funciona

- **Início**: o PDF é aberto no navegador (pdf.js, para contar e mostrar as páginas) e enviado ao servidor, que pede ao
  Gemini a análise do conteúdo real, incluindo figuras. Números de página inexistentes são descartados; anotações em
  texto são referenciadas por seções, nunca por páginas. Se o material não puder ser analisado, aparece o erro e o
  botão “Tentar novamente”.
- **Quadro**: cada conceito vira uma representação estruturada (desenho com legendas, comparação, processo, gráfico,
  esquema de relações ou texto), desenhada em SVG (`shared/board.js`). Antes de aparecer, o quadro passa por:
  1. validação automática (legendas sobrepostas ou cortadas, ligações inválidas, elementos fora da área);
  2. **revisão de precisão**: o desenho é convertido em imagem e enviado ao Gemini junto com o material, para conferir
     posições, setas, sombras e legendas;
  3. correção, se a revisão encontrar problemas. Se não houver desenho confiável, o quadro mostra uma explicação em
     texto e a figura original do PDF. O selo no rodapé do quadro mostra o resultado da revisão.
- **Atalhos e perguntas**: usam o conceito selecionado, o quadro atual e a conversa anterior. Quando ajuda, o quadro é
  redesenhado; o aviso “O quadro foi atualizado” só aparece se ele realmente mudou.
- **Tutor por voz**: sessão Live com áudio de entrada (16 kHz) e de saída (24 kHz), detecção automática de fala (não
  é preciso clicar a cada fala), interrupção, transcrição expansível, silenciar, encerrar e tentar de novo. O tutor
  recebe por escrito o material, o conceito, a descrição do quadro e as ações do aluno, além de uma imagem do quadro. Ele
  pode **trocar de conceito, destacar elementos, redesenhar o quadro, criar infográficos e abrir “Agora eu explico”**
  por chamadas de ferramenta ligadas aos componentes reais; cada resultado volta para ele (`ok` ou erro).
- **Agora eu explico**: pergunta aberta; resposta por voz (gravada e transcrita pelo Gemini) ou por escrito, com texto
  editável; a avaliação só acontece ao clicar em “Terminei minha explicação”.
- **Infográficos**: botão no caderno ou pedido por voz, ambos chamando a mesma função. Primeiro é preparada uma direção
  visual a partir da dúvida e do material; depois a imagem é gerada. Há ampliação, download na resolução original,
  correção específica (envia a imagem atual e a instrução ao modelo), revisão visual (apresentada como orientação) e
  “Perguntar ao tutor sobre este infográfico”.
- **Trocar material** encerra a conversa por voz e apaga quadros, perguntas e infográficos, para não misturar materiais.

## 7. Testes

```bash
npm test            # testes unitários (sem rede)
npm run typecheck
```

Teste ponta a ponta da interface (Chromium + Playwright), usando um **servidor Gemini simulado** que só existe para os
testes (`tests/fake-gemini.mjs`). Ele verifica a mecânica do app, não a qualidade das respostas reais:

```bash
npm run build
node tests/fake-gemini.mjs 8787 &
GEMINI_API_KEY=teste GEMINI_TEST_BASE_URL=http://127.0.0.1:8787 PORT=5180 NODE_ENV=production node server/index.js &
APP=http://127.0.0.1:5180 FAKE=http://127.0.0.1:8787 npm run e2e
# formatos (crie uma pasta com materia.docx, aula.wav, aula.mp4 e foto.png):
MIDIA=pasta node tests/formatos-e2e.mjs
```

`GEMINI_TEST_BASE_URL` serve **apenas** para esses testes; não defina essa variável no uso normal.

## 8. Verificação manual com a sua chave

Os itens abaixo dependem da API real e de áudio audível, e precisam ser conferidos por você:

1. Envie dois materiais de temas diferentes e confira se os conceitos e os desenhos mudam.
2. Com um material sobre eclipses: no eclipse solar, a Lua fica entre o Sol e a Terra; no lunar, a Terra fica entre o
   Sol e a Lua; as sombras ficam atrás do corpo que bloqueia a luz; umbra e penumbra são regiões diferentes; a
   inclinação da órbita aparece desenhada. Leia também o selo de revisão no rodapé do quadro.
3. Clique em “Conversar com o tutor”, permita o microfone e converse sem clicar entre as falas. Interrompa o tutor no
   meio de uma frase. Peça “destaque a Lua”, “mude para o eclipse lunar”, “desenhe de outro jeito” e “crie um
   infográfico”. Use fones de ouvido se o tutor ouvir a própria voz.
4. Gere um infográfico, amplie, baixe, peça uma correção (“aumente as legendas”) e pergunte ao tutor sobre ele.
