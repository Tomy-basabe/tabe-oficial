const CACHE_NAME = 'tabe-cache-v4';
const NEW_DOMAIN = 'https://tabe.com.ar';
const OLD_DOMAINS = ['tabe-oficial.vercel.app', 'tabe.software'];
const STATIC_ASSETS = [
    '/',
    '/auth',
    '/favicon.svg',
    '/pwa-192x192.png',
    '/pwa-512x512.png',
];

// Helper: check if running on an old/dead domain
function isOldDomain(hostname) {
    return OLD_DOMAINS.some(function(d) { return hostname === d; });
}

// Install: cache static assets + force activate immediately
self.addEventListener('install', (event) => {
    // Skip waiting so the new SW takes over ASAP (critical for domain migration)
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// Activate: clean ALL old caches and redirect clients on old domains
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => {
            // Take control of all pages immediately
            return self.clients.claim();
        }).then(() => {
            // Redirect all clients on old domains to the new domain
            return self.clients.matchAll({ type: 'window' }).then((clients) => {
                clients.forEach((client) => {
                    try {
                        var clientUrl = new URL(client.url);
                        if (isOldDomain(clientUrl.hostname)) {
                            client.navigate(NEW_DOMAIN + clientUrl.pathname + clientUrl.search + clientUrl.hash);
                        }
                    } catch (e) {
                        // Ignore navigation errors
                    }
                });
            });
        })
    );
});

// Listen for skip waiting message from the app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Fetch: network-first strategy with domain redirect
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // CRITICAL: If fetching from an old domain, redirect to the new one
    if (isOldDomain(url.hostname)) {
        var newUrl = NEW_DOMAIN + url.pathname + url.search + url.hash;
        // For navigation requests (page loads), redirect the user
        if (event.request.mode === 'navigate') {
            event.respondWith(Response.redirect(newUrl, 301));
            return;
        }
        // For sub-resources (scripts, images, etc.), fetch from the new domain
        event.respondWith(fetch(newUrl));
        return;
    }

    if (url.pathname.startsWith('/api') || url.hostname.includes('supabase')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then((cached) => {
                    return cached || caches.match('/');
                });
            })
    );
});
