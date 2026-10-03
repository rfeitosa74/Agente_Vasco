// Gráficos SVG simples e acessíveis (sem bibliotecas). Cores vêm de variáveis CSS.
import { svgDe, esc } from './util/dom.js';

const W = 640, H = 220, M = { t: 14, r: 14, b: 28, l: 38 };
const iw = W - M.l - M.r, ih = H - M.t - M.b;
const nice = (max) => { if (max <= 0) return 1; const p = 10 ** Math.floor(Math.log10(max)); const f = max / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };

function eixoY(max, passos = 4, fmt = (v) => v) {
  let s = '';
  for (let i = 0; i <= passos; i++) {
    const v = (max / passos) * i;
    const y = M.t + ih - (v / max) * ih;
    s += `<line class="${i ? 'gl' : 'ax'}" x1="${M.l}" x2="${W - M.r}" y1="${y}" y2="${y}"/><text x="${M.l - 6}" y="${y + 4}" text-anchor="end">${esc(fmt(Math.round(v * 10) / 10))}</text>`;
  }
  return s;
}

/** Barras (opcionalmente empilhadas). series: [{nome, cor, valores:[]}], rotulos: [] */
export function graficoBarras({ rotulos, series, titulo, empilhado = false, linhasRef = [], fmt }) {
  const n = rotulos.length;
  const totais = rotulos.map((_, i) => (empilhado ? series.reduce((a, s) => a + (s.valores[i] || 0), 0) : Math.max(...series.map((s) => s.valores[i] || 0))));
  const max = nice(Math.max(1, ...totais, ...linhasRef.map((l) => l.v)));
  const bw = iw / n;
  const g = empilhado ? 1 : series.length;
  const w = Math.min(46, (bw * 0.7) / g);
  let barras = '';
  rotulos.forEach((r, i) => {
    const cx = M.l + bw * i + bw / 2;
    let acc = 0;
    series.forEach((s, j) => {
      const v = s.valores[i] || 0;
      const hh = (v / max) * ih;
      const x = empilhado ? cx - w / 2 : cx - (w * g) / 2 + w * j;
      const y = M.t + ih - (empilhado ? ((acc + v) / max) * ih : hh);
      if (v > 0) barras += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(hh, 1).toFixed(1)}" rx="3" fill="${s.cor}"><title>${esc(s.nome)} · ${esc(r)}: ${v}</title></rect>`;
      acc += v;
    });
    if (!empilhado && series.length === 1 && totais[i] > 0) barras += `<text x="${cx}" y="${M.t + ih - (totais[i] / max) * ih - 4}" text-anchor="middle" style="fill:var(--ink);font-weight:700">${esc(fmt ? fmt(totais[i]) : totais[i])}</text>`;
    barras += `<text x="${cx}" y="${H - 8}" text-anchor="middle">${esc(r)}</text>`;
  });
  const refs = linhasRef.map((l) => { const y = M.t + ih - (l.v / max) * ih; return `<line x1="${M.l}" x2="${W - M.r}" y1="${y}" y2="${y}" stroke="${l.cor}" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${M.l + 4}" y="${y - 4}" text-anchor="start" style="fill:${l.cor};font-weight:700">${esc(l.rotulo)}</text>`; }).join('');
  return svgDe(`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(titulo)}"><title>${esc(titulo)}</title>${eixoY(max, max <= 8 && Number.isInteger(max) ? max : 4)}${barras}${refs}</svg>`);
}

/** Linha com pontos. pontos: [{x: rótulo, y: número|null}] ; refs: linhas de referência */
export function graficoLinha({ pontos, titulo, cor = 'var(--brand)', refs = [], fmt = (v) => v, invertido = false }) {
  const ys = pontos.map((p) => p.y).filter((y) => y != null);
  if (!ys.length) return svgDe(`<svg class="chart" viewBox="0 0 ${W} 80"><text x="${W / 2}" y="44" text-anchor="middle">Sem dados ainda</text></svg>`);
  const max = nice(Math.max(...ys, ...refs.map((r) => r.v)) * 1.05);
  const n = pontos.length;
  const px = (i) => M.l + (n === 1 ? iw / 2 : (iw * i) / (n - 1));
  const py = (v) => M.t + ih - (v / max) * ih;
  const seg = pontos.map((p, i) => (p.y == null ? null : [px(i), py(p.y)])).filter(Boolean);
  const path = seg.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const dots = pontos.map((p, i) => (p.y == null ? '' : `<circle cx="${px(i).toFixed(1)}" cy="${py(p.y).toFixed(1)}" r="4" fill="${cor}"><title>${esc(p.x)}: ${esc(fmt(p.y))}</title></circle>`)).join('');
  const passo = Math.max(1, Math.ceil(n / 8));
  const labs = pontos.map((p, i) => (i % passo === 0 ? `<text x="${px(i)}" y="${H - 8}" text-anchor="middle">${esc(p.x)}</text>` : '')).join('');
  const rf = refs.map((r) => `<line x1="${M.l}" x2="${W - M.r}" y1="${py(r.v)}" y2="${py(r.v)}" stroke="${r.cor || 'var(--ok)'}" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${W - M.r}" y="${py(r.v) - 4}" text-anchor="end" style="fill:${r.cor || 'var(--ok)'};font-weight:700">${esc(r.rotulo)}</text>`).join('');
  return svgDe(`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(titulo)}"><title>${esc(titulo)}</title>${eixoY(max, 4, fmt)}${rf}<path d="${path}" fill="none" stroke="${cor}" stroke-width="2.5" stroke-linejoin="round"/>${dots}${labs}</svg>`);
}

export const legenda = (itens) => {
  const d = document.createElement('div');
  d.className = 'legend';
  d.innerHTML = itens.map((i) => `<span><i style="background:${i.cor}"></i>${esc(i.nome)}</span>`).join('');
  return d;
};

export const CORES = { A: '#d9822b', B: '#5b7fd6', C: '#9a6fd1', ok: '#12a07a', brand: '#3b63d0' };
