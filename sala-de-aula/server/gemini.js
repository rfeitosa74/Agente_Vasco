// Acesso à API Gemini (somente no servidor: a chave nunca vai para o navegador).
import { GoogleGenAI } from '@google/genai';

/** Remove o que costuma vir junto ao colar a chave: espaços, quebras de linha, aspas, "GEMINI_API_KEY=". */
export function limparChave(bruta) {
  let k = String(bruta || '').trim();
  k = k.replace(/^(export\s+)?(GEMINI_API_KEY|GOOGLE_API_KEY)\s*[=:]\s*/i, '');
  k = k.replace(/^["'`]+|["'`]+$/g, '');
  return k.replace(/\s+/g, '');
}
const API_KEY = limparChave(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '');

/** Onde a chave é configurada, conforme a plataforma. */
const ONDE_CHAVE = process.env.REPL_ID || process.env.REPLIT_DEPLOYMENT
  ? 'no Replit, em Secrets (GEMINI_API_KEY), e depois publique de novo'
  : process.env.RENDER
  ? 'no Render, em Environment (GEMINI_API_KEY)'
  : 'no arquivo .env (GEMINI_API_KEY) e reinicie o servidor';

/** Descreve o formato da chave sem revelá-la. */
export function diagnosticoChave(k = API_KEY) {
  if (!k) return 'nenhuma chave configurada';
  if (/^sk-/.test(k)) return 'a chave começa com "sk-": parece ser uma chave da OpenAI, não do Gemini';
  if (!/^AIza/.test(k)) return `a chave não começa com "AIza" como as chaves do Gemini (tem ${k.length} caracteres)`;
  if (k.length !== 39) return `a chave começa com "AIza", mas tem ${k.length} caracteres (o normal são 39): pode ter sido copiada pela metade ou com algo a mais`;
  return 'o formato da chave parece correto (começa com "AIza" e tem 39 caracteres): ela pode ter sido apagada, restrita ou criada num projeto sem acesso à API Gemini';
}

let client = null;
export function hasKey() {
  return !!API_KEY;
}
export function ai() {
  if (!API_KEY) {
    throw new AppError(
      'configuracao',
      'A chave da API Gemini não está configurada no servidor.',
      `Configure a chave ${ONDE_CHAVE}.`
    );
  }
  if (!client) {
    const opts = { apiKey: API_KEY };
    // Usado apenas pelos testes automatizados (servidor Gemini simulado).
    if (process.env.GEMINI_TEST_BASE_URL) opts.httpOptions = { baseUrl: process.env.GEMINI_TEST_BASE_URL };
    client = new GoogleGenAI(opts);
  }
  return client;
}

export class AppError extends Error {
  constructor(tipo, mensagem, comoResolver = '', detalhe = '', status = 500) {
    super(mensagem);
    this.tipo = tipo;
    this.comoResolver = comoResolver;
    this.detalhe = detalhe;
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Modelos: identificadores configuráveis, conferidos na lista real da API.
// ---------------------------------------------------------------------------

const CANDIDATOS = {
  texto: [process.env.GEMINI_TEXT_MODEL, 'gemini-3.8-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-flash-latest'],
  live: [
    process.env.GEMINI_LIVE_MODEL,
    'gemini-3.8-live',
    'gemini-3.1-flash-live-preview',
    'gemini-2.5-flash-native-audio-preview-12-2025',
    'gemini-2.5-flash-native-audio-preview-09-2025',
    'gemini-live-2.5-flash-preview',
  ],
  // Nano Banana Pro. Não há substituto por outro modelo de imagem.
  imagem: [process.env.GEMINI_IMAGE_MODEL, 'gemini-3-pro-image', 'gemini-3-pro-image-preview'],
};

let modelCache = null; // { at, models: Map<id, info> }

export async function listModels(force = false) {
  if (!force && modelCache && Date.now() - modelCache.at < 10 * 60 * 1000) return modelCache.models;
  const models = new Map();
  try {
    const pager = await ai().models.list({ config: { pageSize: 200 } });
    for await (const m of pager) {
      const id = String(m.name || '').replace(/^models\//, '');
      models.set(id, { id, nome: m.displayName, acoes: m.supportedActions || [] });
    }
  } catch (e) {
    throw toAppError(e, 'listar os modelos');
  }
  modelCache = { at: Date.now(), models };
  return models;
}

/** Escolhe o primeiro modelo candidato que existe para esta chave. */
export async function resolveModel(papel) {
  const models = await listModels();
  const cands = CANDIDATOS[papel].filter(Boolean);
  for (const c of cands) if (models.has(c)) return c;
  if (papel === 'live') {
    // Qualquer modelo com suporte à API Live e saída de áudio
    const live = [...models.values()].filter((m) => m.acoes.includes('bidiGenerateContent'));
    const audio = live.find((m) => /audio|live/i.test(m.id));
    if (audio) return audio.id;
  }
  if (papel === 'texto') {
    const flash = [...models.values()].find((m) => /^gemini-[\d.]+-flash$/.test(m.id));
    if (flash) return flash.id;
  }
  throw new AppError(
    'modelo_indisponivel',
    papel === 'imagem'
      ? 'O modelo Nano Banana Pro (gemini-3-pro-image) não está disponível para esta chave.'
      : `Nenhum modelo ${papel === 'live' ? 'da API Live' : 'de texto'} compatível foi encontrado para esta chave.`,
    papel === 'imagem'
      ? 'Confira em aistudio.google.com se o projeto da chave tem acesso ao Nano Banana Pro. Ele exige faturamento ativado. Se o identificador mudou, defina GEMINI_IMAGE_MODEL no .env.'
      : `Defina o identificador correto em GEMINI_${papel === 'live' ? 'LIVE' : 'TEXT'}_MODEL no .env.`,
    `Procurados: ${cands.join(', ')}`,
    503
  );
}

export async function modelStatus() {
  const out = {};
  for (const papel of Object.keys(CANDIDATOS)) {
    try {
      out[papel] = { ok: true, modelo: await resolveModel(papel) };
    } catch (e) {
      const ae = toAppError(e);
      out[papel] = { ok: false, erro: publicError(ae) };
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Erros: tradução das respostas da API para mensagens compreensíveis.
// ---------------------------------------------------------------------------

export function toAppError(e, acao = 'falar com o Gemini') {
  if (e instanceof AppError) return e;
  const status = Number(e?.status) || 0;
  const msg = String(e?.message || e || '');
  const m = msg.toLowerCase();
  const det = msg.slice(0, 600);
  if (m.includes('api key not valid') || m.includes('api_key_invalid') || m.includes('api key expired'))
    return new AppError(
      'chave',
      'O Google recusou a chave da API Gemini (inválida, apagada ou expirada).',
      `Verificação: ${diagnosticoChave()}. Copie a chave de novo em aistudio.google.com/apikey (ou crie uma nova) e cole ${ONDE_CHAVE}.`,
      det,
      401
    );
  if (m.includes('billing') || m.includes('free tier') || (m.includes('only available') && m.includes('paid')))
    return new AppError('faturamento', 'Este recurso exige faturamento ativado no projeto da chave.', 'No Google AI Studio, abra o projeto da chave e ative o faturamento (plano pago) em "Billing". Depois tente novamente.', det, 402);
  if (status === 429 || m.includes('resource_exhausted') || m.includes('quota'))
    return new AppError('cota', 'A cota de uso da API foi atingida.', 'Espere alguns minutos e tente de novo, ou confira os limites do projeto em aistudio.google.com.', det, 429);
  if (status === 404 || m.includes('not found') || m.includes('is not supported for'))
    return new AppError('modelo_indisponivel', 'O modelo pedido não está disponível para esta chave.', 'Confira o identificador do modelo no .env e o acesso do projeto no Google AI Studio.', det, 503);
  if (status === 403 || m.includes('permission_denied') || m.includes('permission denied'))
    return new AppError('permissao', 'A chave não tem permissão para usar este recurso.', 'Confira se a API "Generative Language" está ativada no projeto da chave e se há restrições na chave.', det, 403);
  if (status === 400 && (m.includes('location') || m.includes('region')))
    return new AppError('regiao', 'Este recurso não está disponível na sua região.', '', det, 400);
  if (status === 413 || m.includes('too large') || m.includes('payload size'))
    return new AppError('tamanho', 'O arquivo é grande demais para ser analisado.', 'Tente um PDF menor (até 20 MB) ou divida o material.', det, 413);
  if (status >= 500)
    return new AppError('servico', 'O serviço do Gemini está instável no momento.', 'Espere um ou dois minutos e tente novamente. Se continuar, abra o detalhe técnico e me mande o texto.', det, 502);
  if (m.includes('fetch failed') || m.includes('enotfound') || m.includes('econnrefused') || m.includes('network'))
    return new AppError('rede', 'Não foi possível conectar ao Gemini.', 'Confira a conexão com a internet do computador que roda o servidor.', det, 502);
  return new AppError('desconhecido', `Não foi possível ${acao}.`, 'Tente novamente. Se o erro continuar, veja o detalhe técnico.', det, status >= 400 && status < 600 ? status : 500);
}

export function publicError(e) {
  return { tipo: e.tipo, mensagem: e.message, comoResolver: e.comoResolver, detalhe: e.detalhe };
}

// ---------------------------------------------------------------------------
// Utilitários de geração
// ---------------------------------------------------------------------------

function blockedReason(resp) {
  const pf = resp?.promptFeedback?.blockReason;
  if (pf) return `bloqueado (${pf})`;
  const fr = resp?.candidates?.[0]?.finishReason;
  if (fr && !['STOP', 'MAX_TOKENS', 'FINISH_REASON_UNSPECIFIED'].includes(fr)) return `interrompido (${fr})`;
  return '';
}

// ---------------------------------------------------------------------------
// Resiliência: novas tentativas e troca de modelo quando o Gemini falha
// ---------------------------------------------------------------------------
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
/** Falhas passageiras: erro interno, sobrecarga, tempo esgotado, conexão. */
export function falhaPassageira(e) {
  const st = Number(e?.status) || 0;
  const m = String(e?.message || '').toLowerCase();
  return st >= 500 || st === 408 || /overloaded|unavailable|internal error|deadline|timed? ?out|fetch failed|econnreset|socket hang up|etimedout|resposta vazia|json inválido/.test(m);
}
const ESPERA_BASE = Number(process.env.GEMINI_ESPERA_MS || 1500);

/** Repete a chamada em falhas passageiras, esperando cada vez mais. */
export async function comRetentativas(fn, tentativas = 3) {
  for (let i = 0; ; i++) {
    try {
      return await fn(i);
    } catch (e) {
      if (!falhaPassageira(e) || i >= tentativas - 1) throw e;
      const ms = ESPERA_BASE * Math.pow(2.5, i) + Math.random() * 400;
      console.warn(`[gemini] falha passageira (${e?.status || ''} ${String(e?.message || e).slice(0, 120)}); nova tentativa em ${Math.round(ms)} ms`);
      await espera(ms);
    }
  }
}

// Modelos que falharam há pouco ficam por último durante 5 minutos.
const modelosComProblema = new Map();
async function modelosDeTexto() {
  const models = await listModels();
  let lista = CANDIDATOS.texto.filter(Boolean).filter((c) => models.has(c));
  if (!lista.length) lista = [await resolveModel('texto')];
  const agora = Date.now();
  const ruim = (m) => ((modelosComProblema.get(m) || 0) > agora ? 1 : 0);
  return [...new Set(lista)].sort((a, b) => ruim(a) - ruim(b)).slice(0, 3);
}

/** Executa `fn(modelo, tentativa)` com novas tentativas e, se preciso, com outros modelos de texto. */
async function comModelosDeTexto(acao, fn, modeloFixo) {
  const modelos = modeloFixo ? [modeloFixo] : await modelosDeTexto();
  const falhas = [];
  for (const modelo of modelos) {
    try {
      return await comRetentativas((i) => fn(modelo, i));
    } catch (e) {
      if (e instanceof AppError && !falhaPassageira(e)) throw e;
      const st = Number(e?.status) || 0;
      if (!falhaPassageira(e) && st !== 404) throw toAppError(e, acao);
      falhas.push(`${modelo}: ${st || ''} ${String(e?.message || e).slice(0, 200)}`);
      modelosComProblema.set(modelo, Date.now() + 5 * 60 * 1000);
      console.warn(`[gemini] ${modelo} falhou ao ${acao}; ${modelos.indexOf(modelo) < modelos.length - 1 ? 'tentando outro modelo' : 'sem outros modelos'}`);
    }
  }
  throw new AppError(
    'servico',
    `O Gemini não conseguiu ${acao} agora, mesmo depois de várias tentativas${modelos.length > 1 ? ` com ${modelos.length} modelos diferentes` : ''}.`,
    'Espere um ou dois minutos e clique em "Tentar novamente". Se continuar, abra o detalhe técnico e me mande o texto.',
    falhas.join('\n'),
    502
  );
}

function respostaVazia(resp, acao) {
  const r = blockedReason(resp);
  // Bloqueio de segurança não melhora com nova tentativa; resposta vazia, sim.
  if (r) return new AppError('sem_resposta', `O Gemini não respondeu ao pedido de ${acao} (${r}).`, 'Tente reformular o pedido.', r, 422);
  return Object.assign(new Error('resposta vazia do Gemini'), { status: 502 });
}

/** Gera uma resposta JSON validada pelo esquema. */
export async function generateJson({ parts, schema, system, temperature = 0.4, acao, model }) {
  const call = (modelo, withSchema) =>
    ai().models.generateContent({
      model: modelo,
      contents: [
        {
          role: 'user',
          parts: withSchema
            ? parts
            : [...parts, { text: `Responda somente com JSON válido que siga este JSON Schema:\n${JSON.stringify(schema)}` }],
        },
      ],
      config: {
        systemInstruction: system,
        temperature,
        responseMimeType: 'application/json',
        ...(withSchema ? { responseJsonSchema: schema } : {}),
      },
    });
  return comModelosDeTexto(
    acao,
    async (modelo, tentativa) => {
      let resp;
      // Na última tentativa, manda o esquema no texto: alguns erros internos vêm do esquema.
      const comEsquema = tentativa < 2;
      try {
        resp = await call(modelo, comEsquema);
      } catch (e) {
        if (comEsquema && Number(e?.status) === 400 && /schema|too many states|nesting/i.test(String(e?.message))) resp = await call(modelo, false);
        else throw e;
      }
      const txt = resp.text;
      if (!txt) throw respostaVazia(resp, acao);
      try {
        return { data: JSON.parse(txt), modelo: resp.modelVersion || modelo };
      } catch {
        throw Object.assign(new Error(`JSON inválido na resposta: ${txt.slice(0, 120)}`), { status: 502 });
      }
    },
    model
  );
}

/** Gera texto simples. */
export async function generateText({ parts, system, temperature = 0.2, acao }) {
  return comModelosDeTexto(acao, async (modelo) => {
    const resp = await ai().models.generateContent({ model: modelo, contents: [{ role: 'user', parts }], config: { systemInstruction: system, temperature } });
    if (!resp.text) throw respostaVazia(resp, acao);
    return { text: resp.text, modelo: resp.modelVersion || modelo };
  });
}

/** Gera (ou edita) uma imagem com o Nano Banana Pro. */
export async function generateImage({ parts }) {
  const modelo = await resolveModel('imagem');
  const call = (imageConfig) =>
    ai().models.generateContent({
      model: modelo,
      contents: [{ role: 'user', parts }],
      config: { responseModalities: ['TEXT', 'IMAGE'], imageConfig },
    });
  let resp;
  let configUsada = { aspectRatio: '16:9', imageSize: '2K' };
  try {
    resp = await comRetentativas(() => call(configUsada));
  } catch (e) {
    const m = String(e?.message || '').toLowerCase();
    // Se a API recusar especificamente o tamanho, tenta só com a proporção e avisa.
    if (Number(e?.status) === 400 && (m.includes('image_size') || m.includes('imagesize'))) {
      configUsada = { aspectRatio: '16:9' };
      try {
        resp = await comRetentativas(() => call(configUsada));
      } catch (e2) {
        throw toAppError(e2, 'gerar o infográfico');
      }
    } else throw toAppError(e, 'gerar o infográfico');
  }
  const partsOut = resp?.candidates?.[0]?.content?.parts || [];
  const img = partsOut.find((p) => p.inlineData?.data && String(p.inlineData.mimeType || '').startsWith('image/'));
  const texto = partsOut.filter((p) => p.text && !p.thought).map((p) => p.text).join('\n').trim();
  if (!img) {
    const r = blockedReason(resp);
    throw new AppError(
      'sem_imagem',
      `O modelo de imagem respondeu, mas não devolveu nenhuma imagem${r ? ` (${r})` : ''}.`,
      'Tente novamente, talvez reformulando o pedido.',
      texto.slice(0, 400) || r,
      502
    );
  }
  return {
    mimeType: img.inlineData.mimeType,
    data: img.inlineData.data,
    modelo: resp.modelVersion || modelo,
    modeloPedido: modelo,
    configUsada,
    textoDoModelo: texto,
  };
}

/**
 * Envia um arquivo grande (áudio, vídeo) pela API de arquivos do Gemini e
 * espera ele ficar pronto para uso. Os arquivos ficam lá por 48 horas.
 */
export async function enviarArquivo(buffer, mimeType, nome) {
  let f;
  try {
    f = await comRetentativas(() => ai().files.upload({ file: new Blob([buffer], { type: mimeType }), config: { mimeType, displayName: String(nome || 'material').slice(0, 100) } }));
    const inicio = Date.now();
    while (String(f.state) === 'PROCESSING') {
      if (Date.now() - inicio > 5 * 60 * 1000) throw new AppError('tempo', 'O Gemini demorou demais para processar o arquivo.', 'Tente um arquivo menor ou mais curto.', '', 504);
      await new Promise((r) => setTimeout(r, 2500));
      f = await comRetentativas(() => ai().files.get({ name: f.name }));
    }
  } catch (e) {
    throw toAppError(e, 'enviar o arquivo ao Gemini');
  }
  if (String(f.state) === 'FAILED') throw new AppError('formato', 'O Gemini não conseguiu ler este arquivo.', 'Confira se o arquivo abre normalmente no computador, ou tente outro formato.', '', 422);
  return { uri: f.uri, mimeType: f.mimeType || mimeType };
}
