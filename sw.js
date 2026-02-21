/* ════════════════════════════════════════════════════
   viadecide.com — Service Worker
   PWA: Offline support, caching, background sync
════════════════════════════════════════════════════ */

const CACHE_VERSION = "v2";
const CACHE_NAME = `decide-engine-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

// Core app shell to cache immediately
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// External resources to cache when first fetched
const EXTERNAL_ALLOWLIST = [
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "cdnjs.cloudflare.com",
  "cdn.jsdelivr.net",
];

// ── Install: cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn("[SW] App shell cache partial failure:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("decide-engine-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: serve from cache, fall back to network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and browser extensions
  if (request.method !== "GET") return;
  if (url.protocol === "chrome-extension:") return;
  if (url.protocol === "moz-extension:") return;

  // Skip Wikipedia/Wikivoyage API calls — always fresh
  const isWikiAPI = [
    "wikipedia.org/w/api.php",
    "wikivoyage.org/w/api.php",
    "wikibooks.org/w/api.php",
    "wikinews.org/w/api.php",
  ].some((pattern) => url.href.includes(pattern));

  if (isWikiAPI) {
    event.respondWith(
      fetch(request).catch(() => new Response(JSON.stringify({ error: "offline" }), {
        headers: { "Content-Type": "application/json" },
      }))
    );
    return;
  }

  // External allowed assets: cache-first with network fallback
  const isExternal = EXTERNAL_ALLOWLIST.some((h) => url.hostname.includes(h));
  if (isExternal) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return response;
        }).catch(() => new Response("", { status: 503 }));
      })
    );
    return;
  }

  // App navigation: network-first, fall back to cache, then offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) => cached || caches.match(OFFLINE_URL)
          )
        )
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        return response;
      }).catch(() => new Response("", { status: 503 }));
    })
  );
});

// ── Background Sync (for future use)
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-notes") {
    // Future: sync notes to server
    console.log("[SW] Background sync: notes");
  }
});

// ── Push Notifications (for future use)
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || "decide.engine", {
      body: data.body || "New decision intelligence available.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      const url = event.notification.data?.url || "/";
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

console.log(`[SW] decide.engine service worker ${CACHE_VERSION} loaded`);
