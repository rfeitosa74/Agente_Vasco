// Planejador do ciclo D-3 (página 9 do plano).
//
// Para cada prova: D-3 fabricar a ferramenta · D-2 puxar da memória · D-1 só o vermelho · Dia D não estudar.
// Regras de conflito do plano:
//   • no máximo 2 estágios ATIVOS por dia (o Dia D não é ativo: é "não estudar");
//   • nunca dois D-2 no mesmo dia (é o estágio mais pesado);
//   • prioridade: disciplina crítica (História/Geografia) e depois a de maior peso.
// Os estágios caem só em dias de missão (seg–sex, fora dias livres): sábado é Desafio do Pai e domingo é folga.
import { addDays, isWeekday } from '../util/dates.js';

export const DISCIPLINAS = ['História', 'Geografia', 'Matemática', 'Português', 'Ciências', 'Inglês', 'Outra'];
export const CRITICAS = ['História', 'Geografia'];

export const ESTAGIOS = {
  D3: { id: 'D3', ordem: 0, rotulo: 'D-3', nome: 'Fabricar a ferramenta', curto: 'Fabricar' },
  D2: { id: 'D2', ordem: 1, rotulo: 'D-2', nome: 'Puxar da memória', curto: 'Puxar' },
  D1: { id: 'D1', ordem: 2, rotulo: 'D-1', nome: 'Só o vermelho', curto: 'Vermelho' },
  D: { id: 'D', ordem: 3, rotulo: 'Dia D', nome: 'Não estudar', curto: 'Prova' },
};

const LIMITE_DIAS_ATRAS = 21;

function comparaPrioridade(a, b) {
  const ca = CRITICAS.includes(a.disciplina) ? 0 : 1;
  const cb = CRITICAS.includes(b.disciplina) ? 0 : 1;
  if (ca !== cb) return ca - cb;
  const pa = Number(a.peso) || 1;
  const pb = Number(b.peso) || 1;
  if (pa !== pb) return pb - pa; // maior peso primeiro
  if (a.data !== b.data) return a.data < b.data ? -1 : 1;
  return String(a.id).localeCompare(String(b.id));
}

/**
 * @param {Array<{id:string, disciplina:string, data:string, peso?:number, criadaEm?:string, cancelada?:boolean}>} provas
 * @param {{diasLivres?:string[], maxAtivos?:number}} opts
 * @returns {{porDia: Record<string, Array>, avisos: Record<string,string[]>}}
 */
export function planejarProvas(provas, { diasLivres = [], maxAtivos = 2 } = {}) {
  const livres = new Set(diasLivres);
  const ehMissao = (d) => isWeekday(d) && !livres.has(d);
  const porDia = {};
  const avisos = {};

  const ativos = (d) => (porDia[d] || []).filter((s) => s.estagio !== 'D').length;
  const temD2 = (d) => (porDia[d] || []).some((s) => s.estagio === 'D2');
  const colocar = (d, item) => (porDia[d] ||= []).push(item);

  const ordenadas = provas.filter((p) => p.data && !p.cancelada).slice().sort(comparaPrioridade);

  ordenadas.forEach((p, prioIdx) => {
    const piso = [p.criadaEm || '0000-01-01', addDays(p.data, -LIMITE_DIAS_ATRAS)].sort().pop();
    const av = (avisos[p.id] ||= []);
    const base = { provaId: p.id, disciplina: p.disciplina, prio: prioIdx };

    // Procura o dia de missão mais tardio estritamente antes de `ref` (ou no próprio `ref` se incluso).
    const anterior = (ref, ok, incluirRef = false) => {
      let d = incluirRef ? ref : addDays(ref, -1);
      while (d >= piso) {
        if (ehMissao(d) && ok(d)) return d;
        d = addDays(d, -1);
      }
      return null;
    };

    if (ehMissao(p.data)) colocar(p.data, { ...base, estagio: 'D' });

    const cabe = (d) => ativos(d) < maxAtivos;
    const cabeD2 = (d) => cabe(d) && !temD2(d);

    // Aviso em cima da hora: só 1 dia de missão antes da prova. Sem D-1 (não há vermelho antes de um D-2),
    // o que vale é fabricar a ferramenta e puxar da memória no mesmo dia.
    const disponiveis = [];
    for (let d = addDays(p.data, -1); d >= piso; d = addDays(d, -1)) if (ehMissao(d)) disponiveis.push(d);
    if (disponiveis.length === 1) {
      const d = disponiveis[0];
      if (cabe(d)) colocar(d, { ...base, estagio: 'D3', comprimido: true });
      if (cabeD2(d)) colocar(d, { ...base, estagio: 'D2', comprimido: true });
      av.push('Só 1 dia antes da prova: fabricar a ferramenta e puxar da memória no mesmo dia (sem véspera).');
      return;
    }

    // D-1: o dia de missão imediatamente anterior à prova.
    let d1 = anterior(p.data, cabe);
    if (d1) colocar(d1, { ...base, estagio: 'D1' });
    else av.push('Sem espaço para o D-1 (só o vermelho).');

    // D-2: antes do D-1; se não houver dia, aperta no mesmo dia do D-1 (sprints em sequência).
    let d2 = anterior(d1 || p.data, cabeD2);
    let comprimidoD2 = false;
    if (!d2 && d1 && cabeD2(d1)) {
      d2 = d1;
      comprimidoD2 = true;
    }
    if (d2) {
      colocar(d2, { ...base, estagio: 'D2', comprimido: comprimidoD2 });
      if (comprimidoD2) av.push('Pouco tempo: D-2 e D-1 caíram no mesmo dia.');
    } else av.push('Sem espaço para o D-2 (puxar da memória).');

    // D-3: antes do D-2; se não houver dia, aperta no dia do D-2.
    const refD3 = d2 || d1 || p.data;
    let d3 = anterior(refD3, cabe);
    let comprimidoD3 = false;
    if (!d3 && (d2 || d1) && cabe(d2 || d1)) {
      d3 = d2 || d1;
      comprimidoD3 = true;
    }
    if (d3) {
      colocar(d3, { ...base, estagio: 'D3', comprimido: comprimidoD3 });
      if (comprimidoD3) av.push('Pouco tempo: D-3 foi apertado junto do estágio seguinte.');
    } else av.push('Sem espaço para o D-3 (fabricar a ferramenta).');

    if (!av.length) delete avisos[p.id];
  });

  for (const d of Object.keys(porDia)) {
    porDia[d].sort((a, b) => a.prio - b.prio || ESTAGIOS[a.estagio].ordem - ESTAGIOS[b.estagio].ordem);
  }
  return { porDia, avisos };
}

/** Estágios que ocupam sprint (tudo menos o Dia D). */
export const estagiosAtivos = (lista = []) => lista.filter((s) => s.estagio !== 'D');
