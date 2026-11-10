# Recriar a plataforma "Minha sala de aula" do zero

Este arquivo é uma especificação completa para entregar a outra IA de programação. Ele descreve o que construir,
como, e as armadilhas já encontradas. O código de referência está em
https://github.com/rfeitosa74/Agente_Vasco (branch `claude/sharp-cerf-vfhtre`, pasta `sala-de-aula`). Se a IA puder
ler o repositório, peça que o use como referência; se não puder, este documento basta.

**Como usar:** cole tudo a partir de "PEDIDO" numa conversa nova. Entregue as chaves só por formulário seguro da
ferramenta, nunca no texto da conversa.

---

## PEDIDO

Construa um aplicativo web educacional chamado **"Minha sala de aula"**, em português do Brasil, para um aluno de
11 anos (fim do 6º ano) e a família dele. O app transforma um material de estudo (PDF, Word, texto, foto, áudio ou
vídeo) numa aula com quadro visual, caderno de conceitos, perguntas, tutor por voz em tempo real, avaliação da
explicação do aluno e infográficos. Funciona com qualquer tema; nunca troque a análise real por conteúdo de exemplo.

Regras gerais, válidas para tudo:
- Nada de botões decorativos, conversas simuladas ou indicadores de sucesso falsos.
- Estados de carregamento reais e erros compreensíveis, com "Tentar novamente". Em falha, nunca mostre conteúdo
  inventado no lugar do resultado.
- Chaves de API só no servidor.
- Ao terminar, diga o que implementou, o que testou e o que precisa de verificação manual. Não afirme ter
  verificado áudio audível ou respostas reais da IA se não verificou.

### 1. Tecnologia

- **Servidor:** Node.js 20+, Express 5, um único processo que serve a API e a interface já compilada.
- **Interface:** React 18 + TypeScript + Vite. Sem biblioteca de componentes; CSS próprio.
- **IA:** Google Gemini pelo SDK oficial `@google/genai`:
  - texto e multimodal (análise, quadro, respostas, avaliação, transcrição);
  - **Live API** (áudio nativo, voz em tempo real) para o tutor;
  - **Nano Banana Pro** (`gemini-3-pro-image` / `gemini-3-pro-image-preview`) para infográficos.
- **Outras bibliotecas:** `multer` (envios), `pdfjs-dist` (mostrar páginas do PDF no navegador), `mammoth` (texto de
  `.docx` no navegador), `@resvg/resvg-js` (transformar o SVG do quadro em PNG no servidor), `dotenv`,
  `@replit/object-storage` (dados permanentes no Replit).
- **Modelos:** os nomes mudam com frequência. O servidor deve **listar os modelos da chave** (`models.list`) e
  escolher o primeiro disponível de uma lista de preferência, com substituição por variável de ambiente
  (`GEMINI_TEXT_MODEL`, `GEMINI_LIVE_MODEL`, `GEMINI_IMAGE_MODEL`). Preferências usadas: texto
  `gemini-3.8-flash`, `gemini-3-flash-preview`, `gemini-2.5-flash`; Live `gemini-3.8-live`,
  `gemini-3.1-flash-live-preview`, `gemini-2.5-flash-native-audio-preview-*`; imagem sem substituto.

### 2. Usuários, sessões e permissões

- Cada pessoa tem **usuário e senha** e vê **somente as próprias salas**. Nem o administrador vê as salas alheias.
- Perfis: **Administrador** (cria, remove, define senha e troca o perfil de usuários) e **Aluno**.
- Trocar o perfil não altera senha, sessão, salas nem progresso. Deve existir sempre pelo menos um administrador;
  ninguém remove a própria conta nem tira o próprio perfil de administrador.
- **Primeiro administrador:** na internet, criado ao iniciar o servidor com usuário `admin` (ou `ADMIN_USER`) e a
  senha da variável `APP_PASSWORD`; sem usuários e sem `APP_PASSWORD`, a API fica bloqueada. No computador local
  (servidor em `127.0.0.1`), a primeira tela pede para criar o administrador.
- `REDEFINIR_ADMIN=sim` redefine a senha do `admin` para `APP_PASSWORD` ao iniciar (recuperação de acesso).
- Senhas: hash **scrypt** com sal por usuário; mínimo de 6 caracteres; usuário em minúsculas `[a-z0-9._-]{3,32}`.
- Sessão: cookie `HttpOnly`, `SameSite=Strict`, `Secure` em HTTPS, 30 dias, contendo
  `idDoUsuário.validade.assinatura`, com assinatura HMAC-SHA256 sobre id + validade + **versão da senha**. Trocar
  a senha aumenta a versão e encerra as outras sessões. O segredo da assinatura é gerado uma vez e guardado junto
  aos dados.
