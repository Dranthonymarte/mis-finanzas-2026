// ╔══════════════════════════════════════════════════════════════════════╗
// ║  AI-CONTEXT — service-worker.js · Mis Finanzas 2026                 ║
// ║  VERSIÓN: finanzas-v59-batch55                                       ║
// ║  F2 batch55: shell visual redesign — sidebar 240px + topbar +       ║
// ║  bottom nav 64px. shell.css nuevo archivo, SVG icons, tokens 2026.  ║
// ╚══════════════════════════════════════════════════════════════════════╝

const CACHE_VERSION = 'finanzas-v59-batch55';
const CDN_CACHE     = 'finanzas-cdn-v44';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/tokens.css',
  '/styles.css',
  '/styles-desktop.css',
  '/shell.css',
  '/fonts/instrument-serif-400.woff2',
  '/fonts/inter-var.woff2',
  '/fonts/jetbrains-mono-var.woff2',
  '/config.js',
  '/globals-init.js',
  '/auth.js',
  '/household.js',
  '/data-load.js',
  '/audit.js',
  '/init.js',
  '/sw-loader.js',
  '/viewport.js',
  '/app-core.js',
  '/app-nav.js',
  '/app-offline.js',
  '/app-analytics.js',
  '/app-cuentas.js',
  '/app-numpad.js',
  '/app-voice.js',
  '/app-features.js',
  '/app-cuentas-v2.js',
  '/app-docs.js',
  '/app-smart.js',
  '/notificaciones-panel.js',
  '/app-calendar.js',
  '/vapid-push.js',
  '/gcal-integration.js',
];

const CDN_HOSTS = [
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'unpkg.com',
];

// INSTALL — precachear y activar inmediatamente
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())   // activar sin esperar a que cierren pestañas
  );
});

// ACTIVATE — nuclear: borrar TODOS los cachés viejos + tomar control inmediato
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Borrar absolutamente todos los cachés que no sean los actuales
      caches.keys().then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION && k !== CDN_CACHE)
          .map(k => {
            console.log('[SW] Eliminando caché viejo:', k);
            return caches.delete(k);
          })
      )),
      // Tomar control de todas las pestañas inmediatamente
      self.clients.claim()
    ])
  );
});

// FETCH
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // SW propio → siempre desde red, nunca cachear
  if (url.pathname === '/service-worker.js') {
    event.respondWith(fetch(request)); return;
  }

  // App shell + módulos JS → Network-first (siempre frescos)
  const appShell = [
    '/', '/index.html', '/manifest.json',
    '/config.js', '/sw-loader.js', '/viewport.js',
    '/app-core.js', '/app-nav.js', '/app-offline.js',
    '/app-analytics.js', '/app-cuentas.js', '/app-numpad.js',
    '/app-voice.js', '/app-features.js', '/app-cuentas-v2.js',
    '/app-docs.js', '/app-smart.js', '/styles.css', '/styles-desktop.css',
    '/vapid-push.js', '/gcal-integration.js', '/notificaciones-panel.js',
    '/app-calendar.js',
  ];
  if (appShell.includes(url.pathname)) {
    event.respondWith(networkFirst(request, CACHE_VERSION)); return;
  }

  // APIs externas → Network-only
  if (['supabase.co','groq.com','er-api.com','frankfurter.app','emailjs.com','workers.dev']
      .some(h => url.hostname.includes(h))) {
    event.respondWith(fetch(request)); return;
  }

  // CDN → Cache-first
  if (CDN_HOSTS.some(h => url.hostname.includes(h))) {
    event.respondWith(cacheFirst(request, CDN_CACHE)); return;
  }

  // Assets estáticos → Cache-first
  if (/\.(png|ico|woff2|svg)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, CACHE_VERSION)); return;
  }

  // Default → Network-first
  event.respondWith(networkFirst(request, CACHE_VERSION));
});

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    return new Response('', { status: 503 });
  }
}

// ── PUSH NOTIFICATIONS ─────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch(e) { payload = { title: 'Mis Finanzas', body: event.data.text() }; }
  const title   = payload.title || 'Mis Finanzas 2026';
  const options = {
    body:    payload.body    || '',
    icon:    payload.icon    || '/icon-192.png',
    badge:   '/icon-192.png',
    tag:     payload.tag     || 'finanzas-notif',
    data:    payload.data    || {},
    actions: payload.actions || [],
    vibrate: [100, 50, 100],
    renotify: !!payload.renotify
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.startsWith(self.registration.scope));
      if (existing) { existing.focus(); existing.navigate(url); }
      else clients.openWindow(url);
    })
  );
});

// Background sync para movimientos offline
self.addEventListener('sync', event => {
  if (event.tag === 'sync-movimientos') {
    event.waitUntil(
      self.clients.matchAll().then(clientList => {
        if (clientList.length > 0) clientList[0].postMessage({ type: 'PROCESS_OFFLINE_QUEUE' });
      })
    );
  }
});

self.addEventListener('message', event => {
  if (event.data?.type === 'GET_VERSION') {
    event.source?.postMessage({ type: 'VERSION', version: CACHE_VERSION });
  }
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
