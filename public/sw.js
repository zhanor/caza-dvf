const CACHE_NAME = 'cazadvf-v4';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon.png',
];

// Installation : mise en cache des assets statiques (sans '/' pour éviter les conflits Next.js)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch : stratégie sélective (jamais les navigations ni les RSC Next.js)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et les extensions de navigateur
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  // Ne jamais intercepter les navigations de page (laisse Next.js gérer)
  if (request.mode === 'navigate') return;

  // Ne jamais intercepter les requêtes RSC de Next.js (_rsc, ?_rsc=)
  if (url.searchParams.has('_rsc')) return;

  // Ne jamais intercepter les routes auth (next-auth gère ses propres redirections)
  if (url.pathname.startsWith('/api/auth')) return;

  // API routes DVF : Network-first sans cache.
  // Un seul échec réseau peut survenir juste après le réveil de l'appareil (pile réseau
  // pas encore prête) — on retente une fois après un court délai avant d'abandonner,
  // pour éviter d'afficher "hors ligne" alors que le réseau revient l'instant d'après.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(
        () => new Promise((resolve) => setTimeout(resolve, 800)).then(() => fetch(request))
      ).catch(() =>
        new Response(JSON.stringify({ error: 'Hors ligne - données non disponibles' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Assets statiques Next.js : Cache-first (immutables par construction)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      }))
    );
    return;
  }

  // Assets statiques publics (manifest, icônes) : Cache-first
  if (url.pathname.match(/\.(png|ico|json|webp|svg)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Tout le reste : laisser passer sans interférer
});
