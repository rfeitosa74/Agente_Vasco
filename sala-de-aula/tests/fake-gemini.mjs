// SERVIDOR GEMINI SIMULADO — usado SOMENTE nos testes automatizados.
// Responde no mesmo formato da API real para exercitar a interface e o fluxo
// do aplicativo sem uma chave. Não é usado pelo aplicativo em funcionamento normal.
// Uso: node tests/fake-gemini.mjs [porta]
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { WebSocketServer } from 'ws';
import { Resvg } from '@resvg/resvg-js';

const PORT = Number(process.argv[2] || 8787);
const log = []; // registro de tudo o que o app enviou
const fx = (n) => JSON.parse(readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url), 'utf8'));
const opts = { imageError: process.env.FAKE_IMAGE_ERROR || '', falhas503: 0, quebrado: '', lento: '', atraso: 0 };

const ANALISE_ECLIPSE = {
  analisavel: true,
  titulo: 'Eclipses do Sol e da Lua',
  disciplina: 'Ciências',
  resumo: 'O material explica luz e sombra, umbra e penumbra, e como acontecem os eclipses solar e lunar.',
  secoes: [
    { id: 'luz_sombra', titulo: 'Luz e sombra' },
    { id: 'eclipse_solar', titulo: 'Eclipse solar' },
    { id: 'eclipse_lunar', titulo: 'Eclipse lunar' },
    { id: 'por_que', titulo: 'Por que não há eclipse todo mês?' },
  ],
  conceitos: [
    { id: 'eclipse_solar', nome: 'Eclipse solar', resumo: 'A Lua passa entre o Sol e a Terra.', paginas: [3], secoes: ['eclipse_solar'], conteudo: 'Ordem Sol – Lua – Terra; a sombra da Lua atinge parte da Terra; só na Lua Nova. Umbra: eclipse total; penumbra: parcial.', perguntaCentral: 'Por que algumas pessoas veem o eclipse total e outras só parcial?', representacao: 'desenho', figuras: [] },
    { id: 'eclipse_lunar', nome: 'Eclipse lunar', resumo: 'A Terra fica entre o Sol e a Lua.', paginas: [], secoes: ['eclipse_lunar'], conteudo: 'Ordem Sol – Terra – Lua; a Lua entra na sombra da Terra; só na Lua Cheia; a Lua fica avermelhada.', perguntaCentral: 'Por que a Lua fica avermelhada no eclipse lunar?', representacao: 'desenho', figuras: [] },
    { id: 'inclinacao', nome: 'Inclinação da órbita da Lua', resumo: 'A órbita da Lua é inclinada cerca de 5 graus.', paginas: [], secoes: ['por_que'], conteudo: 'Inclinação de cerca de 5° em relação ao plano da órbita da Terra; por isso não há eclipse todo mês.', perguntaCentral: 'Por que não acontece eclipse todo mês?', representacao: 'desenho', figuras: [] },
  ],
};
const ANALISE_FRACOES = {
  analisavel: true,
  titulo: 'Frações',
  disciplina: 'Matemática',
  resumo: 'O material apresenta o que é uma fração, frações equivalentes, comparação, soma e tipos de fração.',
  secoes: [
    { id: 'o_que_e', titulo: 'O que é uma fração' },
    { id: 'tipos', titulo: 'Tipos de fração' },
  ],
  conceitos: [
    { id: 'partes', nome: 'Numerador e denominador', resumo: 'O denominador diz em quantas partes; o numerador, quantas tomamos.', paginas: [], secoes: ['o_que_e'], conteudo: 'Na fração 3/4, o denominador 4 indica em quantas partes iguais o inteiro foi dividido; o numerador 3, quantas partes consideramos.', perguntaCentral: 'O que significam os números de uma fração?', representacao: 'relacoes', figuras: [] },
    { id: 'tipos', nome: 'Tipos de fração', resumo: 'Própria, imprópria e aparente.', paginas: [], secoes: ['tipos'], conteudo: 'Própria: numerador menor que o denominador. Imprópria: maior ou igual. Aparente: representa um inteiro.', perguntaCentral: 'Como saber se uma fração é maior que um inteiro?', representacao: 'comparacao', figuras: [] },
  ],
};

