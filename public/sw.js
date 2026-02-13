const CACHE = "decideos-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/assets/styles.css",
  "/src/main.js",
  "/src/router.js",
  "/src/store.js",
  "/src/state.js",
  "/src/utils/dom.js",
  "/src/utils/logic.js",
  "/src/utils/loadScript.js",
  "/src/services/api.js",
  "/src/services/products.js",
  "/src/services/pdf.js",
  "/src/views/LobbyView.js",
  "/src/views/DecideFlowView.js",
  "/manifest.json",
  "/admin.html",
  "/admin.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Network-first for API
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // Cache-first for static
  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});
