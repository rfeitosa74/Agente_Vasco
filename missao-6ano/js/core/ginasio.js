// Ginásio de Cálculo (páginas 7–8): 5 min/dia, 5 faixas. Anota-se o TEMPO, não o acerto.
// Sobe de faixa quem bate a meta 3 dias seguidos.
import { int, pick, shuffle } from './rng.js';
import { isWeekday, addDays } from '../util/dates.js';

export const FAIXAS = [
  { n: 1, nome: 'Base', desc: 'Tabuada salteada até 12, fora de ordem', qtd: 20, meta: 60, metaTxt: '20 produtos em 60 segundos' },
  { n: 2, nome: 'Ponte', desc: 'Dois dígitos por um dígito (34×7, 68×6…)', qtd: 5, meta: 90, metaTxt: '5 contas em 90 segundos' },
  { n: 3, nome: 'Retomada', desc: 'Dois por dois, por decomposição (34×27…)', qtd: 5, meta: 180, metaTxt: '5 contas em 3 minutos' },
  { n: 4, nome: 'Atalhos', desc: '×11, quadrados, diferença de quadrados, dobrar e partir', qtd: 5, meta: 120, metaTxt: '5 contas em 2 minutos' },
  { n: 5, nome: 'Misto', desc: 'Tudo junto, com frações e decimais simples', qtd: 8, meta: null, metaTxt: 'Manter — esta faixa não termina' },
];

export const ARMAS = [
  { id: 'decompor', nome: 'Decompor', exemplo: '34×27 = 34×20 + 34×7 = 680 + 238 = 918' },
  { id: 'dq', nome: 'Diferença de quadrados', exemplo: '48×52 = 50² − 2² = 2.500 − 4 = 2.496' },
  { id: 'x11', nome: 'Vezes 11', exemplo: '45×11 → abre o 4 e o 5, soma no meio: 4 (9) 5 = 495' },
  { id: 'dobrar', nome: 'Dobrar e partir ao meio', exemplo: '16×25 = 8×50 = 4×100 = 400' },
  { id: 'q5', nome: 'Quadrado terminado em 5', exemplo: '35² → 3×4 = 12, cola 25 → 1.225' },
];

// ---------- respostas como fração (n/d) para aceitar "0,75", "3/4", "6/8" ----------
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
export const reduz = ({ n, d }) => {
  const g = gcd(n, d) || 1;
  const s = d < 0 ? -1 : 1;
  return { n: (s * n) / g, d: (s * d) / g };
};
export const inteiro = (n) => ({ n, d: 1 });
export const igual = (a, b) => a.n * b.d === b.n * a.d;

/** Lê o que o aluno digitou: "238", "1.225", "0,75", "3/4". Devolve {n,d} ou null. */
export function parseResp(txt) {
  if (txt == null) return null;
  let s = String(txt).trim().replace(/\s+/g, '');
  if (!s) return null;
  if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); // 1.225 → milhar
  if (/^-?\d+\/\d+$/.test(s)) {
    const [n, d] = s.split('/').map(Number);
    return d === 0 ? null : reduz({ n, d });
  }
  if (/^-?\d+([.,]\d+)?$/.test(s)) {
    const [i, f = ''] = s.replace(',', '.').split('.');
    const d = 10 ** f.length;
    const n = Number(i + f);
    return reduz({ n, d });
  }
  return null;
}

const ehDecimalFinito = (d) => {
  let x = d;
  while (x % 2 === 0) x /= 2;
  while (x % 5 === 0) x /= 5;
  return x === 1;
};

