/* sw.js — decide.engine PWA service worker (root-hosted) */

const VERSION = "v1.0.0";
const CACHE_NAME = `decide-engine-${VERSION}`;

// Cache only what you control
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/alchemist.html" // remove if you don't have this file
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("decide-engine-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Helpers
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const res = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, res.clone());
  return res;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const res = await fetch(request);
    cache.put(request, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw e;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;

  // SPA navigation => serve cached index.html (offline capable)
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cached = await caches.match("/index.html");
        if (cached) return cached;

        const res = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put("/index.html", res.clone());
        return res;
      })().catch(async () => {
        const cached = await caches.match("/index.html");
        return (
          cached ||
          new Response("Offline", {
            status: 200,
            headers: { "Content-Type": "text/plain" }
          })
        );
      })
    );
    return;
  }

  // Same-origin assets => cache-first
  if (url.origin === self.location.origin) {
    const isAsset =
      req.destination === "script" ||
      req.destination === "style" ||
      req.destination === "image" ||
      req.destination === "font" ||
      req.destination === "document" ||
      url.pathname.endsWith(".json");

    if (isAsset) {
      event.respondWith(cacheFirst(req).catch(() => caches.match(req)));
      return;
    }

    event.respondWith(networkFirst(req).catch(() => caches.match(req)));
    return;
  }

  // MediaWiki APIs => network-first (fresh research), fallback to cache
  const isMediaWiki =
    url.hostname.endsWith("wikipedia.org") ||
    url.hostname.endsWith("wikivoyage.org") ||
    url.hostname.endsWith("wikibooks.org") ||
    url.hostname.endsWith("wikinews.org");

  if (isMediaWiki) {
    event.respondWith(networkFirst(req).catch(() => caches.match(req)));
    return;
  }

  // Other cross-origin (CDNs/fonts) => cache-first + update
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);

      const fetched = fetch(req)
        .then(async (res) => {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);

      return cached || (await fetched) || new Response("", { status: 504 });
    })()
  );
});
