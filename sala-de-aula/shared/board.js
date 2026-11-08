// Representações do quadro: validação e desenho em SVG.
// Este arquivo é usado no navegador (para mostrar o quadro) e no servidor
// (para gerar uma imagem do quadro e enviá-la à revisão de precisão).

export const VIEW_W = 1000;
export const VIEW_H = 560;

export const KINDS = ['desenho', 'comparacao', 'processo', 'grafico', 'relacoes', 'texto'];
export const SVG_KINDS = ['desenho', 'processo', 'grafico', 'relacoes'];

export const CORES = {
  amarelo: '#f7d774',
  laranja: '#f5a65b',
  branco: '#f5f3ea',
  azul: '#9fd3f0',
  azulEscuro: '#4a86c5',
  coral: '#f49a84',
  verde: '#a8e6b0',
  marrom: '#c9a274',
  cinza: '#b9beb6',
  roxo: '#c7a8ec',
  sombraEscura: '#0d1712',
  sombraClara: '#3d5e4d',
};
export const NOMES_CORES = Object.keys(CORES);

const ELEM_TIPOS = ['circulo', 'elipse', 'retangulo', 'linha', 'seta', 'poligono', 'texto'];

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function num(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function cor(nome, def = 'branco') {
  return CORES[nome] || CORES[def];
}
function safeId(s, fallback) {
  const id = String(s ?? '').trim().replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 40);
  return id || fallback;
}

/** Quebra um texto em linhas que caibam em `maxChars` caracteres. */
export function wrapText(text, maxChars, maxLines = 4) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/\s*\S*$/, '') + '…';
    return { lines: kept, truncated: true };
  }
  return { lines, truncated: false };
}

const CHAR_W = 0.56; // largura média aproximada de um caractere, em relação ao tamanho da fonte

function textBox(cx, cy, lines, size, anchor = 'middle') {
  const w = Math.max(...lines.map((l) => l.length), 1) * size * CHAR_W;
  const h = lines.length * size * 1.2;
  const x0 = anchor === 'middle' ? cx - w / 2 : anchor === 'end' ? cx - w : cx;
  return { x: x0, y: cy - size * 0.9, w, h };
}
function overlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

/**
 * Normaliza a representação recebida do modelo e devolve a lista de problemas
 * detectados automaticamente (que também são enviados à revisão).
 */
