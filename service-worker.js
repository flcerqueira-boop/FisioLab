const CACHE_NAME = "fisiolab-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./ortoflix-logo.png",
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
      }
      self.clients.claim();
    })()
  );
});

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
        }
        return response;
      } catch (e) {
        return fetch(request);
      }
    })()
  );
});
