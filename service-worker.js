const CACHE_NAME = "fisiolab-v3";
const APP_SHELL = [
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./ortoflix-logo.png",
  "./manual-professor.pdf",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
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

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  const isDocument = request.mode === "navigate" || request.destination === "document";

  if (isDocument) {
    // NETWORK-FIRST para o app principal (index.html): sempre busca a versão
    // mais nova quando há internet. Só usa a cópia salva se estiver offline.
    // Isso garante que atualizações cheguem aos alunos que já instalaram o
    // app na tela de início, sem precisar reinstalar nada.
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          try {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
          } catch (e) {}
          return response;
        } catch (e) {
          const cached = await caches.match(request);
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // CACHE-FIRST para os demais arquivos estáticos (ícones, manifest, PDF) —
  // mudam raramente, então prioriza velocidade e uso offline.
  event.respondWith(
    (async () => {
      try {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        try {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        } catch (e) {}
        return response;
      } catch (e) {
        return fetch(request);
      }
    })()
  );
});
