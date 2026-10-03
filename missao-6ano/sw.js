// Service worker: (1) deixa o aplicativo funcionar offline (cache de tudo que é estático, rede primeiro);
// (2) recebe o “Compartilhar” do Android (WhatsApp → Missão 6º Ano) e guarda o conteúdo para a tela Receber tarefa.
const VERSAO = 'missao6-v3';
const NUCLEO = ['./', 'index.html', 'css/styles.css', 'manifest.webmanifest', 'assets/icon.svg', 'assets/icon-maskable.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(NUCLEO)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

function abrirDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('missao6-anexos', 2);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('anexos')) db.createObjectStore('anexos', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('compartilhado')) db.createObjectStore('compartilhado', { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function receberCompartilhado(req) {
  try {
    const fd = await req.formData();
    const arquivos = [];
    for (const f of fd.getAll('arquivos')) if (f && typeof f === 'object' && 'size' in f) arquivos.push({ name: f.name, type: f.type, blob: f });
    const db = await abrirDb();
    await new Promise((res, rej) => {
      const tx = db.transaction('compartilhado', 'readwrite');
      tx.objectStore('compartilhado').put({ id: 'ultimo', titulo: fd.get('title') || '', texto: fd.get('text') || '', url: fd.get('url') || '', arquivos, em: Date.now() });
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
  } catch { /* se falhar, abre a tela mesmo assim */ }
  return Response.redirect(new URL('./index.html#/pai/receber?compartilhado=1', self.registration.scope).href, 303);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method === 'POST' && url.origin === location.origin && url.pathname.endsWith('/share-target')) { e.respondWith(receberCompartilhado(req)); return; }
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && res.status === 200) { const copia = res.clone(); caches.open(VERSAO).then((c) => c.put(req, copia)); }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('index.html'))),
  );
});