export function validateBoard(input) {
  const problemas = [];
  const b = typeof input === 'object' && input ? structuredClone(input) : {};
  if (!KINDS.includes(b.tipo)) {
    problemas.push(`Tipo de representação desconhecido: "${b.tipo}".`);
    b.tipo = 'texto';
  }
  b.pergunta = String(b.pergunta || '').trim();
  b.titulo = String(b.titulo || '').trim();
  b.explicacao = String(b.explicacao || '').trim();
  b.fontes = Array.isArray(b.fontes) ? b.fontes.map(String).slice(0, 8) : [];
  if (!b.pergunta) problemas.push('A representação não indica qual pergunta responde.');
  b.cartoes = Array.isArray(b.cartoes)
    ? b.cartoes.slice(0, 3).map((c, i) => ({
        id: safeId(c?.id, `cartao${i + 1}`),
        titulo: String(c?.titulo || ''),
        texto: String(c?.texto || ''),
      }))
    : [];

  const ids = new Set();
  const uid = (raw, fb) => {
    let id = safeId(raw, fb);
    while (ids.has(id)) id += '_';
    ids.add(id);
    return id;
  };

  if (b.tipo === 'desenho') {
    const elems = Array.isArray(b.desenho?.elementos) ? b.desenho.elementos : [];
    if (elems.length === 0) problemas.push('O desenho não tem elementos.');
    b.desenho = {
      elementos: elems.slice(0, 60).map((e, i) => {
        const o = { ...e };
        o.id = uid(e?.id, `el${i + 1}`);
        if (!ELEM_TIPOS.includes(o.tipo)) {
          problemas.push(`Elemento "${o.id}" tem tipo inválido (${o.tipo}).`);
          o.tipo = 'texto';
        }
        if (o.cor && !CORES[o.cor]) o.cor = 'branco';
        for (const k of ['x', 'x2', 'rotuloX']) if (o[k] != null) o[k] = num(o[k]);
        for (const k of ['y', 'y2', 'rotuloY']) if (o[k] != null) o[k] = num(o[k]);
        for (const k of ['r', 'rx', 'ry', 'w', 'h', 'rotacao', 'espessura', 'opacidade', 'camada'])
          if (o[k] != null) o[k] = num(o[k]);
        if (Array.isArray(o.pontos)) o.pontos = o.pontos.map((p) => ({ x: num(p?.x), y: num(p?.y) }));
        const fora = (x, y) => x < -5 || x > VIEW_W + 5 || y < -5 || y > VIEW_H + 5;
        if (o.x != null && o.y != null && fora(o.x, o.y))
          problemas.push(`Elemento "${o.id}" está fora da área visível (${o.x}, ${o.y}).`);
        if (o.tipo === 'circulo' && !(o.r > 0)) problemas.push(`Círculo "${o.id}" sem raio.`);
        if (o.tipo === 'poligono' && !(o.pontos?.length >= 3))
          problemas.push(`Polígono "${o.id}" precisa de pelo menos 3 pontos.`);
        if ((o.tipo === 'linha' || o.tipo === 'seta') && (o.x2 == null || o.y2 == null))
          problemas.push(`Linha/seta "${o.id}" sem ponto final.`);
        if (o.rotulo && String(o.rotulo).length > 60) {
          problemas.push(`Legenda longa demais em "${o.id}".`);
          o.rotulo = String(o.rotulo).slice(0, 60);
        }
        return o;
      }),
    };
    // Sobreposição de legendas
    const boxes = layoutDesenho(b.desenho.elementos).labels;
    for (let i = 0; i < boxes.length; i++) {
      const bi = boxes[i];
      if (bi.box.x < 0 || bi.box.x + bi.box.w > VIEW_W || bi.box.y < 0 || bi.box.y + bi.box.h > VIEW_H)
        problemas.push(`A legenda "${bi.text}" fica cortada na borda do quadro.`);
      for (let j = i + 1; j < boxes.length; j++)
        if (overlap(bi.box, boxes[j].box))
          problemas.push(`As legendas "${bi.text}" e "${boxes[j].text}" se sobrepõem.`);
    }
  }

  if (b.tipo === 'comparacao') {
    const cols = Array.isArray(b.comparacao?.colunas) ? b.comparacao.colunas : [];
    if (cols.length < 2) problemas.push('Uma comparação precisa de pelo menos duas colunas.');
    b.comparacao = {
      colunas: cols.slice(0, 4).map((c, i) => ({
        id: uid(c?.id, `col${i + 1}`),
        titulo: String(c?.titulo || ''),
        cor: CORES[c?.cor] ? c.cor : ['amarelo', 'azul', 'coral', 'verde'][i % 4],
      })),
      aspectos: (Array.isArray(b.comparacao?.aspectos) ? b.comparacao.aspectos : []).slice(0, 8).map((a, i) => ({
        id: uid(a?.id, `asp${i + 1}`),
        aspecto: String(a?.aspecto || ''),
        valores: (Array.isArray(a?.valores) ? a.valores : []).map(String),
      })),
    };
    for (const a of b.comparacao.aspectos)
      if (a.valores.length !== b.comparacao.colunas.length)
        problemas.push(`O aspecto "${a.aspecto}" não tem um valor para cada coluna.`);
  }

  if (b.tipo === 'processo') {
    const et = Array.isArray(b.processo?.etapas) ? b.processo.etapas : [];
    if (et.length < 2) problemas.push('Um processo precisa de pelo menos duas etapas.');
    b.processo = {
      ciclico: !!b.processo?.ciclico,
      etapas: et.slice(0, 8).map((e, i) => ({
        id: uid(e?.id, `etapa${i + 1}`),
        titulo: String(e?.titulo || ''),
        detalhe: String(e?.detalhe || ''),
      })),
    };
  }

  if (b.tipo === 'grafico') {
    const g = b.grafico || {};
    const series = (Array.isArray(g.series) ? g.series : []).slice(0, 4).map((s, i) => ({
      id: uid(s?.id, `serie${i + 1}`),
      nome: String(s?.nome || ''),
      cor: CORES[s?.cor] ? s.cor : ['amarelo', 'azul', 'coral', 'verde'][i % 4],
      pontos: (Array.isArray(s?.pontos) ? s.pontos : []).slice(0, 24).map((p) => ({ x: String(p?.x ?? ''), y: num(p?.y) })),
    }));
    if (!series.length || !series.some((s) => s.pontos.length)) problemas.push('O gráfico não tem dados.');
    b.grafico = {
      tipo: g.tipo === 'linha' ? 'linha' : 'barras',
      eixoX: String(g.eixoX || ''),
      eixoY: String(g.eixoY || ''),
      unidade: String(g.unidade || ''),
      dadosIlustrativos: !!g.dadosIlustrativos,
      series,
    };
  }

  if (b.tipo === 'relacoes') {
    const nos = (Array.isArray(b.relacoes?.nos) ? b.relacoes.nos : []).slice(0, 10).map((n, i) => ({
      id: uid(n?.id, `no${i + 1}`),
      rotulo: String(n?.rotulo || ''),
      central: !!n?.central,
    }));
    const noIds = new Set(nos.map((n) => n.id));
    const ligacoes = [];
    for (const [i, l] of (Array.isArray(b.relacoes?.ligacoes) ? b.relacoes.ligacoes : []).entries()) {
      const de = safeId(l?.de, ''), para = safeId(l?.para, '');
      if (!noIds.has(de) || !noIds.has(para)) {
        problemas.push(`Ligação "${l?.rotulo || i}" aponta para um nó que não existe.`);
        continue;
      }
      ligacoes.push({ id: uid(l?.id, `lig${i + 1}`), de, para, rotulo: String(l?.rotulo || '') });
    }
    if (nos.length < 2) problemas.push('Um esquema de relações precisa de pelo menos dois nós.');
    b.relacoes = { nos, ligacoes };
  }

  if (b.tipo === 'texto') {
    b.texto = {
      blocos: (Array.isArray(b.texto?.blocos) ? b.texto.blocos : []).slice(0, 5).map((t, i) => ({
        id: uid(t?.id, `bloco${i + 1}`),
        titulo: String(t?.titulo || ''),
        texto: String(t?.texto || ''),
      })),
    };
  }

  if (b.figuraOriginal && !(num(b.figuraOriginal.pagina) >= 1)) delete b.figuraOriginal;

  for (const k of KINDS) if (k !== b.tipo) delete b[k];
  return { board: b, problemas };
}

