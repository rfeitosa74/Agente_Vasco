// Exporta a rotina completa como calendário (.ics) com eventos recorrentes, fuso America/Fortaleza.
const FUSO = 'America/Fortaleza';
const pad = (n) => String(n).padStart(2, '0');
const esc = (t) => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const compacto = (data) => data.replace(/-/g, '');
const soma = (hhmm, min) => { const [h, m] = hhmm.split(':').map(Number); const t = h * 60 + m + min; return `${pad(Math.floor(t / 60) % 24)}${pad(t % 60)}00`; };
const hm = (hhmm) => hhmm.replace(':', '') + '00';

/** Dobra linhas com mais de 75 octetos (RFC 5545). */
function dobrar(linha) {
  const enc = new TextEncoder();
  if (enc.encode(linha).length <= 75) return linha;
  let saida = '';
  let atual = '';
  for (const ch of linha) {
    if (enc.encode(atual + ch).length > (saida ? 74 : 75)) { saida += (saida ? '\r\n ' : '') + atual; atual = ch; } else atual += ch;
  }
  return saida + (saida ? '\r\n ' : '') + atual;
}

/**
 * @param {object} cfg  state.config
 * @param {string} inicio  primeira data (AAAA-MM-DD) — uma segunda-feira
 */
export function gerarIcs(cfg, inicio) {
  const h = cfg.horarios;
  const aluno = cfg.aluno.split(' ')[0];
  const base = compacto(inicio);
  const sabado = (() => { const [y, m, d] = inicio.split('-').map(Number); const dt = new Date(y, m - 1, d + 5); return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`; })();
  const eventos = [
    { nome: 'Janela limpa (sem tela)', ini: soma(h.aquecimento, -30), fim: hm(h.aquecimento), dia: 'MO,TU,WE,TH,FR,SA', data: base, desc: '30 minutos sem tela antes do Bloco 1: café, banho, mochila, conversa.' },
    { nome: 'Bloco 1 · Aquecimento', ini: hm(h.aquecimento), fim: soma(h.aquecimento, 15), dia: 'MO,TU,WE,TH,FR,SA', data: base, desc: 'Caligrafia + 5 minutos do Ginásio de Cálculo.' },
    { nome: 'Bloco 2 · Missão do Dia', ini: hm(h.missao), fim: soma(h.missao, 29), dia: 'MO,TU,WE,TH,FR', data: base, desc: '2 sprints + 5 min de pausa. O conteúdo vem do aplicativo (rotação ou ciclo D-3).' },
    { nome: 'Bloco 3 · Episódio do canal', ini: hm(h.episodio), fim: soma(h.episodio, 10), dia: 'MO,WE,FR', data: base, desc: '1 minuto, no máximo 2 takes, sem olhar o caderno.' },
    { nome: 'Bloco 4 · Desafio do Pai', ini: hm(h.desafio), fim: soma(h.desafio, 25), dia: 'SA', data: sabado, desc: 'Quiz com o pai + soma do XP da semana.' },
    { nome: 'Me explica (5 min)', ini: hm(h.explica), fim: soma(h.explica, 5), dia: 'MO,TU,WE,TH,FR', data: base, desc: 'O pai só pergunta “por quê?” e “e daí?”.' },
    { nome: 'Celular na base', ini: hm(h.base), fim: soma(h.base, 5), dia: 'MO,TU,WE,TH,FR,SA,SU', data: base, desc: 'O celular dorme fora do quarto, na sala, todos os dias — inclusive o do pai.' },
    { nome: 'Hora de dormir', ini: hm(h.dormir), fim: soma(h.dormir, 15), dia: 'MO,TU,WE,TH,FR,SA,SU', data: base, desc: 'Aos 11 anos o recomendado é de 9 a 11 horas de sono.' },
  ];
  const agora = new Date();
  const carimbo = `${agora.getUTCFullYear()}${pad(agora.getUTCMonth() + 1)}${pad(agora.getUTCDate())}T${pad(agora.getUTCHours())}${pad(agora.getUTCMinutes())}${pad(agora.getUTCSeconds())}Z`;
  const linhas = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Missao 6 Ano//PT-BR//', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc('Missão 6º Ano · ' + aluno)}`, `X-WR-TIMEZONE:${FUSO}`,
    'BEGIN:VTIMEZONE', `TZID:${FUSO}`, 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:-0300', 'TZOFFSETTO:-0300', 'TZNAME:-03', 'END:STANDARD', 'END:VTIMEZONE',
  ];
  eventos.forEach((e, i) => {
    linhas.push('BEGIN:VEVENT', `UID:missao6-${i}-${base}@missao6ano`, `DTSTAMP:${carimbo}`,
      `DTSTART;TZID=${FUSO}:${e.data}T${e.ini}`, `DTEND;TZID=${FUSO}:${e.data}T${e.fim}`, `RRULE:FREQ=WEEKLY;BYDAY=${e.dia}`,
      `SUMMARY:${esc(e.nome)}`, `DESCRIPTION:${esc(e.desc)}`, 'END:VEVENT');
  });
  linhas.push('END:VCALENDAR');
  return linhas.map(dobrar).join('\r\n') + '\r\n';
}
