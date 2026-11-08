// Sessão real com a API Live do Gemini (áudio de entrada e de saída).
// A chave da API fica no servidor; aqui usamos um token temporário de uso único.
import { GoogleGenAI, Modality, type LiveServerMessage, type Session, type FunctionDeclaration } from '@google/genai';
import { postJson, toErro } from '../api';
import { MicCapture, PcmPlayer } from './audio';

export type LiveStatus = 'desconectado' | 'conectando' | 'ouvindo' | 'respondendo' | 'erro';

export interface TranscriptEntry {
  id: string;
  papel: 'aluno' | 'tutor' | 'sistema';
  texto: string;
}

export interface LiveSnapshot {
  status: LiveStatus;
  muted: boolean;
  erro: string;
  dica: string;
  modelo: string;
  transcript: TranscriptEntry[];
  ferramenta: string; // ação em execução, se houver
  nivelMic: number;
}

interface Options {
  systemInstruction: () => string;
  tools: FunctionDeclaration[];
  onToolCall: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  onChange: (s: LiveSnapshot) => void;
}

const NOMES_FERRAMENTAS: Record<string, string> = {
  mostrar_conceito: 'trocando de conceito',
  destacar_no_quadro: 'destacando no quadro',
  atualizar_quadro: 'atualizando o quadro',
  criar_infografico: 'pedindo o infográfico',
  abrir_agora_eu_explico: 'abrindo “Agora eu explico”',
};

let uid = 0;
const nextId = () => `t${Date.now()}_${uid++}`;

function motivoAmigavel(reason: string, code: number): { erro: string; dica: string } {
  const r = (reason || '').toLowerCase();
  if (r.includes('quota') || r.includes('exhausted')) return { erro: 'A cota de uso da API Live foi atingida.', dica: 'Espere alguns minutos ou confira os limites do projeto no Google AI Studio.' };
  if (r.includes('billing')) return { erro: 'A API Live exige faturamento ativado neste projeto.', dica: 'Ative o faturamento no projeto da chave (Google AI Studio → Billing).' };
  if (r.includes('not found') || r.includes('not supported')) return { erro: 'O modelo Live configurado não está disponível.', dica: 'Defina GEMINI_LIVE_MODEL no .env com um modelo Live disponível para sua chave.' };
  if (r.includes('permission') || r.includes('api key') || r.includes('unauthenticated') || r.includes('token'))
    return { erro: 'O acesso à API Live foi recusado.', dica: 'Confira a chave no servidor e tente novamente.' };
  if (code === 1006) return { erro: 'A conexão com o tutor caiu.', dica: 'Confira a internet e clique em “Tentar novamente”.' };
  return { erro: `A sessão do tutor foi encerrada${reason ? `: ${reason}` : ''}.`, dica: 'Clique em “Tentar novamente”.' };
}

export class LiveTutor {
  private opts: Options;
  private session: Session | null = null;
  private mic: MicCapture | null = null;
  private player: PcmPlayer | null = null;
  private resumeHandle = '';
  private closingOnPurpose = false;
  private reconnecting = false;
  private turnOpen = false;
  private curTutor: TranscriptEntry | null = null;
  private curAluno: TranscriptEntry | null = null;
  private cancelled = new Set<string>();
  private sentStreamEnd = false;
  private usaContextUpdate = true;
  private s: LiveSnapshot = { status: 'desconectado', muted: false, erro: '', dica: '', modelo: '', transcript: [], ferramenta: '', nivelMic: 0 };

  constructor(opts: Options) {
    this.opts = opts;
  }

  get snapshot() {
    return this.s;
  }
  get ativo() {
    return this.s.status === 'ouvindo' || this.s.status === 'respondendo';
  }

  private set(p: Partial<LiveSnapshot>) {
    this.s = { ...this.s, ...p };
    this.opts.onChange(this.s);
  }
  private addEntry(papel: TranscriptEntry['papel'], texto: string) {
    const e = { id: nextId(), papel, texto };
    this.set({ transcript: [...this.s.transcript, e].slice(-200) });
    return e;
  }
  private appendTo(entry: TranscriptEntry, texto: string) {
    entry.texto += texto;
    this.set({ transcript: this.s.transcript.map((t) => (t.id === entry.id ? { ...entry } : t)) });
  }