/** Lista os elementos que podem ser destacados, com seus rótulos. */
export function listElements(board) {
  if (!board) return [];
  const out = [];
  const push = (id, rotulo) => out.push({ id, rotulo: String(rotulo || '').slice(0, 80) });
  if (board.tipo === 'desenho')
    for (const e of board.desenho.elementos) push(e.id, e.rotulo || e.texto || `${e.tipo}`);
  if (board.tipo === 'comparacao') {
    for (const c of board.comparacao.colunas) push(c.id, c.titulo);
    for (const a of board.comparacao.aspectos) push(a.id, a.aspecto);
  }
  if (board.tipo === 'processo') for (const e of board.processo.etapas) push(e.id, e.titulo);
  if (board.tipo === 'grafico') for (const s of board.grafico.series) push(s.id, s.nome);
  if (board.tipo === 'relacoes') {
    for (const n of board.relacoes.nos) push(n.id, n.rotulo);
    for (const l of board.relacoes.ligacoes) push(l.id, l.rotulo);
  }
  if (board.tipo === 'texto') for (const t of board.texto.blocos) push(t.id, t.titulo);
  for (const c of board.cartoes || []) push(c.id, c.titulo);
  return out;
}

/** Descrição textual compacta do quadro (para o tutor e para a revisão). */
export function describeBoard(board) {
  if (!board) return 'O quadro está vazio.';
  const linhas = [
    `Tipo: ${board.tipo}. Título: "${board.titulo}". Pergunta que responde: "${board.pergunta}".`,
    `Explicação mostrada: ${board.explicacao}`,
  ];
  if (board.tipo === 'desenho') {
    linhas.push('Elementos (coordenadas num quadro de 1000x560, x cresce para a direita, y para baixo):');
    for (const e of board.desenho.elementos) {
      const pos =
        e.tipo === 'poligono'
          ? `pontos ${e.pontos.map((p) => `(${Math.round(p.x)},${Math.round(p.y)})`).join(' ')}`
          : e.tipo === 'linha' || e.tipo === 'seta'
          ? `de (${e.x},${e.y}) até (${e.x2},${e.y2})`
          : `em (${e.x},${e.y})${e.r ? ` raio ${e.r}` : ''}${e.w ? ` ${e.w}x${e.h}` : ''}`;
      linhas.push(`- [${e.id}] ${e.tipo} ${e.cor || ''} ${pos}${e.rotulo ? ` — legenda "${e.rotulo}"` : ''}${e.texto ? ` — texto "${e.texto}"` : ''}`);
    }
  } else {
    for (const el of listElements(board)) linhas.push(`- [${el.id}] ${el.rotulo}`);
  }
  if (board.tipo === 'comparacao')
    for (const a of board.comparacao.aspectos)
      linhas.push(`  ${a.aspecto}: ${a.valores.map((v, i) => `${board.comparacao.colunas[i]?.titulo}= ${v}`).join(' | ')}`);
  if (board.tipo === 'processo')
    linhas.push(`  ${board.processo.ciclico ? 'Ciclo' : 'Sequência'}: ${board.processo.etapas.map((e) => `${e.titulo} (${e.detalhe})`).join(' → ')}`);
  if (board.tipo === 'grafico')
    for (const s of board.grafico.series)
      linhas.push(`  Série ${s.nome}: ${s.pontos.map((p) => `${p.x}=${p.y}`).join(', ')} ${board.grafico.unidade}`);
  if (board.tipo === 'relacoes')
    for (const l of board.relacoes.ligacoes) linhas.push(`  ${l.de} —"${l.rotulo}"→ ${l.para}`);
  if (board.tipo === 'texto') for (const t of board.texto.blocos) linhas.push(`  ${t.titulo}: ${t.texto}`);
  for (const c of board.cartoes || []) linhas.push(`Cartão [${c.id}] ${c.titulo}: ${c.texto}`);
  if (board.legendaGeral) linhas.push(`Observação no quadro: ${board.legendaGeral}`);
  return linhas.join('\n');
}

