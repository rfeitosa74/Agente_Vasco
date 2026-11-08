// Persistência com armazenamento externo (simulado por uma pasta, como o Object Storage do Replit).
// O script inicia o servidor, grava dados, APAGA o disco local (máquina nova), reinicia e confere.
// Uso: FAKE=http://127.0.0.1:8787 PDF=caminho.pdf node tests/espelho.test-manual.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const FAKE = process.env.FAKE || 'http://127.0.0.1:8787';
const PORTA = 5230;
const APP = `http://127.0.0.1:${PORTA}`;
const DISCO = fs.mkdtempSync(path.join(os.tmpdir(), 'disco-'));
const BUCKET = fs.mkdtempSync(path.join(os.tmpdir(), 'bucket-'));
const ok = (m) => console.log(`✓ ${m}`);

function iniciar() {
  const p = spawn('node', ['server/index.js', '--producao'], {
    env: { ...process.env, PORT: String(PORTA), DATA_DIR: DISCO, ESPELHO_PASTA: BUCKET, APP_PASSWORD: 'segredo1', GEMINI_API_KEY: 'fake', GEMINI_TEST_BASE_URL: FAKE, RENDER: '', REPL_ID: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  p.stdout.on('data', (d) => (log += d));
  p.stderr.on('data', (d) => (log += d));
  return new Promise((ok, fail) => {
    const t = setInterval(() => {
      if (log.includes('Minha sala de aula:')) clearInterval(t), ok({ p, log: () => log });
    }, 100);
    setTimeout(() => fail(new Error(`servidor não iniciou:\n${log}`)), 15000);
  });
}
function cliente() {
  let cookie = '';
  return async (rota, corpo, metodo = corpo ? 'POST' : 'GET') => {
    const r = await fetch(APP + rota, { method: metodo, headers: { cookie, ...(corpo instanceof FormData ? {} : { 'content-type': 'application/json' }) }, body: corpo instanceof FormData ? corpo : corpo ? JSON.stringify(corpo) : undefined });
    const c = r.headers.get('set-cookie');
    if (c) cookie = c.split(';')[0];
    const tipo = r.headers.get('content-type') || '';
    return { status: r.status, corpo: tipo.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()) };
  };
}

let srv = await iniciar();
let admin = cliente();
assert.equal((await admin('/api/login', { usuario: 'admin', senha: 'segredo1' })).status, 200);
assert.equal((await admin('/api/usuarios', { nome: 'Luan', usuario: 'luan', senha: 'luan2026' })).status, 200);
const sala = (await admin('/api/salas', { nome: 'Ciências' })).corpo;
const pdf = fs.readFileSync(process.env.PDF);
const fd = new FormData();
fd.append('arquivo', new Blob([pdf], { type: 'application/pdf' }), 'eclipses.pdf');
fd.append('numPaginas', '2');
const { docId } = (await admin(`/api/salas/${sala.id}/materiais`, fd)).corpo;
const mid = docId.split(':')[1];
assert.equal((await admin('/api/analyze', { docId })).status, 200);
await admin(`/api/salas/${sala.id}/materiais/${mid}/estado`, { estado: { conceitoId: 'eclipse_lunar', mensagens: [{ papel: 'aluno', texto: 'oi' }] } }, 'PUT');
const img = (await admin('/api/infographic/generate', { docId, direcao: { titulo: 'T', perguntaPrincipal: 'P', ilustracaoPrincipal: 'I', secoes: [], legendas: [], conclusao: 'C', paleta: 'p', cuidadosCientificos: [] } })).corpo;
assert.ok(img.imagemId, 'infográfico guardado');
ok('dados criados: usuário Luan, sala, PDF analisado, progresso e infográfico');
const sit = (await admin('/api/session')).corpo.armazenamento;
assert.equal(sit.persistente, true);

// Máquina nova: o disco local é apagado
srv.p.kill();
await new Promise((r) => setTimeout(r, 500));
fs.rmSync(DISCO, { recursive: true, force: true });
fs.mkdirSync(DISCO);
// Dados "velhos" no disco local (como uma cópia do ambiente de desenvolvimento) não podem vencer o armazenamento
fs.writeFileSync(path.join(DISCO, 'usuarios.json'), '[]');
srv = await iniciar();
assert.match(srv.log(), /arquivo\(s\) de dados restaurado/);
ok('servidor reiniciado com o disco vazio e dados restaurados do armazenamento');

admin = cliente();
assert.equal((await admin('/api/login', { usuario: 'admin', senha: 'segredo1' })).status, 200);
const luan = cliente();
assert.equal((await luan('/api/login', { usuario: 'luan', senha: 'luan2026' })).status, 200, 'Luan continua existindo');
ok('Luan continua existindo e entra com a mesma senha');
const salas = (await admin('/api/salas')).corpo;
assert.deepEqual(salas.map((s) => s.nome), ['Ciências']);
const mat = (await admin(`/api/salas/${sala.id}/materiais/${mid}`)).corpo;
assert.equal(mat.estado.conceitoId, 'eclipse_lunar');
assert.ok(mat.analise.conceitos.length > 0);
const arquivo = (await admin(`/api/salas/${sala.id}/materiais/${mid}/arquivo`)).corpo;
assert.ok(Buffer.compare(arquivo, pdf) === 0, 'PDF original igual');
const imagem = (await admin(`/api/salas/${sala.id}/materiais/${mid}/imagens/${img.imagemId}`)).corpo;
assert.ok(imagem.data.length > 1000);
assert.equal((await admin('/api/ask', { docId, conceito: mat.analise.conceitos[0], acao: 'exemplo', historico: [] })).status, 200, 'material usável na aula');
ok('sala, análise, progresso, PDF original e infográfico voltaram; a aula funciona');

// Excluir apaga também do armazenamento
await admin(`/api/salas/${sala.id}`, undefined, 'DELETE');
const restantes = [];
const andar = (d) => fs.existsSync(d) && fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? andar(path.join(d, e.name)) : restantes.push(e.name)));
andar(path.join(BUCKET, 'sala-de-aula', 'salas'));
assert.deepEqual(restantes, [], 'nada da sala sobrou no armazenamento');
ok('excluir a sala também apaga os arquivos do armazenamento permanente');
srv.p.kill();
fs.rmSync(DISCO, { recursive: true, force: true });
fs.rmSync(BUCKET, { recursive: true, force: true });
