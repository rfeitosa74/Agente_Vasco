# Manual do administrador — Minha sala de aula

Leia também o [Manual do usuário](MANUAL-USUARIO.md): o administrador usa as salas como qualquer pessoa.

## 1. Acessos

| O quê | Endereço |
|---|---|
| Site (uso diário) | https://insistent-light-websphere.replit.app |
| Painel do app no Replit | https://replit.com/replid/407494c0-2158-4919-af7d-b2a39d6ef529 |
| Código no GitHub | https://github.com/rfeitosa74/Agente_Vasco (branch `claude/sharp-cerf-vfhtre`, pasta `sala-de-aula`) |
| Chave do Gemini | https://aistudio.google.com/apikey |

## 2. Credenciais

> **Atenção:** as senhas **não estão escritas aqui de propósito**. Este arquivo fica num repositório público do
> GitHub, e o assistente que montou a plataforma nunca viu as senhas: você as digitou direto no Replit e no site.
> Preencha a coluna "Senha" **só numa cópia particular** (impressa ou num gerenciador de senhas), nunca no GitHub.

### Contas do site

| Nome | Usuário | Perfil | Senha | Onde foi definida |
|---|---|---|---|---|
| Administrador | `admin` | Administrador | ____________ | Segredo `APP_PASSWORD` no Replit (valor inicial) |
| Rubens Feitosa | `rubens.feitosa` | Administrador | ____________ | Criada por você na tela **Usuários** |
| Luan Carlos | `luan.carlos` | Aluno | ____________ | Criada por você na tela **Usuários** |

### Segredos e variáveis no Replit (ferramenta **Secrets**)

| Nome | Para que serve | Valor |
|---|---|---|
| `GEMINI_API_KEY` | Chave da IA do Google (começa com `AIza`, 39 caracteres) | guardado no Replit |
| `APP_PASSWORD` | Senha inicial do usuário `admin` | guardado no Replit |
| `REPLIT_BUCKET_ID` | Identificador do armazenamento permanente (não é segredo) | guardado no Replit |

Para ver um valor: Replit → **Secrets** (cadeado) → clique no olho ao lado do nome.

### Outras contas envolvidas
Replit (hospedagem), Google AI Studio (chave e faturamento do Gemini) e GitHub (código): todas com o seu próprio
login. Ative a verificação em duas etapas nas três.

## 3. Usuários (menu **Usuários**)
- **Criar:** preencha nome, usuário (minúsculas, sem espaços) e senha (mínimo 6; recomendo 12 ou mais). Marque
  "Também é administrador" só para adultos de confiança.
- **Trocar perfil:** escolha *Aluno* ou *Administrador* na coluna **Perfil** e confirme. Salas, materiais e
  progresso da pessoa são mantidos.
- **Definir senha:** clique em **Definir senha** na linha da pessoa. Os aparelhos dela são desconectados.
- **Remover:** apaga a pessoa e **todas as salas e materiais dela**, sem volta.
- O administrador **não vê** as salas dos outros usuários. Você não pode remover a própria conta nem tirar o
  próprio perfil de administrador.

## 4. Senha do `admin` esquecida
1. Outro administrador pode redefinir em **Usuários → Definir senha**.
2. Se não houver outro: no Replit, em **Secrets**, altere `APP_PASSWORD` para a nova senha, crie
   `REDEFINIR_ADMIN` com o valor `sim` e clique em **Republicar**. Entre com `admin` e a nova senha.
3. **Apague `REDEFINIR_ADMIN`** e republique. Se ficar lá, a senha volta ao valor de `APP_PASSWORD` a cada reinício.

## 5. Manutenção no Replit
- **Republicar:** botão **Republicar** no alto do painel. Necessário depois de mudar Secrets ou o código.
  Leva de 3 a 6 minutos; os dados não se perdem.
- **Tipo de publicação:** deve ser **Reserved VM** (uma máquina sempre ligada). Não mude para *Autoscale*.
- **Trocar a chave do Gemini:** Secrets → `GEMINI_API_KEY` → cole a nova → **Republicar**.
- **Registros:** aba **Registros** (Logs) da publicação. Linhas úteis:
  - `[armazenamento] Replit Object Storage: N arquivo(s) de dados restaurado(s).` → dados permanentes funcionando;
  - `[login] falha` / `[login] bloqueado` → tentativas de acesso;
  - `[gemini] ...` → lentidão ou troca de modelo da IA.
- **Aviso vermelho "os dados não estão sendo guardados de forma permanente":** o Object Storage não está ligado.
  Siga os passos do próprio aviso.
- **Atualizar o código:** peça ao assistente, ou no Replit use **Git → Pull** e depois **Republicar**.

## 6. Dados e cópia de segurança
- Tudo fica no **Object Storage** do Replit, na pasta `sala-de-aula/`: `usuarios.json` (senhas só em forma de
  hash), `segredo.txt` (assinatura das sessões) e `salas/<usuário>/<sala>/…`.
- **Cópia de segurança:** no painel **Object Storage**, baixe a pasta `sala-de-aula/` de tempos em tempos.
- A pré-visualização do Replit usa o **mesmo** armazenamento do site: evite testes nela.

## 7. Custos
- **Replit:** a publicação Reserved VM e o Object Storage são cobrados conforme o seu plano.
- **Google (Gemini):** análise, respostas e voz consomem a cota da chave; **infográficos exigem faturamento
  ativado** no Google AI Studio. Há um limite de 15 infográficos por hora e 90 pedidos de IA a cada 5 minutos por
  usuário (variáveis `LIMITE_IMAGENS_POR_HORA` e `LIMITE_IA_POR_5MIN`).
- **Render:** não é mais usado. Apague o serviço `minha-sala-de-aula` no painel do Render, se ainda existir.

## 8. Segurança — rotina recomendada
- Senhas longas e únicas nas contas de administrador; use `rubens.feitosa` no dia a dia e guarde o `admin`.
- Verificação em duas etapas no Replit, Google e GitHub.
- Não escreva senhas nem a chave do Gemini em conversas, e-mails ou no GitHub.
- Suspeita de acesso indevido: troque a senha da conta (desconecta todos os aparelhos) e olhe os registros.
- Leia o [Relatório de segurança](RELATORIO-SEGURANCA.md) para os riscos conhecidos.

## 9. Problemas comuns
| Sintoma | Causa provável | Solução |
|---|---|---|
| "Chave inválida" | Valor errado em `GEMINI_API_KEY` | A mensagem diz o que há de errado no formato. Cole a chave certa e republique. |
| "Faturamento necessário" | Projeto do Google sem faturamento | Ative em aistudio.google.com (Billing). |
| "Modelo indisponível" | O Google mudou o nome de um modelo | Defina `GEMINI_TEXT_MODEL`, `GEMINI_LIVE_MODEL` ou `GEMINI_IMAGE_MODEL` em Secrets. |
| Usuários ou salas sumiram | Armazenamento desligado | Veja o aviso vermelho; confira o Object Storage e `REPLIT_BUCKET_ID`. |
| Sala "sumiu" | Você entrou com outra conta | Cada conta vê só as próprias salas. |
