# Relatório de análise de segurança — Minha sala de aula

Data: 10/11/2026 · Versão analisada: branch `claude/sharp-cerf-vfhtre` · Site: https://insistent-light-websphere.replit.app

## 1. Resumo

A plataforma está adequada para uso familiar na internet. A revisão do código não encontrou falha que permita a
alguém de fora entrar, ler dados de outro usuário ou obter a chave do Gemini. Seis pontos foram reforçados nesta
revisão (seção 3) e restam riscos menores e decisões que dependem do dono (seção 4).

**Limites desta análise.** Foi uma revisão de código e testes automatizados num ambiente de teste, com a IA do
Google simulada. O site publicado não pôde ser acessado diretamente daqui (restrição de rede da sessão), então a
configuração do Replit foi conferida apenas pelas respostas do Agent do Replit. Não é uma auditoria profissional
nem um teste de invasão feito por terceiros.

## 2. O que foi verificado e está correto

| Área | Verificação | Resultado |
|---|---|---|
| Acesso sem login | 20 rotas da API testadas sem login | Todas recusam (401) |
| Criação do administrador | Tentativa pela internet | Recusada; só pela senha `APP_PASSWORD` do servidor |
| Senhas | Armazenamento | Hash scrypt com sal por usuário; nunca em texto puro nem em respostas |
| Login | Mensagem de erro | Igual para usuário inexistente e senha errada |
| Login | Força bruta | 8 erros bloqueiam o endereço por 15 minutos |
| Sessão | Cookie | `HttpOnly`, `SameSite=Strict`, `Secure` em HTTPS, assinado (HMAC-SHA256), 30 dias |
| Sessão | Cookie adulterado (assinatura, validade, outro usuário) | Recusado |
| Sessão | Troca de senha | Encerra as outras sessões do usuário |
| Separação entre usuários | Ler, alterar, apagar sala/material de outro; usar material de outro na IA | Recusado, inclusive para o administrador |
| Permissões | Aluno tentando listar, criar, alterar ou remover usuários | Recusado (403) |
| Arquivos no servidor | Caminhos com `../` nos identificadores | Recusados (identificadores validados) |
| Chave do Gemini | Exposição ao navegador | Nunca enviada; o tutor por voz usa token temporário de uso único |
| Segredos no código | Busca no histórico do Git | Nenhuma chave ou senha encontrada |
| Envio de arquivos | Tipos aceitos | Lista fixa (PDF, Word, texto, imagem, áudio, vídeo); HTML e outros recusados |
| Conteúdo gerado pela IA | Desenho do quadro (SVG) | Textos escapados, cores e tipos de uma lista fixa |

## 3. Reforços aplicados nesta revisão

1. **Cabeçalhos de segurança no navegador**: política de conteúdo (CSP) que só permite scripts do próprio site e
   conexões ao próprio site e ao Google; bloqueio de exibição do site dentro de outras páginas; `nosniff`;
   `Referrer-Policy`; HSTS; remoção do cabeçalho que identifica o servidor.
2. **Pedidos de quem não entrou limitados a 50 KB**. Antes, o servidor lia até 40 MB de qualquer pedido antes de
   checar o login, o que permitia sobrecarregá-lo.
3. **Limite de uso da IA por usuário**: 90 pedidos a cada 5 minutos e 15 infográficos por hora (ajustáveis por
   `LIMITE_IA_POR_5MIN` e `LIMITE_IMAGENS_POR_HORA`). Protege a cota e o custo da chave.
4. **Arquivos enviados servidos como download isolado**, para nunca rodarem como página do site.
5. **Registro de logins** (entradas, falhas e bloqueios) nos registros do servidor, sem senhas.
6. **Erros de configuração não derrubam o servidor** (por exemplo, `APP_PASSWORD` curta demais).

Testes: `tests/seguranca.test-manual.mjs` (15 verificações, todas aprovadas) e os testes de tela com a CSP ativa
(aula completa, PDF, Word, áudio, vídeo, foto, tutor por voz simulado), sem nenhum bloqueio indevido.

## 4. Riscos que permanecem e recomendações

| # | Risco | Gravidade | Recomendação |
|---|---|---|---|
| 1 | **Repositório do GitHub é público**: qualquer pessoa lê o código (não há segredos nele). | Baixa | Se preferir, torne-o privado em *Settings → Danger Zone → Change visibility*. O Replit já tem a cópia do código. |
| 2 | **Senhas**: mínimo de 6 caracteres e sem segunda etapa (2FA). | Média | Use senhas longas (12+), diferentes das de outros sites, principalmente nas contas de administrador. |
| 3 | **Dois administradores** (`admin` e `rubens.feitosa`). | Baixa | Use `rubens.feitosa` no dia a dia; guarde o `admin` para emergências, com senha forte. |
| 4 | **Bloqueio de login é por endereço de rede**, não por conta, e os contadores zeram quando o servidor reinicia. | Baixa | Suficiente para uso familiar; senhas fortes compensam. |
| 5 | **Sair não invalida um cookie roubado** (sessão sem registro no servidor); vale 30 dias. | Baixa | Em caso de suspeita, troque a senha: isso encerra todas as sessões. |
| 6 | **Privacidade — Google**: materiais, perguntas e o áudio do tutor são enviados ao Gemini. | Média | Não envie documentos com dados pessoais sensíveis. Confira os termos da API do Gemini: no uso gratuito, o Google pode usar os dados para melhorar seus produtos; no uso pago, as condições são mais restritas. |
| 7 | **Dados no Replit sem criptografia própria do app**: quem tiver acesso à sua conta do Replit lê tudo. | Média | Proteja a conta do Replit com senha forte e verificação em duas etapas. |
| 8 | **Pré-visualização do Replit e site publicado usam o mesmo armazenamento.** | Baixa | Use sempre o endereço `.replit.app`; evite testes na pré-visualização. |
| 9 | **Sem cópia de segurança além do Object Storage.** | Média | Baixe periodicamente a pasta `sala-de-aula/` do Object Storage (painel do Replit). |
| 10 | **Dependências**: 6 alertas de gravidade moderada, todos em bibliotecas internas do cliente de armazenamento do Replit, sem correção disponível. | Baixa | Reavaliar quando o Replit atualizar a biblioteca (`npm audit`). |
| 11 | **Envios de até 100 MB ficam na memória do servidor**; um usuário autenticado mal-intencionado poderia sobrecarregá-lo. | Baixa | Aceitável com usuários de confiança. Reduza com `LIMITE_MIDIA_MB` se quiser. |
| 14 | **Visibilidade do código no Replit** não pôde ser confirmada daqui. | Baixa | No Replit, confira em **Convidar → Acesso** se o app está privado. |
| 12 | **Variável `REDEFINIR_ADMIN`** redefine a senha do `admin` a cada reinício enquanto existir. | Baixa | Apague-a logo depois de usar. |
| 13 | **Instruções escondidas em materiais** podem influenciar as respostas da IA. | Baixa | O impacto fica restrito à aula daquele material; o tutor só controla a tela (quadro, conceito, infográfico). |

## 5. O que o dono deve conferir

- [ ] Conta do Replit com verificação em duas etapas.
- [ ] Senhas fortes para `admin` e `rubens.feitosa`.
- [ ] Decidir se o repositório do GitHub fica público ou privado.
- [x] `REDEFINIR_ADMIN` não existe em Secrets do Replit (conferido em 10/11/2026).
- [ ] App privado no Replit (**Convidar → Acesso**).
- [ ] Entrar no site e confirmar que não aparece o aviso vermelho de armazenamento.
