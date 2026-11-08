# Passo a passo no Windows (sem comandos)

Faça uma vez só. Leva uns 20 minutos.

## Passo 1 — Instalar o Node.js
1. Abra https://nodejs.org/pt/download
2. Baixe o instalador para Windows da versão **LTS** e abra o arquivo baixado.
3. Clique em **Avançar (Next)** em todas as telas e depois em **Instalar**. Se o Windows perguntar se permite alterações, clique em **Sim**.

## Passo 2 — Criar a chave do Gemini
1. Abra https://aistudio.google.com/apikey e entre com a sua conta Google.
2. Clique em **Create API key** (Criar chave de API).
3. Clique no ícone de copiar ao lado da chave. Ela começa com **AIza**.
4. Não mande essa chave para ninguém: ela funciona como uma senha.

> Para os **infográficos** funcionarem, ative o faturamento: na mesma página, clique em **Set up billing**
> (Configurar faturamento) ao lado da chave e cadastre um cartão. Sem isso, todo o resto funciona, mas o botão
> "Criar infográfico" vai mostrar o erro "Faturamento necessário".

## Passo 3 — Baixar a sala de aula
1. Abra https://github.com/rfeitosa74/Agente_Vasco/archive/refs/heads/claude/sharp-cerf-vfhtre.zip
   (entre na sua conta do GitHub se ele pedir).
2. Abra a pasta **Downloads**, clique com o botão direito no arquivo ZIP e escolha **Extrair tudo…** → **Extrair**.

## Passo 4 — Abrir a sala de aula
1. Na pasta extraída, entre na pasta **sala-de-aula**.
2. Dê dois cliques em **INICIAR-SALA-DE-AULA** (o ícone de engrenagem).
   - Se aparecer "O Windows protegeu o computador", clique em **Mais informações** → **Executar assim mesmo**.
3. Na primeira vez, a janela preta pede a chave: clique com o **botão direito** dentro dela para colar e aperte **Enter**.
4. Espere a instalação (alguns minutos, só na primeira vez). O navegador abre sozinho com a sala de aula.

**Deixe a janela preta aberta** enquanto o Luan estuda. Para desligar, feche essa janela.

## Nos outros dias
Só o passo 4: dois cliques em **INICIAR-SALA-DE-AULA**.

## Problemas comuns
- **"O Node.js ainda não está instalado"**: faça o passo 1 e reinicie o computador.
- **"Chave inválida"** na sala de aula: apague o arquivo `.env` da pasta sala-de-aula e abra o INICIAR de novo para colar outra chave.
- **O microfone não funciona**: use o Chrome ou o Edge e clique em **Permitir** quando ele perguntar.
- **O tutor ouve a própria voz**: use fones de ouvido.
