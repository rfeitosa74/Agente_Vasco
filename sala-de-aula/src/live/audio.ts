// Captura do microfone (PCM 16 bits, 16 kHz) e reprodução do áudio do tutor (PCM 16 bits, 24 kHz).

const WORKLET = `
class CaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000;
    this.pos = 0;
    this.out = new Int16Array(1600); // 100 ms
    this.n = 0;
    this.level = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    let peak = 0;
    // Reamostragem por média de janela (decimação simples com filtro de caixa)
    while (this.pos < ch.length) {
      const start = Math.floor(this.pos);
      const end = Math.min(ch.length, Math.floor(this.pos + this.ratio));
      let sum = 0, cnt = 0;
      for (let i = start; i < Math.max(end, start + 1); i++) { sum += ch[i]; cnt++; }
      const v = Math.max(-1, Math.min(1, sum / cnt));
      if (Math.abs(v) > peak) peak = Math.abs(v);
      this.out[this.n++] = v < 0 ? v * 0x8000 : v * 0x7fff;
      if (this.n === this.out.length) {
        this.port.postMessage({ pcm: this.out.buffer, level: peak }, [this.out.buffer]);
        this.out = new Int16Array(1600);
        this.n = 0;
        peak = 0;
      }
      this.pos += this.ratio;
    }
    this.pos -= ch.length;
    return true;
  }
}
registerProcessor('capture-processor', CaptureProcessor);
`;

export function bytesToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export class MicCapture {
  private ctx: AudioContext | null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  onChunk: (base64Pcm: string, level: number) => void = () => {};

  constructor() {
    // Criado de forma síncrona, dentro do clique do usuário.
    this.ctx = new AudioContext();
    void this.ctx.resume().catch(() => {});
  }

  async start() {
    if (!this.ctx) throw new Error('captura encerrada');
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
    await this.ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, 'capture-processor');
    this.node.port.onmessage = (ev) => this.onChunk(bytesToBase64(ev.data.pcm), ev.data.level);
    src.connect(this.node);
    // O nó precisa estar ligado a um destino para processar; ganho zero evita eco.
    const mute = this.ctx.createGain();
    mute.gain.value = 0;
    this.node.connect(mute).connect(this.ctx.destination);
  }

  stop() {
    this.node?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close().catch(() => {});
    this.node = null;
    this.stream = null;
    this.ctx = null;
  }
}

export class PcmPlayer {
  private ctx: AudioContext;
  private next = 0;
  private sources = new Set<AudioBufferSourceNode>();
  onIdle: () => void = () => {};
  onStart: () => void = () => {};

  constructor() {
    // Criado dentro do clique do usuário para cumprir as regras de reprodução do navegador.
    this.ctx = new AudioContext({ sampleRate: 24000 });
  }
  async resume() {
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }
  get playing() {
    return this.sources.size > 0;
  }
  play(base64: string, rate = 24000) {
    const bytes = base64ToBytes(base64);
    const samples = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    if (!samples.length) return;
    const buf = this.ctx.createBuffer(1, samples.length, rate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < samples.length; i++) ch[i] = samples[i] / 0x8000;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);
    const now = this.ctx.currentTime;
    if (this.next < now + 0.02) this.next = now + 0.06;
    src.start(this.next);
    this.next += buf.duration;
    const wasIdle = this.sources.size === 0;
    this.sources.add(src);
    if (wasIdle) this.onStart();
    src.onended = () => {
      this.sources.delete(src);
      if (this.sources.size === 0) this.onIdle();
    };
  }
  /** Para imediatamente (quando o aluno interrompe o tutor). */
  stopAll() {
    for (const s of this.sources) {
      try {
        s.onended = null;
        s.stop();
      } catch {
        /* já parado */
      }
    }
    this.sources.clear();
    this.next = 0;
    this.onIdle();
  }
  close() {
    this.stopAll();
    this.ctx.close().catch(() => {});
  }
}

/** Converte uma gravação (webm/ogg/mp4) em WAV mono 16 kHz, formato aceito pelo Gemini. */
export async function blobToWav16k(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const rate = 16000;
    const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start();
    const out = (await off.startRendering()).getChannelData(0);
    const buf = new ArrayBuffer(44 + out.length * 2);
    const v = new DataView(buf);
    const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF');
    v.setUint32(4, 36 + out.length * 2, true);
    str(8, 'WAVE');
    str(12, 'fmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, rate, true);
    v.setUint32(28, rate * 2, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    str(36, 'data');
    v.setUint32(40, out.length * 2, true);
    for (let i = 0; i < out.length; i++) {
      const s = Math.max(-1, Math.min(1, out[i]));
      v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([buf], { type: 'audio/wav' });
  } finally {
    void ctx.close();
  }
}
