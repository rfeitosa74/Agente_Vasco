# Sorteio Auditável

Sistema de sorteio em página única (`index.html`) — cole uma lista de participantes (um por linha, com nome, e-mail, telefone ou o que for necessário) e sorteie um ou mais vencedores.

## Integridade e aleatoriedade

- **CSPRNG**: números vêm de `crypto.getRandomValues` (gerador criptográfico do sistema operacional), nunca de `Math.random()`.
- **Sem viés**: inteiros uniformes por *rejection sampling* (elimina o viés de módulo) e seleção por Fisher–Yates parcial.
- **Verificável**: cada sorteio gera uma **ata** (JSON) com numeração sequencial, id único, data/hora (local + ISO + fuso horário), localização GPS opcional, a impressão digital SHA-256 da lista, os números aleatórios consumidos e o **hash SHA-256 da própria ata** — resumido num código de verificação e num **QR Code**. Com a ata + a lista original, qualquer pessoa reproduz o resultado na seção "Verificar um sorteio" — qualquer alteração na lista, na ata ou no resultado faz a verificação falhar.
- **Log local**: cada sorteio é registrado num log do dispositivo (localStorage), com nº, data/hora, participantes e hashes, exportável em JSON.
- **Privacidade**: tudo roda no navegador; a lista não é enviada a servidor algum.

## Uso

Abra `index.html` em qualquer navegador moderno. Sem dependências, sem build.

Algoritmo registrado na ata: `FY-RS-SHA256-v1`.
