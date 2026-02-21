/* ═══════════════════════════════════════
   decide.engine — Service Worker
   viadecide.com | IndiaAI Mission
═══════════════════════════════════════ */

const CACHE_NAME = 'decide-engine-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/alchemist.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&family=Space+Mono:wght@400;700&family=Noto+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap',
];

// CDN assets to cache on first use
const CDN_HOSTS = [
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// Wiki API hosts — always network-first
const WIKI_HOSTS = [
  'en.wikipedia.org',
  'en.wikivoyage.org',
  'en.wikibooks.org',
  'en.wikinews.org',
];

/* ── Install ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache what we can; ignore failures for CDN assets
        return Promise.allSettled(
          STATIC_ASSETS.map(url =>
            cache.add(url).catch(err => {
              console.warn('[SW] Failed to cache:', url, err);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

/* ── Activate ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch Strategy ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension / non-http
  if (!url.protocol.startsWith('http')) return;

  // Wiki APIs — network only (real-time data)
  if (WIKI_HOSTS.some(h => url.hostname.includes(h))) {
    event.respondWith(networkOnly(event.request));
    return;
  }

  // CDN assets — cache first, then network
  if (CDN_HOSTS.some(h => url.hostname.includes(h))) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // App shell — stale while revalidate
  event.respondWith(staleWhileRevalidate(event.request));
});

/* ── Strategy helpers ── */

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Offline — network unavailable', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then(response => {
      if (response && response.status === 200 && response.type !== 'opaque') {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || networkFetch || new Response('Offline', { status: 503 });
}

/* ── Background Sync (future) ── */
self.addEventListener('sync', event => {
  if (event.tag === 'decide-engine-sync') {
    console.log('[SW] Background sync triggered');
  }
});

/* ── Push Notifications (future) ── */
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'decide.engine', {
      body: data.body || 'India\'s Decision Engine',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      data: data.url || '/',
      tag: 'decide-engine-notification',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});

console.log('[SW] decide.engine Service Worker loaded — viadecide.com');
