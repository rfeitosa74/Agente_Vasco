// Painel de pesquisa em fontes online confiáveis — usado pelo Luan (“Descobrir”) e pelo pai (“Pesquisar”).
// Sem internet: mostra o que já foi pesquisado/guardado. Nada é buscado fora da lista fechada de fontes.
import { h } from '../util/dom.js';
import { getState } from '../store.js';
import { FONTES, SITES_ESTUDO, linkBusca, linkVideos } from '../core/fontes.js';
import { buscar, configFontes, temInternet, biblioteca, guardar, estaGuardado, removerDaBiblioteca, criarCartaDe, sugerir, anexarReferencia, marcarSugestaoFeita } from '../pesquisa.js';
import { DISCIPLINAS } from '../core/planner.js';
import { banner, chip, toast } from '../ui.js';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const externo = (href, ...f) => h('a', { class: 'btn sm', href, target: '_blank', rel: 'noopener noreferrer' }, ...f);

/**
 * @param {{modo: 'aluno'|'pai', q?: string, disciplina?: string, tarefaId?: string, rerender: Function}} o
 */
export function painelPesquisa({ modo, q = '', disciplina = '', tarefaId = '', rerender }) {
  const s = getState();
  const cfg = configFontes();
  const pai = modo === 'pai';
  const livre = pai || cfg.pesquisaLivreAluno;
  const raiz = h('div', { class: 'stack lg' });
  let disc = disciplina;
  let ultimo = q;

  const saida = h('div', { class: 'stack' });
  const rodapeEl = h('div', { class: 'stack lg' });
  const campo = h('input', { type: 'search', 'aria-label': 'O que você quer descobrir?', placeholder: 'Ex.: Egito antigo, fotossíntese, Júpiter…', value: q, onKeydown: (e) => { if (e.key === 'Enter') pesquisar(campo.value); } });
  const escolheDisc = h('select', { 'aria-label': 'Disciplina (ajuda a achar fontes melhores)', onChange: (e) => { disc = e.target.value; } },
    h('option', { value: '' }, 'Qualquer matéria'), ...DISCIPLINAS.filter((d) => d !== 'Outra').map((d) => h('option', { value: d, selected: d === disc }, d)));

  // ---------- temas prontos (tarefas e sugestões do pai) ----------
  const temas = [];
  for (const t of s.tarefas.filter((x) => !x.cancelada && !x.feitaEm)) for (const p of t.pesquisas || []) temas.push({ termo: p, disc: t.disciplina, rotulo: `${p}`, de: 'tarefa' });
  for (const g of s.sugestoes.filter((x) => !x.feita)) temas.push({ termo: g.termo, disc: g.disciplina, rotulo: g.termo, de: 'pai', id: g.id });
  const vistos = new Set();
  const unicos = temas.filter((t) => { const k = norm(t.termo); if (vistos.has(k)) return false; vistos.add(k); return true; });

  raiz.append(
    livre
      ? h('div', { class: 'card stack' },
        h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, campo, h('button', { class: 'btn primary', onClick: () => pesquisar(campo.value) }, '🔎 Pesquisar')),
        h('div', { class: 'row tight' }, h('span', { class: 'small muted' }, 'Matéria:'), escolheDisc),
        !temInternet() ? banner('aviso', 'Sem internet agora', 'Vou mostrar só o que já foi pesquisado ou guardado neste aparelho.') : null)
      : h('div', { class: 'banner info' }, h('h4', null, `Temas para ${modo === 'aluno' ? 'você' : 'o aluno'} pesquisar`), h('p', null, 'Escolha um tema abaixo. (O pai pode liberar a pesquisa livre em Configurações → Fontes online.)'),
        !temInternet() ? h('p', null, h('b', null, 'Sem internet agora: '), 'mostro só o que já foi guardado.') : null),
    unicos.length ? h('div', { class: 'stack sm' }, h('b', { class: 'small' }, 'Temas para pesquisar'), h('div', { class: 'row tight' }, ...unicos.map((t) => h('button', { class: 'btn sm', onClick: () => { campo.value = t.termo; disc = t.disc && t.disc !== 'Outra' ? t.disc : disc; escolheDisc.value = disc; pesquisar(t.termo, t) } }, '🔎 ', t.rotulo)))) : (!livre ? h('p', { class: 'muted' }, 'Ainda não há temas. Quando uma tarefa pedir pesquisa (ou o pai sugerir um tema), ele aparece aqui.') : null),
    saida);

  // ---------- pesquisa ----------
  async function pesquisar(termo, origemTema) {
    termo = String(termo || '').trim();
    if (termo.length < 2) { toast('Digite pelo menos 2 letras.'); return; }
    ultimo = termo;
    saida.replaceChildren(h('div', { class: 'card center muted', 'aria-live': 'polite' }, '🔎 Consultando fontes confiáveis…'));
    const r = await buscar(termo, disc);
    if (termo !== ultimo) return; // o usuário já pediu outra coisa
    const guardados = biblioteca().filter((b) => norm(b.termo).includes(norm(termo)) || norm(b.titulo).includes(norm(termo)));
    const ids = new Set(r.resultados.map((x) => x.titulo + x.fonte));
    saida.replaceChildren();
    const avisos = [];
    if (r.offline) avisos.push(banner('aviso', 'Sem internet', r.resultados.length ? 'Estes resultados foram guardados de uma pesquisa anterior.' : 'Não encontrei nada guardado sobre isso. Tente de novo quando houver internet.'));
    else if (r.doCache && !r.falhas.length) avisos.push(h('p', { class: 'small muted' }, '↺ Resultado recente guardado neste aparelho.'));
    if (r.falhas.length) avisos.push(banner('aviso', 'Algumas fontes não responderam', `${r.falhas.map((f) => FONTES[f.fonte].nome).join(', ')} — ${r.falhas[0].erro}. As outras continuam valendo; tente de novo depois.`));
    saida.append(...avisos);
    if (!r.resultados.length && !r.offline && !r.falhas.length) saida.append(h('div', { class: 'card stack sm' }, h('b', null, 'Não achei esse assunto nas fontes.'), h('p', { class: 'muted', style: { margin: 0 } }, 'Tente outra palavra (mais simples ou no singular), ou use os sites de estudo abaixo.')));
    if (r.resultados.length) saida.append(h('div', { class: 'stack' }, h('h2', { style: { margin: 0 } }, `Sobre “${termo}”`), ...r.resultados.map((x) => cartao(x))));
    const extras = guardados.filter((b) => !ids.has(b.titulo + b.fonte));
    if (extras.length) saida.append(h('div', { class: 'stack' }, h('h3', { style: { margin: 0 } }, '📚 Da sua biblioteca'), ...extras.map((b) => cartaoBiblioteca(b))));
    rodapeEl.replaceChildren(...rodape(termo));
    if (origemTema?.de === 'pai') marcarSugestaoFeita(origemTema.id);
  }

  // ---------- cartão de resultado ----------
  function cartao(x) {
    const f = FONTES[x.fonte];
    const corpo = h('div', { class: 'stack sm' });
    const texto = h('p', { style: { margin: 0, whiteSpace: 'pre-wrap' } }, x.resumo);
    const acoes = h('div', { class: 'row tight no-print' });
    const guardarBtn = h('button', { class: 'btn sm', onClick: () => { if (guardar(x, { disciplina: disc, tarefaId: tarefaId || null })) { toast('Guardado na biblioteca'); guardarBtn.textContent = '✓ Guardado'; guardarBtn.disabled = true; } } }, estaGuardado(x) ? '✓ Guardado' : '💾 Guardar');
    guardarBtn.disabled = estaGuardado(x);
    acoes.append(guardarBtn,
      h('button', { class: 'btn sm', onClick: () => { criarCartaDe(x, disc); toast('Carta criada! Ela volta nas revisões 🃏'); } }, '🃏 Fazer carta'),
      modo === 'aluno' ? h('button', { class: 'btn sm', onClick: () => testarMemoria(x, corpo, texto, acoes) }, '🧠 Testar minha memória') : null,
      pai && tarefaId ? h('button', { class: 'btn sm', onClick: () => { anexarReferencia(tarefaId, x); toast('Anexado à tarefa'); } }, '📎 Anexar à tarefa') : null,
      pai ? h('button', { class: 'btn sm', onClick: () => { toast(sugerir(x.titulo, disc) ? 'Sugerido ao Luan' : 'Já sugerido'); } }, '💡 Sugerir ao Luan') : null,
      x.url ? externo(x.url, 'Ler na fonte ↗') : null);
    corpo.append(texto, acoes);
    return h('div', { class: 'card stack sm' },
      h('div', { class: 'row tight' }, chip(`${f.icone} ${f.nome}`, 'info'), x.idioma === 'en' ? chip('em inglês 🇺🇸') : null, h('span', { class: 'small muted' }, f.licenca)),
      h('div', { class: 'row', style: { alignItems: 'flex-start', flexWrap: 'nowrap', gap: '12px' } },
        x.imagem ? h('img', { class: 'res-img', src: x.imagem, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer', onError: (e) => e.target.remove() }) : null,
        h('div', { class: 'stack sm', style: { flex: 1, minWidth: 0 } }, h('h3', { style: { margin: 0 } }, x.titulo), corpo)),
      h('details', { class: 'acc' }, h('summary', null, 'Como saber se posso confiar?'), h('div', { class: 'acc-body small' }, f.confianca)));
  }

  function cartaoBiblioteca(b) {
    const f = FONTES[b.fonte] || { icone: '📖', nome: b.fonte };
    const el = h('div', { class: 'card flat stack sm' },
      h('div', { class: 'row between' }, h('div', { class: 'row tight' }, chip(`${f.icone} ${f.nome}`), h('b', null, b.titulo)), h('button', { class: 'btn ghost sm', 'aria-label': 'Remover da biblioteca', onClick: () => { removerDaBiblioteca(b.id); el.remove(); } }, '✕')),
      h('p', { style: { margin: 0, whiteSpace: 'pre-wrap' } }, b.resumo),
      b.url ? h('div', null, externo(b.url, 'Ler na fonte ↗')) : null);
    return el;
  }

  // “Puxar da memória”: esconde o texto, ele escreve o que lembra, depois confere.
  function testarMemoria(x, corpo, texto, acoes) {
    texto.hidden = true; acoes.hidden = true;
    const ta = h('textarea', { 'aria-label': 'O que você lembra', placeholder: `Sem olhar: o que você lembra sobre “${x.titulo}”?`, style: { minHeight: '90px' } });
    const bloco = h('div', { class: 'stack sm' },
      h('b', null, `🧠 O que você lembra sobre “${x.titulo}”?`), ta,
      h('button', { class: 'btn amber', onClick: () => {
        bloco.replaceChildren(h('b', null, 'Compare com a fonte:'), h('div', { class: 'quote' }, x.resumo),
          h('div', { class: 'row tight' }, h('span', { class: 'small muted' }, 'Lembrei bem?'),
            h('button', { class: 'btn sm ok', onClick: () => { toast('Muito bem! Puxar da memória é o que fixa 💪'); fim(); } }, '✓ Sim'),
            h('button', { class: 'btn sm', onClick: () => { criarCartaDe(x, disc); toast('Virou carta para revisar 🃏'); fim(); } }, 'Preciso rever → fazer carta')));
      } }, 'Mostrar o texto'));
    const fim = () => { bloco.remove(); texto.hidden = false; acoes.hidden = false; };
    corpo.prepend(bloco);
    ta.focus();
  }

  // ---------- sites de estudo + guia ----------
  function rodape(termo) {
    const sites = SITES_ESTUDO.filter((x) => !disc || x.disc.includes(disc));
    const podeLinks = pai || cfg.linksExternosAluno;
    return [
      podeLinks ? h('div', { class: 'card stack sm' }, h('h3', { style: { margin: 0 } }, 'Continuar estudando em sites confiáveis'),
        h('p', { class: 'small muted', style: { margin: 0 } }, 'Abre em outra aba, no site deles (não fica guardado aqui). Peça ao pai para olhar junto se algo parecer estranho.'),
        h('div', { class: 'row tight' }, ...sites.map((x) => externo(linkBusca(x, termo), `🔗 ${x.nome}`)), externo(linkVideos(termo), '▶️ Vídeo-aulas')),
        h('ul', { class: 'small muted', style: { margin: 0, paddingLeft: '18px' } }, ...sites.map((x) => h('li', null, h('b', null, x.nome), ' — ', x.desc)))) : null,
      guiaConfianca(),
    ];
  }
  rodapeEl.append(...rodape(q));
  // pesquisa livre: busca direto; senão só se o termo for um tema aprovado (da tarefa ou sugerido pelo pai)
  if (q && (livre || unicos.some((t) => norm(t.termo) === norm(q)))) pesquisar(q);

  // ---------- biblioteca (sempre visível, funciona offline) ----------
  const lib = biblioteca().slice().reverse();
  raiz.append(h('div', { class: 'card stack' }, h('div', { class: 'row between' }, h('h2', { style: { margin: 0 } }, '📚 Biblioteca'), chip(`${lib.length} guardado(s)`)),
    lib.length ? h('div', { class: 'stack sm' }, ...lib.slice(0, 20).map(cartaoBiblioteca)) : h('p', { class: 'muted', style: { margin: 0 } }, 'O que você guardar aparece aqui — e dá para ler mesmo sem internet.')));
  raiz.append(rodapeEl);
  return raiz;
}

export function guiaConfianca() {
  return h('details', { class: 'card' }, h('summary', { style: { fontWeight: 700 } }, '🧭 Como saber se uma fonte é confiável'),
    h('div', { class: 'stack sm', style: { marginTop: '10px' } },
      h('p', { style: { margin: 0 } }, 'Antes de copiar ou decorar, faça 4 perguntas:'),
      h('ol', { style: { margin: 0, paddingLeft: '20px' } },
        h('li', null, h('b', null, 'Quem escreveu?'), ' Uma instituição conhecida (IBGE, NASA, escola, universidade) ou alguém sem nome?'),
        h('li', null, h('b', null, 'Quando?'), ' Datas e números mudam; veja se é recente.'),
        h('li', null, h('b', null, 'Outra fonte diz o mesmo?'), ' Confirme o que for importante em um segundo lugar.'),
        h('li', null, h('b', null, 'Tem referências?'), ' Bons textos dizem de onde tiraram as informações.')),
      h('p', { class: 'small muted', style: { margin: 0 } }, 'Na tarefa, escreva com as suas palavras — copiar e colar não é aprender (e a professora percebe!).')));
}