  /** Deve ser chamado diretamente no clique do botão (libera o áudio do navegador). */
  async start() {
    if (this.s.status === 'conectando' || this.ativo) return;
    // 1) Reprodução: criar/retomar o AudioContext ainda dentro do gesto do usuário
    if (!this.player) {
      this.player = new PcmPlayer();
      this.player.onStart = () => this.set({ status: 'respondendo' });
      this.player.onIdle = () => {
        if (this.session && !this.turnOpen && this.s.status === 'respondendo') this.set({ status: 'ouvindo' });
      };
    }
    const resumed = this.player.resume();
    const novaCaptura = !this.mic;
    if (novaCaptura) {
      this.mic = new MicCapture();
      this.mic.onChunk = (b64, level) => this.onMicChunk(b64, level);
    }
    this.set({ status: 'conectando', erro: '', dica: '' });
    try {
      await resumed;
      // 2) Microfone (o navegador pede permissão aqui)
      if (novaCaptura && this.mic) {
        try {
          await this.mic.start();
        } catch (e) {
          this.mic.stop();
          this.mic = null;
          const name = (e as DOMException)?.name;
          throw new Error(
            name === 'NotAllowedError'
              ? 'Permissão do microfone negada. Libere o microfone no ícone do cadeado da barra de endereço e tente de novo.'
              : name === 'NotFoundError'
              ? 'Nenhum microfone foi encontrado neste aparelho.'
              : `Não foi possível usar o microfone (${name || e}).`
          );
        }
      }
      await this.connect();
    } catch (e) {
      const err = toErro(e);
      const fech = /closed before setup completed \(code (\d+)\):?\s*(.*)/i.exec(err.mensagem);
      if (fech) {
        const { erro, dica } = motivoAmigavel(fech[2], Number(fech[1]));
        this.set({ status: 'erro', erro, dica: `${dica} (código ${fech[1]}: ${fech[2].slice(0, 160)})` });
      } else this.set({ status: 'erro', erro: err.mensagem, dica: err.comoResolver || '' });
      this.cleanupSession();
    }
  }

