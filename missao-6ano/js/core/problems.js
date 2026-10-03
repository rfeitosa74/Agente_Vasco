// Problemas de Matemática do 6º ano para a Missão de quarta ("5 problemas, não 30 exercícios").
// Dois tipos:
//   • "conta": geometria com conta, frações/decimais, números (mmc, potências, expressões);
//   • "enunciado": problema escrito com um dado SOBRANDO — treina as três perguntas do enunciado.
import { int, pick, shuffle, uid } from './rng.js';
import { reduz, inteiro, igual, parseResp, fmtResp } from './ginasio.js';

const br = (n) => String(n).replace('.', ',');
const mdc = (a, b) => (b ? mdc(b, a % b) : a);
const mmc = (a, b) => (a * b) / mdc(a, b);

// ---------- problemas de conta ----------
const CONTAS = {
  perimetroRet: (rng) => {
    const a = int(rng, 4, 15), b = int(rng, 3, 12);
    return { topico: 'Geometria', texto: `Um retângulo tem lados de ${a} cm e ${b} cm. Qual é o perímetro?`, resp: inteiro(2 * (a + b)), unidade: 'cm', solucao: `2 × (${a} + ${b}) = ${2 * (a + b)} cm` };
  },
  areaRet: (rng) => {
    const a = int(rng, 4, 15), b = int(rng, 3, 12);
    return { topico: 'Geometria', texto: `Qual é a área de um retângulo de ${a} m por ${b} m?`, resp: inteiro(a * b), unidade: 'm²', solucao: `${a} × ${b} = ${a * b} m²` };
  },
  areaTri: (rng) => {
    const b = int(rng, 3, 12) * 2, h = int(rng, 3, 10);
    return { topico: 'Geometria', texto: `Qual é a área de um triângulo de base ${b} cm e altura ${h} cm?`, resp: inteiro((b * h) / 2), unidade: 'cm²', solucao: `${b} × ${h} ÷ 2 = ${(b * h) / 2} cm²` };
  },
  angTri: (rng) => {
    const x = int(rng, 30, 80), y = int(rng, 30, 80);
    return { topico: 'Geometria', texto: `Dois ângulos de um triângulo medem ${x}° e ${y}°. Quanto mede o terceiro ângulo?`, resp: inteiro(180 - x - y), unidade: '°', solucao: `180 − ${x} − ${y} = ${180 - x - y}°` };
  },
  areaQuad: (rng) => {
    const l = int(rng, 4, 14);
    return { topico: 'Geometria', texto: `Um quadrado tem lado de ${l} cm. Qual é a sua área?`, resp: inteiro(l * l), unidade: 'cm²', solucao: `${l} × ${l} = ${l * l} cm²` };
  },
  perimetroQuad: (rng) => {
    const l = int(rng, 4, 20);
    return { topico: 'Geometria', texto: `Qual é o perímetro de um quadrado de lado ${l} cm?`, resp: inteiro(4 * l), unidade: 'cm', solucao: `4 × ${l} = ${4 * l} cm` };
  },
  fracaoDe: (rng) => {
    const d = pick(rng, [3, 4, 5, 6, 8]);
    const n = int(rng, 1, d - 1);
    const tot = d * int(rng, 3, 12);
    return { topico: 'Frações', texto: `Quanto é ${n}/${d} de ${tot}?`, resp: inteiro((tot / d) * n), solucao: `${tot} ÷ ${d} = ${tot / d}; ${tot / d} × ${n} = ${(tot / d) * n}` };
  },
  somaFracao: (rng) => {
    const d = pick(rng, [5, 6, 7, 8, 9, 10]);
    const a = int(rng, 1, d - 2), b = int(rng, 1, d - a - 1);
    return { topico: 'Frações', texto: `Quanto é ${a}/${d} + ${b}/${d}? (pode simplificar)`, resp: reduz({ n: a + b, d }), forma: 'fracao', solucao: `${a}/${d} + ${b}/${d} = ${a + b}/${d}` };
  },
  fracaoEquiv: (rng) => {
    const d = pick(rng, [3, 4, 5, 6]);
    const n = int(rng, 1, d - 1);
    const k = int(rng, 2, 5);
    return { topico: 'Frações', texto: `Complete: ${n}/${d} = ?/${d * k}`, resp: inteiro(n * k), solucao: `${d} × ${k} = ${d * k}, então multiplicamos o numerador também: ${n} × ${k} = ${n * k}` };
  },
  decSoma: (rng) => {
    const A = int(rng, 11, 99), B = int(rng, 105, 399); // décimos e centésimos
    const a = A / 10, b = B / 100;
    return { topico: 'Decimais', texto: `Quanto é ${br(a)} + ${br(b)}?`, resp: reduz({ n: A * 10 + B, d: 100 }), forma: 'decimal', solucao: `${br(a.toFixed(2))} + ${br(b.toFixed(2))} = ${br(((A * 10 + B) / 100).toFixed(2))}` };
  },
  decSub: (rng) => {
    const B = int(rng, 11, 89) / 10;
    const A = B + int(rng, 12, 60) / 10;
    const r = Math.round((A - B) * 10);
    return { topico: 'Decimais', texto: `Quanto é ${br(A.toFixed(1))} − ${br(B.toFixed(1))}?`, resp: reduz({ n: r, d: 10 }), forma: 'decimal', solucao: `${br(A.toFixed(1))} − ${br(B.toFixed(1))} = ${br((r / 10).toFixed(1))}` };
  },
  decMult10: (rng) => {
    const A = int(rng, 101, 999) / 100; // 1,01 … 9,99
    const k = pick(rng, [10, 100, 1000]);
    const n = Math.round(A * 100 * k);
    return { topico: 'Decimais', texto: `Quanto é ${br(A.toFixed(2))} × ${k}?`, resp: reduz({ n, d: 100 }), forma: 'decimal', solucao: `Multiplicar por ${k} anda a vírgula ${String(k).length - 1} casa(s) para a direita.` };
  },
  mmc: (rng) => {
    const [a, b] = pick(rng, [[4, 6], [6, 8], [6, 9], [4, 10], [8, 12], [10, 15], [6, 10], [9, 12]]);
    return { topico: 'Números', texto: `Qual é o mmc de ${a} e ${b}?`, resp: inteiro(mmc(a, b)), solucao: `Múltiplos de ${a} e de ${b}: o primeiro em comum é ${mmc(a, b)}.` };
  },
  mdc: (rng) => {
    const [a, b] = pick(rng, [[12, 18], [24, 36], [20, 30], [18, 27], [16, 24], [30, 45]]);
    return { topico: 'Números', texto: `Qual é o mdc de ${a} e ${b}?`, resp: inteiro(mdc(a, b)), solucao: `O maior número que divide os dois é ${mdc(a, b)}.` };
  },
  potencia: (rng) => {
    const b = pick(rng, [2, 2, 3, 3, 4, 5, 10]);
    const e = b === 2 ? int(rng, 3, 8) : b === 10 ? int(rng, 2, 4) : int(rng, 2, 4);
    return { topico: 'Números', texto: `Quanto é ${b}${['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸'][e]}?`, resp: inteiro(b ** e), solucao: `${Array(e).fill(b).join(' × ')} = ${b ** e}` };
  },
  expressao: (rng) => {
    const a = int(rng, 2, 9), b = int(rng, 2, 9), c = int(rng, 2, 9), d = int(rng, 1, 9);
    return { topico: 'Números', texto: `Resolva: ${a} + ${b} × ${c} − ${d}`, resp: inteiro(a + b * c - d), solucao: `Multiplicação primeiro: ${b} × ${c} = ${b * c}; depois ${a} + ${b * c} − ${d} = ${a + b * c - d}` };
  },
  porcento: (rng) => {
    const p = pick(rng, [10, 25, 50]);
    const base = int(rng, 2, 20) * (p === 10 ? 10 : p === 25 ? 4 : 2);
    return { topico: 'Números', texto: `Quanto é ${p}% de ${base}?`, resp: inteiro((base * p) / 100), solucao: `${p}% de ${base} = ${(base * p) / 100}` };
  },
};

