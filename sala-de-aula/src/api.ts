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

/** Avisado quando o servidor pede login (sessão expirada ou ausente). */
export const EVENTO_LOGIN = 'sala-login-necessario';

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, credentials: 'same-origin' });
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
    if (res.status === 401 && body?.erro?.tipo === 'login') window.dispatchEvent(new Event(EVENTO_LOGIN));
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
