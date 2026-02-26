// ============================================================
// sw.js — ViaDecide Engine Service Worker
// BUMP the version below every time you deploy changes.
// This forces all clients to get fresh content.
// ============================================================

const CACHE_VERSION = 'v' + Date.now(); // auto-busts on every SW update
const CACHE_NAME = `engine-cache-${CACHE_VERSION}`;

// Files to pre-cache on install (add/remove as needed)
const PRE_CACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
];

// ── Install ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  // Skip waiting so the new SW activates immediately
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRE_CACHE).catch(err => {
        // Don't fail install if a pre-cache asset is missing
        console.warn('[SW] Pre-cache failed for some assets:', err);
      });
    })
  );
});

// ── Activate ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  // Take control of all open tabs immediately
  event.waitUntil(
    Promise.all([
      // Delete ALL old caches that don't match current version
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
        )
      ),
      // Claim all clients so they get the new SW right away
      self.clients.claim(),
    ])
  );
});

// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Don't cache API / external requests
  const url = new URL(request.url);
  if (!url.origin.includes(self.location.origin)) return;

  event.respondWith(
    // Network-first strategy: always try network, fall back to cache
    fetch(request)
      .then(networkResponse => {
        // Clone and store fresh response in cache
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      })
      .catch(() => {
        // Network failed — serve from cache
        return caches.match(request).then(cached => {
          if (cached) return cached;
          // Last resort: return offline page if available
          return caches.match('/index.html');
        });
      })
  );
});
