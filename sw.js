const CACHE = 'meus-treinos-v3';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './imagens/favicon.ico',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Estratégia "network-first" para HTML/CSS/JS: sempre tenta buscar a
   versão mais nova na rede primeiro, e só usa o cache como reserva se
   estiver offline. Isso evita que o app fique "preso" numa versão
   antiga depois de um deploy — o problema que causava o site não
   atualizar sozinho em alguns celulares (ex.: iPhone com o app
   instalado na tela de início). Imagens e fontes continuam cache-first
   (mudam raramente, prioriza velocidade). */
const NETWORK_FIRST_EXT = ['.html', '.css', '.js'];

self.addEventListener('fetch', e => {
  const url = e.request.url;
  const isNetworkFirst = e.request.mode === 'navigate' ||
    NETWORK_FIRST_EXT.some(ext => url.endsWith(ext)) ||
    url.endsWith('/');

  if (isNetworkFirst) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});