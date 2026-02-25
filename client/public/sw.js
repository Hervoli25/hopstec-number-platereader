// HOPSVOIR Service Worker
const CACHE_NAME = 'hopsvoir-v2';
const API_CACHE_NAME = 'hopsvoir-api-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.png'
];

// API GET endpoints to cache for offline reads
const CACHEABLE_API_PATTERNS = [
  '/api/wash-jobs',
  '/api/queue/stats',
  '/api/parking/sessions',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  const keepCaches = [CACHE_NAME, API_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !keepCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || '',
      icon: data.icon || '/favicon.png',
      badge: data.badge || '/favicon.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
      tag: data.tag || 'hopsvoir-notification',
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'HOPSVOIR', options)
    );
  } catch (e) {
    // Fallback for plain text push
    event.waitUntil(
      self.registration.showNotification('HOPSVOIR', {
        body: event.data.text(),
        icon: '/favicon.png',
      })
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(url);
    })
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests (mutations are handled by IndexedDB offline queue)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Cacheable API endpoints — network first, stale fallback for offline reads
  if (url.pathname.startsWith('/api/') && CACHEABLE_API_PATTERNS.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Skip other API requests (auth, SSE, etc.) — always network only
  if (url.pathname.startsWith('/api/')) return;

  // Static assets — network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          // For navigation requests, return the cached index.html (SPA fallback)
          if (!cached && event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return cached;
        });
      })
  );
});
