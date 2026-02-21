/* ═══════════════════════════════════════════════════════════
   decide.engine — Service Worker v4
   
   Strategy:
   • NAVIGATE requests → always serve /index.html (SPA, hash routing)
   • Hash (#research, #founder …) is CLIENT-SIDE only — SW never sees it
   • Wiki API → always network (never cache, always fresh data)
   • CDN fonts/libs → cache-first (fast repeat loads)
   • App shell → pre-cached on install
   • Meets Chrome PWA installability checklist ✓
═══════════════════════════════════════════════════════════ */

const CACHE = "decide-v4";
const SHELL = ["/", "/index.html", "/manifest.json", "/offline.html",
               "/icons/icon-192.png", "/icons/icon-512.png"];

const CDN   = ["fonts.googleapis.com","fonts.gstatic.com",
               "cdnjs.cloudflare.com","cdn.jsdelivr.net"];
const WIKI  = ["wikipedia.org","wikivoyage.org","wikibooks.org","wikinews.org"];

/* ── INSTALL: pre-cache shell */
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL).catch(err => console.warn("[SW] shell cache partial:", err)))
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE: clear old caches, claim clients */
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith("decide-") && k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── FETCH */
self.addEventListener("fetch", e => {
  const { request: req } = e;
  const url = new URL(req.url);

  // Ignore non-GET and extensions
  if (req.method !== "GET") return;
  if (!["https:","http:"].includes(url.protocol)) return;

  // Wiki APIs — always live, no cache
  if (WIKI.some(h => url.hostname.includes(h))) {
    e.respondWith(
      fetch(req).catch(() =>
        new Response('{"error":"offline"}', { headers: {"Content-Type":"application/json"} })
      )
    );
    return;
  }

  // CDN assets — cache-first, network fallback
  if (CDN.some(h => url.hostname.includes(h))) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }))
    );
    return;
  }

  // Navigation (page load, PWA launch, home-screen shortcut tap)
  // Hash is stripped before reaching SW — just serve index.html
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
          return res;
        })
        .catch(async () => {
          // Offline fallback: cached index → offline page
          return (await caches.match("/index.html")) ||
                 (await caches.match("/offline.html")) ||
                 new Response("Offline", { status: 503 });
        })
    );
    return;
  }

  // Static assets (icons, manifest) — cache-first
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() => new Response("", { status: 503 })))
  );
});

/* ── MESSAGE: force update from page */
self.addEventListener("message", e => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

console.log("[SW] decide.engine v4 ready");