const BOARD_ECLIPSE_ERRADO = (() => {
  const b = fx('eclipse-solar');
  // ERRO PROPOSITAL: sombras apontando para o lado do Sol
  b.desenho.elementos = b.desenho.elementos.map((e) =>
    e.id === 'umbra' || e.id === 'penumbra' ? { ...e, pontos: e.pontos.map((p) => ({ x: 1040 - p.x, y: p.y })), rotuloX: 300 } : e
  );
  return b;
})();
const BOARD_LUNAR = {
  tipo: 'desenho', pergunta: 'Onde fica a Lua durante um eclipse lunar?', titulo: 'Eclipse lunar: a Terra entre o Sol e a Lua',
  explicacao: 'A Terra bloqueia a luz do Sol e a Lua entra na sombra da Terra.', legendaGeral: 'Fora de escala', fontes: ['Eclipse lunar'],
  desenho: { elementos: [
    { id: 'penumbra', tipo: 'poligono', cor: 'sombraClara', pontos: [{ x: 470, y: 230 }, { x: 470, y: 330 }, { x: 940, y: 470 }, { x: 940, y: 90 }], rotulo: 'Penumbra', rotuloX: 760, rotuloY: 100, camada: 1 },
    { id: 'umbra', tipo: 'poligono', cor: 'sombraEscura', pontos: [{ x: 470, y: 230 }, { x: 470, y: 330 }, { x: 940, y: 300 }, { x: 940, y: 260 }], rotulo: 'Umbra', rotuloX: 760, rotuloY: 420, camada: 2 },
    { id: 'sol', tipo: 'circulo', x: 120, y: 280, r: 90, cor: 'amarelo', rotulo: 'Sol', camada: 3 },
    { id: 'terra', tipo: 'circulo', x: 470, y: 280, r: 50, cor: 'azulEscuro', rotulo: 'Terra', rotuloY: 370, rotuloX: 470, camada: 3 },
    { id: 'lua', tipo: 'circulo', x: 860, y: 280, r: 16, cor: 'coral', rotulo: 'Lua (avermelhada)', rotuloX: 860, rotuloY: 330, camada: 3 },
  ] },
};
const BOARD_TIPOS = {
  tipo: 'comparacao', pergunta: 'Como saber se uma fração é maior que um inteiro?', titulo: 'Própria, imprópria ou aparente?', explicacao: 'Compare o numerador com o denominador.', fontes: ['Tipos de fração'],
  comparacao: { colunas: [{ id: 'propria', titulo: 'Própria', cor: 'verde' }, { id: 'impropria', titulo: 'Imprópria', cor: 'coral' }, { id: 'aparente', titulo: 'Aparente', cor: 'azul' }],
    aspectos: [{ id: 'regra', aspecto: 'Numerador × denominador', valores: ['menor', 'maior ou igual', 'múltiplo'] }, { id: 'ex', aspecto: 'Exemplo', valores: ['2/5', '7/4', '8/4 = 2'] }] },
};

function genResponse(obj) {
  return { candidates: [{ content: { role: 'model', parts: [{ text: typeof obj === 'string' ? obj : JSON.stringify(obj) }] }, finishReason: 'STOP' }], modelVersion: 'fake-text-model' };
}
function textOf(body) {
  return (body.contents || []).flatMap((c) => c.parts || []).map((p) => p.text || '').join('\n');
}

