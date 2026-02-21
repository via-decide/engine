/* sw.js — decide.engine PWA service worker */

const VERSION = "v1.0.0";
const CACHE_NAME = `decide-engine-${VERSION}`;

// App shell: cache only the essentials you control.
// (Don't cache CDN libs aggressively; use runtime caching below.)
const APP_SHELL = [
  "/",            // serve index.html from navigation handler
  "/index.html",
  "/manifest.json",
  "/alchemist.html" // if you have it; remove if not present
];

// Install: pre-cache shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: cleanup old caches
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

// Fetch strategy:
// - Navigations: serve cached index.html (app shell) first, fallback to network.
// - Static assets (same-origin): cache-first.
// - CDN/assets cross-origin: stale-while-revalidate-ish (cache-first, update in bg).
// - Wiki API calls: network-first (to stay fresh), fallback to cache.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== "GET") return;

  // 1) SPA navigation -> index.html
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        // Try cache first (fast offline), then network
        const cached = await caches.match("/index.html");
        if (cached) return cached;

        // If not cached, go network and cache it
        const res = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put("/index.html", res.clone());
        return res;
      })().catch(async () => {
        // Offline fallback
        const cached = await caches.match("/index.html");
        if (cached) return cached;
        return new Response("Offline", {
          status: 200,
          headers: { "Content-Type": "text/plain" }
        });
      })
    );
    return;
  }

  // 2) Same-origin assets (CSS/JS/images/icons/html/json)
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

    // Default same-origin GET
    event.respondWith(networkFirst(req).catch(() => caches.match(req)));
    return;
  }

  // 3) MediaWiki APIs (wikipedia/wikivoyage/wikibooks/wikinews) -> network-first
  // Keeps research fresh; caches as fallback.
  const isMediaWiki =
    url.hostname.endsWith("wikipedia.org") ||
    url.hostname.endsWith("wikivoyage.org") ||
    url.hostname.endsWith("wikibooks.org") ||
    url.hostname.endsWith("wikinews.org");

  if (isMediaWiki) {
    event.respondWith(networkFirst(req).catch(() => caches.match(req)));
    return;
  }

  // 4) Other cross-origin (CDN scripts/fonts) -> cache-first + update
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      const fetchPromise = fetch(req)
        .then(async (res) => {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);

      return cached || (await fetchPromise) || new Response("", { status: 504 });
    })()
  );
});
