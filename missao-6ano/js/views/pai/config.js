// Configurações: rampa, horários, XP, PIN, dias livres, backup e calendário.
import { h } from '../../util/dom.js';
import { getState, mutate, hashPin, temPin, confereOPin, exportarJson, importarJson, apagarTudo } from '../../store.js';
import { FASES, ORDEM_FASES, faseKey } from '../../core/phase.js';
import { gerarIcs } from '../../core/ics.js';
import { chip, confirmar, perguntarTexto, toast, baixarArquivo } from '../../ui.js';
import { weekStart, addDays, fmtDia, dow } from '../../util/dates.js';
import { sairDoPai } from '../../app.js';
import * as sync from '../../sync.js';
import { listar as listarAnexos, obterBlob, salvarBlob } from '../../anexos.js';
import { blobParaBase64, base64ParaBlob } from '../../core/syncAnexosCore.js';
import { abrirModal } from '../../ui.js';

export default function config(ctx) {
  const s = getState();
  const c = s.config;
  const hoje = ctx.hoje;
  const re = () => ctx.rerender();
  const raiz = h('div', { class: 'stack lg' });
  const salvar = (msg = 'Salvo') => { toast(msg); re(); };

  raiz.append(h('div', null, h('p', { class: 'eyebrow' }, 'Ajustes'), h('h1', { style: { margin: 0 } }, 'Configurações')));

  // ---------- identidade ----------
  const nomeA = h('input', { type: 'text', value: c.aluno, 'aria-label': 'Nome do aluno' });
  const nomeT = h('input', { type: 'text', value: c.tutor, 'aria-label': 'Nome do tutor' });
  raiz.append(h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, 'Quem usa'),
    h('div', { class: 'form-row' }, h('div', { class: 'field' }, h('label', null, 'Aluno'), nomeA), h('div', { class: 'field' }, h('label', null, 'Tutor (pai)'), nomeT)),
    h('button', { class: 'btn sm', onClick: () => { mutate((st) => { st.config.aluno = nomeA.value.trim() || 'Luan'; st.config.tutor = nomeT.value.trim() || 'Rubens'; }); salvar(); } }, 'Salvar nomes')));

  // ---------- PIN ----------
  raiz.append(h('div', { class: 'card stack sm' }, h('h2', { style: { margin: 0 } }, 'PIN da área do pai'),
    h('p', { class: 'small muted', style: { margin: 0 } }, 'Impede que o aluno abra o painel, o registro de atenção e os gabaritos. É uma trava de conveniência (os dados ficam no aparelho), não um cofre.'),
    h('div', { class: 'row' }, chip(temPin() ? 'PIN ativo' : 'sem PIN', temPin() ? 'ok' : 'warn'),
      h('button', { class: 'btn sm', onClick: async () => {
        if (temPin()) { const atual = await perguntarTexto('PIN atual', { titulo: 'Trocar PIN', tipo: 'password' }); if (atual == null) return; if (!confereOPin(atual)) { toast('PIN atual incorreto.'); return; } }
        const novo = await perguntarTexto('Novo PIN (4 a 8 números)', { titulo: 'Novo PIN', tipo: 'password' });
        if (novo == null) return;
        if (!/^\d{4,8}$/.test(novo)) { toast('Use de 4 a 8 números.'); return; }
        mutate((st) => { st.config.pinHash = hashPin(novo); }); salvar('PIN definido');
      } }, temPin() ? 'Trocar PIN' : 'Criar PIN'),
      temPin() ? h('button', { class: 'btn sm danger', onClick: async () => { const atual = await perguntarTexto('PIN atual', { titulo: 'Remover PIN', tipo: 'password' }); if (atual == null) return; if (!confereOPin(atual)) { toast('PIN incorreto.'); return; } mutate((st) => { st.config.pinHash = null; }); salvar('PIN removido'); } }, 'Remover PIN') : null)));

  // ---------- rampa ----------
  const ini = h('input', { type: 'date', value: c.inicioBimestre4 || '', 'aria-label': 'Início do 4º bimestre' });
  const forca = h('select', { 'aria-label': 'Forçar fase' }, h('option', { value: '' }, 'Automática (pela data)'), ...ORDEM_FASES.map((k) => h('option', { value: k, selected: c.faseForcada === k }, FASES[k].rotulo)));
  const iniSemana = c.inicioBimestre4 ? weekStart(c.inicioBimestre4) : null;
  const datasFase = iniSemana ? { w1: iniSemana, w2: addDays(iniSemana, 7), w3: addDays(iniSemana, 14), w4: addDays(iniSemana, 21), full: addDays(iniSemana, 28) } : {};
  raiz.append(h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, 'Rampa de implantação'),
    h('p', { class: 'small muted', style: { margin: 0 } }, 'Até o fim do 3º bimestre: só Aquecimento + ciclo D-3, sem XP, quadro nem Desafio do Pai. A rampa de 4 semanas começa na primeira segunda-feira do 4º bimestre.'),
    h('div', { class: 'form-row' }, h('div', { class: 'field' }, h('label', null, 'Início do 4º bimestre'), ini, h('span', { class: 'hint' }, 'Informe qualquer dia dessa primeira semana; a rampa conta a partir da segunda-feira.')), h('div', { class: 'field' }, h('label', null, 'Fase'), forca)),
    h('button', { class: 'btn sm', onClick: () => { mutate((st) => { st.config.inicioBimestre4 = ini.value || null; st.config.faseForcada = forca.value || null; }); salvar(); } }, 'Salvar rampa'),
    h('table', { class: 'tbl' }, h('tbody', null, ...ORDEM_FASES.map((k) => h('tr', { style: faseKey(hoje, c) === k ? { background: 'var(--brand-soft)' } : null }, h('td', { class: 'nowrap' }, h('b', null, FASES[k].rotulo)), h('td', { class: 'nowrap small' }, k === 'pre' ? (c.inicioBimestre4 ? `até ${fmtDia(addDays(iniSemana, -1))}` : '—') : datasFase[k] ? fmtDia(datasFase[k]) : '—'), h('td', { class: 'small' }, FASES[k].resumo)))))));

  // ---------- sprint ----------
  const mins = {};
  const linhasMin = ORDEM_FASES.map((k) => { const inp = h('input', { type: 'number', min: 5, max: 30, value: c.sprintMin[k] || '', placeholder: String(FASES[k].sprintMin), 'aria-label': `Minutos do sprint, ${FASES[k].rotulo}` }); mins[k] = inp; return h('div', { class: 'field' }, h('label', null, FASES[k].rotulo), inp); });
  raiz.append(h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, 'Duração do sprint'),
    h('p', { class: 'small muted', style: { margin: 0 } }, 'Padrão do plano: 12 minutos; 15 na semana 3. Deixe em branco para usar o padrão. Dica: em dia ruim, o aluno usa o “modo 5 minutos” na própria tela da Missão.'),
    h('div', { class: 'form-row' }, ...linhasMin), h('button', { class: 'btn sm', onClick: () => { mutate((st) => { st.config.sprintMin = {}; for (const k of ORDEM_FASES) if (mins[k].value) st.config.sprintMin[k] = Number(mins[k].value); }); salvar(); } }, 'Salvar durações')));

  // ---------- horários ----------
  const hs = { acordar: 'Acordar', dever: 'Dever de casa', aquecimento: 'Bloco 1 · Aquecimento', missao: 'Bloco 2 · Missão do Dia', episodio: 'Bloco 3 · Episódio', desafio: 'Sábado · Desafio do Pai', explica: '“Me explica”', base: 'Celular na base', dormir: 'Dormir' };
  const hin = {};
  raiz.append(h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, 'Horários'),
    h('p', { class: 'small muted', style: { margin: 0 } }, 'Ajuste à agenda do reforço. A ordem e a duração dos blocos é o que não deve mudar. Se o reforço ocupar a manhã, mova a Missão para as 19h.'),
    h('div', { class: 'form-row' }, ...Object.entries(hs).map(([k, rot]) => { hin[k] = h('input', { type: 'time', value: c.horarios[k], 'aria-label': rot }); return h('div', { class: 'field' }, h('label', null, rot), hin[k]); })),
    h('button', { class: 'btn sm', onClick: () => { mutate((st) => { for (const k of Object.keys(hs)) if (hin[k].value) st.config.horarios[k] = hin[k].value; }); salvar(); } }, 'Salvar horários')));

  // ---------- XP ----------
  const nv = { bronze: h('input', { type: 'number', value: c.niveis.bronze, 'aria-label': 'XP Bronze' }), prata: h('input', { type: 'number', value: c.niveis.prata, 'aria-label': 'XP Prata' }), ouro: h('input', { type: 'number', value: c.niveis.ouro, 'aria-label': 'XP Ouro' }) };
  const rc = { bronze: h('input', { type: 'text', value: c.recompensas.bronze, 'aria-label': 'Recompensa Bronze' }), prata: h('input', { type: 'text', value: c.recompensas.prata, 'aria-label': 'Recompensa Prata' }), ouro: h('input', { type: 'text', value: c.recompensas.ouro, 'aria-label': 'Recompensa Ouro' }) };
  const conq = h('input', { type: 'text', value: c.conquistaMes, placeholder: 'Ex.: binóculo 10×50', 'aria-label': 'Conquista do Mês' });
  raiz.append(h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, 'Níveis e recompensas'),
    h('p', { class: 'small muted', style: { margin: 0 } }, 'Os valores do plano são Bronze 150 · Prata 200 · Ouro 250. Somando todas as marcações possíveis, uma semana perfeita passa de 400 XP; o plano estima 250–300 numa semana cheia. Se achar que o Ouro ficou fácil (ou difícil) demais, ajuste aqui — mas combine com o Luan ANTES de mudar, e nunca para baixo depois de conquistado.'),
    ...['bronze', 'prata', 'ouro'].map((k) => h('div', { class: 'form-row' }, h('div', { class: 'field' }, h('label', null, `${k[0].toUpperCase() + k.slice(1)} · XP`), nv[k]), h('div', { class: 'field', style: { gridColumn: 'span 2' } }, h('label', null, 'Recompensa'), rc[k]))),
    h('div', { class: 'field' }, h('label', null, 'Conquista do Mês (4 semanas Ouro seguidas)'), conq),
    h('button', { class: 'btn sm', onClick: () => { mutate((st) => { for (const k of ['bronze', 'prata', 'ouro']) { st.config.niveis[k] = Number(nv[k].value) || st.config.niveis[k]; st.config.recompensas[k] = rc[k].value.trim(); } st.config.conquistaMes = conq.value.trim(); }); salvar(); } }, 'Salvar níveis')));

  // ---------- tarefas de casa ----------
  const teto = h('input', { type: 'number', min: 15, max: 240, step: 5, value: c.tetoTarefaMin, 'aria-label': 'Teto de tarefa por noite, em minutos' });
  const xpT = h('input', { type: 'number', min: 0, max: 50, step: 1, value: c.xpTarefa, 'aria-label': 'XP por tarefa de casa' });
  raiz.append(h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, 'Tarefas de casa'),
    h('p', { class: 'small muted', style: { margin: 0 } }, 'O plano não prevê dever de casa na tabela de XP, então por padrão tarefa NÃO dá XP (0). Se quiser, dê um valor pequeno por tarefa enviada. O teto avisa quando a noite está pesada: o plano pede para não aumentar as horas.'),
    h('div', { class: 'form-row' }, h('div', { class: 'field' }, h('label', null, 'Teto de tarefa por noite (min)'), teto), h('div', { class: 'field' }, h('label', null, 'XP por tarefa enviada'), xpT)),
    h('button', { class: 'btn sm', onClick: () => { mutate((st) => { st.config.tetoTarefaMin = Number(teto.value) || 60; st.config.xpTarefa = Math.max(0, Number(xpT.value) || 0); }); salvar(); } }, 'Salvar')));

  // ---------- dias livres ----------
  const dl = h('input', { type: 'date', 'aria-label': 'Novo dia livre' });
  raiz.append(h('div', { class: 'card stack sm' }, h('h2', { style: { margin: 0 } }, 'Dias livres (feriados, sem reforço)'),
    h('p', { class: 'small muted', style: { margin: 0 } }, 'Não recebem estágios de prova, não quebram a corrente e reduzem o necessário para o bônus de semana cheia.'),
    h('div', { class: 'row' }, dl, h('button', { class: 'btn sm', onClick: () => { if (!dl.value) return; mutate((st) => { if (!st.config.diasLivres.includes(dl.value)) st.config.diasLivres.push(dl.value); st.config.diasLivres.sort(); }); re(); } }, 'Adicionar')),
    h('div', { class: 'row tight' }, ...c.diasLivres.map((d) => h('span', { class: 'chip' }, fmtDia(d), h('button', { class: 'btn ghost sm', style: { minHeight: '22px', padding: '0 6px' }, 'aria-label': 'Remover', onClick: () => { mutate((st) => { st.config.diasLivres = st.config.diasLivres.filter((x) => x !== d); }); re(); } }, '✕'))))));

  // ---------- calendário ----------
  let proxSeg = hoje;
  while (dow(proxSeg) !== 1) proxSeg = addDays(proxSeg, 1);
  const inicioIcs = h('input', { type: 'date', value: proxSeg, 'aria-label': 'Primeira segunda-feira do calendário' });
  raiz.append(h('div', { class: 'card stack sm' }, h('h2', { style: { margin: 0 } }, 'Calendário (.ics)'),
    h('p', { class: 'small muted', style: { margin: 0 } }, 'Exporta a rotina completa como eventos semanais (fuso América/Fortaleza) para o Google Agenda, Apple Calendário ou Outlook. A primeira data precisa ser uma segunda-feira.'),
    h('div', { class: 'row' }, inicioIcs, h('button', { class: 'btn sm primary', onClick: () => { if (dow(inicioIcs.value) !== 1) { toast('Escolha uma segunda-feira.'); return; } baixarArquivo('Missao_6Ano_Rotina.ics', gerarIcs(getState().config, inicioIcs.value), 'text/calendar'); } }, 'Baixar .ics'))));

  // ---------- sincronização ----------
  const copiar = async (txt, msg) => { try { await navigator.clipboard.writeText(txt); toast(msg); } catch { toast('Copie manualmente: ' + txt); } };
  const mostrarCodigo = (titulo = 'Código da família') => {
    const cod = sync.formatarCodigo(sync.codigoAtual());
    abrirModal(h('div', { class: 'stack' },
      h('p', { class: 'muted small' }, 'Quem tem este código lê e altera os dados do Luan. Guarde como uma senha. Para conectar o outro aparelho, abra o link de pareamento nele (ou digite o código em Configurações → Sincronização).'),
      h('div', { class: 'resp-box', style: { fontSize: '1.2rem', letterSpacing: '.08em', wordBreak: 'break-all' } }, cod),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onClick: () => copiar(cod, 'Código copiado') }, 'Copiar código'), h('button', { class: 'btn', onClick: () => copiar(sync.linkDePareamento(), 'Link de pareamento copiado') }, 'Copiar link de pareamento'))), { titulo });
  };
  const st = sync.status();
  const campoCodigo = h('input', { type: 'text', placeholder: 'XXXX-XXXX-XXXX-…', 'aria-label': 'Código da família', autocomplete: 'off' });
  const falha = (e) => toast(String(e.message || e), { ms: 5000 });
  const cardSync = h('div', { class: 'card stack sm' }, h('h2', { style: { margin: 0 } }, 'Sincronização entre aparelhos'));
  if (!sync.ativo()) {
    cardSync.append(
      h('p', { class: 'small', style: { margin: 0 } }, 'Opcional. Liga o aparelho do Luan e o seu: o que um marca aparece no outro. Os dados passam a ser guardados também na nuvem (Supabase, servidor em São Paulo), protegidos por um código secreto de 160 bits que só você tem. Sem ativar, nada sai do aparelho.'),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onClick: async () => {
        if (!(await confirmar('Criar o código e enviar os dados deste aparelho para a nuvem? Depois você conecta o outro aparelho com o código.', { ok: 'Ativar sincronização' }))) return;
        try { await sync.habilitar(sync.gerarCodigo()); re(); mostrarCodigo('Anote o código da família'); } catch (e) { falha(e); }
      } }, '☁️ Ativar e criar código')),
      h('div', { class: 'field' }, h('label', null, 'Já tenho um código (de outro aparelho)'), h('div', { class: 'row' }, h('div', { class: 'grow' }, campoCodigo), h('button', { class: 'btn', onClick: async () => {
        const temDados = Object.keys(getState().days).length > 0;
        if (temDados && !(await confirmar('Este aparelho já tem registros. Ao conectar, ele passa a usar os dados da nuvem e os registros daqui serão substituídos. Exporte um backup antes se quiser guardá-los. Continuar?', { ok: 'Conectar e substituir', perigo: true }))) return;
        try { await sync.habilitar(campoCodigo.value, { entrar: true }); toast('Aparelho conectado'); re(); } catch (e) { falha(e); }
      } }, 'Conectar'))));
  } else {
    cardSync.append(
      h('div', { class: 'row' }, chip(st.fase === 'erro' ? 'com erro' : st.fase === 'sincronizando' ? 'sincronizando…' : 'ligada', st.fase === 'erro' ? 'bad' : 'ok'), st.ultimoOk ? h('span', { class: 'small muted' }, `última vez: ${new Date(st.ultimoOk).toLocaleString('pt-BR')}`) : null),
      st.erro ? h('p', { class: 'small', style: { margin: 0, color: 'var(--bad)' } }, st.erro) : null,
      h('p', { class: 'small muted', style: { margin: 0 } }, 'Sincroniza sozinha poucos segundos depois de cada marcação, ao abrir o app e a cada 45 s. Se os dois aparelhos mexerem em coisas diferentes, tudo é mantido; se mexerem exatamente na mesma coisa, vale a mudança deste aparelho.'),
      h('div', { class: 'row' },
        h('button', { class: 'btn sm primary', onClick: async () => { await sync.agora(); re(); } }, 'Sincronizar agora'),
        h('button', { class: 'btn sm', onClick: () => mostrarCodigo() }, 'Mostrar código e link'),
        h('button', { class: 'btn sm danger', onClick: async () => { if (await confirmar('Desligar a sincronização neste aparelho? Os dados continuam aqui e na nuvem; este aparelho só deixa de enviar e receber.', { ok: 'Desligar', perigo: true })) { sync.desabilitar(); re(); } } }, 'Desligar neste aparelho')));
  }
  raiz.append(cardSync);

  // ---------- backup ----------
  const arq = h('input', { type: 'file', accept: 'application/json,.json', class: 'hidden', 'aria-label': 'Arquivo de backup' });
  arq.addEventListener('change', async () => {
    const f = arq.files[0];
    if (!f) return;
    try {
      if (!(await confirmar('Importar este backup substitui TODOS os dados atuais deste aparelho. Continuar?', { ok: 'Importar', perigo: true }))) return;
      const dados = JSON.parse(await f.text());
      const imagens = dados._anexos || {};
      delete dados._anexos;
      importarJson(JSON.stringify(dados));
      for (const [id, a] of Object.entries(imagens)) await salvarBlob(await base64ParaBlob(a.tipo, a.dados), { id, sync: false });
      toast(`Backup importado${Object.keys(imagens).length ? ` (com ${Object.keys(imagens).length} imagens)` : ''}`); re();
    } catch (e) { toast(String(e.message || e)); }
  });
  raiz.append(h('div', { class: 'card stack sm' }, h('h2', { style: { margin: 0 } }, 'Backup e privacidade'),
    h('p', { class: 'small', style: { margin: 0 } }, 'Todos os dados ficam neste aparelho (no navegador). Nada é enviado para a internet. Para usar em dois aparelhos (o do Luan e o do pai), exporte aqui e importe no outro. Faça backup de vez em quando.'),
    c.ultimoBackup ? h('p', { class: 'small muted', style: { margin: 0 } }, `Último backup: ${fmtDia(c.ultimoBackup)}`) : null,
    h('div', { class: 'row' },
      h('button', { class: 'btn sm primary', onClick: async () => {
        const dados = JSON.parse(exportarJson());
        dados._anexos = {};
        for (const a of await listarAnexos()) dados._anexos[a.id] = await blobParaBase64(await obterBlob(a.id));
        baixarArquivo(`missao6ano-backup-${hoje}.json`, JSON.stringify(dados));
        mutate((st) => { st.config.ultimoBackup = hoje; }); re();
      } }, '⬇ Exportar backup (com imagens)'),
      h('button', { class: 'btn sm', onClick: () => arq.click() }, '⬆ Importar backup'), arq,
      h('button', { class: 'btn sm danger', onClick: async () => {
        if (!(await confirmar('Apagar TODOS os dados (XP, provas, erros, cartas, tudo) deste aparelho? Isto não pode ser desfeito.', { ok: 'Apagar tudo', perigo: true }))) return;
        const t = await perguntarTexto('Para confirmar, digite APAGAR', { titulo: 'Confirmação' });
        if (t === 'APAGAR') { apagarTudo(); toast('Tudo apagado'); sairDoPai(); }
      } }, 'Apagar tudo'))));
  return raiz;
}
