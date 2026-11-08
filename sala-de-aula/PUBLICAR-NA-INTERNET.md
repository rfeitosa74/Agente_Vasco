# Publicar a sala de aula na internet (Render)

Você vai precisar só de: a **chave do Gemini** (começa com `AIza`) e uma **senha** inventada por você para entrar no site.
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
   - **APP_PASSWORD**: a senha que você vai usar para entrar no site.
5. Clique em **Deploy Blueprint** (ou **Apply**) e espere de 3 a 5 minutos.

## Passo 3 — Entrar
1. Clique no serviço **minha-sala-de-aula**. O endereço do site aparece no alto, terminado em `.onrender.com`.
2. Abra o endereço, digite a senha e pronto. O navegador lembra de você por 30 dias.

## Bom saber
- **Atualizações:** quando o código muda no GitHub (no branch escolhido), o Render publica a nova versão sozinho em
  alguns minutos. Dá para acompanhar em **Events**, no painel do serviço.
- **Formatos:** o site aceita PDF, Word (.docx), texto, fotos, áudios e vídeos (até 100 MB). No plano grátis, vídeos
  grandes podem demorar alguns minutos para serem enviados e analisados.
- **Plano grátis:** o site "dorme" depois de 15 minutos sem uso; o primeiro acesso depois disso leva cerca de 1 minuto.
  No painel do Render, em **Settings → Instance Type**, o plano **Starter** (cerca de US$ 7 por mês) fica sempre ligado.
- **Trocar a chave ou a senha:** no serviço, abra **Environment**, edite o valor e clique em **Save Changes**. Trocar a
  senha desconecta todos os aparelhos.
- **Infográficos** exigem faturamento ativado no Google AI Studio (veja o PASSO-A-PASSO-WINDOWS.md).
- **Segurança:** a chave fica guardada só no Render, nunca no navegador. Sem a senha configurada, o site se recusa a
  funcionar. Após 8 senhas erradas, o acesso daquele endereço fica bloqueado por 15 minutos.