// ---------- problemas escritos, com UM dado sobrando ----------
// [a], [b]… são os números do texto. `usa` são os dados necessários, `sobra` os que não servem.
const ENUNCIADOS = [
  {
    id: 'cadernos', op: '×', pede: 'o custo dos cadernos', unidade: 'R$',
    txt: 'Luan comprou [a] cadernos de R$ [b] cada. Pagou com uma nota de R$ [c]. Quanto custaram os cadernos?',
    gen: (rng) => { const a = int(rng, 3, 9), b = int(rng, 4, 12); return { a, b, c: a * b <= 50 ? 50 : 100 }; },
    resp: (v) => v.a * v.b, usa: ['a', 'b'], sobra: ['c'], solucao: (v) => `${v.a} × ${v.b} = ${v.a * v.b}. A nota de R$ ${v.c} não entra na conta.`,
  },
  {
    id: 'piscina', op: '×', pede: 'a área da superfície da água', unidade: 'm²',
    txt: 'Uma piscina tem [a] m de comprimento, [b] m de largura e [c] m de profundidade. Qual é a área da superfície da água, em m²?',
    gen: (rng) => ({ a: int(rng, 6, 15), b: int(rng, 3, 8), c: int(rng, 1, 3) }),
    resp: (v) => v.a * v.b, usa: ['a', 'b'], sobra: ['c'], solucao: (v) => `Área da superfície = comprimento × largura = ${v.a} × ${v.b} = ${v.a * v.b}. A profundidade não entra.`,
  },
  {
    id: 'van', op: '÷', pede: 'a velocidade média', unidade: 'km/h',
    txt: 'Uma van percorreu [a] km em [b] horas, levando [c] passageiros. Qual foi a velocidade média, em km/h?',
    gen: (rng) => { const b = int(rng, 2, 6), v = int(rng, 4, 12) * 10; return { a: b * v, b, c: int(rng, 8, 15) }; },
    resp: (v) => v.a / v.b, usa: ['a', 'b'], sobra: ['c'], solucao: (v) => `${v.a} ÷ ${v.b} = ${v.a / v.b} km/h. O número de passageiros não entra.`,
  },
  {
    id: 'figurinhas', op: '+', pede: 'quantas figurinhas ela tem agora', unidade: '',
    txt: 'Ana tinha [a] figurinhas e ganhou [b] do primo. Ela tem [c] anos. Com quantas figurinhas Ana ficou?',
    gen: (rng) => ({ a: int(rng, 35, 120), b: int(rng, 12, 48), c: int(rng, 9, 12) }),
    resp: (v) => v.a + v.b, usa: ['a', 'b'], sobra: ['c'], solucao: (v) => `${v.a} + ${v.b} = ${v.a + v.b}. A idade de Ana não entra.`,
  },
  {
    id: 'grupos', op: '÷', pede: 'quantos grupos', unidade: '',
    txt: '[a] alunos serão divididos em grupos de [b]. A escola tem [c] salas. Quantos grupos serão formados?',
    gen: (rng) => { const b = int(rng, 3, 8), k = int(rng, 4, 9); return { a: b * k, b, c: int(rng, 10, 24) }; },
    resp: (v) => v.a / v.b, usa: ['a', 'b'], sobra: ['c'], solucao: (v) => `${v.a} ÷ ${v.b} = ${v.a / v.b}. O número de salas não entra.`,
  },
  {
    id: 'troco', op: '−', pede: 'quanto dinheiro sobrou', unidade: 'R$',
    txt: 'Rafael tinha R$ [a] e gastou R$ [b] em um lanche. A viagem de ônibus dura [c] minutos. Quanto dinheiro sobrou?',
    gen: (rng) => { const b = int(rng, 8, 25); return { a: b + int(rng, 10, 40), b, c: int(rng, 15, 50) }; },
    resp: (v) => v.a - v.b, usa: ['a', 'b'], sobra: ['c'], solucao: (v) => `${v.a} − ${v.b} = ${v.a - v.b}. O tempo da viagem não entra.`,
  },
  {
    id: 'torneira', op: '×', pede: 'litros desperdiçados', unidade: 'L',
    txt: 'Uma torneira vazando desperdiça [a] litros por dia. A caixa-d’água da casa tem [c] litros. Quantos litros a torneira desperdiça em [b] dias?',
    gen: (rng) => ({ a: int(rng, 6, 20), b: int(rng, 7, 30), c: pick(rng, [500, 750, 1000, 1500]) }),
    resp: (v) => v.a * v.b, usa: ['a', 'b'], sobra: ['c'], solucao: (v) => `${v.a} × ${v.b} = ${v.a * v.b}. O tamanho da caixa-d’água não entra.`,
  },
  {
    id: 'campo', op: '×', pede: 'a área do terreno', unidade: 'm²',
    txt: 'Um terreno retangular mede [a] m de comprimento por [b] m de largura. A cerca em volta custou R$ [c]. Qual é a área do terreno, em m²?',
    gen: (rng) => ({ a: int(rng, 12, 40), b: int(rng, 8, 25), c: int(rng, 10, 40) * 50 }),
    resp: (v) => v.a * v.b, usa: ['a', 'b'], sobra: ['c'], solucao: (v) => `${v.a} × ${v.b} = ${v.a * v.b} m². O preço da cerca não entra.`,
  },
];

