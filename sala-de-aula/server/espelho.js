// Espelho permanente dos dados: cada arquivo gravado na pasta de dados também é
// enviado a um armazenamento externo, e é restaurado de lá quando o servidor
// começa numa máquina nova (no Replit, o disco é apagado a cada publicação).
//
// Destinos:
//   - Replit Object Storage (automático quando o app roda no Replit e há um bucket);
//   - uma pasta (ESPELHO_PASTA), usada nos testes para simular o bucket.
import fs from 'node:fs';
import path from 'node:path';

const PREFIXO = 'sala-de-aula/';

async function destinoReplit() {
  const { Client } = await import('@replit/object-storage');
  const client = new Client();
  const ok = (r, acao) => {
    if (!r.ok) throw new Error(`Object Storage: falha ao ${acao}: ${r.error?.message || JSON.stringify(r.error)}`);
    return r.value;
  };
  return {
    nome: 'Replit Object Storage',
    enviar: async (nome, buf) => ok(await client.uploadFromBytes(nome, buf), 'enviar'),
    baixar: async (nome) => {
      const r = await client.downloadAsBytes(nome);
      return r.ok ? r.value[0] : null;
    },
    listar: async (prefixo) => ok(await client.list({ prefix: prefixo }), 'listar').map((o) => o.name),
    apagar: async (nome) => void (await client.delete(nome, { ignoreNotFound: true })),
  };
}

function destinoPasta(raiz) {
  const abs = (nome) => path.join(raiz, nome);
  return {
    nome: `pasta ${raiz}`,
    enviar: async (nome, buf) => {
      fs.mkdirSync(path.dirname(abs(nome)), { recursive: true });
      fs.writeFileSync(abs(nome), buf);
    },
    baixar: async (nome) => (fs.existsSync(abs(nome)) ? fs.readFileSync(abs(nome)) : null),
    listar: async (prefixo) => {
      const out = [];
      const andar = (dir) => {
        if (!fs.existsSync(dir)) return;
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, e.name);
          if (e.isDirectory()) andar(p);
          else out.push(path.relative(raiz, p).split(path.sep).join('/'));
        }
      };
      andar(raiz);
      return out.filter((n) => n.startsWith(prefixo));
    },
    apagar: async (nome) => fs.rmSync(abs(nome), { force: true }),
  };
}

/**
 * Cria o espelho da pasta `dataDir`, ou devolve null quando não há destino
 * (computador local, Render com disco).
 */
export async function criarEspelho(dataDir) {
  let destino = null;
  if (process.env.ESPELHO_PASTA) destino = destinoPasta(path.resolve(process.env.ESPELHO_PASTA));
  else if ((process.env.REPL_ID || process.env.REPLIT_DEPLOYMENT) && process.env.ARMAZENAMENTO !== 'local') {
    try {
      destino = await destinoReplit();
    } catch (e) {
      return { ativo: false, erro: `Não foi possível usar o Object Storage do Replit: ${e.message}` };
    }
  }
  if (!destino) return null;

  const rel = (abs) => path.relative(dataDir, abs).split(path.sep).join('/');
  const nomeObjeto = (abs) => PREFIXO + rel(abs);
  const pendentes = new Set();
  const estado = { ativo: true, erro: '', destino: destino.nome };

  const acompanhar = (p) => {
    const t = p
      .catch((e) => {
        estado.erro = e.message;
        console.error('[espelho]', e.message);
      })
      .finally(() => pendentes.delete(t));
    pendentes.add(t);
    return t;
  };

  return {
    estado,
    /** Copia um arquivo local para o destino (em segundo plano; use aguardar()). */
    enviar(abs) {
      const buf = fs.readFileSync(abs);
      return acompanhar(destino.enviar(nomeObjeto(abs), buf));
    },
    /** Apaga do destino um arquivo ou tudo dentro de uma pasta. */
    apagar(abs) {
      return acompanhar(
        (async () => {
          const base = nomeObjeto(abs);
          const nomes = await destino.listar(base);
          await Promise.all(nomes.filter((n) => n.startsWith(base)).map((n) => destino.apagar(n)));
        })()
      );
    },
    /** Espera todas as cópias em andamento (antes de responder ao navegador). */
    async aguardar() {
      while (pendentes.size) await Promise.all([...pendentes]);
    },
    /** Restaura do destino os arquivos pequenos (dados); os grandes vêm sob demanda. */
    async restaurar() {
      const nomes = await destino.listar(PREFIXO);
      let n = 0;
      for (const nome of nomes) {
        const local = path.join(dataDir, nome.slice(PREFIXO.length));
        if (!/\.(json|txt)$/.test(nome) || fs.existsSync(local)) continue;
        const buf = await destino.baixar(nome);
        if (!buf) continue;
        fs.mkdirSync(path.dirname(local), { recursive: true });
        fs.writeFileSync(local, buf);
        n++;
      }
      return n;
    },
    /** Garante que um arquivo grande exista na pasta local, baixando se preciso. */
    async garantir(abs) {
      if (fs.existsSync(abs)) return true;
      const buf = await destino.baixar(nomeObjeto(abs));
      if (!buf) return false;
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, buf);
      return true;
    },
    /** Procura no destino arquivos cujo nome começa com o prefixo indicado. */
    async procurar(absPrefixo) {
      return (await destino.listar(nomeObjeto(absPrefixo))).map((n) => path.join(dataDir, n.slice(PREFIXO.length)));
    },
    /** Teste rápido de escrita e leitura no destino. */
    async testar() {
      const nome = `${PREFIXO}.teste-escrita`;
      await destino.enviar(nome, Buffer.from(String(Date.now())));
      if (!(await destino.baixar(nome))) throw new Error('o arquivo de teste não pôde ser lido de volta');
    },
  };
}
