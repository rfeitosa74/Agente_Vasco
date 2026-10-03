// Servidor estático mínimo (sem dependências): node scripts/serve.mjs [porta]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(fileURLToPath(new URL('..', import.meta.url)));
const porta = Number(process.argv[2] || process.env.PORT || 8080);
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

createServer(async (req, res) => {
  try {
    let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (p.endsWith('/')) p += 'index.html';
    const arq = join(raiz, p);
    if (!arq.startsWith(raiz)) { res.writeHead(403).end('403'); return; }
    if (!(await stat(arq)).isFile()) throw new Error('nf');
    res.writeHead(200, { 'Content-Type': tipos[extname(arq)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(await readFile(arq));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404');
  }
}).listen(porta, () => console.log(`Missão 6º Ano em http://localhost:${porta}`));
