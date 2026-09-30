# Sorteio SCDP — sorteio auditável offline

Sistema de sorteio do **I Workshop do Setor de Concessão de Diárias e Passagens (SCDP)** em um **único arquivo HTML autossuficiente** (`index.html`): fontes e gerador de QR Code vêm embutidos, e nada é buscado na internet. Basta abrir o arquivo em qualquer navegador moderno (Windows, macOS, Linux, Android, iOS).

## Como usar

1. Abra `index.html` no navegador (duplo clique).
2. Cole a lista de participantes, um por linha (só o nome, ou nome + e-mail + telefone).
3. Escolha o nº de sorteados e clique em **Sortear**.
4. Guarde a **ata** (copiar ou baixar) junto com a lista usada.

## Quem já foi sorteado não concorre de novo

Cada sorteado fica gravado numa **base de dados local** (IndexedDB do navegador). Nos sorteios seguintes ele é excluído automaticamente, mesmo que seja inserido na lista de novo com outra grafia. É considerada a mesma pessoa a linha que tiver:

- o mesmo **e-mail** (sem diferenciar maiúsculas);
- o mesmo **telefone/documento** (só os dígitos, ignorando formatação e o +55);
- o mesmo **nome** (sem diferenciar maiúsculas, acentos e espaços extras).

Os excluídos aparecem na tela e são listados na ata. Na seção **Base de sorteados e log** é possível:

- **Liberar** um sorteado (ex.: desistência) — exige motivo, que fica registrado no log;
- **Exportar/Importar backup** (JSON) — para guardar a base ou levá-la a outro computador;
- **Copiar log** e **Zerar base** (exige digitar ZERAR; baixa um backup antes).

A base vale por navegador e por computador. Use sempre o mesmo navegador no mesmo computador durante o evento, e exporte o backup ao final de cada rodada.

## Integridade e auditoria

- **Aleatoriedade**: `crypto.getRandomValues` (gerador criptográfico do sistema operacional), inteiros uniformes por *rejection sampling* e seleção por Fisher–Yates.
- **Base encadeada por hashes**: cada registro traz o SHA-256 do anterior; qualquer alteração é detectada e bloqueia novos sorteios até restaurar um backup íntegro.
- **Gravação antes da revelação**: o resultado vai para a base antes da contagem regressiva; recarregar a página não desfaz o sorteio.
- **Ata**: nº do sorteio, id único, data/hora com fuso, localização GPS opcional, registro na base, hashes da lista de entrada, dos elegíveis e da própria ata, os números aleatórios consumidos, um código de verificação e um QR Code.
- **Verificação**: com a lista + a ata, a seção "Verificar um sorteio" confere os hashes, confere as exclusões com a base e refaz o sorteio de forma determinística.
- **Política de segurança (CSP)**: só os dois scripts embutidos podem rodar (fixados por hash); injeção de código, `eval` e qualquer acesso à rede são bloqueados.

Limite conhecido: a ata não tem assinatura digital. Quem controla o computador pode, em tese, recriar uma base inteira; por isso atas publicadas (impressas ou com o QR Code) servem de âncora externa para auditoria.

## Desenvolvimento

O arquivo final é gerado a partir de `src/sorteio.template.html`:

```bash
npm install
npm run build   # gera index.html (arquivo único)
npm test        # testes de segurança e integridade (Playwright + Chromium)
```

Para rodar os testes fora deste ambiente, instale um Chromium (`npx playwright install chromium`) ou aponte `CHROMIUM_PATH` para um executável existente.

Algoritmo registrado na ata: `FY-RS-SHA256-v2` (atas `v1` da versão anterior continuam verificáveis).

Componentes de terceiros embutidos: fontes Barlow, Barlow Condensed e IBM Plex Mono (SIL Open Font License) e qrcode-generator de Kazuhiko Arase (licença MIT).
