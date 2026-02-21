/* sw.js - decide.engine PWA service worker */

const CACHE_VERSION = "decide-engine-v1";
const APP_SHELL = [
  "/",                 // if your server maps / to index.html
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Install: pre-cache app shell
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
});

// Activate: cleanup old caches
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_VERSION ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
  })());
});

// Allow page to trigger immediate update
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// Fetch: network-first for API, cache-first for static, fallback to index.html for navigations
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // SPA navigation: return cached index.html
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const network = await fetch(req);
        const cache = await caches.open(CACHE_VERSION);
        cache.put("/index.html", network.clone());
        return network;
      } catch {
        const cache = await caches.open(CACHE_VERSION);
        return (await cache.match("/index.html")) || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }

  // Static assets: cache-first
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(req);
    if (cached) return cached;

    try {
      const res = await fetch(req);
      // Cache successful GETs
      if (req.method === "GET" && res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      return cached || new Response("Offline", { status: 503 });
    }
  })());
});