// ---------------------------------------------------------------------------
// Desenho em SVG
// ---------------------------------------------------------------------------

const FONT = "Inter, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

function textSvg(x, y, lines, { size = 22, fill = CORES.branco, anchor = 'middle', weight = 600, cls = '' } = {}) {
  const tspans = lines
    .map((l, i) => `<tspan x="${x.toFixed(1)}" dy="${i === 0 ? 0 : (size * 1.2).toFixed(1)}">${esc(l)}</tspan>`)
    .join('');
  return `<text class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" stroke="#1d3a2c" stroke-width="${Math.max(3, size / 5).toFixed(1)}" paint-order="stroke" stroke-linejoin="round">${tspans}</text>`;
}

function anchorOf(e) {
  switch (e.tipo) {
    case 'circulo':
    case 'elipse':
    case 'texto':
      return { x: num(e.x), y: num(e.y) };
    case 'retangulo':
      return { x: num(e.x) + num(e.w) / 2, y: num(e.y) + num(e.h) / 2 };
    case 'linha':
    case 'seta':
      return { x: (num(e.x) + num(e.x2)) / 2, y: (num(e.y) + num(e.y2)) / 2 };
    case 'poligono': {
      const p = e.pontos || [];
      if (!p.length) return { x: 0, y: 0 };
      return { x: p.reduce((s, q) => s + q.x, 0) / p.length, y: p.reduce((s, q) => s + q.y, 0) / p.length };
    }
    default:
      return { x: num(e.x), y: num(e.y) };
  }
}

function defaultLabelPos(e) {
  const a = anchorOf(e);
  if (e.tipo === 'circulo') return { x: a.x, y: a.y + num(e.r) + 28 };
  if (e.tipo === 'elipse') return { x: a.x, y: a.y + num(e.ry, num(e.rx)) + 28 };
  if (e.tipo === 'retangulo') return { x: a.x, y: num(e.y) + num(e.h) + 28 };
  if (e.tipo === 'linha' || e.tipo === 'seta') return { x: a.x, y: a.y - 14 };
  return a;
}

