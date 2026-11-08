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

/** Versão publicada como artefato do Claude: sem servidor, usa o Claude da conta de quem abre. */
export const IS_ARTIFACT = import.meta.env.VITE_ARTIFACT === '1';

async function requisicao<T>(url: string, init: RequestInit = {}): Promise<T> {
  if (IS_ARTIFACT) {
    const { handle } = await import('./artifact/backend');
    try {
      return (await handle(url, init)) as T;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError({ tipo: 'desconhecido', mensagem: e instanceof Error ? e.message : String(e) }, 500);
    }
  }
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
  return requisicao<T>(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data), signal });
}
export function postForm<T>(url: string, form: FormData) {
  return requisicao<T>(url, { method: 'POST', body: form });
}
export function getJson<T>(url: string) {
  return requisicao<T>(url);
}

export function toErro(e: unknown): ApiErro {
  if (e instanceof ApiError) return e.erro;
  return { tipo: 'desconhecido', mensagem: e instanceof Error ? e.message : String(e) };
}

/** PUT, PATCH ou DELETE com corpo JSON. */
export function request<T = unknown>(url: string, method: 'PUT' | 'PATCH' | 'DELETE', data?: unknown) {
  return requisicao<T>(url, { method, headers: { 'content-type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) });
}