  private async connect() {
    const { token, modelo, testBaseUrl } = await postJson<{ token: string; modelo: string; testBaseUrl?: string }>('/api/live/token', {});
    this.usaContextUpdate = !/(^|-)2\.[05]-|live-2\.5|2\.0-flash-live/.test(modelo);
    const client = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha', ...(testBaseUrl ? { baseUrl: testBaseUrl } : {}) } });
    this.closingOnPurpose = false;
    this.turnOpen = false;
    const session = await client.live.connect({
      model: modelo,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: this.opts.systemInstruction(),
        tools: [{ functionDeclarations: this.opts.tools }],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        contextWindowCompression: { slidingWindow: {} },
        sessionResumption: this.resumeHandle ? { handle: this.resumeHandle } : {},
      },
      callbacks: {
        onopen: () => {},
        onmessage: (m: LiveServerMessage) => this.onMessage(m),
        onerror: (e: ErrorEvent) => console.warn('Live: erro', e?.message),
        onclose: (e: CloseEvent) => this.onClose(e),
      },
    });
    this.session = session;
    this.set({ modelo });
  }

  private onMicChunk(b64: string, level: number) {
    this.s.nivelMic = level; // sem re-render a cada pedaço
    if (!this.session || this.s.muted || !this.ativo) return;
    try {
      this.session.sendRealtimeInput({ audio: { data: b64, mimeType: 'audio/pcm;rate=16000' } });
      this.sentStreamEnd = false;
    } catch {
      /* sessão fechando */
    }
  }

  private onMessage(m: LiveServerMessage) {
    if (m.setupComplete) {
      const primeira = !this.s.transcript.some((t) => t.papel === 'tutor');
      this.set({ status: 'ouvindo' });
      if (primeira) this.sendText('[Aplicativo] O aluno acabou de abrir a conversa por voz. Cumprimente-o em uma frase curta e pergunte o que ele quer entender sobre o conceito atual.');
      else if (!this.reconnecting) this.addEntry('sistema', 'Conversa retomada.');
      this.reconnecting = false;
    }
    if (m.sessionResumptionUpdate?.resumable && m.sessionResumptionUpdate.newHandle) this.resumeHandle = m.sessionResumptionUpdate.newHandle;
    if (m.goAway) {
      // O servidor vai encerrar em breve: reconecta mantendo a conversa
      this.reconnect();
      return;
    }
    const sc = m.serverContent;
    if (sc) {
      if (sc.interrupted) {
        this.player?.stopAll();
        this.curTutor = null;
        this.turnOpen = false;
        this.set({ status: 'ouvindo' });
      }
      if (sc.inputTranscription?.text) {
        if (this.curTutor) this.curTutor = null;
        if (!this.curAluno) this.curAluno = this.addEntry('aluno', '');
        this.appendTo(this.curAluno, sc.inputTranscription.text);
      }
      for (const p of sc.modelTurn?.parts || []) {
        const d = p.inlineData;
        if (d?.data && d.mimeType?.startsWith('audio/')) {
          this.turnOpen = true;
          const rate = Number(/rate=(\d+)/.exec(d.mimeType)?.[1]) || 24000;
          this.player?.play(d.data, rate);
        }
      }
      if (sc.outputTranscription?.text) {
        this.curAluno = null;
        if (!this.curTutor) this.curTutor = this.addEntry('tutor', '');
        this.appendTo(this.curTutor, sc.outputTranscription.text);
      }
      if (sc.turnComplete || sc.generationComplete) {
        this.turnOpen = false;
        if (sc.turnComplete) {
          this.curTutor = null;
          this.curAluno = null;
        }
        if (!this.player?.playing && this.s.status === 'respondendo') this.set({ status: 'ouvindo' });
      }
    }
    if (m.toolCallCancellation?.ids) for (const id of m.toolCallCancellation.ids) this.cancelled.add(id);
    if (m.toolCall?.functionCalls?.length) {
      for (const fc of m.toolCall.functionCalls) void this.runTool(fc.id || '', fc.name || '', (fc.args || {}) as Record<string, unknown>);
    }
  }

  private async runTool(id: string, name: string, args: Record<string, unknown>) {
    this.set({ ferramenta: NOMES_FERRAMENTAS[name] || name });
    let response: Record<string, unknown>;
    try {
      response = await this.opts.onToolCall(name, args);
    } catch (e) {
      response = { ok: false, erro: toErro(e).mensagem };
    }
    this.set({ ferramenta: '' });
    this.addEntry('sistema', `Ação “${NOMES_FERRAMENTAS[name] || name}”: ${response.ok ? 'feita' : `não realizada (${response.erro || 'erro'})`}.`);
    if (this.cancelled.has(id) || !this.session) return;
    try {
      this.session.sendToolResponse({ functionResponses: [{ id, name, response }] });
    } catch {
      /* sessão encerrada */
    }
  }

  private onClose(e: CloseEvent) {
    this.session = null;
    this.player?.stopAll();
    if (this.closingOnPurpose || this.reconnecting) return;
    const { erro, dica } = motivoAmigavel(e.reason, e.code);
    this.set({ status: 'erro', erro, dica });
  }

  private async reconnect() {
    if (this.reconnecting) return;
    this.reconnecting = true;
    this.closingOnPurpose = true;
    try {
      this.session?.close();
    } catch {
      /* já fechada */
    }
    this.session = null;
    this.set({ status: 'conectando' });
    try {
      await this.connect();
    } catch (e) {
      this.reconnecting = false;
      const err = toErro(e);
      this.set({ status: 'erro', erro: err.mensagem, dica: err.comoResolver || '' });
    }
  }

  /** Mensagem de texto (como fala do aluno/aplicativo) que gera resposta. */
  sendText(text: string) {
    if (!this.session) return false;
    try {
      this.session.sendRealtimeInput({ text });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Atualiza o que o tutor sabe (conceito, quadro, ações do aluno) sem pedir resposta.
   */
  updateContext() {
    if (!this.session || !this.ativo) return false;
    const instr = this.opts.systemInstruction();
    try {
      if (this.usaContextUpdate && typeof (this.session as any).sendContextUpdate === 'function') {
        (this.session as any).sendContextUpdate({ systemInstruction: instr });
      } else {
        this.session.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: `[Atualização do aplicativo — não responda a esta mensagem; use-a como contexto]\n${instr}` }] }],
          turnComplete: false,
        });
      }
      return true;
    } catch (e) {
      console.warn('Live: falha ao atualizar o contexto', e);
      return false;
    }
  }

  /** Envia uma imagem (ex.: quadro ou infográfico) como contexto visual. */
  sendImage(jpegBase64: string) {
    if (!this.session || !this.ativo) return false;
    try {
      this.session.sendRealtimeInput({ video: { data: jpegBase64, mimeType: 'image/jpeg' } });
      return true;
    } catch {
      return false;
    }
  }

  setMuted(muted: boolean) {
    this.set({ muted });
    if (muted && this.session && !this.sentStreamEnd) {
      try {
        this.session.sendRealtimeInput({ audioStreamEnd: true });
        this.sentStreamEnd = true;
      } catch {
        /* ignore */
      }
    }
  }

  /** Para o áudio do tutor imediatamente (ex.: antes de outra fonte de som). */
  silenceOutput() {
    this.player?.stopAll();
  }

  async retry() {
    this.cleanupSession();
    this.set({ status: 'desconectado', erro: '', dica: '' });
    await this.start();
  }

  private cleanupSession() {
    this.closingOnPurpose = true;
    try {
      this.session?.close();
    } catch {
      /* ignore */
    }
    this.session = null;
  }

  end(motivo = 'Conversa encerrada.') {
    this.cleanupSession();
    this.mic?.stop();
    this.mic = null;
    this.player?.close();
    this.player = null;
    this.resumeHandle = '';
    this.curAluno = this.curTutor = null;
    if (this.s.transcript.length) this.addEntry('sistema', motivo);
    this.set({ status: 'desconectado', muted: false, ferramenta: '' });
  }

  clearTranscript() {
    this.set({ transcript: [] });
  }
}
