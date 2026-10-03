# Missão 6º Ano

Plataforma de estudos do Luan (6º ano), construída a partir do plano **“Missão 6º Ano”**: sprints curtos,
recuperação ativa (puxar, não reler), jogo de XP e entrada na matéria pela astronomia.

Dois modos no mesmo aplicativo:

| | **Luan (aluno)** | **Pai (tutor)** |
|---|---|---|
| Para quê | Fazer a rotina do dia, com um toque por passo | Preparar, acompanhar, corrigir o rumo |
| Entrada | Botão “Sou o Luan” | Botão “Sou o pai” (com PIN opcional) |

É um site estático (HTML + CSS + JavaScript puro, **sem build e sem dependências**), instalável no celular/tablet
como aplicativo (PWA) e que **funciona offline**. Os dados ficam no aparelho; nada vai para a internet.

---

## Como usar

### Rodar localmente
```bash
cd missao-6ano
npm start            # http://localhost:8080  (ou: node scripts/serve.mjs 3000)
npm test             # 61 testes da lógica (planejador, XP, Ginásio, mesclagem/sincronização, conteúdo…)
```
Também serve qualquer servidor estático (`python3 -m http.server`). Abrir o `index.html` direto do disco
funciona para olhar, mas o modo offline/instalável exige `http(s)://`.

### Publicar (para abrir no celular do Luan e no seu)
Qualquer hospedagem estática serve — copie a pasta `missao-6ano/`:
- **Netlify**: arraste a pasta em *Deploy manually* (app.netlify.com/drop).
- **GitHub Pages**: *Settings → Pages → Deploy from branch* apontando para a pasta (ou copie o conteúdo para `/docs`).
- Depois, no celular: *Compartilhar → Adicionar à tela inicial*. Instalado, o navegador não apaga os dados por inatividade.

### Primeiros passos (o Painel do pai guia isso)
1. **Configurações**: crie um PIN, confira a data do início do 4º bimestre e os horários.
2. **Semana e provas**: cole a agenda (`08/10 História 2 Egito e Mesopotâmia`, uma por linha). O aplicativo distribui o ciclo D-3 sozinho.
3. **Matemática**: aplique o teste de 10 minutos (marco zero).
4. Leia a **carta** com o Luan (aparece na primeira abertura do modo dele).
5. **Cartas**: monte as cartas dos capítulos do bimestre (já vem um baralho inicial de 64 cartas).

### Dois aparelhos (o do Luan e o do pai): sincronização opcional
*Configurações → Sincronização entre aparelhos*:
1. No aparelho do pai, **Ativar e criar código**. O código (32 letras/números, 160 bits) é a “chave” da família — guarde como uma senha.
2. No aparelho do Luan, abra o **link de pareamento** (botão “Mostrar código e link”) ou digite o código em **Conectar**.

Depois disso o que um marca aparece no outro: envia poucos segundos após cada marcação e busca ao abrir o app, ao voltar à aba e a cada 45 s.
Se os dois mexem em coisas diferentes (ex.: o Luan marca a caligrafia e o pai escreve o recado do mesmo dia), **tudo é mantido** (mesclagem de 3 vias, `js/core/merge3.js`); se mexem exatamente no mesmo campo, vale a mudança do aparelho que está sincronizando.
Sem ativar, nada sai do aparelho; o backup manual (exportar/importar) continua existindo. Abas no mesmo navegador também se sincronizam sozinhas.

**Como funciona o servidor** (Supabase, região São Paulo): uma tabela `familias` com RLS ligado e **sem acesso direto**; só duas funções (`get_estado`, `set_estado`) leem/gravam, e só quem sabe o código. O servidor guarda apenas o *hash* do código e o estado em JSON, com controle de revisão para evitar sobrescrita. A chave publicável em `js/syncConfig.js` é pública por desenho.
Limites: quem obtém o código lê e altera os dados; não há recuperação de código perdido (os dados continuam no aparelho e podem ser reconectados com um código novo). O plano gratuito do Supabase pausa projetos sem uso por semanas — os dados continuam nos aparelhos e voltam a sincronizar quando o projeto é reativado.

---

## O que o aplicativo faz (plano → funcionalidade)

**Linha central fixa** (nunca muda): Bloco 1 Aquecimento → Bloco 2 Missão do Dia → Bloco 3 Episódio do canal → Bloco 4 Desafio do Pai.