export const OPERACOES = ['+', '−', '×', '÷'];

function montarEnunciado(rng, tpl) {
  const v = tpl.gen(rng);
  const partes = [];
  let ultimo = 0;
  const re = /\[(\w)\]/g;
  let m;
  while ((m = re.exec(tpl.txt))) {
    if (m.index > ultimo) partes.push({ t: tpl.txt.slice(ultimo, m.index) });
    partes.push({ num: m[1], valor: String(v[m[1]]), uso: tpl.usa.includes(m[1]) });
    ultimo = re.lastIndex;
  }
  if (ultimo < tpl.txt.length) partes.push({ t: tpl.txt.slice(ultimo) });
  return {
    id: uid(), kind: 'enunciado', topico: 'Problema escrito', tpl: tpl.id, partes,
    texto: partes.map((p) => p.t ?? p.valor).join(''),
    resp: inteiro(tpl.resp(v)), unidade: tpl.unidade, op: tpl.op, pede: tpl.pede,
    solucao: tpl.solucao(v),
  };
}

export const gerarConta = (rng, chave) => ({ id: uid(), kind: 'conta', ...CONTAS[chave](rng) });
export const gerarEnunciado = (rng, tplId) => montarEnunciado(rng, tplId ? ENUNCIADOS.find((t) => t.id === tplId) : pick(rng, ENUNCIADOS));
export const CHAVES_CONTA = Object.keys(CONTAS);

/** Os "5 problemas" do dia: geometria, fração/decimal, números e dois enunciados (com dado sobrando). */
export function gerarCincoProblemas(rng) {
  const geo = pick(rng, ['perimetroRet', 'areaRet', 'areaTri', 'angTri', 'areaQuad', 'perimetroQuad']);
  const fr = pick(rng, ['fracaoDe', 'somaFracao', 'fracaoEquiv', 'decSoma', 'decSub', 'decMult10']);
  const num = pick(rng, ['mmc', 'mdc', 'potencia', 'expressao', 'porcento']);
  const [e1, e2] = shuffle(rng, ENUNCIADOS).slice(0, 2);
  return [gerarConta(rng, geo), gerarConta(rng, fr), montarEnunciado(rng, e1), gerarConta(rng, num), montarEnunciado(rng, e2)];
}

/** Corrige a resposta digitada. */
export function conferir(problema, texto) {
  const r = parseResp(texto);
  return !!r && igual(r, problema.resp);
}

export const respostaTexto = (p) => `${fmtResp(p.resp, p.forma)}${p.unidade ? ' ' + p.unidade : ''}`;
