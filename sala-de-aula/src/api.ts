import type { ApiErro } from './types';

export class ApiError extends Error {
  erro: ApiErro;
  status: number;
  constructor(erro: ApiErro, status: number) {
    super(erro.mensagem);
    this.erro = erro;
    this.status = status;
  }
}

export function getAccessCode() {
  return localStorage.getItem('sala-codigo') || '';
}
export function setAccessCode(c: string) {
  localStorage.setItem('sala-codigo', c);
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const code = getAccessCode();
  if (code) headers.set('x-access-code', code);
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (e) {
    throw new ApiError({ tipo: 'rede', mensagem: 'Não foi possível falar com o servidor da sala de aula.', comoResolver: 'Confira se o servidor (npm run dev) está rodando.', detalhe: String(e) }, 0);
  }
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* sem corpo JSON */
  }
  if (!res.ok) {
    throw new ApiError(body?.erro || { tipo: 'desconhecido', mensagem: `Erro ${res.status} no servidor.` }, res.status);
  }
  return body as T;
}

export function postJson<T>(url: string, data: unknown, signal?: AbortSignal) {
  return request<T>(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data), signal });
}
export function postForm<T>(url: string, form: FormData) {
  return request<T>(url, { method: 'POST', body: form });
}
export function getJson<T>(url: string) {
  return request<T>(url);
}

export function toErro(e: unknown): ApiErro {
  if (e instanceof ApiError) return e.erro;
  return { tipo: 'desconhecido', mensagem: e instanceof Error ? e.message : String(e) };
}