| Parte do plano | No aplicativo |
|---|---|
| Bloco 1 · caligrafia + Ginásio de Cálculo | **Cálculo**: 5 faixas com geradores de contas, teclado numérico, cronômetro, modo “com o pai” (ele fala, o pai marca ✓/✗). Anota o **tempo**; sobe de faixa com a meta batida 3 dias seguidos; “arma da semana” |
| Bloco 2 · Missão do Dia (2 × 12 min + pausa) | **Missão**: sprints com cronômetro global (alarme mesmo trocando de tela), passos da técnica, pausa de 5 min, regras do sprint, “dia difícil” (modo 5 min mantém a corrente) |
| Rotação semanal (Seg História … Sex Português) | Modo padrão automático nas semanas sem prova |
| **Ciclo D-3** (D-3 fabricar · D-2 puxar · D-1 só o vermelho · Dia D não estudar) | **Planejador** (`js/core/planner.js`): distribui por prova, máx. 2 estágios ativos/dia, nunca dois D-2 juntos, prioridade História/Geografia e depois o maior peso, só em dias úteis. Cada estágio tem sua ferramenta (fábrica de cartas, sessão de cartas, **lista do vermelho** que passa do D-2 para o D-1) |
| Diário de erros A/B/C (15 XP) | **Erros e notas**: classifica, erro A vira carta-relâmpago, diagnóstico (“maioria B → o problema nunca foi estudo”) e gráficos |
| Matemática: teste de 10 min, “5 problemas”, “o erro volta amanhã”, 3 perguntas do enunciado | **Matemática** (teste com itens fixos, comparável daqui a um mês); **5 problemas** gerados; o fluxo guiado **O que pedem → que dados tenho (toque: usa/sobra) → o que liga**; erros voltam no dia seguinte (+10 XP) |
| A ponte da astronomia + regra dos 2 minutos | Pergunta-ponte do dia (com a “deixa” para o pai), 21 pontes; 10 ideias de episódio com roteiro de 1 minuto (Eratóstenes em destaque) |
| Cartas-relâmpago de Hist./Geo | Repetição espaçada (caixas 1·3·7·14·30 dias); “tente lembrar antes de virar” |
| Português: Caça ao detalhe, 3 perguntas ao contrário | 6 textos curtos de astronomia/História com perguntas; as 3 perguntas do Luan chegam ao pai à noite |
| Sistema de XP, níveis, Conquista do Mês | Tabela do plano (XP **sempre derivado**: não existe “tirar XP”), semana de 5 dias +30, Bronze/Prata/Ouro, fechamento de sábado, Quadro de Missões digital, cartela do mês, trilha da astronomia |
| Protocolo do celular | Janela limpa, celular na base (20h30), modos Ferramenta/Diversão nas regras do sprint |
| Rampa de 4 semanas | **Fases** automáticas por data (`js/core/phase.js`); recursos aparecem só na semana certa |
| Registro de atenção (3 semanas) | Entrada de 10 s no “Hoje do Luan” + análise (melhor horário, geral × por matéria, sono) |
| Perguntas às professoras, redução do reforço 5→3 dias | Tela **Professoras** com roteiro, anotações e “o que levar” |
| ICS da rotina | **Configurações → Calendário (.ics)** |
| Guia do pai (PDF), carta do Luan, quadro e cartela para imprimir | **Guia do plano** completo, carta na primeira abertura, Quadro com botão de imprimir |

## Decisões e suposições (confira!)

- **Início do 4º bimestre**: **12/10/2026** (confirmado pelo pai). Ajuste em *Configurações*; as fases (rampa) são calculadas a partir daí. Antes disso o aplicativo roda **só Aquecimento + ciclo D-3**, sem XP/quadro/Desafio do Pai, como o plano manda.
- **Duração do sprint**: 12 min em todas as fases, **15 min só na semana 3** (como está no plano). A “rotina completa” volta a 12. Se preferir 15 de lá em diante, é uma linha em *Configurações → Duração do sprint*.
- **Sprints do ciclo de prova**: D-3 e D-2 usam 2 sprints; **D-1 usa 1** (“doze minutos e acabou”); com dois estágios no mesmo dia, 1 sprint cada. O ciclo de prova **não** é reduzido pela fase (a semana 1 “com 1 sprint” vale para a rotação padrão).
- **XP e níveis**: a tabela de XP do plano soma **mais de 400** numa semana perfeita (caligrafia, 2 sprints, bônus, episódios, “expliquei”, Desafio e +30), enquanto o plano estima 250–300 numa semana “cheia” e fixa Bronze 150 / Prata 200 / Ouro 250. Mantive os valores do plano, mas os níveis e recompensas são **editáveis**. O “refazer erro” vale 1×/dia.
- **Dia livre/feriado** não quebra a corrente, não recebe estágio de prova e reduz o necessário para o bônus de semana cheia.
- **Fatos de astronomia**: usei valores conferíveis. O Monte Olimpo (~22 km) tem **mais de duas vezes e meia** a altura do Everest (8,8 km) — o PDF diz “quase três vezes”. Em português os dias da semana não vêm dos deuses (“segunda-feira”…); a ponte usa **espanhol e inglês** (*martes*, *Saturday*).
- **Tutor e aluno**: o PIN é uma trava de conveniência, não um cofre (os dados ficam no aparelho).

## Estrutura

```
index.html · manifest.webmanifest · sw.js         PWA (offline)
css/styles.css                                    tema espacial (aluno) e claro/escuro (pai)
js/app.js                                         shell e roteador (#/aluno/…, #/pai/…)
js/store.js                                       estado + localStorage + backup + sincronização entre abas
js/actions.js · js/sprintTimer.js · js/timer.js   ações com XP · cronômetro global · alarme
js/core/        LÓGICA PURA (testada com node --test)
   planner.js   ciclo D-3        phase.js     rampa        xp.js        XP/níveis/corrente
   dayplan.js   plano do dia     ginasio.js   faixas       problems.js  5 problemas
   leitner.js   cartas           insights.js  alertas      ics.js       calendário
js/data/        conteúdo (guia, técnicas, cartas, pontes, episódios, textos)
js/tools/       mini-aplicativos dentro dos sprints (cartas, problemas, refazer, perguntas, texto, prova)
js/views/aluno/ · js/views/pai/                   telas
tests/                                            61 testes
```

Dica de teste manual: acrescente `?hoje=2026-10-28` à URL para simular qualquer data (e ver as fases da rampa).

## Privacidade

Por padrão nenhum dado sai do aparelho: sem cookies de terceiros, sem fontes ou scripts externos. A única conexão externa é a **sincronização opcional** (Supabase), que só funciona depois que o pai ativa e cria o código da família.
O nome padrão do aluno é só “Luan” (troque em *Configurações*). O PDF e o plano não fazem parte do repositório.

## Evoluções possíveis

- Login por e-mail (em vez do código da família) caso o app passe a atender mais famílias.
- Mais baralhos prontos (Ciências, Inglês) e um banco maior de textos/problemas.
- Notificações/lembretes (hoje: exportar o `.ics` para o Google Agenda).
