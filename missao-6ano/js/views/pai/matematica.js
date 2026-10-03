// Matemática: teste de 10 minutos (marco zero), acompanhamento do Ginásio e diagnóstico de erros.
import { h, limpar } from '../../util/dom.js';
import { getState, mutate, uid } from '../../store.js';
import { makeRng } from '../../core/rng.js';
import { gerarSerie, FAIXAS, sequenciaMeta, DIAS_PARA_SUBIR } from '../../core/ginasio.js';
import { graficoLinha, CORES } from '../../charts.js';
import { chip, confirmar, toast, seg } from '../../ui.js';
import { fmtCurto, fmtDia } from '../../util/dates.js';

// Itens FIXOS (mesmos em todas as aplicações) para que o resultado seja comparável daqui a um mês.
const B1 = gerarSerie(1, makeRng(2026)).map((i) => i.texto);
const B2 = [['23 × 14', 322], ['34 × 27', 918], ['48 × 52', 2496], ['45 × 11', 495], ['16 × 25', 400]];
const B3 = [['Área de um retângulo 7 × 12', '84'], ['Perímetro de um retângulo 7 × 12', '38'], ['Área de um triângulo de base 8 e altura 5', '20'], ['Quanto somam os ângulos de um triângulo', '180°']];
const B4 = { texto: 'Marina comprou 6 canetas de R$ 4 cada e pagou com uma nota de R$ 50. Quanto custaram as canetas?', resp: 'R$ 24', sobra: 'R$ 50' };

const BLOCOS = [
  { id: 'tabuada', nome: '1 · Tabuada salteada', min: 2, pede: '20 produtos fora de ordem, falados, não escritos', indica: 'Se hesita, a base está enferrujada e o Ginásio começa na Faixa 1.' },
  { id: 'cabeca', nome: '2 · Dois dígitos de cabeça', min: 3, pede: '5 contas, de cabeça', indica: 'Aqui você vê se ele perdeu a técnica ou só a velocidade.' },
  { id: 'geometria', nome: '3 · Geometria com conta', min: 3, pede: 'Área, perímetro e ângulos', indica: 'Separa “não sabe a fórmula” de “não sabe aplicar”.' },
  { id: 'problema', nome: '4 · Um problema escrito', min: 2, pede: 'Um enunciado de 3 linhas com um dado a mais', indica: 'Se ele usa o dado sobrando, o problema é leitura, não conta.' },
];

function interpretar(t) {
  const out = [];
  const b = (id) => t.blocos.find((x) => x.id === id);
  const t1 = b('tabuada'), t2 = b('cabeca'), t3 = b('geometria');
  if (t1) out.push(t1.ok >= 18 && t1.seg <= 120 ? 'Tabuada firme: pode começar o Ginásio na Faixa 2 ou 3.' : 'Tabuada hesitante: o Ginásio começa na Faixa 1 (base enferrujada, por desuso — não por falta de capacidade).');
  if (t2) out.push(t2.ok >= 4 && t2.seg > 180 ? 'Dois dígitos: sabe a técnica, falta velocidade (desuso). Ginásio resolve.' : t2.ok >= 4 ? 'Dois dígitos de cabeça em dia.' : 'Dois dígitos: perdeu a técnica — retome as armas (decompor, ×11, diferença de quadrados).');
  if (t3) out.push(t3.ok >= 3 ? 'Geometria com conta ok.' : 'Geometria com conta trava: foco em medir e calcular (perímetro, área, ângulo) — a matéria mudou de nomear para calcular.');
  if (t.usouSobra === true) out.push('Usou o dado sobrando: o problema é de LEITURA, não de conta. Treine as três perguntas do enunciado.');
  if (t.usouSobra === false) out.push('Não usou o dado sobrando: leitura do enunciado em dia.');
  return out;
}

