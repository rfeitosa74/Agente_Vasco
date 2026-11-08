# Publicar a sala de aula na internet (Render)

Você vai precisar só de: a **chave do Gemini** (começa com `AIza`) e uma **senha** inventada por você. Essa senha é a do
usuário **`admin`** (o administrador), criado automaticamente.
A chave da OpenAI **não é usada** por este projeto; guarde-a, mas não precisa colocá-la em lugar nenhum.

## Passo 1 — Criar a conta no Render
1. Abra https://dashboard.render.com/register
2. Clique em **GitHub** para entrar com a sua conta do GitHub e autorize o Render.

## Passo 2 — Criar o site
1. Abra https://dashboard.render.com/blueprints e clique em **New Blueprint Instance**.
2. Se o repositório **Agente_Vasco** não aparecer, clique em **Configure account** e dê acesso a ele.
3. Escolha **Agente_Vasco** e, em **Branch**, escolha `claude/sharp-cerf-vfhtre` (ou `main`, se as mudanças já tiverem sido juntadas lá).
4. O Render mostra um formulário com dois campos. Cole:
   - **GEMINI_API_KEY**: a sua chave do Gemini;
   - **APP_PASSWORD**: a senha do administrador (usuário `admin`).
5. Clique em **Deploy Blueprint** (ou **Apply**) e espere de 3 a 5 minutos.
   O site usa o plano **Starter** com um **disco de 1 GB**, onde ficam usuários, salas, materiais e progresso
   (cerca de US$ 7,25 por mês). O Render pode pedir um cartão de crédito.

## Passo 3 — Entrar
1. Clique no serviço **minha-sala-de-aula**. O endereço do site aparece no alto, terminado em `.onrender.com`.
2. Abra o endereço e entre com o usuário **`admin`** e a senha que você escolheu.
3. Clique em **Usuários** e crie a conta do Luan (por exemplo, usuário `luan` e uma senha para ele).
4. Cada pessoa entra com o próprio usuário e cria as próprias salas (**+ Nova sala**): uma para cada disciplina, curso
   ou módulo. Dentro de cada sala, **+ Adicionar material**. O progresso fica salvo e a aula continua de onde parou.

## Bom saber
- **Atualizações:** quando o código muda no GitHub (no branch escolhido), o Render publica a nova versão sozinho em
  alguns minutos. Dá para acompanhar em **Events**, no painel do serviço.
- **Formatos:** o site aceita PDF, Word (.docx), texto, fotos, áudios e vídeos (até 100 MB). No plano grátis, vídeos
  grandes podem demorar alguns minutos para serem enviados e analisados.
- **Se o seu site já existia no plano grátis:** depois desta atualização, o Render passa a pedir o plano Starter com
  disco. Se ele não mudar sozinho, abra o serviço e, em **Settings → Instance Type**, escolha **Starter**; depois, em
  **Disks**, adicione um disco com *Mount Path* `/var/data` e 1 GB. Sem o disco, as salas somem a cada reinício.
- **Esqueceu a senha do admin?** No serviço do Render, abra **Environment**: o valor de `APP_PASSWORD` (clique no
  olho para ver) é a senha do `admin`, a menos que você a tenha trocado em **Minha conta**. Se mesmo assim não entrar:
  1. em **Environment**, coloque em `APP_PASSWORD` a senha que quer usar e crie `REDEFINIR_ADMIN` com o valor `sim`;
  2. clique em **Save Changes** e espere o site reiniciar; entre com `admin` e essa senha;
  3. volte em **Environment** e apague `REDEFINIR_ADMIN` (senão a senha volta a ser redefinida a cada reinício).
- **Trocar a chave do Gemini:** no serviço, abra **Environment**, edite o valor e clique em **Save Changes**.
- **Trocar senhas:** cada pessoa troca a própria em **Minha conta**; o administrador define a de qualquer usuário em
  **Usuários**. Trocar a senha desconecta os outros aparelhos dessa pessoa.
- **Infográficos** exigem faturamento ativado no Google AI Studio (veja o PASSO-A-PASSO-WINDOWS.md).
- **Segurança:** a chave fica guardada só no Render, nunca no navegador. Sem a senha configurada, o site se recusa a
  funcionar. Após 8 senhas erradas, o acesso daquele endereço fica bloqueado por 15 minutos.
