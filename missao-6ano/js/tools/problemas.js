// "5 problemas, não 30 exercícios" + as três perguntas do enunciado (o que pedem / que dados tenho / o que liga os dois).
import { h, limpar } from '../util/dom.js';
import { getState, getDay, mutateDay } from '../store.js';
import { makeRng } from '../core/rng.js';
import { gerarCincoProblemas, gerarEnunciado, conferir, respostaTexto, OPERACOES } from '../core/problems.js';
import { registrarErro } from '../actions.js';
import { pick } from '../core/rng.js';

const TPLS = ['cadernos', 'piscina', 'van', 'figurinhas', 'grupos', 'troco', 'torneira', 'campo'];

function conjuntoDoDia(data, modo) {
  const dia = getDay(data);
  const salvo = dia.problemas?.[modo];
  if (salvo) return salvo;
  const rng = makeRng();
  const itens = modo === 'cinco' ? gerarCincoProblemas(rng) : [0, 1, 2].map(() => gerarEnunciado(rng, pick(rng, TPLS)));
  const novo = { itens, i: 0, res: [] };
  mutateDay(data, (d) => { d.problemas = { ...(d.problemas || {}), [modo]: novo }; });
  return getDay(data).problemas[modo];
}

const salvar = (data, modo, conj) => mutateDay(data, (d) => { d.problemas = { ...(d.problemas || {}), [modo]: conj }; });

