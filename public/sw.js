const CACHE_NAME = "decide-os-v100";
const STATIC_ASSETS = [
  "/",
  "/index.html"
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request)
      .then(res => res || fetch(e.request).then(response=>{
        const clone=response.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(e.request,clone));
        return response;
      }))
      .catch(()=>caches.match("/index.html"))
  );
});