- Login: mensagem única para usuário inexistente e senha errada (faça o mesmo trabalho de hash nos dois casos);
  8 erros em 15 minutos bloqueiam o endereço de rede.

### 3. Salas, materiais e dados permanentes

- **Sala:** nome, tipo (disciplina, curso, módulo, outro), descrição. Botão **+ Nova sala**; editar; excluir.
- **Material:** pertence a uma sala. Guarda: metadados, arquivo original, **análise**, **estado da aula** (conceito
  atual, quadros já gerados por conceito, conversa, nível, último infográfico pronto) e as imagens dos infográficos.
- O estado é **salvo automaticamente** (com atraso de cerca de 1 segundo após mudanças). Reabrir um material
  continua de onde parou, **sem refazer a análise**.
- **Armazenamento em arquivos**, numa pasta `DATA_DIR`:
  `usuarios.json`, `segredo.txt`, `salas/<usuário>/<sala>/sala.json`,
  `salas/<usuário>/<sala>/materiais/<material>.json|.arquivo|-img-<id>.<ext>`.
  Gravação atômica (arquivo temporário + renomear). Todo identificador vindo do navegador deve casar com
  `^[a-zA-Z0-9-]{8,64}$` antes de virar caminho.
- **ARMADILHA CRÍTICA — hospedagens apagam o disco.** No Render grátis e no Replit, os arquivos somem a cada
  reinício ou publicação. Solução adotada: um **espelho**. Cada gravação local também é enviada ao Object Storage
  do Replit; ao iniciar, o servidor **apaga a pasta local e restaura** os arquivos pequenos (JSON/TXT) do
  armazenamento, que é a fonte da verdade; arquivos grandes são baixados sob demanda. As respostas da API só saem
  **depois** que as cópias terminam. Excluir também apaga no armazenamento. Aceite o identificador do bucket pela
  variável `REPLIT_BUCKET_ID` (a detecção automática falhou na prática).
- O administrador deve ver um **aviso vermelho** quando os dados não estão num lugar permanente (no Replit: espelho
  com erro; no Render: pasta de dados no mesmo dispositivo da raiz do sistema), com os passos para corrigir.

### 4. Materiais aceitos

| Formato | Tratamento |
|---|---|
| PDF (até 19 MB) | Enviado inteiro ao Gemini (lê figuras). O navegador conta e mostra as páginas com pdf.js. |
| Word `.docx` | Texto extraído no navegador com mammoth; tratado como texto. `.doc` antigo: recusar e explicar. |
| `.txt`, `.md`, texto colado | Texto (mínimo de 40 caracteres). |
| Imagem (JPG, PNG, WebP, HEIC) | Enviada ao Gemini. Referências por partes da imagem. |
| Áudio e vídeo (até 100 MB) | Enviados ao Gemini; vídeos e arquivos acima de 15 MB pela **API de arquivos** (expira em 48 h: reenviar quando passar de 40 h). Pedir os **momentos (mm:ss)** de cada conceito e seção. |

- Referências: **páginas reais** para PDF, **momentos** para áudio/vídeo, **seções** para o resto. O servidor
  descarta páginas fora do intervalo e momentos além da duração real. Nunca inventar numeração.
- "Ver material original": páginas do PDF, o texto, a foto ou um player com botões que pulam para cada momento.
- Materiais de exemplo (eclipses, frações, ciclo da água) claramente marcados como "Exemplo" e separados.

### 5. Tela da aula

Visual: fundo marfim com textura sutil de papel; **quadro verde grande com moldura de madeira discreta**; caderno
pautado à direita; letras grandes; branco, amarelo, azul-claro e coral para diferenciar elementos. Barra fixa
embaixo com os controles do tutor, sempre acessível.

- **Caderno:** título, resumo, lista de conceitos com referência (página, momento ou seção), nível das explicações
  (mais simples / normal / mais desafiador), botões "Agora eu explico", "Criar infográfico", "Ver anotações
  originais" e "Voltar à sala".
- **Quadro:** para cada conceito, uma representação que responde a uma pergunta específica.
- **Abaixo do quadro:** campo de pergunta e quatro atalhos — "Não entendi esta parte", "Explique de outra
  maneira", "Dê um exemplo do dia a dia", "O que acontece se mudarmos isso?". Cada resposta usa o conceito atual,
  o quadro atual e a conversa anterior; pode redesenhar o quadro ou destacar elementos. O aviso "o quadro foi
  atualizado" só aparece se ele realmente mudou.

### 6. Quadro didático (ponto central de qualidade)

O modelo **não gera SVG livre**. Ele devolve JSON num formato próprio, e o app desenha:

- `tipo`: `desenho` | `comparacao` | `processo` | `grafico` | `relacoes` | `texto`.
- Campos comuns: `pergunta`, `titulo`, `explicacao`, `legendaGeral` (ex.: "Fora de escala"), `fontes`, até 3
  `cartoes` complementares, `figuraOriginal` (página do PDF).
- `desenho`: lista de elementos (`circulo`, `elipse`, `retangulo`, `linha`, `seta`, `poligono`, `texto`) com
  coordenadas numa área de 1000×560, cor de uma **lista fixa de nomes**, camada, e legenda com posição opcional.
- `comparacao` (colunas × aspectos), `processo` (etapas, cíclico ou não), `grafico` (barras/linha, séries, marca
  de "valores ilustrativos"), `relacoes` (nós e ligações com rótulo), `texto` (blocos).
- Um único módulo (`shared/board.js`) valida e desenha, usado **no navegador e no servidor**. Todo texto é
  escapado; cada elemento tem `id` para poder ser destacado.

Fluxo de cada quadro: **gerar → validar automaticamente** (legendas sobrepostas ou cortadas, elementos fora da
área, ligações inválidas) **→ transformar em PNG → revisar** (segunda chamada ao modelo, com a imagem, o material e
a lista de problemas) **→ regenerar com as correções**, se preciso. Se não houver desenho confiável, mostrar texto
e a figura original. O selo no rodapé mostra o resultado; apresente a revisão como orientação, não garantia.

Regras para o modelo: escolher a representação adequada; conceitos relacionados não são etapas; não transformar
tudo em cartões; sombras atrás do corpo que bloqueia a luz, no sentido oposto à fonte; regiões distintas como
polígonos distintos; inclinações desenhadas de verdade. Testes de precisão com material sobre eclipses: solar =
Sol–Lua–Terra; lunar = Sol–Terra–Lua; umbra e penumbra separadas; inclinação orbital desenhada.

### 7. Tutor por voz (Gemini Live)

- Botão "Conversar com o tutor". Sessão **real** de áudio nos dois sentidos; conversa contínua sem clicar a cada
  fala; o aluno pode interromper. Não substituir por ditado + voz do navegador.
- **Autenticação:** o servidor cria um **token efêmero** (`authTokens.create`, API `v1alpha`, 1 uso, expira em 30
  min, janela de 2 min para iniciar) e o navegador conecta com ele. A chave nunca vai ao navegador.
- **Áudio:** captura a 16 kHz PCM16 com AudioWorklet (pedaços de 100 ms); reprodução a 24 kHz com fila; parar a
  reprodução quando o servidor sinalizar interrupção. Criar os AudioContext **dentro do clique**.
- Estados reais: desconectado, conectando, ouvindo, respondendo, erro. Silenciar, encerrar, tentar de novo,
  transcrição expansível (entrada e saída), retomada de sessão e compressão de contexto.
- **Contexto explícito:** o tutor recebe por texto o material, a lista de conceitos, o conceito atual, a descrição
  do quadro e as ações recentes do aluno, mais uma imagem do quadro; atualize a cada mudança. Ele não vê a tela.
- **Ferramentas** ligadas a componentes reais, com o resultado devolvido ao modelo: `mostrar_conceito`,
  `destacar_no_quadro`, `atualizar_quadro`, `criar_infografico` (responde "iniciado" e avisa quando a imagem ficar
  pronta ou falhar), `abrir_agora_eu_explico`. O tutor só anuncia mudanças depois de `ok: true`.
- Ao sair do material, encerrar a conversa para não misturar conteúdos.

### 8. Agora eu explico

Janela com uma pergunta aberta sobre o conceito. Resposta por voz (gravar, converter para WAV 16 kHz no navegador,
transcrever no servidor com o Gemini) ou por escrito; texto editável. Só avaliar ao clicar em **"Terminei minha
explicação"**. Avaliar o significado em relação ao material: o que acertou, o que faltou, o que confundiu, correção
breve. Sem elogio automático e sem inventar erros. Permitir tentar de novo e voltar ao quadro.

### 9. Infográficos (Nano Banana Pro)

Mesma função para o botão e para o pedido por voz. Duas etapas: (1) **direção visual** em JSON (pergunta
principal, título breve, ilustração principal grande, até 3 seções, legendas, conclusão, paleta, nota de escala,
cuidados científicos); (2) geração da imagem em **16:9 e 2K** (`imageConfig`). Mostrar o modelo que realmente
respondeu e o tamanho real. Ampliar, baixar na resolução original, corrigir (envia a imagem atual + instrução),
revisar (comparação com o material, como orientação) e "Perguntar ao tutor sobre este infográfico" (envia a imagem
ao Live). Diferenciar erros de faturamento, permissão, cota e modelo indisponível. Nunca gerar substituto.

