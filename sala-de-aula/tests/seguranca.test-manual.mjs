// Teste de segurança da API (servidor rodando com base vazia e Gemini simulado).
// Uso: APP=http://127.0.0.1:5280 node tests/seguranca.test-manual.mjs
// Servidor: RENDER=1 APP_PASSWORD=segredo-admin1 LIMITE_IA_POR_5MIN=6 LIMITE_IMAGENS_POR_HORA=2 ...
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const APP = process.env.APP || 'http://127.0.0.1:5280';
const ok = (m) => console.log(`✓ ${m}`);
function cliente(cookieInicial = '') {
  let cookie = cookieInicial;
  const f = async (rota, corpo, metodo = corpo ? 'POST' : 'GET', extra = {}) => {
    const r = await fetch(APP + rota, { method: metodo, redirect: 'manual', headers: { cookie, ...(corpo instanceof FormData ? {} : { 'content-type': 'application/json' }), ...extra }, body: corpo instanceof FormData ? corpo : corpo ? (typeof corpo === 'string' ? corpo : JSON.stringify(corpo)) : undefined });
    const c = r.headers.get('set-cookie');
    if (c) cookie = c.split(';')[0];
    let json = null;
    const txt = await r.text();
    try { json = JSON.parse(txt); } catch { /* não é JSON */ }
    return { status: r.status, json, txt, headers: r.headers, setCookie: c || '' };
  };
  f.cookie = () => cookie;
  return f;
}

// 1) Sem login: nada além de health/session/login responde
const anon = cliente();
const ROTAS = [
  ['GET', '/api/usuarios'], ['POST', '/api/usuarios'], ['GET', '/api/salas'], ['POST', '/api/salas'], ['GET', '/api/samples'], ['GET', '/api/status?verificar=1'],
  ['POST', '/api/analyze'], ['POST', '/api/board'], ['POST', '/api/ask'], ['POST', '/api/explain/question'], ['POST', '/api/explain/evaluate'], ['POST', '/api/transcribe'],
  ['POST', '/api/infographic/direction'], ['POST', '/api/infographic/generate'], ['POST', '/api/infographic/edit'], ['POST', '/api/infographic/review'], ['POST', '/api/live/token'],
  ['PUT', '/api/conta/senha'], ['DELETE', '/api/usuarios/00000000-0000-0000-0000-000000000000'], ['GET', '/api/salas/00000000-0000-0000-0000-000000000000/materiais/00000000-0000-0000-0000-000000000000/arquivo'],
];
for (const [m, r] of ROTAS) {
  const x = await anon(r, m === 'GET' || m === 'DELETE' ? undefined : {}, m);
  assert.equal(x.status, 401, `${m} ${r} sem login deu ${x.status}`);
}
ok(`${ROTAS.length} rotas recusam acesso sem login (401)`);
assert.equal((await anon('/api/setup', { usuario: 'invasor', senha: 'invasor123' })).status, 403);
ok('ninguém cria administrador pela internet');
const sess = (await anon('/api/session')).json;
assert.deepEqual(Object.keys(sess).sort(), ['configuracaoPendente', 'logado', 'precisaConfigurar', 'usuario']);
ok('a rota pública de sessão não revela nada sobre o servidor');

// 2) Pedido gigante sem login é recusado antes de ser processado
const grande = await anon('/api/login', JSON.stringify({ usuario: 'a', senha: 'x'.repeat(200000) }));
assert.equal(grande.status, 413);
const grande2 = await anon('/api/analyze', JSON.stringify({ lixo: 'x'.repeat(2000000) }));
assert.equal(grande2.status, 401);
ok('pedidos grandes sem login são recusados (413/401) sem serem processados');

// 3) Cabeçalhos de segurança
const pagina = await anon('/');
for (const h of ['content-security-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy']) assert.ok(pagina.headers.get(h), `falta ${h}`);
assert.match(pagina.headers.get('content-security-policy'), /frame-ancestors 'none'/);
assert.equal(pagina.headers.get('x-powered-by'), null);
ok('cabeçalhos de segurança presentes (CSP, nosniff, anti-moldura, sem x-powered-by)');

