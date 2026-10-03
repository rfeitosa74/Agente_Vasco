import test from 'node:test';
import assert from 'node:assert/strict';
import { gerarIcs } from '../js/core/ics.js';
import { CONFIG_PADRAO } from '../js/store.js';

test('ICS: estrutura válida, 8 eventos recorrentes, fuso de Fortaleza', () => {
  const ics = gerarIcs(CONFIG_PADRAO, '2026-10-05');
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.trimEnd().endsWith('END:VCALENDAR'));
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 8);
  assert.equal((ics.match(/END:VEVENT/g) || []).length, 8);
  assert.match(ics, /DTSTART;TZID=America\/Fortaleza:20261005T073000/); // aquecimento na segunda 05/10
  assert.match(ics, /DTSTART;TZID=America\/Fortaleza:20261010T090000/); // desafio no sábado 10/10
  assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR/);
  for (const linha of ics.split('\r\n')) assert.ok(new TextEncoder().encode(linha).length <= 75, `linha longa: ${linha}`);
});

test('ICS: janela limpa começa 30 min antes do aquecimento', () => {
  const ics = gerarIcs(CONFIG_PADRAO, '2026-10-05');
  assert.match(ics, /DTSTART;TZID=America\/Fortaleza:20261005T070000/);
});
