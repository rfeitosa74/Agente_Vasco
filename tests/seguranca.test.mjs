// Testes de segurança e integridade do index.html (arquivo único, offline).
// Uso: npm run build && npm test   (CHROMIUM_PATH aponta para um Chromium, se preciso)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const URL_PAGINA = pathToFileURL(join(raiz, "index.html")).href;
const exe = process.env.CHROMIUM_PATH || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);

let browser;
before(async () => { browser = await chromium.launch({ executablePath: exe }); });
after(async () => { await browser?.close(); });

const PESSOAS = [
  "Ana Souza — ana.souza@exemplo.com — (61) 98888-0001",
  "Bruno Lima — bruno.lima@exemplo.com — (21) 97777-0002",
  "Carla Mendes — carla.mendes@exemplo.com — (31) 96666-0003",
  "Diego Ferreira — diego.f@exemplo.com — (41) 95555-0004",
  "Élida Conceição — elida.c@exemplo.com — (51) 94444-0005",
  "Fábio Tôrres — fabio.t@exemplo.com — (71) 93333-0006"
];

async function abrir(ctx, viewport = { width: 1366, height: 768 }) {
  const page = await ctx.newPage({ viewport });
  page.erros = [];
  page.on("pageerror", (e) => page.erros.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") page.erros.push(m.text()); });
  page.on("dialog", (d) => d.accept(page.respostaDialogo ?? undefined));
  await page.goto(URL_PAGINA);
  await page.waitForFunction(() => !/Abrindo/.test(document.getElementById("status-base").textContent));
  return page;
}
async function definirLista(page, linhas) {
  await page.fill("#lista", linhas.join("\n"));
  await page.waitForTimeout(250);
}
async function sortear(page, n) {
  await page.fill("#n-vencedores", String(n));
  await page.dispatchEvent("#n-vencedores", "change");
  await page.click("#btn-sortear");
  await page.waitForFunction(() => getComputedStyle(document.getElementById("ata-box")).display !== "none", null, { timeout: 20000 });
  return JSON.parse(await page.inputValue("#ata"));
}
const texto = (page, sel) => page.textContent(sel).then((t) => t.replace(/\s+/g, " ").trim());
async function verificar(page, lista, ata) {
  await page.evaluate(() => { document.getElementById("verificar").open = true; });
  await page.fill("#verif-lista", lista);
  await page.fill("#verif-ata", typeof ata === "string" ? ata : JSON.stringify(ata, null, 2));
  await page.click("#btn-verificar");
  await page.waitForFunction(() => !document.getElementById("verif-res").hidden);
  return texto(page, "#verif-res");
}

test("funciona 100% offline: nenhuma requisição de rede e nenhum erro", async () => {
  const ctx = await browser.newContext();
  const requisicoes = [];
  ctx.on("request", (r) => requisicoes.push(r.url()));
  const page = await abrir(ctx);
  await sortear(page, 2);
  const externas = requisicoes.filter((u) => !/^(file|data|blob):/.test(u));
  assert.deepEqual(externas, [], "requisições externas: " + externas.join(", "));
  assert.deepEqual(page.erros, []);
  const fonte = await page.evaluate(() => document.fonts.check('800 20px "Barlow Condensed"'));
  assert.ok(fonte, "fonte embutida carregada");
  const qr = await page.evaluate(() => { const c = document.getElementById("qr"); return !c.hidden && c.width > 116; });
  assert.ok(qr, "QR Code gerado sem internet");
  await ctx.close();
});

test("CSP bloqueia script injetado, handlers inline e eval", async () => {
  const ctx = await browser.newContext();
  const page = await abrir(ctx);
  // O eval chamado direto por page.evaluate é isento de CSP no protocolo de depuração;
  // por isso o teste usa caminhos que a própria página executaria (setTimeout com string).
  const r = await page.evaluate(async () => {
    const violacoes = [];
    document.addEventListener("securitypolicyviolation", (e) => violacoes.push(e.effectiveDirective));
    const d = document.createElement("div");
    d.innerHTML = '<img src="x" onerror="window.__xss1=1"><svg onload="window.__xss2=1"></svg>';
    document.body.append(d);
    const s = document.createElement("script");
    s.textContent = "window.__xss3 = 1";
    document.body.append(s);
    setTimeout("window.__xss4 = 1", 0);
    const img = new Image(); img.src = "https://exemplo.com/rastreio.gif";
    let fetchBloqueado = false;
    try { await fetch("https://exemplo.com/"); } catch { fetchBloqueado = true; }
    await new Promise((res) => setTimeout(res, 400));
    return { x1: window.__xss1, x2: window.__xss2, x3: window.__xss3, x4: window.__xss4, fetchBloqueado, violacoes };
  });
  assert.equal(r.x1, undefined); assert.equal(r.x2, undefined);
  assert.equal(r.x3, undefined); assert.equal(r.x4, undefined, "string executada como código deve ser bloqueada");
  assert.ok(r.fetchBloqueado, "rede deve ser bloqueada (connect-src 'none')");
  for (const dir of ["script-src-attr", "script-src-elem", "script-src", "img-src", "connect-src"]) {
    assert.ok(r.violacoes.includes(dir), "violação esperada de " + dir + " — registradas: " + r.violacoes.join(", "));
  }
  await ctx.close();
});

test("XSS pela lista de participantes é exibido como texto, nunca executado", async () => {
  const ctx = await browser.newContext();
  const page = await abrir(ctx);
  const cargas = [
    '<img src=x onerror="window.__xss=1">',
    "<script>window.__xss=1<\/script>",
    '"><svg onload=window.__xss=1>',
    "javascript:window.__xss=1"
  ];
  await definirLista(page, [...cargas, "Pessoa Normal A", "Pessoa Normal B"]);
  const ata = await sortear(page, 6);
  assert.equal(ata.vencedores.length, 6);
  await page.evaluate(() => { document.getElementById("base-sec").open = true; });
  const r = await page.evaluate(() => ({
    xss: window.__xss,
    elementos: document.querySelectorAll("#vencedores img, #vencedores svg, #vencedores script, #base-log img, #base-log svg, #bloq-lista img").length,
    texto: document.getElementById("vencedores").textContent
  }));
  assert.equal(r.xss, undefined);
  assert.equal(r.elementos, 0);
  assert.ok(r.texto.includes("<img src=x"), "carga aparece como texto literal");
  await ctx.close();
});

test("quem já foi sorteado nunca volta a ser sorteado, mesmo reinserido com outra grafia", async () => {
  const ctx = await browser.newContext();
  const page = await abrir(ctx);
  await definirLista(page, PESSOAS);
  const primeiro = (await sortear(page, 1)).vencedores[0].participante;
  const [nome, email, fone] = primeiro.split(" — ");
  const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const digitos = fone.replace(/\D/g, "");
  const variantes = [
    primeiro.toUpperCase(),
    semAcento(primeiro),
    "  " + nome.replace(" ", "   ") + "  ",
    email.toUpperCase(),
    "Contato: +55 " + digitos.slice(0, 2) + " " + digitos.slice(2, 7) + " " + digitos.slice(7),
    semAcento(nome).toLowerCase() + " ; outro-email@exemplo.com"
  ];
  await definirLista(page, [...PESSOAS, ...variantes]);
  await page.uncheck("#ignora-dup");
  await page.waitForTimeout(200);
  assert.match(await texto(page, "#chip-bloq"), new RegExp("^" + (1 + variantes.length) + " já sorteados"));

  const sorteados = [primeiro];
  for (let i = 0; i < 4; i++) {
    const ata = await sortear(page, 1);
    const v = ata.vencedores[0].participante;
    assert.ok(!variantes.includes(v), "variante de quem já ganhou foi sorteada: " + v);
    assert.ok(!sorteados.includes(v), "repetido: " + v);
    assert.ok(ata.excluidosJaSorteados.length >= 1 + variantes.length);
    sorteados.push(v);
  }
  assert.equal(new Set(sorteados).size, 5);
  assert.ok(await page.isDisabled("#btn-sortear"), "com 1 elegível restante o botão fica desabilitado");
  assert.match(await texto(page, "#btn-sortear"), /Mínimo de 2 participantes elegíveis/);

  await page.reload();
  await page.waitForFunction(() => /íntegra/.test(document.getElementById("status-base").textContent));
  assert.match(await texto(page, "#status-base"), /5 sorteados/, "a base persiste após recarregar");
  await definirLista(page, PESSOAS);
  assert.match(await texto(page, "#chip-bloq"), /^5 já sorteados/);
  await ctx.close();
});

test("liberação registrada no log devolve a pessoa ao sorteio", async () => {
  const ctx = await browser.newContext();
  const page = await abrir(ctx);
  await definirLista(page, PESSOAS.slice(0, 3));
  const ganhador = (await sortear(page, 1)).vencedores[0].participante;
  page.respostaDialogo = "Desistiu do prêmio";
  await page.evaluate(() => { document.getElementById("base-sec").open = true; });
  await page.click("#base-log .ganhador button");
  await page.waitForFunction(() => /Liberado/.test(document.getElementById("base-msg").textContent));
  assert.match(await texto(page, "#status-base"), /0 sorteados/);
  assert.match(await texto(page, "#base-log"), /Liberação.*Desistiu do prêmio/);
  await definirLista(page, PESSOAS.slice(0, 3));
  assert.ok(await page.isHidden("#chip-bloq"), ganhador + " voltou a ser elegível");
  await ctx.close();
});

test("adulterar a base no navegador é detectado e bloqueia novos sorteios", async () => {
  const ctx = await browser.newContext();
  const page = await abrir(ctx);
  await definirLista(page, PESSOAS);
  await sortear(page, 2);
  await page.evaluate(() => new Promise((res, rej) => {
    const r = indexedDB.open("sorteio-scdp-base", 1);
    r.onsuccess = () => {
      const tx = r.result.transaction("registros", "readwrite");
      const st = tx.objectStore("registros");
      const g = st.get(1);
      g.onsuccess = () => { const reg = g.result; reg.dados.vencedores[0].participante = "Fraudador"; st.put(reg); };
      tx.oncomplete = () => { r.result.close(); res(); };
      tx.onerror = () => rej(tx.error);
    };
  }));
  await page.reload();
  await page.waitForFunction(() => /problema/.test(document.getElementById("status-base").textContent));
  assert.ok(await page.isDisabled("#btn-sortear"));
  assert.match(await texto(page, "#base-status"), /registro 1 foi alterado/);
  await ctx.close();
});

test("backup: exporta, rejeita arquivo adulterado e importa o íntegro", async () => {
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await abrir(ctx);
  await definirLista(page, PESSOAS);
  await sortear(page, 2);
  await page.evaluate(() => { document.getElementById("base-sec").open = true; });
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#btn-exportar")]);
  const original = await readFile(await dl.path(), "utf8");
  const backup = JSON.parse(original);
  assert.equal(backup.registros.length, 1);

  const dir = await mkdtemp(join(tmpdir(), "sorteio-"));
  const adulterado = structuredClone(backup);
  adulterado.registros[0].dados.vencedores[0].participante = "Outra Pessoa";
  await writeFile(join(dir, "adulterado.json"), JSON.stringify(adulterado));
  await page.setInputFiles("#arquivo-import", join(dir, "adulterado.json"));
  await page.waitForFunction(() => /rejeitado/.test(document.getElementById("base-msg").textContent));

  await page.evaluate(() => { document.getElementById("base-msg").textContent = ""; });
  const lixo = '{"formato":"sorteio-scdp-base","versao":1,"idBase":"x","registros":[{"__proto__":{"admin":true}}]}';
  await writeFile(join(dir, "lixo.json"), lixo);
  await page.setInputFiles("#arquivo-import", join(dir, "lixo.json"));
  await page.waitForFunction(() => /rejeitado/.test(document.getElementById("base-msg").textContent));
  assert.match(await texto(page, "#status-base"), /2 sorteados/, "base original intacta");

  const ctx2 = await browser.newContext();
  const p2 = await abrir(ctx2);
  await writeFile(join(dir, "ok.json"), original);
  await p2.evaluate(() => { document.getElementById("base-sec").open = true; });
  await p2.setInputFiles("#arquivo-import", join(dir, "ok.json"));
  await p2.waitForFunction(() => /importado/.test(document.getElementById("base-msg").textContent));
  assert.match(await texto(p2, "#status-base"), /2 sorteados/);
  assert.equal(await p2.evaluate(() => ({}).admin), undefined, "sem poluição de protótipo");
  await ctx.close(); await ctx2.close();
});

test("verificação: aceita ata íntegra e rejeita qualquer adulteração", async () => {
  const ctx = await browser.newContext();
  const page = await abrir(ctx);
  await definirLista(page, PESSOAS);
  await sortear(page, 1);
  const lista = PESSOAS.join("\n");
  const ata = await sortear(page, 2);
  assert.equal(ata.excluidosJaSorteados.length, 1);

  assert.match(await verificar(page, lista, ata), /^Sorteio íntegro ✓.*registrada na base.*Exclusões conferem/);

  const trocaVencedor = structuredClone(ata);
  trocaVencedor.vencedores[0].participante = PESSOAS.find((p) => !ata.vencedores.some((v) => v.participante === p));
  assert.match(await verificar(page, lista, trocaVencedor), /falhou.*ALTERADA/);

  assert.match(await verificar(page, lista.replace("Ana", "Anna"), ata), /falhou.*NÃO é a mesma/);

  // Fraude sofisticada: excluir um elegível e recalcular o hash da ata.
  // Só a base de sorteados denuncia (a ata sozinha não tem assinatura).
  const fraude = structuredClone(ata);
  const vitima = PESSOAS.find((p) => !ata.vencedores.some((v) => v.participante === p) &&
                                     !ata.excluidosJaSorteados.some((x) => x.linha === p));
  fraude.excluidosJaSorteados.push({ linha: vitima, motivo: "mesmo nome", sorteioAnterior: 1 });
  delete fraude.hashAtaSHA256;
  fraude.hashAtaSHA256 = await page.evaluate((a) => SorteioCore.sha256Hex(SorteioCore.canonico(a)), fraude);
  assert.match(await verificar(page, lista, fraude), /falhou.*NÃO está registrada/);

  const maliciosas = [
    "não é json",
    '{"__proto__":{"poluido":1},"algoritmo":"FY-RS-SHA256-v2"}',
    JSON.stringify({ ...ata, numerosAleatorios: new Array(300000).fill(1) }),
    JSON.stringify({ ...ata, numerosAleatorios: [1.5, -3, "7", 2 ** 40] }),
    JSON.stringify({ ...ata, vencedores: "todos" }),
    JSON.stringify({ ...ata, algoritmo: "<img src=x onerror=alert(1)>" })
  ];
  for (const m of maliciosas) {
    const t0 = Date.now();
    assert.match(await verificar(page, lista, m), /^Verificação falhou ✗/, m.slice(0, 60));
    assert.ok(Date.now() - t0 < 5000, "resposta rápida mesmo com entrada abusiva");
  }
  assert.equal(await page.evaluate(() => ({}).poluido), undefined);
  assert.equal(await page.$$eval("#verif-res img", (x) => x.length), 0);
  assert.deepEqual(page.erros, []);
  await ctx.close();
});

test("recarregar durante a contagem não desfaz o sorteio (gravado antes da revelação)", async () => {
  const ctx = await browser.newContext();
  const page = await abrir(ctx);
  await definirLista(page, PESSOAS);
  await page.click("#btn-sortear");
  await page.waitForSelector("#overlay-contagem:not([hidden])");
  await page.reload();
  await page.waitForFunction(() => /íntegra/.test(document.getElementById("status-base").textContent));
  assert.match(await texto(page, "#status-base"), /1 sorteado/);
  await ctx.close();
});

test("duas abas sorteando ao mesmo tempo nunca repetem um sorteado", async () => {
  const ctx = await browser.newContext();
  const a = await abrir(ctx), b = await abrir(ctx);
  const lista = PESSOAS.slice(0, 3);
  await definirLista(a, lista); await definirLista(b, lista);
  await Promise.all([a.click("#btn-sortear"), b.click("#btn-sortear")]);
  await a.waitForTimeout(5000);
  const ganhadores = await a.evaluate(() => new Promise((res) => {
    const r = indexedDB.open("sorteio-scdp-base", 1);
    r.onsuccess = () => {
      const g = r.result.transaction("registros").objectStore("registros").getAll();
      g.onsuccess = () => { r.result.close(); res(g.result.flatMap((x) => x.dados.vencedores.map((v) => v.participante))); };
    };
  }));
  assert.ok(ganhadores.length >= 1);
  assert.equal(new Set(ganhadores).size, ganhadores.length, "sorteado repetido: " + ganhadores.join(" | "));
  const msgs = (await texto(a, "#painel-res")) + " " + (await texto(b, "#painel-res"));
  if (ganhadores.length === 1) assert.match(msgs, /alterada em outra aba/);
  await ctx.close();
});

test("aleatoriedade uniforme (qui-quadrado) e sem viés de módulo", async () => {
  const ctx = await browser.newContext();
  const page = await abrir(ctx);
  const r = await page.evaluate(() => {
    const { escolher, inteiroSeguro, inteiroReplay } = SorteioCore;
    const N = 100000, K = 10, cont = new Array(K).fill(0), pos3 = new Array(K).fill(0);
    for (let i = 0; i < N; i++) {
      const s = escolher(K, 3, (m) => inteiroSeguro(m, []));
      cont[s[0]]++; pos3[s[2]]++;
    }
    const qui = (c) => c.reduce((a, o) => a + (o - N / K) ** 2 / (N / K), 0);
    const cursor = { v: [4294967295, 7], i: 0 };
    const replay = inteiroReplay(3, cursor);
    return { q1: qui(cont), q3: qui(pos3), replay, consumidos: cursor.i };
  });
  // gl = 9, p = 0,001 → 27,88
  assert.ok(r.q1 < 27.88, "1º lugar não uniforme: χ² = " + r.q1.toFixed(2));
  assert.ok(r.q3 < 27.88, "3º lugar não uniforme: χ² = " + r.q3.toFixed(2));
  assert.equal(r.replay, 1, "valor acima do limite é rejeitado e o próximo é usado");
  assert.equal(r.consumidos, 2);
  await ctx.close();
});

test("cabe em uma tela, sem rolagem, em computador, tablet e celular", async () => {
  const ctx = await browser.newContext();
  const telas = { "notebook 1366×768": [1366, 768], "full HD": [1920, 1080], "tablet": [768, 1024],
                  "iPhone": [390, 844], "Android": [360, 740] };
  for (const [nome, [w, h]] of Object.entries(telas)) {
    const page = await abrir(ctx, { width: w, height: h });
    const m = await page.evaluate(() => {
      const s = document.scrollingElement;
      const btn = document.getElementById("btn-sortear").getBoundingClientRect();
      return { sh: s.scrollHeight, sw: s.scrollWidth, ih: innerHeight, iw: innerWidth, btnBase: btn.bottom };
    });
    assert.ok(m.sh <= m.ih && m.sw <= m.iw, nome + ": página rola (" + m.sw + "×" + m.sh + ")");
    assert.ok(m.btnBase <= m.ih, nome + ": botão Sortear fora da tela");
    await page.close();
  }
  await ctx.close();
});
