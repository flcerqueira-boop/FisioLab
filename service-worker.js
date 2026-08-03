const CACHE_NAME = "fisiolab-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./logo-wordmark.png",
  "./ortoflix-logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        // adiciona cada item individualmente: se um falhar, os outros continuam
        await Promise.all(
          APP_SHELL.map((url) => cache.add(url).catch(() => {}))
        );
      } catch (e) {
        // Ambientes restritos (ex.: Safari em modo privado) podem bloquear a
        // Cache Storage API. Se isso acontecer, o app deve continuar
        // funcionando normalmente, só sem cache offline.
      }
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      } catch (e) {
        // idem: ignora falha de Cache Storage em ambientes restritos
      }
      self.clients.claim();
    })()
  );
});

// Só intercepta requisições do mesmo domínio (o próprio FisioLab). Scripts de
// CDN externos (React, Babel, Tailwind, fontes) passam direto pelo navegador,
// sem passar pelo cache — evita qualquer problema com respostas "opacas" de
// origens cruzadas.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        try {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        } catch (e) {
          // ignora falha ao gravar cache — a resposta de rede já será usada
        }
        return response;
      } catch (e) {
        // rede e cache indisponíveis: deixa o navegador tentar a requisição normalmente
        return fetch(request);
      }
    })()
  );
});
