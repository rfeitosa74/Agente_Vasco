// Projeto Supabase usado na sincronização. A chave "publishable" é PÚBLICA por desenho: sozinha só consegue chamar
// as funções get_estado/set_estado, que exigem o código secreto da família (160 bits). A tabela não tem acesso direto.
export const SYNC_URL = 'https://hydagsuqtqhmfakqmxxf.supabase.co';
export const SYNC_KEY = 'sb_publishable_g8f7eIXmbncc1RKScZs-mw_aG_znGFJ';