### 10. Resiliência (aprendido na prática)

- O SDK **não tem tempo máximo** por padrão: defina (`httpOptions.timeout`) 150 s para texto e 240 s para imagem.
- Em erro 5xx, sobrecarga, resposta vazia ou JSON inválido: até 3 tentativas com espera crescente. Em tempo
  esgotado, não repetir: **trocar de modelo de texto**. Evitar por 5 minutos o modelo que falhou. Limite total de
  7 minutos; erro final com o que foi tentado.
- Se a conexão do navegador cair durante a análise, o servidor continua e salva; a tela **espera o resultado
  salvo**, com contador de tempo.
- Limpar a chave colada (espaços, aspas, `GEMINI_API_KEY=`) e, em erro de chave, descrever o formato sem revelá-la
  (ex.: "não começa com AIza", "parece chave da OpenAI"), dizendo onde corrigir conforme a hospedagem.

### 11. Segurança (obrigatório)

- Toda rota da API exige sessão, exceto `health`, `session`, `login`, `logout` e `setup` (só local).
- Corpo de pedidos sem login limitado a 50 KB; o leitor de corpo grande (40 MB) vem **depois** da autenticação.
- Cabeçalhos: CSP (`script-src 'self' blob: 'wasm-unsafe-eval'`, `connect-src` só o próprio site e
  `generativelanguage.googleapis.com` por https e wss, `frame-ancestors 'none'` fora do editor do Replit),
  `nosniff`, `X-Frame-Options`, `Referrer-Policy`, HSTS, sem `x-powered-by`, API sem cache.
- Arquivos enviados: lista fixa de tipos; servidos com `Content-Disposition: attachment` e CSP `sandbox`.
- Limite de uso da IA por usuário: 90 pedidos / 5 min e 15 infográficos / hora.
- Registrar logins, falhas e bloqueios (sem senhas).

### 12. Hospedagem

- **Não serve:** plataformas de funções curtas (ex.: Netlify), por causa de chamadas de minutos e envios de 100 MB.
- **Adotada: Replit**, publicação **Reserved VM** (uma máquina sempre ligada; nunca Autoscale), com Object
  Storage. Segredos: `GEMINI_API_KEY`, `APP_PASSWORD`; variável `REPLIT_BUCKET_ID`. Arquivo `.replit` na raiz do
  repositório apontando para a pasta do app (build: instalar e compilar; run: `node server/index.js --producao`).
- Alternativa: Render com plano pago e disco em `/var/data` (`DATA_DIR=/var/data`).
- Local (Windows): arquivo `.bat` que confere o Node, pede a chave, instala, compila e abre o navegador.

### 13. Testes exigidos

Crie um **servidor Gemini simulado**, usado só em testes, que responde no formato real (inclusive WebSocket do
Live, API de arquivos e falhas 500/503/lentidão), e com ele:
1. dois materiais de temas diferentes geram conceitos e representações diferentes;
2. trocar de conceito atualiza o contexto do tutor;
3. os atalhos respondem sobre o conceito selecionado;
4. áudio do Live chega ao servidor e as ferramentas alteram a tela;
5. "Agora eu explico" avalia a resposta enviada;
6. a revisão corrige um quadro com erro proposital;
7. infográfico: gerar, ampliar, baixar, corrigir, perguntar; erro de faturamento sem substituto;
8. cada formato de material; formato recusado explica o motivo;
9. usuários: separação entre contas, troca de perfil, troca de senha;
10. persistência: apagar o disco, reiniciar e conferir que tudo voltou;
11. segurança: rotas sem login, cookie adulterado, `../`, limites, cabeçalhos;
12. resiliência: 503 repetido, modelo que não responde, conexão cortada.

Verificação manual que só o dono pode fazer: respostas reais do Gemini, voz audível, infográfico real e o site
publicado.

### 14. O que pedir ao dono

1. Chave da API Gemini (aistudio.google.com/apikey) com **faturamento ativado** para infográficos.
2. Uma senha para o usuário `admin`.
3. Conta na hospedagem escolhida.
Peça por formulário seguro. Explique que a chave tem 39 caracteres e começa com `AIza`, e que não é a senha do site.

### 15. Versão opcional: artefato do Claude

Uma segunda compilação da mesma interface roda dentro do claude.ai, sem chaves, usando o Claude da conta de quem
abre. Limitações da plataforma: sem microfone e sem rede externa. Portanto: tutor e "Agora eu explico" por escrito,
infográfico desenhado em SVG pelo Claude, sem áudio/vídeo como material e sem salas guardadas.
