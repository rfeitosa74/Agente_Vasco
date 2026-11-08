import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, IS_ARTIFACT, postForm, postJson, toErro } from './api';
import { TutorChat, type TutorChatHandle } from './components/TutorChat';

async function sair() {
  await postJson('/api/logout', {}).catch(() => {});
  window.location.reload();
}
import { openPdf, type PdfDoc } from './pdf';
import { prepararArquivo, segundosDe } from './material';
import { describeBoard, listElements, renderBoardSvg, SVG_KINDS } from '../shared/board.js';
import type { Analise, ApiErro, BoardState, Conceito, Direcao, ImagemGerada, Material, Mensagem } from './types';
import { StartScreen } from './components/StartScreen';
import { BoardView } from './components/BoardView';
import { Notebook } from './components/Notebook';
import { AskBar, ATALHOS } from './components/AskBar';
import { TutorDock } from './components/TutorDock';
import { ExplainModal } from './components/ExplainModal';
import { InfographicPanel, type InfoState, type ObservacaoRevisao } from './components/InfographicPanel';
import { OriginalViewer } from './components/OriginalViewer';
import { LiveTutor, type LiveSnapshot } from './live/LiveTutor';
import { buildSystemInstruction, TUTOR_TOOLS } from './live/tutorContext';

let msgSeq = 0;
const mid = () => `m${Date.now()}_${msgSeq++}`;

/** Converte um SVG ou imagem em JPEG (base64) reduzido, para enviar ao tutor como contexto visual. */
async function toJpegBase64(src: string, maxW = 1024, bg = '#ffffff'): Promise<string> {
  const img = new Image();
  img.decoding = 'async';
  await new Promise<void>((ok, fail) => {
    img.onload = () => ok();
    img.onerror = () => fail(new Error('imagem inválida'));
    img.src = src;
  });
  const scale = Math.min(1, maxW / (img.naturalWidth || maxW));
  const w = Math.round((img.naturalWidth || maxW) * scale);
  const h = Math.round((img.naturalHeight || maxW * 0.56) * scale);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/jpeg', 0.85).split(',')[1];
}