let revisoesEclipse = 0;
function handleGenerate(model, body) {
  const t = textOf(body);
  const isEclipse = /Eclipse|eclipse/.test(t);
  if (model.includes('image')) {
    if (opts.imageError === 'billing') return { status: 400, body: { error: { code: 400, message: 'Gemini 3 Pro Image is only available on paid tiers. Please enable billing.', status: 'FAILED_PRECONDITION' } } };
    if (opts.imageError === 'quota') return { status: 429, body: { error: { code: 429, message: 'Resource has been exhausted (e.g. check quota).', status: 'RESOURCE_EXHAUSTED' } } };
    const editing = (body.contents?.[0]?.parts || []).some((p) => p.inlineData);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2752" height="1536"><rect width="100%" height="100%" fill="#fdf8ec"/><text x="1376" y="200" font-size="${editing ? 130 : 96}" text-anchor="middle" font-family="DejaVu Sans" fill="#2f5d46">IMAGEM DE TESTE ${editing ? '(corrigida)' : ''}</text><text x="1376" y="400" font-size="60" text-anchor="middle" font-family="DejaVu Sans">gerada pelo servidor simulado</text></svg>`;
    const png = new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng();
    return { body: { candidates: [{ content: { parts: [{ text: 'Aqui está.' }, { inlineData: { mimeType: 'image/png', data: png.toString('base64') } }] }, finishReason: 'STOP' }], modelVersion: 'gemini-3-pro-image-preview' } };
  }
  if (t.includes('Responda SOMENTE com um único documento SVG')) {
    const corr = t.includes('INFOGRÁFICO ATUAL (SVG)');
    return { body: genResponse(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#fdf8ec"/><text x="800" y="120" font-size="${corr ? 80 : 56}" text-anchor="middle" fill="#2f5d46">INFOGRÁFICO SVG DE TESTE${corr ? ' (corrigido)' : ''}</text><circle cx="300" cy="480" r="120" fill="gold"/><circle cx="800" cy="480" r="30" fill="gray"/><circle cx="1300" cy="480" r="90" fill="steelblue"/></svg>`) };
  }
  if (t.includes('Analise o material de estudo anexado') && /O material é um (ÁUDIO|VÍDEO)/.test(t)) {
    return { body: genResponse({ ...ANALISE_ECLIPSE, secoes: [{ id: 'abertura', titulo: 'Abertura', inicio: '00:00' }, { id: 'eclipse_solar', titulo: 'Eclipse solar', inicio: '00:04' }],
      conceitos: ANALISE_ECLIPSE.conceitos.map((c, i) => ({ ...c, paginas: [], tempos: i === 0 ? ['00:04', '99:00'] : ['00:07'] })) }) };
  }
  if (t.includes('Analise o material de estudo anexado')) {
    if (t.includes('Material vazio de teste')) return { body: genResponse({ analisavel: false, motivoNaoAnalisavel: 'o texto não contém conteúdo de estudo', titulo: '', resumo: '', conceitos: [] }) };
    return { body: genResponse(isEclipse ? ANALISE_ECLIPSE : ANALISE_FRACOES) };
  }
  if (t.includes('Você é um revisor rigoroso')) {
    if (t.includes('CONCEITO: Eclipse solar') && revisoesEclipse++ === 0)
      return { body: genResponse({ aprovado: false, confiavel: true, problemas: ['As sombras estão do lado do Sol; devem partir da Lua em direção à Terra.'] }) };
    return { body: genResponse({ aprovado: true, confiavel: true, problemas: [] }) };
  }
  if (t.includes('Crie a representação do quadro')) {
    const corr = t.includes('UMA VERSÃO ANTERIOR DESTE QUADRO TINHA ERROS');
    if (t.includes('CONCEITO: Eclipse solar')) return { body: genResponse(corr ? fx('eclipse-solar') : BOARD_ECLIPSE_ERRADO) };
    if (t.includes('CONCEITO: Eclipse lunar')) return { body: genResponse(BOARD_LUNAR) };
    if (t.includes('CONCEITO: Numerador')) return { body: genResponse(fx('fracoes-rel')) };
    if (t.includes('CONCEITO: Tipos')) return { body: genResponse(BOARD_TIPOS) };
    return { body: genResponse(fx('ciclo-agua')) };
  }
  if (t.includes('Você é o tutor de uma sala de aula virtual')) {
    const conceito = /CONCEITO ATUAL: (.+)/.exec(t)?.[1];
    const eSe = t.includes('O que acontece se mudarmos isso?');
    return { body: genResponse({ resposta: `Resposta de teste sobre ${conceito}.${eSe ? ' (atalho e-se)' : ''}`, atualizarQuadro: eSe, pedidoParaQuadro: eSe ? 'mostrar a mudança' : '', destacar: eSe ? [] : ['lua'] }) };
  }
  if (t.includes('Crie UMA pergunta aberta')) return { body: genResponse({ pergunta: 'Com suas palavras: por que algumas pessoas veem o eclipse total e outras não?' }) };
  if (t.includes('Avalie a explicação')) {
    const resp = /RESPOSTA DO ALUNO[^"]*"""\n([\s\S]*?)\n"""/.exec(t)?.[1] || '';
    const fala = /lua/i.test(resp);
    return { body: genResponse({ entendeuCorretamente: fala ? ['A Lua fica entre o Sol e a Terra.'] : [], faltou: fala ? ['A diferença entre umbra e penumbra.'] : [], confundiu: [], correcao: 'Quem está na umbra vê o eclipse total; na penumbra, parcial.', situacao: fala ? 'parcial' : 'fora_do_tema', comentario: `Avaliação de teste da resposta: "${resp.slice(0, 60)}"` }) };
  }
  if (t.includes('Transcreva literalmente')) return { body: genResponse('A Lua fica entre o Sol e a Terra.') };
  if (t.includes('Prepare a direção visual')) {
    return { body: genResponse({ perguntaPrincipal: 'Por que cada pessoa vê o eclipse de um jeito?', titulo: 'O mesmo eclipse, duas formas de vê-lo', ilustracaoPrincipal: 'Sol à esquerda, Lua no meio, Terra à direita; umbra e penumbra atrás da Lua.', secoes: [{ titulo: 'Na umbra', conteudo: 'eclipse total' }, { titulo: 'Na penumbra', conteudo: 'eclipse parcial' }], legendas: ['Sol', 'Lua', 'Terra', 'Umbra', 'Penumbra'], conclusao: 'O que você vê depende de onde está', paleta: 'amarelo para o Sol, cinza para a Lua, azul para a Terra', notaEscala: 'Fora de escala', cuidadosCientificos: ['Ordem Sol–Lua–Terra'] }) };
  }
  if (t.includes('Revise o infográfico')) return { body: genResponse({ observacoes: [{ categoria: 'legendas', descricao: 'Observação de teste: legendas pequenas.', sugestaoDeCorrecao: 'aumente o tamanho das legendas' }], resumo: 'Revisão de teste.' }) };
  return { body: genResponse({}) };
}

const server = http.createServer((req, res) => {
  let data = '';
  req.on('data', (c) => (data += c));
  req.on('end', () => {
    const send = (status, obj) => {
      res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
      res.end(JSON.stringify(obj));
    };
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/__log') return send(200, log);
    if (url.pathname === '/__opts') {
      Object.assign(opts, Object.fromEntries(url.searchParams));
      return send(200, opts);
    }
    // API de arquivos (envio retomável, como a real)
    if (url.pathname.startsWith('/upload/') && req.headers['x-goog-upload-command'] === 'start') {
      log.push({ upload: 'start', mime: req.headers['x-goog-upload-header-content-type'], tamanho: req.headers['x-goog-upload-header-content-length'] });
      res.writeHead(200, { 'x-goog-upload-url': `http://127.0.0.1:${PORT}/upload-session/1`, 'x-goog-upload-status': 'active', 'content-type': 'application/json' });
      return res.end('{}');
    }
    if (url.pathname.startsWith('/upload-session/')) {
      const fim = String(req.headers['x-goog-upload-command'] || '').includes('finalize');
      res.writeHead(200, { 'x-goog-upload-status': fim ? 'final' : 'active', 'content-type': 'application/json' });
      return res.end(JSON.stringify({ file: { name: 'files/video1', uri: `http://127.0.0.1:${PORT}/v1beta/files/video1`, mimeType: 'video/mp4', state: 'PROCESSING' } }));
    }
    if (req.method === 'GET' && url.pathname.endsWith('/files/video1')) return send(200, { name: 'files/video1', uri: `http://127.0.0.1:${PORT}/v1beta/files/video1`, mimeType: 'video/mp4', state: 'ACTIVE' });
    let body = {};
    try {
      body = data ? JSON.parse(data) : {};
    } catch {
      body = {};
    }
    log.push({ method: req.method, path: url.pathname, body: summarize(body) });
    if (req.method === 'GET' && /\/models$/.test(url.pathname)) {
      return send(200, {
        models: [
          { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-3.8-live', supportedGenerationMethods: ['bidiGenerateContent'] },
          { name: 'models/gemini-3-pro-image-preview', supportedGenerationMethods: ['generateContent'] },
        ],
      });
    }
    if (url.pathname.endsWith('/auth_tokens')) return send(200, { name: 'auth_tokens/fake-token-123' });
    const m = /models\/([^:]+):generateContent/.exec(url.pathname);
    if (m) {
      // Simula instabilidade do Google: N respostas 503 seguidas, ou um modelo sempre com erro 500.
      if (!m[1].includes('image') && (opts.quebrado === m[1] || opts.quebrado === 'todos'))
        return send(500, { error: { code: 500, message: 'An internal error has occurred. Please retry or report in https://developers.generativeai.google/guide/troubleshooting', status: 'INTERNAL' } });
      if (!m[1].includes('image') && Number(opts.falhas503) > 0) {
        opts.falhas503 = Number(opts.falhas503) - 1;
        return send(503, { error: { code: 503, message: 'The model is overloaded. Please try again later.', status: 'UNAVAILABLE' } });
      }
      // Simula um modelo que demora (ou não responde) e uma análise lenta em geral.
      if (opts.lento && opts.lento === m[1]) return; // nunca responde
      if (Number(opts.atraso) > 0 && /Analise o material/.test(textOf(body))) {
        setTimeout(() => {
          const r = handleGenerate(m[1], body);
          send(r.status || 200, r.body);
        }, Number(opts.atraso));
        return;
      }
      const r = handleGenerate(m[1], body);
      return send(r.status || 200, r.body);
    }
    send(404, { error: { code: 404, message: 'not found', status: 'NOT_FOUND' } });
  });
});

function summarize(body) {
  // Reduz dados binários no registro
  return JSON.parse(JSON.stringify(body, (k, v) => (k === 'data' && typeof v === 'string' && v.length > 200 ? `<${v.length} chars base64>` : v)));
}

// ---------------------------------------------------------------- Live (WebSocket)
const wss = new WebSocketServer({ server });
wss.on('connection', (ws, req) => {
  const live = { url: req.url, setup: null, audioChunks: 0, textos: [], toolResponses: [], contextUpdates: 0, videoFrames: 0, clientContents: 0 };
  log.push({ live });
  let toolStage = 0;
  const sendAudio = (text) => {
    const n = 24000 * 0.4;
    const pcm = Buffer.alloc(n * 2);
    for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round(Math.sin((i / 24000) * 2 * Math.PI * 440) * 6000), i * 2);
    ws.send(JSON.stringify({ serverContent: { modelTurn: { parts: [{ inlineData: { mimeType: 'audio/pcm;rate=24000', data: pcm.toString('base64') } }] } } }));
    ws.send(JSON.stringify({ serverContent: { outputTranscription: { text } } }));
    ws.send(JSON.stringify({ serverContent: { turnComplete: true } }));
  };
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.setup) {
      live.setup = {
        model: msg.setup.model,
        tools: (msg.setup.tools?.[0]?.functionDeclarations || []).map((f) => f.name),
        temSystemInstruction: !!msg.setup.systemInstruction,
        systemInstructionInicio: JSON.stringify(msg.setup.systemInstruction).slice(0, 4000),
        inputTranscription: !!msg.setup.inputAudioTranscription,
        outputTranscription: !!msg.setup.outputAudioTranscription,
        compressao: !!msg.setup.contextWindowCompression,
        resumption: !!msg.setup.sessionResumption,
      };
      ws.send(JSON.stringify({ setupComplete: {} }));
      ws.send(JSON.stringify({ sessionResumptionUpdate: { newHandle: 'handle-1', resumable: true } }));
      return;
    }
    if (msg.realtimeInput?.audio) {
      live.audioChunks++;
      if (live.audioChunks === 2) ws.send(JSON.stringify({ serverContent: { inputTranscription: { text: 'Destaque a Lua, por favor.' } } }));
      if (live.audioChunks === 15 && toolStage === 0) {
        toolStage = 1;
        ws.send(JSON.stringify({ toolCall: { functionCalls: [{ id: 'call-1', name: 'destacar_no_quadro', args: { ids: ['lua', 'inexistente'] } }] } }));
      }
      return;
    }
    if (msg.realtimeInput?.text) {
      live.textos.push(msg.realtimeInput.text.slice(0, 300));
      sendAudio('Olá! Vamos estudar juntos?');
      return;
    }
    if (msg.realtimeInput?.video) {
      live.videoFrames++;
      return;
    }
    if (msg.toolResponse) {
      live.toolResponses.push(msg.toolResponse.functionResponses);
      if (toolStage === 1) {
        toolStage = 2;
        ws.send(JSON.stringify({ toolCall: { functionCalls: [{ id: 'call-2', name: 'mostrar_conceito', args: { conceito_id: 'eclipse_lunar' } }] } }));
      } else if (toolStage === 2) {
        toolStage = 3;
        ws.send(JSON.stringify({ toolCall: { functionCalls: [{ id: 'call-3', name: 'criar_infografico', args: { duvida: 'umbra e penumbra' } }] } }));
      } else sendAudio('Pronto.');
      return;
    }
    if (msg.contextUpdate) {
      live.contextUpdates++;
      live.ultimoContexto = JSON.stringify(msg.contextUpdate).slice(0, 3000);
      return;
    }
    if (msg.clientContent) live.clientContents++;
  });
});

server.listen(PORT, () => console.log(`Gemini simulado em http://127.0.0.1:${PORT}`));
