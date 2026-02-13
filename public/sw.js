const CACHE_VERSION = "decide-engine-v2.0.0";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json"
];

/* =========================
   INSTALL
========================= */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

/* =========================
   ACTIVATE
========================= */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_VERSION) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

/* =========================
   FETCH STRATEGIES
========================= */
self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Network First for APIs
  if (
    url.hostname.includes("wikipedia") ||
    url.hostname.includes("script.google.com") ||
    url.hostname.includes("googleapis")
  ) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_VERSION)
            .then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then(cached => cached || new Response(
              JSON.stringify({ offline: true }),
              { headers: { "Content-Type": "application/json" } }
            ));
        })
    );
    return;
  }

  // App Shell: Cache First
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        return cached || fetch(event.request)
          .then(response => {
            const clone = response.clone();
            caches.open(CACHE_VERSION)
              .then(cache => cache.put(event.request, clone));
            return response;
          });
      })
      .catch(() => caches.match("./index.html"))
  );
});