export function montar({ hoje, modo = 'cinco' }) {
  const raiz = h('div', { class: 'stack' });
  let conj = conjuntoDoDia(hoje, modo);
  let fb = null; // feedback do problema atual: { ok, texto }
  // estado do fluxo guiado do enunciado (memória; se recarregar volta ao passo 1 do mesmo problema)
  let g = { passo: 1, pede: '', marcas: {}, leituraErro: false, opErro: false, op: null, msg: '' };

  const atual = () => conj.itens[conj.i];
  const reiniciaGuia = () => { g = { passo: 1, pede: '', marcas: {}, leituraErro: false, opErro: false, op: null, msg: '' }; fb = null; };

  function finalizar(p, ok, leitura = null) {
    if (conj.res.some((r) => r.id === p.id)) return;
    conj.res.push({ id: p.id, ok, leitura });
    if (!ok) {
      registrarErro({ data: hoje, assunto: p.topico, enunciado: p.texto, problema: p, leitura, origem: 'matematica' });
    }
    salvar(hoje, modo, conj);
  }

  function proximo() {
    conj.i += 1;
    salvar(hoje, modo, conj);
    reiniciaGuia();
    desenhar();
  }

  function campoResposta(p, aoConferir) {
    const input = h('input', { type: 'text', inputmode: p.forma === 'fracao' ? 'text' : 'decimal', autocomplete: 'off', 'aria-label': 'Sua resposta', placeholder: p.unidade ? `Resposta (${p.unidade})` : 'Resposta' });
    const ir = () => { if (input.value.trim()) aoConferir(input.value); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') ir(); });
    setTimeout(() => input.focus(), 30);
    return h('div', { class: 'row' }, h('div', { class: 'grow' }, input), h('button', { class: 'btn amber', onClick: ir }, 'Conferir'));
  }

  function feedback(p) {
    return h('div', { class: 'stack' },
      h('div', { class: `banner ${fb.ok ? 'ok' : 'erro'}` },
        h('h4', null, fb.ok ? 'Isso mesmo!' : 'Quase — vamos olhar com calma'),
        h('p', null, fb.ok ? `Resposta: ${respostaTexto(p)}` : `A resposta era ${respostaTexto(p)}.`),
        h('p', { class: 'small' }, p.solucao),
        !fb.ok ? h('p', { class: 'small' }, 'Esse erro volta amanhã para você refazer do zero — e vale XP quando acertar.') : null),
      h('button', { class: 'btn amber lg block', onClick: proximo }, conj.i + 1 >= conj.itens.length ? 'Ver o resultado' : 'Próximo problema →'));
  }

  function conta(p) {
    if (fb) return feedback(p);
    return h('div', { class: 'stack' },
      h('div', { class: 'card' }, h('p', { class: 'eyebrow' }, p.topico), h('p', { style: { fontSize: '1.3rem', fontWeight: 700, margin: 0 } }, p.texto)),
      campoResposta(p, (v) => { const ok = conferir(p, v); finalizar(p, ok); fb = { ok }; desenhar(); }));
  }

  function enunciado(p) {
    if (fb) return feedback(p);
    const cab = h('div', { class: 'row tight' },
      ...['1 · O que pedem?', '2 · Que dados tenho?', '3 · O que liga os dois?', '4 · Responder'].map((t, i) =>
        h('span', { class: 'chip ' + (g.passo === i + 1 ? 'info' : g.passo > i + 1 ? 'ok' : '') }, t)));

    const textoComTokens = () => h('p', { style: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.8 } },
      ...p.partes.map((x) => {
        if (x.t != null) return x.t;
        if (g.passo !== 2) return h('b', null, x.valor);
        const m = g.marcas[x.num] || '';
        return h('button', {
          class: `tok ${m}`, 'aria-label': `${x.valor}: ${m === 'uso' ? 'vou usar' : m === 'sobra' ? 'sobra' : 'ainda sem marcar'}`,
          onClick: () => { g.marcas[x.num] = m === '' ? 'uso' : m === 'uso' ? 'sobra' : ''; g.msg = ''; desenhar(); },
        }, x.valor);
      }));

    let corpo;
    if (g.passo === 1) {
      const inp = h('input', { type: 'text', 'aria-label': 'O que a questão pede', placeholder: 'Em até 4 palavras…', value: g.pede });
      const seguir = () => { if (!inp.value.trim()) { g.msg = 'Escreva o que a questão pede (4 palavras bastam).'; desenhar(); return; } g.pede = inp.value.trim(); g.passo = 2; g.msg = ''; desenhar(); };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') seguir(); });
      corpo = h('div', { class: 'stack' }, h('h3', null, '1 · O que estão pedindo?'), h('p', { class: 'muted small' }, 'Sublinhe a pergunta no texto e escreva, em 4 palavras, o que ela quer saber.'), inp,
        g.msg && h('p', { class: 'small', style: { color: 'var(--bad)' } }, g.msg), h('button', { class: 'btn amber', onClick: seguir }, 'Continuar'));
      setTimeout(() => inp.focus(), 30);
    } else if (g.passo === 2) {
      const nums = p.partes.filter((x) => x.num);
      const todos = nums.every((x) => g.marcas[x.num]);
      corpo = h('div', { class: 'stack' }, h('h3', null, '2 · Que dados eu tenho?'),
        h('p', { class: 'muted small' }, 'Toque em cada número: 1 toque = vou usar (círculo verde) · 2 toques = sobra (riscado). Todo número precisa de uma marca.'),
        h('p', { class: 'small' }, `Você escreveu que a questão pede: “${g.pede}”.`),
        g.msg && h('p', { class: 'small', style: { color: 'var(--bad)' } }, g.msg),
        h('button', { class: 'btn amber', disabled: !todos, onClick: () => {
          const certo = nums.every((x) => g.marcas[x.num] === (x.uso ? 'uso' : 'sobra'));
          if (certo) { g.passo = 3; g.msg = ''; } else { g.leituraErro = true; g.msg = 'Olhe de novo: tem número marcado errado. Releia a pergunta e pense: este dado ajuda a responder?'; }
          desenhar();
        } }, 'Conferir os dados'));
    } else if (g.passo === 3) {
      corpo = h('div', { class: 'stack' }, h('h3', null, '3 · O que liga um dado ao outro?'),
        h('p', { class: 'muted small' }, `Pedem: ${p.pede}. Qual operação junta os dados que você escolheu?`),
        g.msg && h('p', { class: 'small', style: { color: 'var(--bad)' } }, g.msg),
        h('div', { class: 'grid c4' }, ...OPERACOES.map((o) => h('button', { class: 'btn lg', onClick: () => {
          if (o === p.op) { g.op = o; g.passo = 4; g.msg = ''; } else { g.opErro = true; g.msg = 'Essa não liga os dados do jeito que a pergunta quer. Tente outra.'; }
          desenhar();
        } }, o))));
    } else {
      corpo = h('div', { class: 'stack' }, h('h3', null, '4 · Agora sim, a conta'),
        h('p', { class: 'muted small' }, `Dados: os que ficaram verdes · Operação: ${g.op}`),
        campoResposta(p, (v) => { const ok = conferir(p, v); finalizar(p, ok, g.leituraErro || g.opErro); fb = { ok }; desenhar(); }));
    }
    return h('div', { class: 'stack' }, cab, h('div', { class: 'card' }, h('p', { class: 'eyebrow' }, p.topico), textoComTokens()), h('div', { class: 'card' }, corpo));
  }

  function resultado() {
    const acertos = conj.res.filter((r) => r.ok).length;
    const leit = conj.res.filter((r) => !r.ok && r.leitura).length;
    return h('div', { class: 'card b4 center stack' },
      h('div', { class: 'big-emoji' }, acertos === conj.itens.length ? '🏆' : '💪'),
      h('h3', null, `${acertos} de ${conj.itens.length} certos`),
      h('p', null, conj.res.length - acertos ? 'Os problemas que você errou voltam amanhã — refaça do zero. Errar e descobrir vale ponto.' : 'Sem erros hoje. Excelente atenção!'),
      leit ? h('p', { class: 'small muted' }, 'Dica: em alguns você tropeçou na leitura. As três perguntas do enunciado resolvem isso.') : null);
  }

  function desenhar() {
    limpar(raiz);
    const total = conj.itens.length;
    if (conj.i >= total) { raiz.append(resultado()); return; }
    const p = atual();
    const jaRespondido = conj.res.find((r) => r.id === p.id);
    if (jaRespondido && !fb) fb = { ok: jaRespondido.ok }; // recarregou depois de responder
    raiz.append(
      h('div', { class: 'row between' }, h('span', { class: 'chip info' }, `Problema ${conj.i + 1} de ${total}`), h('span', { class: 'muted small' }, 'Sem calculadora · o cronômetro está rodando')),
      p.kind === 'enunciado' ? enunciado(p) : conta(p));
  }

  desenhar();
  return raiz;
}
