// Ginásio de Cálculo: 5 minutos por dia. Anota-se o TEMPO, não o acerto. Sobe de faixa quem bate a meta 3 dias seguidos.
import { h, limpar } from '../../util/dom.js';
import { getState, getDay } from '../../store.js';
import { FAIXAS, ARMAS, gerarSerie, parseResp, igual, fmtResp, sequenciaMeta, armaDaSemana, DIAS_PARA_SUBIR } from '../../core/ginasio.js';
import { makeRng } from '../../core/rng.js';
import { registrarGinasio } from '../../actions.js';
import { chip, seg as segCtl, toast } from '../../ui.js';
import { bip, prepararAudio } from '../../timer.js';
import { weekStart, diffDays, fmtCurto } from '../../util/dates.js';

const fmtSeg = (s) => `${s.toFixed(1).replace('.', ',')} s`;

export default function ginasio(ctx) {
  const s = getState();
  const data = ctx.hoje;
  const raiz = h('div', { class: 'stack lg' });
  const faixaAtual = s.ginasio.faixa;
  let faixa = Number(ctx.params.faixa) || faixaAtual;
  let modo = 'sozinho';
  let rodando = null; // estado da série em andamento
  let rafId = null;
  let onKey = null;

  const parar = () => { cancelAnimationFrame(rafId); if (onKey) document.removeEventListener('keydown', onKey); onKey = null; };
  ctx.onCleanup(parar);

  // ===================== escolha =====================
  function escolha() {
    parar();
    limpar(raiz);
    const def = FAIXAS[faixa - 1];
    const sem = Math.floor(diffDays(data, weekStart(s.criadoEm)) / 7);
    const arma = armaDaSemana(sem);
    const seq = sequenciaMeta(s.ginasio.historico, faixa, data, s.config.diasLivres);
    const hist = s.ginasio.historico.filter((x) => x.faixa === faixa).slice(-6).reverse();
    const hojeFeito = getDay(data).ginasio;

    raiz.append(
      h('div', null, h('p', { class: 'eyebrow' }, 'Ginásio de Cálculo · 5 min'), h('h1', { style: { margin: 0 } }, 'Cálculo de cabeça')),
      h('div', { class: 'card b1 stack' },
        h('div', { class: 'row between' }, h('h2', { style: { margin: 0 } }, `Faixa ${def.n} · ${def.nome}`), chip(faixa === faixaAtual ? 'sua faixa' : faixa < faixaAtual ? 'treino extra' : 'faixa à frente', faixa === faixaAtual ? 'ok' : '')),
        h('p', { style: { margin: 0 } }, def.desc),
        h('p', { style: { margin: 0, fontWeight: 700 } }, `Meta: ${def.metaTxt}`),
        def.meta != null ? h('p', { class: 'small muted', style: { margin: 0 } }, `Bata a meta ${DIAS_PARA_SUBIR} dias seguidos para subir de faixa. Você está em ${Math.min(seq, DIAS_PARA_SUBIR)} de ${DIAS_PARA_SUBIR}.`) : h('p', { class: 'small muted', style: { margin: 0 } }, 'Esta faixa não termina: o objetivo é manter e melhorar o seu tempo.'),
        hojeFeito ? h('p', { class: 'small', style: { margin: 0, color: 'var(--ok)' } }, `Hoje você já fez: ${fmtSeg(hojeFeito.seg)} (faixa ${hojeFeito.faixa}).`) : null),
      h('div', { class: 'card stack sm' }, h('h3', { style: { margin: 0 } }, '🗡️ Arma da semana'), h('p', { style: { margin: 0 } }, h('b', null, arma.nome + ': '), arma.exemplo)),
      h('div', { class: 'card stack' },
        h('div', { class: 'row' }, h('span', { class: 'small muted' }, 'Como você vai responder?'),
          segCtl([['sozinho', 'Sozinho (digitando)'], ['pai', 'Com o pai (falando)']], modo, (m) => { modo = m; escolha(); })),
        modo === 'pai' ? h('p', { class: 'small muted', style: { margin: 0 } }, 'O Luan fala a resposta em voz alta; o pai toca ✓ (acertou) ou ✗ (errou). O tempo corre do mesmo jeito.') : null,
        h('div', { class: 'row' }, h('span', { class: 'small muted' }, 'Faixa:'),
          ...FAIXAS.map((f) => h('button', { class: 'btn sm' + (f.n === faixa ? ' primary' : ''), 'aria-pressed': String(f.n === faixa), onClick: () => { faixa = f.n; escolha(); } }, String(f.n)))),
        h('button', { class: 'btn amber lg block', onClick: () => { prepararAudio(); contagem(); } }, '▶ Começar')),
      hist.length ? h('div', { class: 'card flat stack sm' }, h('h3', { style: { margin: 0 } }, 'Seus últimos tempos nesta faixa'),
        ...hist.map((x) => h('div', { class: 'row between' }, h('span', { class: 'muted' }, fmtCurto(x.data)), h('b', null, fmtSeg(x.seg)), chip(def.meta == null ? '—' : x.ok ? 'meta batida' : 'quase', x.ok ? 'ok' : '')))) : null);
  }

  // ===================== contagem 3-2-1 =====================
  function contagem() {
    limpar(raiz);
    let n = 3;
    const num = h('div', { class: 'hero center', style: { fontSize: '7rem' } }, String(n));
    raiz.append(h('div', { class: 'stack center', style: { paddingTop: '3rem' } }, h('p', { class: 'eyebrow' }, 'Prepare-se'), num, h('p', { class: 'muted' }, 'Celular firme na mão, cabeça no jogo.')));
    const passo = () => {
      bip();
      n--;
      if (n <= 0) { iniciar(); return; }
      num.textContent = String(n);
      timeout = setTimeout(passo, 800);
    };
    let timeout = setTimeout(passo, 800);
    bip();
    ctx.onCleanup(() => clearTimeout(timeout));
  }

  // ===================== série =====================
  function iniciar() {
    const def = FAIXAS[faixa - 1];
    const itens = gerarSerie(faixa, makeRng());
    rodando = { i: 0, erros: 0, t0: performance.now(), buf: '', itens, dica: false };
    desenharSerie();
    loopRelogio();
    onKey = (e) => {
      if (!rodando) return;
      if (modo === 'pai') return;
      if (/^[0-9]$/.test(e.key)) digitar(e.key);
      else if (e.key === ',' || e.key === '.') digitar(',');
      else if (e.key === '/') digitar('/');
      else if (e.key === 'Backspace') { rodando.buf = rodando.buf.slice(0, -1); atualizarCaixa(); }
      else if (e.key === 'Enter') conferir();
    };
    document.addEventListener('keydown', onKey);
  }

  let refs = {};
  function desenharSerie() {
    limpar(raiz);
    const def = FAIXAS[faixa - 1];
    const it = rodando.itens[rodando.i];
    const relogio = h('b', { style: { fontVariantNumeric: 'tabular-nums', fontSize: '1.3rem' } }, '0,0 s');
    const caixa = h('div', { class: 'resp-box', 'aria-live': 'polite' }, '');
    refs = { relogio, caixa };
    const teclas = (rotulos, extra = '') => rotulos.map((t) => h('button', { class: t === '✓' ? 'go' : '', 'aria-label': t === '⌫' ? 'apagar' : t === '✓' ? 'conferir' : t, onClick: () => (t === '⌫' ? (rodando.buf = rodando.buf.slice(0, -1), atualizarCaixa()) : t === '✓' ? conferir() : digitar(t)) }, t));
    const usaFracao = faixa === 5;
    raiz.append(
      h('div', { class: 'row between' }, h('span', { class: 'chip info' }, `Conta ${rodando.i + 1} de ${rodando.itens.length}`), h('span', null, '⏱ ', relogio, def.meta ? h('span', { class: 'muted small' }, ` · meta ${def.meta} s`) : null)),
      h('div', { class: 'card stack' },
        h('div', { class: 'pergunta-grande', 'aria-live': 'polite' }, it.texto, ' = ?'),
        faixa === 4 && it.arma ? h('div', { class: 'center' }, rodando.dica ? h('span', { class: 'chip warn' }, `Arma: ${ARMAS.find((a) => a.id === it.arma).nome}`) : h('button', { class: 'btn ghost sm', onClick: () => { rodando.dica = true; desenharSerie(); } }, 'Ver a arma (dica)')) : null,
        modo === 'sozinho' ? [caixa, h('div', { class: 'keypad' }, ...teclas(['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓']), usaFracao ? [h('button', { onClick: () => digitar(',') }, ','), h('button', { onClick: () => digitar('/') }, '/'), h('button', { class: 'small', onClick: pular }, 'Pular')] : [h('span'), h('button', { class: 'small', style: { fontSize: '.9rem' }, onClick: pular }, 'Pular'), h('span')])]
          : [h('p', { class: 'center muted' }, 'Resposta (só para o pai): ', h('b', { style: { color: 'var(--ink)' } }, fmtResp(it.resp, it.forma))),
            h('div', { class: 'grid c2' }, h('button', { class: 'btn lg danger', onClick: () => { rodando.erros++; toast('Errou — tenta de novo', { ms: 900 }); } }, '✗ Errou'), h('button', { class: 'btn lg ok', onClick: avancar }, '✓ Acertou')),
            h('button', { class: 'btn ghost sm', onClick: pular }, 'Pular (conta como erro)')]));
    atualizarCaixa();
  }

  function atualizarCaixa() { if (refs.caixa) refs.caixa.textContent = rodando.buf || '…'; }
  function digitar(c) { if (rodando.buf.length < 9) { rodando.buf += c; atualizarCaixa(); } }

  function conferir() {
    const it = rodando.itens[rodando.i];
    const r = parseResp(rodando.buf);
    if (r && igual(r, it.resp)) { avancar(); return; }
    rodando.erros++;
    rodando.buf = '';
    refs.caixa.classList.remove('errou');
    void refs.caixa.offsetWidth;
    refs.caixa.classList.add('errou');
    atualizarCaixa();
  }
  function pular() { rodando.erros++; avancar(); }
  function avancar() {
    rodando.i++;
    rodando.buf = '';
    rodando.dica = false;
    if (rodando.i >= rodando.itens.length) { fim(); return; }
    desenharSerie();
  }

  function loopRelogio() {
    const passo = () => {
      if (!rodando) return;
      if (refs.relogio) refs.relogio.textContent = fmtSeg((performance.now() - rodando.t0) / 1000);
      rafId = requestAnimationFrame(passo);
    };
    rafId = requestAnimationFrame(passo);
  }

  // ===================== resultado =====================
  function fim() {
    const segs = (performance.now() - rodando.t0) / 1000;
    const erros = rodando.erros;
    const itens = rodando.itens;
    rodando = null;
    parar();
    const def = FAIXAS[faixa - 1];
    const antes = getState().ginasio.historico.filter((x) => x.faixa === faixa).map((x) => x.seg);
    const recorde = !antes.length || segs < Math.min(...antes);
    const r = registrarGinasio({ faixa, seg: segs, erros, modo }, data);
    const sq = sequenciaMeta(getState().ginasio.historico, faixa, data, getState().config.diasLivres);
    limpar(raiz);
    raiz.append(h('div', { class: 'card b4 center stack' },
      h('div', { class: 'big-emoji' }, r.subiu ? '🚀' : r.ok ? '🎯' : '💪'),
      h('p', { class: 'eyebrow' }, `Faixa ${def.n} · ${def.nome}`),
      h('div', { class: 'hero', style: { fontSize: '3.4rem' } }, fmtSeg(segs)),
      def.meta != null ? h('p', { style: { fontWeight: 700, margin: 0 } }, r.ok ? `Meta batida! (${def.meta} s)` : `Faltaram ${fmtSeg(segs - def.meta)} para a meta de ${def.meta} s.`) : h('p', { style: { margin: 0 } }, 'Faixa de manutenção: compare com o seu último tempo.'),
      recorde ? chip('🏅 Novo recorde pessoal!', 'ok') : null,
      r.subiu ? h('div', { class: 'banner ok' }, h('h4', null, 'Subiu de faixa!'), h('p', null, `Você bateu a meta ${DIAS_PARA_SUBIR} dias seguidos. Agora é a faixa ${getState().ginasio.faixa}.`)) :
        (def.meta != null && r.ok ? h('p', { class: 'muted' }, `Dia ${Math.min(sq, DIAS_PARA_SUBIR)} de ${DIAS_PARA_SUBIR} seguidos na meta.`) : null),
      h('div', { class: 'row', style: { justifyContent: 'center' } },
        h('button', { class: 'btn amber', onClick: () => { prepararAudio(); faixa = getState().ginasio.faixa; contagem(); } }, 'De novo'),
        h('button', { class: 'btn', onClick: () => { faixa = getState().ginasio.faixa; escolha(); } }, 'Voltar'),
        h('a', { class: 'btn ghost', href: '#/aluno/hoje' }, 'Ir para o Hoje'))));
    if (faixa === 4) raiz.append(h('div', { class: 'card flat stack sm' }, h('h3', { style: { margin: 0 } }, 'As armas desta série'), ...itens.map((it) => h('p', { class: 'small', style: { margin: 0 } }, h('b', null, `${it.texto} = ${fmtResp(it.resp)}`), ` — ${ARMAS.find((a) => a.id === it.arma)?.nome}`))));
  }

  escolha();
  return raiz;
}
