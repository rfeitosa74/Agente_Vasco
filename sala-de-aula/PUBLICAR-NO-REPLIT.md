# Publicar a sala de aula no Replit

O Replit mantém o site sempre ligado (publicação **Reserved VM**) e guarda usuários, salas e materiais no
**Object Storage**, que não se apaga quando o site é publicado de novo.

Você vai precisar de: a **chave do Gemini** (começa com `AIza`) e uma **senha** inventada por você para o usuário
**`admin`** (o administrador).

## Passo 1 — Importar o projeto do GitHub
1. Entre em https://replit.com e clique em **+ Create App** (ou **Create**) → **Import from GitHub**.
2. Se pedir, conecte a sua conta do GitHub e dê acesso ao repositório **Agente_Vasco**.
3. Escolha **rfeitosa74/Agente_Vasco** e confirme a importação.
4. Se o Replit oferecer o Agent para "configurar" o projeto, recuse: a configuração já vem pronta no projeto.
5. Abra a ferramenta **Git** e, em **Branch**, escolha `claude/sharp-cerf-vfhtre` (se o projeto já estiver em
   `main` com estas mudanças, pule este item).

## Passo 2 — Guardar a chave e a senha (Secrets)
1. Abra a ferramenta **Secrets** (cadeado).
2. Clique em **New Secret** e crie:
   - `GEMINI_API_KEY` = a sua chave do Gemini;
   - `APP_PASSWORD` = a senha do usuário `admin`.

## Passo 3 — Criar o armazenamento permanente
1. Abra a ferramenta **Object Storage** (procure por “Object Storage” na lista de ferramentas).
2. Clique em **Create new bucket** e confirme o nome sugerido.
3. Se depois aparecer o aviso vermelho com “A bucket name is needed”, copie o identificador do bucket (na tela do
   Object Storage) e crie em **Secrets** a variável `REPLIT_BUCKET_ID` com esse valor.

## Passo 4 — Testar
Clique em **Run**. Depois de 1 ou 2 minutos aparece a tela de entrada na janela de visualização. Entre com o usuário
`admin` e a senha do `APP_PASSWORD`. Se aparecer um aviso vermelho sobre os dados, o Object Storage não foi criado
(volte ao passo 3).

## Passo 5 — Publicar
1. Clique em **Publish** (ou **Deploy**).
2. Escolha **Reserved VM** (a menor máquina basta) — não use *Autoscale*, que pode abrir várias cópias do site e
   desligá-lo quando ninguém usa.
3. Confira se os Secrets aparecem na publicação e clique em **Publish**.
4. O endereço do site aparece no fim (termina em `.replit.app`). Entre com `admin`, crie o Luan em **Usuários** e as
   salas em **+ Nova sala**.

## Bom saber
- **Atualizações:** quando o projeto mudar no GitHub, abra a ferramenta **Git**, clique em **Pull** e depois em
  **Republish**. Os dados continuam no Object Storage.
- **Esqueceu a senha do admin?** Em **Secrets**, mude `APP_PASSWORD`, crie `REDEFINIR_ADMIN` com o valor `sim`,
  republique, entre com `admin` e a nova senha e depois apague `REDEFINIR_ADMIN`.
- **Infográficos** exigem faturamento ativado no Google AI Studio.
