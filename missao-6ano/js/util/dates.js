// Datas como strings "AAAA-MM-DD" no fuso local do aparelho (evita bugs de UTC).
const pad = (n) => String(n).padStart(2, '0');

export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Hoje. Em testes manuais dá para simular com ?hoje=2026-10-05 na URL. */
export function today() {
  if (typeof location !== 'undefined') {
    const q = new URLSearchParams(location.search).get('hoje');
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
  }
  return iso(new Date());
}

export const addDays = (s, n) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};

export const dow = (s) => parse(s).getDay(); // 0 = domingo
export const isWeekday = (s) => {
  const d = dow(s);
  return d >= 1 && d <= 5;
};
export const weekStart = (s) => addDays(s, -((dow(s) + 6) % 7)); // segunda-feira
export const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / 86400000);

export const DIAS_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const DIAS_LONGO = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const fmtCurto = (s) => {
  const d = parse(s);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
};
export const fmtDia = (s) => `${DIAS_CURTO[dow(s)]}, ${fmtCurto(s)}`;
export const fmtDiaLongo = (s) => {
  const d = parse(s);
  return `${DIAS_LONGO[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
};

/** Os 7 dias (seg..dom) da semana que contém `s`. */
export const semanaDe = (s) => {
  const ini = weekStart(s);
  return Array.from({ length: 7 }, (_, i) => addDays(ini, i));
};

export const nowHM = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