export default function App({ podeSair = false }: { podeSair?: boolean }) {
  // ------------------------------------------------------------------ material
  const [material, setMaterial] = useState<Material | null>(null);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [carregando, setCarregando] = useState<string | null>(null);
  const [erroInicio, setErroInicio] = useState<ApiErro | null>(null);
  const docIdRef = useRef('');
  const pdfRef = useRef<PdfDoc | null>(null);
  const epochRef = useRef(0); // muda a cada troca de material: descarta respostas antigas

  // ------------------------------------------------------------------ aula
  const [conceitoId, setConceitoId] = useState('');
  const [boards, setBoards] = useState<Record<string, BoardState>>({});
  const [boardLoading, setBoardLoading] = useState<{ id: string; msg: string } | null>(null);
  const [boardErros, setBoardErros] = useState<Record<string, ApiErro>>({});
  const [highlights, setHighlights] = useState<string[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [perguntando, setPerguntando] = useState(false);
  const [nivel, setNivel] = useState('');
  const [explicarAberto, setExplicarAberto] = useState(false);
  const [original, setOriginal] = useState<{ pagina?: number; tempo?: number } | null>(null);
  const [info, setInfo] = useState<InfoState | null>(null);
  const [liveSnap, setLiveSnap] = useState<LiveSnapshot>({ status: 'desconectado', muted: false, erro: '', dica: '', modelo: '', transcript: [], ferramenta: '', nivelMic: 0 });

  const conceito = useMemo(() => analise?.conceitos.find((c) => c.id === conceitoId) || null, [analise, conceitoId]);
  const boardState = conceito ? boards[conceito.id] || null : null;

  // Estado mais recente para os callbacks do tutor (que vivem fora do ciclo do React)
  const S = useRef({ analise, conceito, boardState, highlights, mensagens, nivel, info, boards });
  S.current = { analise, conceito, boardState, highlights, mensagens, nivel, info, boards };

  // ------------------------------------------------------------------ documento no servidor
  const registrar = useCallback(async (m: Material) => {
    const fd = new FormData();
    if (m.tipo === 'pdf' && m.arquivo) {
      fd.append('arquivo', m.arquivo, m.arquivo.name);
      fd.append('numPaginas', String(m.numPaginas || 0));
      fd.append('nome', m.nome);
    } else if (m.tipo === 'midia' && m.arquivo) {
      fd.append('arquivo', m.arquivo, m.arquivo.name);
      fd.append('midia', m.midia || '');
      fd.append('duracao', String(m.duracao || 0));
      fd.append('nome', m.nome);
    } else {
      fd.append('texto', m.texto || '');
      fd.append('nome', m.nome);
    }
    const r = await postForm<{ docId: string }>('/api/documents', fd);
    docIdRef.current = r.docId;
    return r.docId;
  }, []);

  const materialRef = useRef<Material | null>(null);
  materialRef.current = material;
  /** Executa uma chamada que precisa do documento; reenvia-o se o servidor o tiver perdido. */
  const withDoc = useCallback(
    async <T,>(fn: (docId: string) => Promise<T>): Promise<T> => {
      try {
        return await fn(docIdRef.current);
      } catch (e) {
        if (e instanceof ApiError && e.status === 410 && materialRef.current) {
          await registrar(materialRef.current);
          return fn(docIdRef.current);
        }
        throw e;
      }
    },
    [registrar]
  );

  // ------------------------------------------------------------------ início
  const ultimoMaterial = useRef<Material | null>(null);
  const comecar = useCallback(
    async (m: Material) => {
      ultimoMaterial.current = m;
      const epoch = ++epochRef.current;
      setErroInicio(null);
      try {
        let mat = { ...m };
        pdfRef.current = null;
        if (m.tipo === 'arquivo' && m.arquivo) {
          setCarregando('Lendo o arquivo…');
          mat = await prepararArquivo(m.arquivo);
          if (epoch !== epochRef.current) return;
        }
        if (mat.tipo === 'pdf' && mat.arquivo) {
          setCarregando('Abrindo o PDF…');
          let pdf: PdfDoc;
          try {
            pdf = await openPdf(mat.arquivo);
          } catch (e) {
            throw new ApiError({ tipo: 'formato', mensagem: 'Não foi possível abrir este PDF (arquivo danificado ou protegido por senha).', comoResolver: 'Tente outro arquivo ou cole o texto.', detalhe: String(e) }, 400);
          }
          pdfRef.current = pdf;
          mat = { ...mat, numPaginas: pdf.numPages };
        }
        setCarregando(mat.tipo === 'midia' && mat.midia !== 'imagem' ? 'Enviando o arquivo (áudios e vídeos podem levar alguns minutos)…' : 'Enviando o material…');
        await registrar(mat);
        if (epoch !== epochRef.current) return;
        setCarregando(
          `Analisando o conteúdo com ${IS_ARTIFACT ? 'o Claude' : 'o Gemini'}${mat.midia === 'audio' ? ' (ouvindo o áudio)' : mat.midia === 'video' ? ' (assistindo ao vídeo)' : mat.midia === 'imagem' ? ' (lendo a imagem)' : ' (texto e figuras)'}… isso pode levar alguns segundos.`
        );
        const r = await withDocFor(mat, (docId) => postJson<{ analise: Analise }>('/api/analyze', { docId }));
        if (epoch !== epochRef.current) return;
        setMaterial(mat);
        setAnalise(r.analise);
        setConceitoId(r.analise.conceitos[0].id);
      } catch (e) {
        if (epoch === epochRef.current) setErroInicio(toErro(e));
      } finally {
        if (epoch === epochRef.current) setCarregando(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registrar]
  );
  // variante de withDoc que usa um material explícito (antes de ele virar estado)
  const withDocFor = async <T,>(m: Material, fn: (docId: string) => Promise<T>) => {
    try {
      return await fn(docIdRef.current);
    } catch (e) {
      if (e instanceof ApiError && e.status === 410) {
        await registrar(m);
        return fn(docIdRef.current);
      }
      throw e;
    }
  };

  // ------------------------------------------------------------------ quadro
  const boardPromises = useRef<Record<string, Promise<BoardState | null>>>({});
  const carregarQuadro = useCallback(
    (c: Conceito, pedido = '', origem = 'conceito'): Promise<BoardState | null> => {
      const epoch = epochRef.current;
      const atual = S.current.boards[c.id];
      setBoardLoading({ id: c.id, msg: pedido ? 'Atualizando o quadro…' : 'Desenhando o quadro e conferindo a precisão…' });
      setBoardErros((e) => {
        const n = { ...e };
        delete n[c.id];
        return n;
      });
      const p = withDoc((docId) =>
        postJson<{ board: BoardState['board']; revisao: BoardState['revisao']; modelo: string }>('/api/board', {
          docId,
          conceito: c,
          pedido,
          quadroAtual: atual ? describeBoard(atual.board) : '',
        })
      )
        .then((r) => {
          if (epoch !== epochRef.current) return null;
          const st: BoardState = { board: r.board, revisao: r.revisao, modelo: r.modelo, origem };
          setBoards((b) => ({ ...b, [c.id]: st }));
          if (S.current.conceito?.id === c.id) setHighlights([]);
          return st;
        })
        .catch((e) => {
          if (epoch === epochRef.current) setBoardErros((x) => ({ ...x, [c.id]: toErro(e) }));
          throw e;
        })
        .finally(() => {
          if (epoch === epochRef.current) setBoardLoading((l) => (l?.id === c.id ? null : l));
        });
      boardPromises.current[c.id] = p.catch(() => null);
      return p;
    },
    [withDoc]
  );

  const selecionar = useCallback(
    (id: string) => {
      const c = S.current.analise?.conceitos.find((k) => k.id === id);
      if (!c) return null;
      setConceitoId(id);
      setHighlights([]);
      if (!S.current.boards[id] && !(boardLoading?.id === id)) return carregarQuadro(c).catch(() => null);
      return boardPromises.current[id] || Promise.resolve(S.current.boards[id] || null);
    },
    [carregarQuadro, boardLoading]
  );

  // primeiro quadro após a análise
  useEffect(() => {
    if (conceito && !boards[conceito.id] && !boardLoading && !boardErros[conceito.id]) void carregarQuadro(conceito).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conceito?.id]);

  // ------------------------------------------------------------------ perguntas e atalhos
  const perguntar = useCallback(
    async (acao: string, pergunta?: string) => {
      const c = S.current.conceito;
      if (!c) return;
      const epoch = epochRef.current;
      const rotulo = ATALHOS.find((a) => a.acao === acao)?.rotulo;
      const msgAluno: Mensagem = { id: mid(), papel: 'aluno', texto: pergunta || rotulo || acao, conceitoId: c.id, acao };
      const historico = S.current.mensagens.filter((m) => !m.erro).map((m) => ({ papel: m.papel, texto: `${m.conceitoId !== c.id ? `[sobre outro conceito] ` : ''}${m.texto}` }));
      setMensagens((ms) => [...ms, msgAluno]);
      setPerguntando(true);
      const atual = S.current.boards[c.id];
      try {
        if (atual) setBoardLoading(null);
        const r = await withDoc((docId) =>
          postJson<{ resposta: string; board?: BoardState['board']; revisao?: BoardState['revisao']; boardErro?: ApiErro; destacar?: string[]; modelo: string }>('/api/ask', {
            docId,
            conceito: c,
            acao,
            pergunta,
            historico,
            nivel: S.current.nivel,
            quadroAtual: atual ? describeBoard(atual.board) : '',
          })
        );
        if (epoch !== epochRef.current) return;
        let atualizado = false;
        if (r.board && r.revisao) {
          setBoards((b) => ({ ...b, [c.id]: { board: r.board!, revisao: r.revisao!, origem: rotulo || 'pergunta' } }));
          setHighlights([]);
          atualizado = true;
        } else if (r.destacar?.length && atual) {
          const existentes = new Set(listElements(atual.board).map((e) => e.id));
          setHighlights(r.destacar.filter((id) => existentes.has(id)));
        }
        const texto = r.resposta + (r.boardErro ? `\n(Não foi possível atualizar o quadro: ${r.boardErro.mensagem})` : '');
        setMensagens((ms) => [...ms, { id: mid(), papel: 'tutor', texto, conceitoId: c.id, acao, quadroAtualizado: atualizado }]);
      } catch (e) {
        if (epoch === epochRef.current) setMensagens((ms) => [...ms, { id: mid(), papel: 'tutor', texto: '', conceitoId: c.id, erro: toErro(e) }]);
      } finally {
        if (epoch === epochRef.current) setPerguntando(false);
      }
    },
    [withDoc]
  );

  // ------------------------------------------------------------------ infográfico
  const liveRef = useRef<LiveTutor | null>(null);
  const infoRef = useRef<InfoState | null>(null);
  infoRef.current = info;

  const avisarTutor = (texto: string) => {
    const lt = liveRef.current;
    if (lt?.ativo) lt.sendText(`[Aplicativo] ${texto}`);
  };

  const gerarImagem = async (direcao: Direcao, epoch: number, base: InfoState) => {
    setInfo({ ...base, direcao, fase: 'imagem', erro: undefined, etapaErro: undefined });
    try {
      const img = await postJson<ImagemGerada>('/api/infographic/generate', { direcao });
      if (epoch !== epochRef.current) return;
      const st: InfoState = { ...base, direcao, fase: 'pronto', versoes: [img], atual: 0, erro: undefined, etapaErro: undefined, revisao: undefined };
      setInfo(st);
      // Contexto visual para o tutor
      const lt = liveRef.current;
      if (lt?.ativo) {
        try {
          const jpeg = await toJpegBase64(`data:${img.mimeType};base64,${img.data}`);
          lt.sendImage(jpeg);
        } catch {
          /* segue só com o texto */
        }
        avisarTutor(
          `O infográfico "${direcao.titulo}" ficou pronto e já está na tela; a imagem acabou de ser enviada para você. Avise o aluno em uma frase curta.`
        );
      }
    } catch (e) {
      if (epoch !== epochRef.current) return;
      const erro = toErro(e);
      setInfo({ ...base, direcao, fase: 'erro', erro, etapaErro: 'imagem' });
      avisarTutor(`A geração do infográfico falhou: ${erro.mensagem}. Explique ao aluno, em uma frase, que não deu certo e que ele pode tentar de novo.`);
    }
  };

  const criarInfografico = useCallback(
    async (duvida: string, origem: 'botao' | 'voz') => {
      const c = S.current.conceito;
      if (!c) return { ok: false, erro: 'Nenhum conceito selecionado.' };
      if (infoRef.current && ['direcao', 'imagem', 'corrigindo'].includes(infoRef.current.fase)) return { ok: false, erro: 'Já existe um infográfico sendo gerado.' };
      const epoch = epochRef.current;
      const base: InfoState = { fase: 'direcao', conceitoNome: c.nome, duvida, origem, versoes: [], atual: 0 };
      setInfo(base);
      setTimeout(() => document.querySelector('.infographic')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      try {
        const atual = S.current.boards[c.id];
        const r = await withDoc((docId) =>
          postJson<{ direcao: Direcao }>('/api/infographic/direction', { docId, conceito: c, duvida, quadroAtual: atual ? describeBoard(atual.board) : '' })
        );
        if (epoch !== epochRef.current) return { ok: false };
        await gerarImagem(r.direcao, epoch, base);
      } catch (e) {
        if (epoch !== epochRef.current) return { ok: false };
        const erro = toErro(e);
        setInfo({ ...base, fase: 'erro', erro, etapaErro: 'direcao' });
        avisarTutor(`A preparação do infográfico falhou: ${erro.mensagem}.`);
      }
      return { ok: true };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [withDoc]
  );

  const infoRetry = () => {
    const st = infoRef.current;
    if (!st) return;
    if (st.etapaErro === 'imagem' && st.direcao) void gerarImagem(st.direcao, epochRef.current, { ...st, versoes: [], atual: 0 });
    else if (st.etapaErro === 'correcao' && ultimaCorrecao.current) void infoCorrigir(ultimaCorrecao.current);
    else void criarInfografico(st.duvida, st.origem);
  };

  const ultimaCorrecao = useRef('');
  const infoCorrigir = async (instrucao: string) => {
    const st = infoRef.current;
    if (!st || !st.versoes[st.atual]) return;
    ultimaCorrecao.current = instrucao;
    const epoch = epochRef.current;
    setInfo({ ...st, fase: 'corrigindo', erro: undefined, etapaErro: undefined });
    try {
      const img = await postJson<ImagemGerada>('/api/infographic/edit', { imagem: st.versoes[st.atual], instrucao, direcao: st.direcao });
      if (epoch !== epochRef.current) return;
      const versoes = [...st.versoes, img];
      setInfo({ ...st, fase: 'pronto', versoes, atual: versoes.length - 1, revisao: undefined });
      const lt = liveRef.current;
      if (lt?.ativo) {
        try {
          lt.sendImage(await toJpegBase64(`data:${img.mimeType};base64,${img.data}`));
        } catch {
          /* ignore */
        }
        avisarTutor(`O infográfico foi corrigido conforme o pedido do aluno ("${instrucao}") e a nova versão está na tela e foi enviada para você.`);
      }
    } catch (e) {
      if (epoch === epochRef.current) setInfo({ ...st, fase: 'erro', erro: toErro(e), etapaErro: 'correcao' });
    }
  };

  const infoRevisar = async () => {
    const st = infoRef.current;
    const c = S.current.conceito;
    if (!st || !c || !st.versoes[st.atual]) return;
    setInfo({ ...st, revisao: { carregando: true } });
    try {
      const r = await withDoc((docId) =>
        postJson<{ observacoes: ObservacaoRevisao[]; resumo: string }>('/api/infographic/review', {
          docId,
          conceito: analise?.conceitos.find((k) => k.nome === st.conceitoNome) || c,
          direcao: st.direcao,
          imagem: st.versoes[st.atual],
        })
      );
      setInfo((cur) => (cur ? { ...cur, revisao: { carregando: false, observacoes: r.observacoes, resumo: r.resumo } } : cur));
    } catch (e) {
      setInfo((cur) => (cur ? { ...cur, revisao: { carregando: false, erro: toErro(e) } } : cur));
    }
  };

  // ------------------------------------------------------------------ tutor por voz
  const ctxTutor = () =>
    buildSystemInstruction({
      analise: S.current.analise,
      conceito: S.current.conceito,
      boardState: S.current.boardState,
      highlights: S.current.highlights,
      mensagens: S.current.mensagens,
      nivel: S.current.nivel,
      modo: IS_ARTIFACT ? 'texto' : 'voz',
      infografico:
        S.current.info?.fase === 'pronto' && S.current.info.direcao
          ? `"${S.current.info.direcao.titulo}" — ${S.current.info.direcao.ilustracaoPrincipal} Legendas: ${S.current.info.direcao.legendas.join(', ')}. Conclusão: ${S.current.info.direcao.conclusao}`
          : S.current.info && ['direcao', 'imagem', 'corrigindo'].includes(S.current.info.fase)
          ? 'Um infográfico está sendo gerado agora (ainda não está pronto).'
          : '',
    });

  const onToolCall = async (name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const cur = S.current;
    switch (name) {
      case 'mostrar_conceito': {
        const id = String(args.conceito_id || '');
        const c = cur.analise?.conceitos.find((k) => k.id === id || k.nome.toLowerCase() === id.toLowerCase());
        if (!c) return { ok: false, erro: `Conceito "${id}" não existe. Ids válidos: ${cur.analise?.conceitos.map((k) => k.id).join(', ')}` };
        const p = selecionar(c.id);
        const st = await Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), 60000))]);
        return st
          ? { ok: true, conceito: c.nome, quadro: describeBoard(st.board) }
          : { ok: true, conceito: c.nome, quadro: 'O conceito foi selecionado, mas o quadro ainda não ficou pronto (ou falhou).' };
      }
      case 'destacar_no_quadro': {
        const ids = (Array.isArray(args.ids) ? args.ids : [args.ids]).map(String);
        if (!cur.boardState) return { ok: false, erro: 'O quadro ainda não está pronto.' };
        const existentes = new Set(listElements(cur.boardState.board).map((e) => e.id));
        const ok = ids.filter((i) => existentes.has(i));
        const nao = ids.filter((i) => !existentes.has(i));
        if (!ok.length) return { ok: false, erro: 'Nenhum desses elementos existe no quadro atual.', idsValidos: [...existentes] };
        setHighlights(ok);
        return { ok: true, destacados: ok, naoEncontrados: nao };
      }
      case 'atualizar_quadro': {
        if (!cur.conceito) return { ok: false, erro: 'Nenhum conceito selecionado.' };
        try {
          const st = await carregarQuadro(cur.conceito, String(args.pedido || ''), 'tutor por voz');
          if (!st) return { ok: false, erro: 'O material foi trocado.' };
          return { ok: true, quadro: describeBoard(st.board), revisao: st.revisao.status };
        } catch (e) {
          return { ok: false, erro: toErro(e).mensagem };
        }
      }
      case 'criar_infografico': {
        if (!cur.conceito) return { ok: false, erro: 'Nenhum conceito selecionado.' };
        if (cur.info && ['direcao', 'imagem', 'corrigindo'].includes(cur.info.fase)) return { ok: false, erro: 'Já há um infográfico sendo gerado.' };
        void criarInfografico(String(args.duvida || cur.conceito.perguntaCentral), 'voz');
        return { ok: true, status: 'iniciado', aviso: 'A geração começou e leva até um minuto. A imagem AINDA NÃO está pronta; o aplicativo vai avisar quando terminar ou se falhar.' };
      }
      case 'abrir_agora_eu_explico': {
        if (!cur.conceito) return { ok: false, erro: 'Nenhum conceito selecionado.' };
        setExplicarAberto(true);
        return { ok: true, aberto: true, conceito: cur.conceito.nome };
      }
      default:
        return { ok: false, erro: `Ferramenta desconhecida: ${name}` };
    }
  };
  const toolRef = useRef(onToolCall);
  toolRef.current = onToolCall;

  const getLive = () => {
    if (!liveRef.current)
      liveRef.current = new LiveTutor({
        systemInstruction: () => ctxTutor(),
        tools: TUTOR_TOOLS,
        onToolCall: (n, a) => toolRef.current(n, a),
        onChange: setLiveSnap,
      });
    return liveRef.current;
  };

  // Atualiza o contexto do tutor quando o conceito, o quadro ou as ações mudam
  const boardKey = boardState ? `${boardState.board.titulo}|${boardState.origem}|${boardState.board.explicacao.length}` : '';
  useEffect(() => {
    const lt = liveRef.current;
    if (!lt?.ativo) return;
    lt.updateContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conceitoId, boardKey, highlights.join(','), mensagens.length, nivel, info?.fase, liveSnap.status === 'ouvindo' || liveSnap.status === 'respondendo']);

  // Envia a imagem do quadro ao tutor quando o desenho muda
  useEffect(() => {
    const lt = liveRef.current;
    if (!lt?.ativo || !boardState || !SVG_KINDS.includes(boardState.board.tipo)) return;
    const svg = renderBoardSvg(boardState.board, { standalone: true });
    toJpegBase64(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, 1000, '#2f5d46')
      .then((b64) => lt.sendImage(b64))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardKey, liveSnap.status === 'ouvindo' || liveSnap.status === 'respondendo']);

  const chatRef = useRef<TutorChatHandle>(null);
  const perguntarSobreInfografico = async () => {
    const st = infoRef.current;
    const img = st?.versoes[st.atual];
    if (!img) return;
    if (IS_ARTIFACT) {
      const { svgParaPng } = await import('./artifact/backend');
      const svg = decodeURIComponent(escape(atob(img.data)));
      const png = await svgParaPng(svg, 1600, '#ffffff');
      chatRef.current?.perguntar(
        `Quero perguntar sobre o infográfico "${st.direcao?.titulo || st.conceitoNome}" que está na tela${png ? ' (a imagem está anexada)' : ''}. O que ele mostra?`,
        png ? [png] : []
      );
      return;
    }
    const lt = getLive();
    if (!lt.ativo) await lt.start();
    // espera a sessão ficar pronta
    for (let i = 0; i < 40 && !lt.ativo && lt.snapshot.status === 'conectando'; i++) await new Promise((r) => setTimeout(r, 250));
    if (!lt.ativo) return;
    try {
      lt.sendImage(await toJpegBase64(`data:${img.mimeType};base64,${img.data}`));
    } catch {
      /* ignore */
    }
    lt.sendText('[Aplicativo] O aluno clicou em "Perguntar ao tutor sobre este infográfico". A imagem do infográfico foi enviada agora. Descreva em uma frase o que ela mostra e pergunte o que ele quer saber.');
  };

  // ------------------------------------------------------------------ troca de material
  const trocarMaterial = () => {
    epochRef.current++;
    liveRef.current?.end('Material trocado: a conversa foi encerrada para não misturar os materiais.');
    liveRef.current = null;
    setLiveSnap((s) => ({ ...s, status: 'desconectado', transcript: [], modelo: '', erro: '' }));
    setMaterial(null);
    setAnalise(null);
    setConceitoId('');
    setBoards({});
    setBoardErros({});
    setBoardLoading(null);
    setHighlights([]);
    setMensagens([]);
    setPerguntando(false);
    setInfo(null);
    setExplicarAberto(false);
    setOriginal(null);
    boardPromises.current = {};
    docIdRef.current = '';
    pdfRef.current = null;
    window.scrollTo({ top: 0 });
  };

  // "Agora eu explico" e o tutor: silencia o microfone do Live durante a gravação
  const mutadoAntes = useRef<boolean | null>(null);
  useEffect(() => {
    const lt = liveRef.current;
    if (!lt) return;
    if (explicarAberto && lt.ativo) {
      mutadoAntes.current = lt.snapshot.muted;
      lt.setMuted(true);
    } else if (!explicarAberto && mutadoAntes.current !== null) {
      lt.setMuted(mutadoAntes.current);
      mutadoAntes.current = null;
    }
  }, [explicarAberto]);

  // ------------------------------------------------------------------ render
  if (!material || !analise) {
    return (
      <>
        <StartScreen carregando={carregando} erro={erroInicio} onStart={comecar} onRetry={() => ultimoMaterial.current && comecar(ultimoMaterial.current)} />
      </>
    );
  }

  // A dúvida mais recente do aluno sobre o conceito orienta o infográfico
  const duvidaAtual = (c: Conceito) => {
    const ult = [...mensagens].reverse().find((m) => m.papel === 'aluno' && m.conceitoId === c.id && m.acao !== 'agora_eu_explico');
    if (!ult) return c.perguntaCentral;
    return ult.acao === 'pergunta' ? ult.texto : `${ult.texto} (sobre: ${c.perguntaCentral})`;
  };
  const conceitoNome = (id: string) => analise.conceitos.find((c) => c.id === id)?.nome || id;
  const infoOcupado = !!info && ['direcao', 'imagem', 'corrigindo'].includes(info.fase);

  return (
    <div className="app">
      <header className="topbar">
        <h1>Minha sala de aula</h1>
        <span className="topbar-material">
          {material.exemplo && <span className="badge-sample">Exemplo</span>} {analise.titulo}
        </span>
        {podeSair && (
          <button className="btn btn-link" onClick={sair}>
            Sair
          </button>
        )}
      </header>
      <main className="classroom">
        <div className="main-col">
          <BoardView
            state={boardState}
            loading={boardLoading && boardLoading.id === conceitoId ? boardLoading.msg : null}
            erro={conceito ? boardErros[conceito.id] || null : null}
            highlights={highlights}
            temPaginas={analise.temPaginas}
            onRetry={() => conceito && carregarQuadro(conceito).catch(() => {})}
            onShowPage={(p) => setOriginal({ pagina: p })}
            onShowTempo={analise.temTempo ? (t) => setOriginal({ tempo: segundosDe(t) ?? 0 }) : undefined}
          />
          <AskBar conceito={conceito} mensagens={mensagens} ocupado={perguntando} conceitoNome={conceitoNome} onAsk={perguntar} />
          {info && (
            <InfographicPanel
              st={info}
              liveAtivo={liveRef.current?.ativo || false}
              onRetry={infoRetry}
              onCorrigir={infoCorrigir}
              onRevisar={infoRevisar}
              onPerguntarTutor={perguntarSobreInfografico}
              onFechar={() => setInfo(null)}
            />
          )}
        </div>
        <Notebook
          analise={analise}
          material={material}
          conceitoId={conceitoId}
          nivel={nivel}
          onNivel={setNivel}
          onSelect={(id) => void selecionar(id)}
          onVerOriginal={() => setOriginal({})}
          onTrocar={trocarMaterial}
          onExplicar={() => setExplicarAberto(true)}
          onInfografico={() => conceito && criarInfografico(duvidaAtual(conceito), 'botao')}
          infograficoOcupado={infoOcupado}
        />
      </main>

      {IS_ARTIFACT ? (
        <TutorChat ref={chatRef} contexto={ctxTutor} ferramentas={TUTOR_TOOLS} onToolCall={(n, a) => toolRef.current(n, a)} />
      ) : (
      <TutorDock
        snap={liveSnap}
        onStart={() => void getLive().start()}
        onEnd={() => liveRef.current?.end()}
        onMute={(m) => liveRef.current?.setMuted(m)}
        onRetry={() => void getLive().retry()}
      />
      )}

      {explicarAberto && conceito && (
        <ExplainModal
          conceito={conceito}
          withDoc={withDoc}
          onClose={() => setExplicarAberto(false)}
          onBeforeRecord={() => liveRef.current?.silenceOutput()}
          onResultado={(resumo) => setMensagens((ms) => [...ms, { id: mid(), papel: 'aluno', texto: resumo, conceitoId: conceito.id, acao: 'agora_eu_explico' }])}
        />
      )}
      {original && (
        <OriginalViewer
          material={material}
          analise={analise}
          pdf={pdfRef.current}
          paginaInicial={original.pagina}
          tempoInicial={original.tempo}
          temposConceito={conceito?.tempos || []}
          destacarPaginas={conceito?.paginas || []}
          onClose={() => setOriginal(null)}
        />
      )}
    </div>
  );
}
