// Testes unitários (sem rede): validação do quadro e tradução de erros da API.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateBoard, renderBoardSvg, listElements, describeBoard } from '../shared/board.js';
import { toAppError } from '../server/gemini.js';

const fx = (n) => JSON.parse(readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url), 'utf8'));

test('quadro de eclipse solar: Lua entre Sol e Terra e sombras atrás da Lua', () => {
  const { board, problemas } = validateBoard(fx('eclipse-solar'));
  assert.deepEqual(problemas, []);
  const el = Object.fromEntries(board.desenho.elementos.map((e) => [e.id, e]));
  assert.ok(el.sol.x < el.lua.x && el.lua.x < el.terra.x, 'ordem Sol–Lua–Terra');
  for (const s of ['umbra', 'penumbra']) {
    const xs = el[s].pontos.map((p) => p.x);
    assert.ok(Math.min(...xs) >= el.lua.x, `${s} começa na Lua e vai para longe do Sol`);
  }
  assert.notEqual(el.umbra.cor, el.penumbra.cor, 'umbra e penumbra com cores diferentes');
  const svg = renderBoardSvg(board, { highlights: ['lua'] });
  assert.match(svg, /class="el hl" data-id="lua"/);
  assert.match(svg, /Fora de escala/);
});

test('validação aponta legendas sobrepostas, ligações inválidas e colunas incompletas', () => {
  const sobrepostas = validateBoard({
    tipo: 'desenho', pergunta: 'p', titulo: 't', explicacao: 'e',
    desenho: { elementos: [
      { id: 'a', tipo: 'circulo', x: 100, y: 100, r: 20, rotulo: 'Primeira legenda', rotuloX: 300, rotuloY: 300 },
      { id: 'b', tipo: 'circulo', x: 200, y: 100, r: 20, rotulo: 'Segunda legenda', rotuloX: 310, rotuloY: 305 },
    ] },
  });
  assert.ok(sobrepostas.problemas.some((p) => p.includes('se sobrepõem')));
  const rel = validateBoard({ tipo: 'relacoes', pergunta: 'p', titulo: 't', explicacao: 'e', relacoes: { nos: [{ id: 'x', rotulo: 'X' }, { id: 'y', rotulo: 'Y' }], ligacoes: [{ id: 'l', de: 'x', para: 'z' }] } });
  assert.ok(rel.problemas.some((p) => p.includes('não existe')));
  assert.equal(rel.board.relacoes.ligacoes.length, 0);
  const cmp = validateBoard({ tipo: 'comparacao', pergunta: 'p', titulo: 't', explicacao: 'e', comparacao: { colunas: [{ id: 'a', titulo: 'A' }, { id: 'b', titulo: 'B' }], aspectos: [{ id: 'k', aspecto: 'K', valores: ['só um'] }] } });
  assert.ok(cmp.problemas.some((p) => p.includes('um valor para cada coluna')));
});

test('ids dos elementos ficam disponíveis para o tutor destacar', () => {
  const { board } = validateBoard(fx('fracoes-rel'));
  const ids = listElements(board).map((e) => e.id);
  assert.ok(ids.includes('num') && ids.includes('den'));
  assert.match(describeBoard(board), /Numerador/);
});

test('erros da API viram mensagens específicas', () => {
  const e = (status, message) => Object.assign(new Error(message), { status });
  assert.equal(toAppError(e(400, 'API key not valid. Please pass a valid API key.')).tipo, 'chave');
  assert.equal(toAppError(e(400, 'Gemini 3 Pro Image is only available on paid tiers; enable billing')).tipo, 'faturamento');
  assert.equal(toAppError(e(429, 'Resource has been exhausted (e.g. check quota).')).tipo, 'cota');
  assert.equal(toAppError(e(404, 'models/x is not found for API version v1beta')).tipo, 'modelo_indisponivel');
  assert.equal(toAppError(e(403, 'PERMISSION_DENIED')).tipo, 'permissao');
  assert.equal(toAppError(e(503, 'overloaded')).tipo, 'servico');
});
