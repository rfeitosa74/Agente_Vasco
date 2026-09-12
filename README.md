# Sorteio Auditável

Sistema de sorteio em página única (`index.html`) — cole uma lista de participantes (um por linha, com nome, e-mail, telefone ou o que for necessário) e sorteie um ou mais vencedores.

## Integridade e aleatoriedade

- **CSPRNG**: números vêm de `crypto.getRandomValues` (gerador criptográfico do sistema operacional), nunca de `Math.random()`.
- **Sem viés**: inteiros uniformes por *rejection sampling* (elimina o viés de módulo) e seleção por Fisher–Yates parcial.
- **Verificável**: cada sorteio gera uma **ata** (JSON) com a impressão digital SHA-256 da lista e os números aleatórios consumidos. Com a ata + a lista original, qualquer pessoa reproduz o resultado na seção "Verificar um sorteio" — qualquer alteração na lista ou no resultado faz a verificação falhar.
- **Privacidade**: tudo roda no navegador; a lista não é enviada a servidor algum.

## Uso

Abra `index.html` em qualquer navegador moderno. Sem dependências, sem build.

Algoritmo registrado na ata: `FY-RS-SHA256-v1`.