// Ponto do elemento para onde a linha guia da legenda deve apontar.
// Para polígonos (ex.: regiões de sombra), usa o ponto da borda mais próximo
// da legenda, puxado um pouco para dentro — assim a guia não cai em outra região.
function labelTarget(e, pos) {
  if (e.tipo === 'circulo') {
    const ang = Math.atan2(pos.y - num(e.y), pos.x - num(e.x));
    const r = num(e.r) * 0.85;
    return { x: num(e.x) + r * Math.cos(ang), y: num(e.y) + r * Math.sin(ang) };
  }
  if (e.tipo !== 'poligono' || !(e.pontos?.length >= 3)) return anchorOf(e);
  const c = anchorOf(e);
  let best = null, bestD = Infinity;
  const pts = e.pontos;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = clamp(((pos.x - a.x) * dx + (pos.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0.15, 0.85);
    const p = { x: a.x + t * dx, y: a.y + t * dy };
    const d = Math.hypot(p.x - pos.x, p.y - pos.y);
    if (d < bestD) (bestD = d), (best = p);
  }
  return { x: best.x + (c.x - best.x) * 0.12, y: best.y + (c.y - best.y) * 0.12 };
}

function layoutDesenho(elementos) {
  const labels = [];
  for (const e of elementos) {
    if (!e.rotulo) continue;
    const size = clamp(num(e.tamanhoRotulo, 22), 16, 32);
    const pos = e.rotuloX != null && e.rotuloY != null ? { x: e.rotuloX, y: e.rotuloY } : defaultLabelPos(e);
    const { lines } = wrapText(e.rotulo, 22, 3);
    const box = textBox(pos.x, pos.y, lines, size);
    labels.push({ id: e.id, text: e.rotulo, lines, size, pos, box, anchor: labelTarget(e, pos), explicit: e.rotuloX != null });
  }
  return { labels };
}

function shapeSvg(e) {
  const c = cor(e.cor, 'branco');
  const filled = e.preenchido !== false && !['linha', 'seta', 'texto'].includes(e.tipo);
  const op = e.opacidade != null ? clamp(num(e.opacidade), 0.05, 1) : e.cor === 'sombraEscura' ? 0.92 : e.cor === 'sombraClara' ? 0.75 : 1;
  const sw = clamp(num(e.espessura, 3), 1, 14);
  const dash = e.tracejado ? ` stroke-dasharray="${sw * 3} ${sw * 2.5}"` : '';
  const isShadow = e.cor === 'sombraEscura' || e.cor === 'sombraClara';
  const stroke = isShadow ? '#8fb3a0' : c;
  const fillAttr = filled ? `fill="${c}" fill-opacity="${op}"` : 'fill="none"';
  const strokeAttr = `stroke="${stroke}" stroke-width="${isShadow ? 1.5 : sw}" stroke-opacity="${isShadow ? 0.6 : 1}"${dash}`;
  switch (e.tipo) {
    case 'circulo':
      return `<circle cx="${num(e.x)}" cy="${num(e.y)}" r="${Math.max(1, num(e.r, 10))}" ${fillAttr} ${strokeAttr}/>`;
    case 'elipse': {
      const rot = num(e.rotacao) ? ` transform="rotate(${num(e.rotacao)} ${num(e.x)} ${num(e.y)})"` : '';
      return `<ellipse cx="${num(e.x)}" cy="${num(e.y)}" rx="${Math.max(1, num(e.rx, 20))}" ry="${Math.max(1, num(e.ry, 10))}"${rot} ${fillAttr} ${strokeAttr}/>`;
    }
    case 'retangulo':
      return `<rect x="${num(e.x)}" y="${num(e.y)}" width="${Math.max(1, num(e.w, 10))}" height="${Math.max(1, num(e.h, 10))}" rx="8" ${fillAttr} ${strokeAttr}/>`;
    case 'poligono':
      return `<polygon points="${(e.pontos || []).map((p) => `${p.x},${p.y}`).join(' ')}" ${fillAttr} ${strokeAttr} stroke-linejoin="round"/>`;
    case 'linha':
      return `<line x1="${num(e.x)}" y1="${num(e.y)}" x2="${num(e.x2)}" y2="${num(e.y2)}" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"${dash}/>`;
    case 'seta': {
      const x1 = num(e.x), y1 = num(e.y), x2 = num(e.x2), y2 = num(e.y2);
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const L = 10 + sw * 3;
      const p1 = [x2 - L * Math.cos(ang - 0.45), y2 - L * Math.sin(ang - 0.45)];
      const p2 = [x2 - L * Math.cos(ang + 0.45), y2 - L * Math.sin(ang + 0.45)];
      const bx = x2 - L * 0.8 * Math.cos(ang), by = y2 - L * 0.8 * Math.sin(ang);
      return `<line x1="${x1}" y1="${y1}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"${dash}/><polygon points="${x2},${y2} ${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}" fill="${c}"/>`;
    }
    case 'texto': {
      const size = clamp(num(e.tamanho, 24), 14, 44);
      const { lines } = wrapText(e.texto || '', clamp(Math.round(num(e.w, 360) / (size * CHAR_W)), 8, 60), 4);
      return textSvg(num(e.x), num(e.y), lines, { size, fill: c, anchor: e.alinhamento === 'esquerda' ? 'start' : 'middle' });
    }
    default:
      return '';
  }
}

function renderDesenho(board) {
  const els = [...board.desenho.elementos].sort((a, b) => num(a.camada) - num(b.camada));
  const { labels } = layoutDesenho(els);
  const labelById = Object.fromEntries(labels.map((l) => [l.id, l]));
  let out = '';
  for (const e of els) {
    out += `<g class="el" data-id="${esc(e.id)}">${shapeSvg(e)}</g>`;
  }
  // Legendas sempre por cima das formas
  for (const e of els) {
    const l = labelById[e.id];
    if (!l) continue;
    let leader = '';
    const dist = Math.hypot(l.pos.x - l.anchor.x, l.pos.y - l.anchor.y);
    if (l.explicit && dist > 70 && e.tipo !== 'texto') {
      // linha guia da legenda até o elemento
      const ty = l.pos.y < l.anchor.y ? l.box.y + l.box.h : l.box.y;
      leader = `<line x1="${l.pos.x.toFixed(1)}" y1="${ty.toFixed(1)}" x2="${l.anchor.x.toFixed(1)}" y2="${l.anchor.y.toFixed(1)}" stroke="${CORES.branco}" stroke-opacity="0.55" stroke-width="1.5" stroke-dasharray="4 4"/>`;
    }
    out += `<g class="el-label" data-id="${esc(e.id)}">${leader}${textSvg(l.pos.x, l.pos.y, l.lines, {
      size: l.size,
      fill: e.corRotulo && CORES[e.corRotulo] ? CORES[e.corRotulo] : CORES.branco,
    })}</g>`;
  }
  return out;
}

function roundedBox(x, y, w, h, stroke, fillOp = 0.16) {
  return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="16" fill="${stroke}" fill-opacity="${fillOp}" stroke="${stroke}" stroke-width="3"/>`;
}

function arrow(x1, y1, x2, y2, c = CORES.branco, sw = 3) {
  return shapeSvg({ tipo: 'seta', x: x1, y: y1, x2, y2, cor: Object.keys(CORES).find((k) => CORES[k] === c) || 'branco', espessura: sw });
}

function renderProcesso(board) {
  const etapas = board.processo.etapas;
  const n = etapas.length;
  const palette = ['amarelo', 'azul', 'coral', 'verde', 'laranja', 'roxo', 'amarelo', 'azul'];
  let out = '';
  if (board.processo.ciclico && n >= 3) {
    const cx = VIEW_W / 2, cy = VIEW_H / 2 + 6, RX = 340, RY = 190;
    const bw = n > 5 ? 200 : 230, bh = n > 5 ? 112 : 124;
    const pos = etapas.map((_, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return { x: cx + RX * Math.cos(a), y: cy + RY * Math.sin(a) };
    });
    // setas entre caixas, ao longo da elipse
    for (let i = 0; i < n; i++) {
      const a1 = -Math.PI / 2 + ((i + 0.32) * 2 * Math.PI) / n;
      const a2 = -Math.PI / 2 + ((i + 0.68) * 2 * Math.PI) / n;
      const r = 0.92;
      out += arrow(cx + RX * r * Math.cos(a1), cy + RY * r * Math.sin(a1), cx + RX * r * Math.cos(a2), cy + RY * r * Math.sin(a2), CORES.branco, 3);
    }
    etapas.forEach((e, i) => {
      const c = CORES[palette[i]];
      const { x, y } = pos[i];
      const title = wrapText(`${i + 1}. ${e.titulo}`, Math.floor(bw / (20 * CHAR_W)), 2).lines;
      const det = wrapText(e.detalhe, Math.floor(bw / (16 * CHAR_W)), 3).lines;
      out += `<g class="el" data-id="${esc(e.id)}">${roundedBox(x - bw / 2, y - bh / 2, bw, bh, c)}${textSvg(x, y - bh / 2 + 28, title, { size: 20, fill: c, weight: 700 })}${textSvg(x, y - bh / 2 + 32 + title.length * 24, det, { size: 16, weight: 500 })}</g>`;
    });
    return out;
  }
  const perRow = n <= 4 ? n : Math.ceil(n / 2);
  const rows = Math.ceil(n / perRow);
  const gap = 46;
  const bw = Math.min(260, (VIEW_W - 60 - gap * (perRow - 1)) / perRow);
  const bh = rows === 1 ? 260 : 200;
  const top = rows === 1 ? (VIEW_H - bh) / 2 : 50;
  const ptsOf = (i) => {
    const r = Math.floor(i / perRow), k = i % perRow;
    const totalW = perRow * bw + (perRow - 1) * gap;
    const x0 = (VIEW_W - totalW) / 2;
    return { x: x0 + k * (bw + gap), y: top + r * (bh + 50) };
  };
  etapas.forEach((e, i) => {
    const c = CORES[palette[i]];
    const p = ptsOf(i);
    const titleSize = bw < 200 ? 18 : 21;
    const title = wrapText(`${i + 1}. ${e.titulo}`, Math.floor((bw - 20) / (titleSize * CHAR_W)), 2).lines;
    const det = wrapText(e.detalhe, Math.floor((bw - 20) / (17 * CHAR_W)), rows === 1 ? 7 : 5).lines;
    out += `<g class="el" data-id="${esc(e.id)}">${roundedBox(p.x, p.y, bw, bh, c)}${textSvg(p.x + bw / 2, p.y + 34, title, { size: titleSize, fill: c, weight: 700 })}${textSvg(p.x + bw / 2, p.y + 44 + title.length * titleSize * 1.2, det, { size: 17, weight: 500 })}</g>`;
    if (i < n - 1) {
      const q = ptsOf(i + 1);
      if (q.y === p.y) out += arrow(p.x + bw + 6, p.y + bh / 2, q.x - 6, q.y + bh / 2, CORES.branco, 4);
      else out += `<path d="M ${p.x + bw / 2} ${p.y + bh + 4} C ${p.x + bw / 2} ${p.y + bh + 40}, ${q.x + bw / 2} ${q.y - 40}, ${q.x + bw / 2} ${q.y - 14}" fill="none" stroke="${CORES.branco}" stroke-width="3" stroke-dasharray="6 6"/>` + arrow(q.x + bw / 2, q.y - 20, q.x + bw / 2, q.y - 4, CORES.branco, 3);
    }
  });
  return out;
}

function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => m <= s) ?? 10;
  return step * p;
}
function fmt(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(Math.abs(n) < 10 ? 1 : 0).replace('.', ',');
}

function renderGrafico(board) {
  const g = board.grafico;
  const L = 110, R = 960, T = 50, B = 470;
  const allX = [];
  for (const s of g.series) for (const p of s.pontos) if (!allX.includes(p.x)) allX.push(p.x);
  const ys = g.series.flatMap((s) => s.pontos.map((p) => p.y));
  const minY = Math.min(0, ...ys);
  const maxY = niceMax(Math.max(...ys, 0) * 1.05);
  const sy = (y) => B - ((y - minY) / (maxY - minY || 1)) * (B - T);
  let out = '';
  // grade e eixo Y
  for (let i = 0; i <= 5; i++) {
    const v = minY + ((maxY - minY) * i) / 5;
    const y = sy(v);
    out += `<line x1="${L}" y1="${y}" x2="${R}" y2="${y}" stroke="${CORES.branco}" stroke-opacity="0.18" stroke-width="1.5"/>`;
    out += textSvg(L - 12, y + 7, [fmt(v)], { size: 18, anchor: 'end', weight: 500 });
  }
  out += `<line x1="${L}" y1="${T - 10}" x2="${L}" y2="${B}" stroke="${CORES.branco}" stroke-width="3"/><line x1="${L}" y1="${B}" x2="${R}" y2="${B}" stroke="${CORES.branco}" stroke-width="3"/>`;
  const slot = (R - L) / Math.max(allX.length, 1);
  const rotate = allX.length > 8;
  allX.forEach((x, i) => {
    const cx = L + slot * (i + 0.5);
    out += rotate
      ? `<g transform="rotate(-30 ${cx} ${B + 22})">${textSvg(cx, B + 22, [x.slice(0, 14)], { size: 16, anchor: 'end', weight: 500 })}</g>`
      : textSvg(cx, B + 28, wrapText(x, Math.max(6, Math.floor(slot / 10)), 2).lines, { size: 17, weight: 500 });
  });
  const ns = g.series.length;
  g.series.forEach((s, si) => {
    const c = CORES[s.cor];
    let inner = '';
    if (g.tipo === 'barras') {
      const bw = Math.min(70, (slot * 0.7) / ns);
      s.pontos.forEach((p) => {
        const i = allX.indexOf(p.x);
        const x = L + slot * (i + 0.5) - (bw * ns) / 2 + si * bw;
        const y0 = sy(Math.max(0, minY)), y1 = sy(p.y);
        inner += `<rect x="${x.toFixed(1)}" y="${Math.min(y0, y1).toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${Math.abs(y0 - y1).toFixed(1)}" fill="${c}" fill-opacity="0.85" rx="4"/>`;
        inner += textSvg(x + (bw - 4) / 2, Math.min(y0, y1) - 8, [fmt(p.y)], { size: 16, fill: c, weight: 600 });
      });
    } else {
      const pts = s.pontos.map((p) => [L + slot * (allX.indexOf(p.x) + 0.5), sy(p.y)]);
      inner += `<polyline points="${pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="4" stroke-linejoin="round"/>`;
      pts.forEach((p, k) => {
        inner += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="6" fill="${c}"/>`;
        if (pts.length <= 12) inner += textSvg(p[0], p[1] - 14, [fmt(s.pontos[k].y)], { size: 15, fill: c, weight: 600 });
      });
    }
    out += `<g class="el" data-id="${esc(s.id)}">${inner}</g>`;
  });
  // títulos dos eixos e legenda
  out += textSvg((L + R) / 2, VIEW_H - 14, [g.eixoX], { size: 19, fill: CORES.amarelo });
  out += `<g transform="rotate(-90 30 ${(T + B) / 2})">${textSvg(30, (T + B) / 2, [`${g.eixoY}${g.unidade ? ` (${g.unidade})` : ''}`], { size: 19, fill: CORES.amarelo })}</g>`;
  if (ns > 1)
    g.series.forEach((s, i) => {
      const x = R - 220, y = T + i * 28;
      out += `<rect x="${x}" y="${y - 14}" width="18" height="18" fill="${CORES[s.cor]}" rx="3"/>` + textSvg(x + 28, y + 1, [s.nome], { size: 17, anchor: 'start', weight: 500 });
    });
  if (g.dadosIlustrativos) out += textSvg(R, T - 22, ['Valores ilustrativos'], { size: 15, anchor: 'end', fill: CORES.cinza, weight: 500 });
  return out;
}

function renderRelacoes(board) {
  const { nos, ligacoes } = board.relacoes;
  const centrais = nos.filter((n) => n.central);
  const outros = nos.filter((n) => !n.central);
  const pos = {};
  const cx = VIEW_W / 2, cy = VIEW_H / 2;
  if (centrais.length === 1) pos[centrais[0].id] = { x: cx, y: cy };
  else centrais.forEach((n, i) => (pos[n.id] = { x: cx + (i - (centrais.length - 1) / 2) * 260, y: cy }));
  const ring = centrais.length ? outros : nos;
  const RX = 370, RY = 200;
  ring.forEach((n, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / ring.length + (ring.length % 2 === 0 ? Math.PI / ring.length : 0);
    pos[n.id] = { x: cx + RX * Math.cos(a), y: cy + RY * Math.sin(a) };
  });
  const box = {};
  for (const n of nos) {
    const size = n.central ? 24 : 20;
    const { lines } = wrapText(n.rotulo, n.central ? 16 : 18, 3);
    const w = Math.max(...lines.map((l) => l.length)) * size * CHAR_W + 34;
    const h = lines.length * size * 1.2 + 26;
    box[n.id] = { w, h, lines, size };
  }
  let out = '';
  const edgeEnd = (from, to) => {
    // ponto na borda da caixa de destino
    const b = box[to], p = pos[to], q = pos[from];
    const dx = q.x - p.x, dy = q.y - p.y;
    const s = Math.min(Math.abs((b.w / 2 + 6) / (dx || 1e-6)), Math.abs((b.h / 2 + 6) / (dy || 1e-6)));
    return { x: p.x + dx * s, y: p.y + dy * s };
  };
  for (const l of ligacoes) {
    const a = edgeEnd(l.para, l.de), b = edgeEnd(l.de, l.para);
    let inner = arrow(a.x, a.y, b.x, b.y, CORES.azul, 3);
    if (l.rotulo) {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const { lines } = wrapText(l.rotulo, 18, 2);
      const tb = textBox(mx, my + 6, lines, 16);
      inner += `<rect x="${(tb.x - 6).toFixed(1)}" y="${(tb.y - 4).toFixed(1)}" width="${(tb.w + 12).toFixed(1)}" height="${(tb.h + 6).toFixed(1)}" rx="8" fill="#24493a" fill-opacity="0.92"/>` + textSvg(mx, my + 6, lines, { size: 16, fill: CORES.azul, weight: 600 });
    }
    out += `<g class="el" data-id="${esc(l.id)}">${inner}</g>`;
  }
  nos.forEach((n, i) => {
    const p = pos[n.id], b = box[n.id];
    const c = n.central ? CORES.amarelo : CORES[['branco', 'coral', 'verde', 'azul', 'laranja', 'roxo'][i % 6]];
    out += `<g class="el" data-id="${esc(n.id)}">${roundedBox(p.x - b.w / 2, p.y - b.h / 2, b.w, b.h, c, n.central ? 0.22 : 0.14)}${textSvg(p.x, p.y - b.h / 2 + 13 + b.size, b.lines, { size: b.size, fill: c, weight: n.central ? 800 : 650 })}</g>`;
  });
  return out;
}

/**
 * Gera o SVG completo de uma representação. `highlights` é uma lista de ids
 * de elementos a destacar. `standalone` adiciona o fundo (para virar imagem).
 */
export function renderBoardSvg(board, { highlights = [], standalone = false } = {}) {
  let body = '';
  if (board.tipo === 'desenho') body = renderDesenho(board);
  else if (board.tipo === 'processo') body = renderProcesso(board);
  else if (board.tipo === 'grafico') body = renderGrafico(board);
  else if (board.tipo === 'relacoes') body = renderRelacoes(board);
  else return '';
  const hl = new Set(highlights);
  if (hl.size)
    body = body.replace(/<g class="(el|el-label)" data-id="([^"]+)">/g, (m, cls, id) =>
      hl.has(id) ? `<g class="${cls} hl" data-id="${id}">` : m
    );
  const bg = standalone ? `<rect width="${VIEW_W}" height="${VIEW_H}" fill="#2f5d46"/>` : '';
  const nota = board.legendaGeral
    ? textSvg(VIEW_W - 16, VIEW_H - 14, [board.legendaGeral.slice(0, 50)], { size: 16, anchor: 'end', fill: CORES.cinza, weight: 500 })
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" width="100%" role="img" aria-label="${esc(board.titulo)}">${bg}${body}${nota}</svg>`;
}