/** Texto da resposta para mostrar ao tutor. */
export function fmtResp(r, forma = 'auto') {
  const q = reduz(r);
  if (q.d === 1) return String(q.n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (forma !== 'fracao' && ehDecimalFinito(q.d)) return (q.n / q.d).toString().replace('.', ',');
  return `${q.n}/${q.d}`;
}

// ---------- geradores ----------
const q = (texto, n, extra = {}) => ({ texto, resp: inteiro(n), ...extra });

function f1(rng) {
  const usados = new Set();
  const itens = [];
  while (itens.length < 20) {
    const a = int(rng, 2, 12);
    const b = int(rng, 2, 12);
    const chave = a < b ? `${a}x${b}` : `${b}x${a}`;
    if (usados.has(chave)) continue;
    usados.add(chave);
    itens.push(rng() < 0.5 ? [a, b] : [b, a]);
  }
  return itens.map(([a, b]) => q(`${a} × ${b}`, a * b));
}

const naoRedondo = (rng, lo, hi) => {
  let x;
  do x = int(rng, lo, hi);
  while (x % 10 === 0);
  return x;
};

function f2(rng) {
  return Array.from({ length: 5 }, () => {
    const a = naoRedondo(rng, 12, 99);
    const b = int(rng, 3, 9);
    return q(`${a} × ${b}`, a * b);
  });
}

function f3(rng) {
  return Array.from({ length: 5 }, () => {
    const a = naoRedondo(rng, 13, 49);
    const b = naoRedondo(rng, 12, 39);
    return q(`${a} × ${b}`, a * b, { arma: 'decompor' });
  });
}

function atalho(rng, tipo) {
  switch (tipo) {
    case 'x11': {
      const a = int(rng, 12, 99);
      return q(`${a} × 11`, a * 11, { arma: 'x11' });
    }
    case 'q5': {
      const a = pick(rng, [15, 25, 35, 45, 55, 65, 75, 85, 95]);
      return q(`${a}²`, a * a, { arma: 'q5' });
    }
    case 'dq': {
      const m = pick(rng, [30, 40, 50, 60, 70, 80]);
      const d = int(rng, 1, 5);
      return q(`${m - d} × ${m + d}`, (m - d) * (m + d), { arma: 'dq' });
    }
    case 'dobrar': {
      const a = pick(rng, [12, 14, 16, 18, 22, 24, 26, 28, 32, 36, 44, 48]);
      const b = pick(rng, [25, 25, 50, 5]);
      return q(`${a} × ${b}`, a * b, { arma: 'dobrar' });
    }
    default: {
      const a = naoRedondo(rng, 13, 49);
      const b = naoRedondo(rng, 12, 39);
      return q(`${a} × ${b}`, a * b, { arma: 'decompor' });
    }
  }
}

function f4(rng) {
  const tipos = shuffle(rng, ['x11', 'q5', 'dq', 'dobrar', 'decompor']);
  return tipos.map((t) => atalho(rng, t));
}

function fracoesDecimais(rng) {
  const tipo = int(rng, 0, 5);
  if (tipo === 0) {
    const d = pick(rng, [4, 5, 8, 10]);
    const a = int(rng, 1, d - 2);
    const b = int(rng, 1, d - a - 1);
    return { texto: `${a}/${d} + ${b}/${d}`, resp: reduz({ n: a + b, d }), forma: 'fracao' };
  }
  if (tipo === 1) {
    const d = pick(rng, [2, 3, 4, 5, 10]);
    const n = int(rng, 1, d - 1);
    const total = d * int(rng, 2, 12);
    return q(`${n}/${d} de ${total}`, (total / d) * n);
  }
  if (tipo === 2) {
    const a = int(rng, 1, 9) + int(rng, 1, 9) / 10;
    const b = int(rng, 1, 9) / 10 + int(rng, 0, 9) / 100;
    const A = Math.round(a * 100);
    const B = Math.round(b * 100);
    const fm = (x) => (x / 100).toString().replace('.', ',');
    return { texto: `${fm(A)} + ${fm(B)}`, resp: reduz({ n: A + B, d: 100 }), forma: 'decimal' };
  }
  if (tipo === 3) {
    const a = int(rng, 11, 99) / 10; // 1,1 … 9,9
    const A = Math.round(a * 10);
    const k = pick(rng, [10, 100]);
    return { texto: `${a.toString().replace('.', ',')} × ${k}`, resp: reduz({ n: A * k, d: 10 }), forma: 'decimal' };
  }
  if (tipo === 4) {
    const A = int(rng, 2, 9) * 5; // 1,0 … 4,5 (em décimos)
    const b = int(rng, 2, 6);
    return { texto: `${(A / 10).toString().replace('.', ',')} × ${b}`, resp: reduz({ n: A * b, d: 10 }), forma: 'decimal' };
  }
  const a = int(rng, 20, 90);
  const p = pick(rng, [10, 25, 50]);
  const base = a * (p === 10 ? 10 : p === 25 ? 4 : 2);
  return q(`${p}% de ${base}`, (base * p) / 100);
}

function f5(rng) {
  const gens = [() => f2(rng)[0], () => f3(rng)[0], () => atalho(rng, pick(rng, ['x11', 'q5', 'dq', 'dobrar'])), () => fracoesDecimais(rng), () => fracoesDecimais(rng)];
  return Array.from({ length: 8 }, () => pick(rng, gens)());
}

export function gerarSerie(faixa, rng) {
  switch (faixa) {
    case 1: return f1(rng);
    case 2: return f2(rng);
    case 3: return f3(rng);
    case 4: return f4(rng);
    default: return f5(rng);
  }
}

// ---------- progressão ----------
/**
 * Dias seguidos (de missão) em que a meta foi batida NA FAIXA ATUAL, contando de trás para frente.
 * Um dia de missão sem tentativa (que não seja dia livre) quebra a sequência; fim de semana não conta.
 * @param historico [{data, faixa, ok}]
 */
export function sequenciaMeta(historico, faixa, hoje, diasLivres = []) {
  const livres = new Set(diasLivres);
  const porDia = {};
  for (const h of historico) if (h.faixa === faixa) porDia[h.data] = porDia[h.data] || h.ok;
  let d = hoje;
  let n = 0;
  // hoje ainda pode estar em aberto: só conta se já tiver tentativa
  if (!(d in porDia)) d = addDays(d, -1);
  for (let i = 0; i < 60; i++, d = addDays(d, -1)) {
    if (!isWeekday(d) || livres.has(d)) continue;
    if (porDia[d]) n++;
    else break;
  }
  return n;
}

export const DIAS_PARA_SUBIR = 3;

export function deveSubir(historico, faixa, hoje, diasLivres) {
  const def = FAIXAS[faixa - 1];
  if (!def || def.meta == null) return false;
  return sequenciaMeta(historico, faixa, hoje, diasLivres) >= DIAS_PARA_SUBIR;
}

export const armaDaSemana = (semanaIdx) => ARMAS[Math.abs(semanaIdx) % ARMAS.length];
