// Gera um PNG de uma representação do quadro para conferência visual.
// Uso: node scripts/render-fixture.mjs entrada.json saida.png
import { readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { validateBoard, renderBoardSvg } from '../shared/board.js';
const [, , input, output] = process.argv;
const { board, problemas } = validateBoard(JSON.parse(readFileSync(input, 'utf8')));
console.log('Problemas detectados:', problemas.length ? problemas : 'nenhum');
const svg = renderBoardSvg(board, { standalone: true });
const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1000 }, font: { loadSystemFonts: true, defaultFontFamily: 'DejaVu Sans' } }).render().asPng();
writeFileSync(output, png);
