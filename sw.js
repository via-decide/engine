/* sw.js — ViaDecide PWA Service Worker (cache-first for app shell, network-first for APIs)
   Place at: /sw.js
*/
const VERSION = "viadecide-pwa-v1.0.0";
const APP_SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const APP_SHELL = [
  "/",               // if your hosting maps / -> index.html
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  // Add your alchemist page if it exists at root:
  "/alchemist.html",
];

// Cache only same-origin GET requests (avoid caching wikipedia responses etc.)
function isSameOrigin(reqUrl) {
  try {
    return new URL(reqUrl).origin === self.location.origin;
  } catch {
    return false;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map((k) => {
        if (![APP_SHELL_CACHE, RUNTIME_CACHE].includes(k)) return caches.delete(k);
      })
    );
    await self.clients.claim();
  })());
});

// Strategy:
// - App shell (same-origin html/css/js/icons): cache-first, then network
// - Runtime same-origin assets: stale-while-revalidate
// - Cross-origin (Wikipedia/Wikivoyage APIs): network-only (avoid opaque cache issues)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Do not interfere with cross-origin API calls (Wikipedia etc.)
  if (url.origin !== self.location.origin) {
    // network-only
    event.respondWith(fetch(req).catch(() => new Response("", { status: 504 })));
    return;
  }

  // HTML navigations => cache-first for offline, fallback to cache
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith((async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      const cached = await cache.match("/index.html");
      try {
        const fresh = await fetch(req);
        // keep latest index cached
        cache.put("/index.html", fresh.clone());
        return fresh;
      } catch {
        return cached || new Response("Offline", { status: 200, headers: { "Content-Type": "text/plain" } });
      }
    })());
    return;
  }

  // App shell assets => cache-first
  if (APP_SHELL.includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      const fresh = await fetch(req);
      cache.put(req, fresh.clone());
      return fresh;
    })());
    return;
  }

  // Other same-origin requests => stale-while-revalidate
  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(req);
    const fetchPromise = fetch(req).then((fresh) => {
      cache.put(req, fresh.clone());
      return fresh;
    }).catch(() => null);

    return cached || (await fetchPromise) || new Response("", { status: 504 });
  })());
});