// 4) Login: cookie seguro, mensagens iguais, sessão adulterada
const admin = cliente();
const errado1 = await anon('/api/login', { usuario: 'admin', senha: 'errada' });
const errado2 = await anon('/api/login', { usuario: 'naoexiste', senha: 'errada' });
assert.equal(errado1.txt, errado2.txt, 'a mensagem não revela se o usuário existe');
const login = await admin('/api/login', { usuario: 'admin', senha: 'segredo-admin1' });
assert.equal(login.status, 200);
assert.match(login.setCookie, /HttpOnly/i);
assert.match(login.setCookie, /SameSite=Strict/i);
assert.ok(!JSON.stringify(login.json).match(/hash|sal"|versaoSenha/), 'resposta não traz dados da senha');
ok('login: cookie HttpOnly + SameSite=Strict; erro não revela se o usuário existe');
const [uid, exp, sig] = admin.cookie().split('=')[1].split('.');
for (const [nome, c] of [
  ['assinatura trocada', `${uid}.${exp}.${sig.slice(0, -2)}xx`],
  ['validade estendida', `${uid}.${Number(exp) + 999999}.${sig}`],
  ['outro usuário', `00000000-0000-0000-0000-000000000000.${exp}.${sig}`],
  ['lixo', 'abc'],
]) assert.equal((await cliente(`sala_sessao=${c}`)('/api/salas')).status, 401, nome);
ok('cookies adulterados são recusados');

// 5) Isolamento entre usuários e permissões
assert.equal((await admin('/api/usuarios', { nome: 'Aluno A', usuario: 'aluno.a', senha: 'senha-a-123' })).status, 200);
assert.equal((await admin('/api/usuarios', { nome: 'Aluno B', usuario: 'aluno.b', senha: 'senha-b-123' })).status, 200);
const a = cliente(), b = cliente();
await a('/api/login', { usuario: 'aluno.a', senha: 'senha-a-123' });
await b('/api/login', { usuario: 'aluno.b', senha: 'senha-b-123' });
const sala = (await a('/api/salas', { nome: 'Sala do A' })).json;
const fd = new FormData();
fd.append('texto', readFileSync(new URL('../samples/1-eclipses.md', import.meta.url), 'utf8'));
const { docId } = (await a(`/api/salas/${sala.id}/materiais`, fd)).json;
const mid = docId.split(':')[1];
const base = `/api/salas/${sala.id}`;
for (const quem of [b, admin]) {
  assert.equal((await quem(base)).status, 404);
  assert.equal((await quem(`${base}/materiais/${mid}`)).status, 404);
  assert.equal((await quem(base, { nome: 'invadida' }, 'PATCH')).status, 404);
  assert.equal((await quem(`${base}/materiais/${mid}/estado`, { estado: {} }, 'PUT')).status, 404);
  assert.equal((await quem(`${base}/materiais/${mid}`, undefined, 'DELETE')).status, 404);
  assert.equal((await quem(base, undefined, 'DELETE')).status, 404);
  assert.equal((await quem('/api/analyze', { docId })).status, 410);
  assert.equal((await quem('/api/ask', { docId, conceito: { nome: 'x' }, acao: 'exemplo' })).status, 410);
}
assert.equal((await a(base)).json.nome, 'Sala do A');
ok('outro usuário (e até o administrador) não lê, altera nem apaga a sala e o material de alguém');
for (const [m, r, c] of [['GET', '/api/usuarios'], ['POST', '/api/usuarios', { usuario: 'x.y.z', senha: '12345678', admin: true }], ['PATCH', `/api/usuarios/${uid}`, { senha: 'tomei-conta-1' }], ['PATCH', `/api/usuarios/${uid}`, { admin: false }], ['DELETE', `/api/usuarios/${uid}`]])
  assert.equal((await a(r, c, m)).status, 403, `${m} ${r}`);
ok('aluno não lista, cria, altera nem remove usuários (403)');
assert.equal((await a('/api/salas/..%2F..%2Fusuarios.json')).status, 404);
assert.equal((await a(`/api/salas/${sala.id}/materiais/..%2Fsala.json`)).status, 404);
assert.equal((await a(`/api/salas/${sala.id}/materiais/${mid}/imagens/..%2F..%2F..%2F..%2Fusuarios.json`)).status, 404);
ok('tentativas de sair da pasta de dados (../) são recusadas');
assert.equal((await a('/api/conta/senha', { atual: 'errada', nova: 'nova-senha-1' }, 'PUT')).status, 400);
ok('trocar a senha exige a senha atual');

// 6) Trocar a senha encerra as outras sessões
const a2 = cliente();
await a2('/api/login', { usuario: 'aluno.a', senha: 'senha-a-123' });
assert.equal((await a('/api/conta/senha', { atual: 'senha-a-123', nova: 'senha-a-456' }, 'PUT')).status, 200);
assert.equal((await a2('/api/salas')).status, 401);
assert.equal((await a('/api/salas')).status, 200);
ok('trocar a senha desconecta os outros aparelhos');

// 7) Arquivo enviado nunca roda como página
const fdp = new FormData();
fdp.append('arquivo', new Blob([`%PDF-1.4\n<script>alert(1)</script>`], { type: 'application/pdf' }), 'x.pdf');
const dp = (await a(`/api/salas/${sala.id}/materiais`, fdp)).json;
const arq = await a(`/api/salas/${sala.id}/materiais/${dp.materialId}/arquivo`);
assert.match(arq.headers.get('content-security-policy'), /sandbox/);
assert.equal(arq.headers.get('x-content-type-options'), 'nosniff');
assert.match(arq.headers.get('content-disposition'), /attachment/);
const fdh = new FormData();
fdh.append('arquivo', new Blob(['<html><script>alert(1)</script></html>'], { type: 'text/html' }), 'pagina.html');
assert.equal((await a(`/api/salas/${sala.id}/materiais`, fdh)).status, 400);
ok('arquivos enviados são servidos como download isolado; HTML é recusado');

// 8) Limite de uso da IA por usuário (servidor de teste: 6 por 5 min, 2 imagens por hora)
const dir = { titulo: 'T', perguntaPrincipal: 'P', ilustracaoPrincipal: 'I', secoes: [], legendas: [], conclusao: 'C', paleta: 'p', cuidadosCientificos: [] };
const cod = [];
for (let i = 0; i < 3; i++) cod.push((await a('/api/infographic/generate', { direcao: dir, docId })).status);
assert.deepEqual(cod, [200, 200, 429]);
const cod2 = [];
for (let i = 0; i < 8; i++) cod2.push((await a('/api/explain/question', { docId, conceito: { nome: 'x', conteudo: 'y' } })).status);
assert.ok(cod2.includes(429) && cod2[0] === 200, String(cod2));
assert.equal((await b('/api/salas')).status, 200);
ok('limite de uso da IA por usuário funciona (429) e não afeta os outros usuários');

// 9) Bloqueio após senhas erradas (por último: bloqueia este endereço)
const cods = [];
for (let i = 0; i < 9; i++) cods.push((await anon('/api/login', { usuario: 'admin', senha: `tentativa${i}` })).status);
assert.equal(cods.at(-1), 429);
assert.equal((await cliente()('/api/login', { usuario: 'admin', senha: 'segredo-admin1' })).status, 429);
ok('após 8 senhas erradas o endereço fica bloqueado, mesmo com a senha certa');
