// Gera index.html: um único arquivo autossuficiente (fontes e biblioteca de QR
// embutidas) com Content-Security-Policy que só admite os scripts embutidos.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const pacote = (nome) => join(raiz, "node_modules", nome);

const fontes = [
  ["Barlow Condensed", 600, "@fontsource/barlow-condensed", "barlow-condensed-latin-600-normal.woff2"],
  ["Barlow Condensed", 700, "@fontsource/barlow-condensed", "barlow-condensed-latin-700-normal.woff2"],
  ["Barlow Condensed", 800, "@fontsource/barlow-condensed", "barlow-condensed-latin-800-normal.woff2"],
  ["Barlow", 400, "@fontsource/barlow", "barlow-latin-400-normal.woff2"],
  ["Barlow", 500, "@fontsource/barlow", "barlow-latin-500-normal.woff2"],
  ["Barlow", 600, "@fontsource/barlow", "barlow-latin-600-normal.woff2"],
  ["IBM Plex Mono", 400, "@fontsource/ibm-plex-mono", "ibm-plex-mono-latin-400-normal.woff2"],
  ["IBM Plex Mono", 600, "@fontsource/ibm-plex-mono", "ibm-plex-mono-latin-600-normal.woff2"]
];

const cssFontes = (await Promise.all(fontes.map(async ([familia, peso, pkg, arquivo]) => {
  const b64 = (await readFile(join(pacote(pkg), "files", arquivo))).toString("base64");
  return `@font-face{font-family:"${familia}";font-style:normal;font-weight:${peso};font-display:swap;` +
    `src:url(data:font/woff2;base64,${b64}) format("woff2");}`;
}))).join("\n");

const qrcode = await readFile(join(pacote("qrcode-generator"), "dist", "qrcode.js"), "utf8");
if (/<\/script/i.test(qrcode)) throw new Error("a biblioteca de QR contém </script>");

let html = await readFile(join(raiz, "src", "sorteio.template.html"), "utf8");
html = html.replace("/*@@FONTES@@*/", () => cssFontes).replace("/*@@QRCODE@@*/", () => qrcode);

const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map((m) => `'sha256-${createHash("sha256").update(m[1], "utf8").digest("base64")}'`);
if (hashes.length !== 2) throw new Error("esperados 2 scripts embutidos, encontrados " + hashes.length);

const csp = [
  "default-src 'none'",
  `script-src ${hashes.join(" ")}`,
  "style-src 'unsafe-inline'",
  "font-src data:",
  "img-src data:",
  "connect-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "manifest-src 'none'",
  "media-src 'none'"
].join("; ");
html = html.replace("@@CSP@@", () => csp);
if (html.includes("@@")) throw new Error("marcador não substituído no template");

await writeFile(join(raiz, "index.html"), html);
console.log(`index.html gerado: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
console.log(`CSP: ${csp}`);