export default function matematica(ctx) {
  const s = getState();
  const hoje = ctx.hoje;
  const re = () => ctx.rerender();
  const raiz = h('div', { class: 'stack lg' });

  raiz.append(h('div', null, h('p', { class: 'eyebrow' }, 'Você deu aula de Matemática e Física — esta é a sua praia'), h('h1', { style: { margin: 0 } }, 'Matemática'),
    h('p', { class: 'muted' }, 'A queda não é de conteúdo: são três problemas de execução (velocidade por desuso, geometria que mudou de nomear para calcular e erro de enunciado).')));

  // ---------- teste ----------
  const areaTeste = h('div', { class: 'card stack' });
  raiz.append(areaTeste);
  let etapa = -1; // -1 = visão geral
  let reg = null;

  function visaoGeral() {
    limpar(areaTeste);
    areaTeste.append(h('div', { class: 'row between' }, h('h2', { style: { margin: 0 } }, 'Teste de 10 minutos (marco zero)'), h('button', { class: 'btn primary', onClick: () => { etapa = 0; reg = { blocos: [], usouSobra: null, obs: '' }; desenhar(); } }, s.testesMat.length ? 'Aplicar de novo' : 'Aplicar o teste')),
      h('p', { class: 'muted small', style: { margin: 0 } }, 'Faça uma vez, no sábado, em clima de brincadeira, cronometrando cada bloco. O resultado diz onde atacar primeiro e serve de marco zero para comparar daqui a um mês.'),
      h('div', { class: 'scroll-x' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'Bloco'), h('th', null, 'O que pedir'), h('th', null, 'O que indica'))),
        h('tbody', null, ...BLOCOS.map((b) => h('tr', null, h('td', null, h('b', null, b.nome), h('br'), h('small', { class: 'muted' }, `${b.min} min`)), h('td', null, b.pede), h('td', null, b.indica)))))));
    if (s.testesMat.length) {
      areaTeste.append(h('h3', { style: { margin: 0 } }, 'Resultados anteriores'),
        ...s.testesMat.slice().reverse().map((t, idx, arr) => {
          const anterior = arr[idx + 1];
          return h('div', { class: 'card flat stack sm' }, h('div', { class: 'row between' }, h('b', null, fmtDia(t.data)), idx === arr.length - 1 ? chip('marco zero', 'info') : null),
            h('div', { class: 'row tight' }, ...t.blocos.map((b) => { const d = anterior?.blocos.find((x) => x.id === b.id); const dif = d ? b.ok - d.ok : 0; return chip(`${BLOCOS.find((x) => x.id === b.id).nome.slice(4)}: ${b.ok}/${b.total} em ${Math.round(b.seg)}s${d ? (dif > 0 ? ` ▲${dif}` : dif < 0 ? ` ▼${-dif}` : ' =') : ''}`, d ? (dif > 0 ? 'ok' : dif < 0 ? 'warn' : '') : ''); })),
            h('ul', { class: 'small', style: { margin: 0 } }, ...interpretar(t).map((x) => h('li', null, x))), t.obs ? h('p', { class: 'small muted', style: { margin: 0 } }, t.obs) : null);
        }));
    }
  }

  function desenhar() {
    if (etapa < 0) return visaoGeral();
    limpar(areaTeste);
    if (etapa >= BLOCOS.length) return resumoFinal();
    const b = BLOCOS[etapa];
    let t0 = null, intervalo = null, tempo = 0, parado = false;
    const marcas = {};
    const relogio = h('b', { style: { fontSize: '2rem', fontVariantNumeric: 'tabular-nums' } }, '0:00');
    const itens = etapa === 0 ? B1.map((x, i) => ({ k: i, txt: x })) : etapa === 1 ? B2.map(([x, r], i) => ({ k: i, txt: `${x} = ${r}` })) : etapa === 2 ? B3.map(([x, r], i) => ({ k: i, txt: `${x} → ${r}` })) : [{ k: 0, txt: `${B4.texto}   (resposta: ${B4.resp})` }];
    const btnIni = h('button', { class: 'btn amber lg' }, '▶ Iniciar cronômetro');
    const parar = () => { if (t0 != null && !parado) { tempo = (performance.now() - t0) / 1000; parado = true; clearInterval(intervalo); } };
    btnIni.onclick = () => { if (t0 == null) { t0 = performance.now(); intervalo = setInterval(() => { relogio.textContent = `${Math.floor((performance.now() - t0) / 60000)}:${String(Math.floor(((performance.now() - t0) / 1000) % 60)).padStart(2, '0')}`; }, 250); btnIni.textContent = '■ Parar'; } else { parar(); btnIni.disabled = true; btnIni.textContent = 'Parado'; } };
    ctx.onCleanup(() => clearInterval(intervalo));
    const caixas = itens.map((it) => h('label', { class: 'check card flat', style: { padding: '8px 12px' } }, h('input', { type: 'checkbox', onChange: (e) => { marcas[it.k] = e.target.checked; } }), h('span', null, it.txt)));
    const sobra = etapa === 3 ? h('label', { class: 'check' }, h('input', { type: 'checkbox', onChange: (e) => { reg.usouSobra = e.target.checked; } }), `Ele usou o dado sobrando (${B4.sobra}) na conta`) : null;
    areaTeste.append(h('div', { class: 'row between' }, h('h2', { style: { margin: 0 } }, b.nome), chip(`bloco ${etapa + 1} de 4 · ${b.min} min`, 'info')),
      h('p', { class: 'muted' }, b.pede + '. Marque os itens que ele acertou.'),
      h('div', { class: 'row' }, btnIni, relogio),
      h('div', { class: etapa === 0 ? 'grid c4' : 'stack sm' }, ...caixas), sobra,
      h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('button', { class: 'btn ghost', onClick: () => { clearInterval(intervalo); etapa = -1; visaoGeral(); } }, 'Cancelar'),
        h('button', { class: 'btn primary', onClick: () => {
          parar();
          if (t0 == null) { toast('Inicie o cronômetro para registrar o tempo.'); return; }
          reg.blocos.push({ id: b.id, seg: tempo, ok: Object.values(marcas).filter(Boolean).length, total: itens.length });
          etapa++; desenhar();
        } }, etapa === 3 ? 'Concluir' : 'Próximo bloco →')));
  }

  function resumoFinal() {
    const obs = h('textarea', { 'aria-label': 'Observações', placeholder: 'Como foi? Ficou nervoso? Hesitou em quê?' });
    areaTeste.append(h('h2', { style: { margin: 0 } }, 'Resultado'), h('div', { class: 'row tight' }, ...reg.blocos.map((b) => chip(`${BLOCOS.find((x) => x.id === b.id).nome.slice(4)}: ${b.ok}/${b.total} em ${Math.round(b.seg)}s`))),
      h('ul', null, ...interpretar(reg).map((x) => h('li', null, x))), h('div', null, h('label', null, 'Observações'), obs),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onClick: () => {
        mutate((st) => { st.testesMat.push({ id: uid(), data: hoje, ...reg, obs: obs.value.trim() }); });
        toast('Teste salvo como marco zero'); etapa = -1; re();
      } }, 'Salvar resultado'), h('button', { class: 'btn ghost', onClick: () => { etapa = -1; visaoGeral(); } }, 'Descartar')));
  }
  desenhar();

  // ---------- Ginásio ----------
  const faixa = s.ginasio.faixa;
  const def = FAIXAS[faixa - 1];
  const hist = s.ginasio.historico.filter((x) => x.faixa === faixa).slice(-20);
  const seq = sequenciaMeta(s.ginasio.historico, faixa, hoje, s.config.diasLivres);
  raiz.append(h('div', { class: 'card stack' }, h('div', { class: 'row between' }, h('h2', { style: { margin: 0 } }, 'Ginásio de Cálculo'), h('a', { class: 'btn sm primary', href: `#/aluno/ginasio?faixa=${faixa}` }, 'Conduzir com o Luan →')),
    h('div', { class: 'row' }, h('span', { class: 'muted small' }, 'Faixa do Luan:'), ...FAIXAS.map((f) => h('button', { class: 'btn sm' + (f.n === faixa ? ' primary' : ''), onClick: () => { mutate((st) => { st.ginasio.faixa = f.n; }); re(); } }, `${f.n} · ${f.nome}`))),
    h('p', { style: { margin: 0 } }, `Meta: ${def.metaTxt}.`, def.meta != null ? ` Dias seguidos na meta: ${Math.min(seq, DIAS_PARA_SUBIR)} de ${DIAS_PARA_SUBIR}.` : ''),
    graficoLinha({ titulo: `Tempo do Ginásio na faixa ${faixa}`, pontos: hist.map((x) => ({ x: fmtCurto(x.data), y: x.seg })), cor: CORES.brand, refs: def.meta ? [{ v: def.meta, rotulo: `meta ${def.meta}s`, cor: 'var(--ok)' }] : [], fmt: (v) => `${v}s` }),
    h('p', { class: 'small muted', style: { margin: 0 } }, 'Anota-se o tempo, não o acerto: o progresso aparece em poucos dias — como na caligrafia.')));

  // ---------- erros de matemática ----------
  const me = s.erros.filter((e) => e.origem === 'matematica');
  if (me.length) {
    const leit = me.filter((e) => e.leitura).length;
    const porTopico = {};
    for (const e of me) porTopico[e.assunto || 'Outros'] = (porTopico[e.assunto || 'Outros'] || 0) + 1;
    raiz.append(h('div', { class: 'card stack sm' }, h('h2', { style: { margin: 0 } }, 'Erros nos problemas'),
      h('p', { style: { margin: 0 } }, `${me.length} erros registrados · ${leit} de leitura (dado/operação mal escolhido) · ${me.length - leit} de conta.`),
      h('div', { class: 'row tight' }, ...Object.entries(porTopico).sort((a, b) => b[1] - a[1]).map(([k, v]) => chip(`${k}: ${v}`)))));
  }
  return raiz;
}
