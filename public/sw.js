const CACHE_NAME = 'tabe-cache-v1';
const STATIC_ASSETS = [
    '/',
    '/favicon.svg',
    '/pwa-192x192.png',
    '/pwa-512x512.png',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch: network-first strategy (so app always gets fresh data)
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip API calls and Supabase requests
    const url = new URL(event.request.url);
    if (url.pathname.startsWith('/api') || url.hostname.includes('supabase')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone and cache the response
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // If network fails, try cache
                return caches.match(event.request).then((cached) => {
                    return cached || caches.match('/');
                });
            })
    );
});
