const CACHE_NAME = 'smart-lf-static-v7';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];

const sameOriginPath = (value, fallback = '/') => {
  try {
    const target = new URL(String(value || fallback), self.location.origin);
    if (target.origin !== self.location.origin) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('push', (event) => {
  const data = (() => {
    try { return event.data?.json?.() || {}; }
    catch { return { body: event.data?.text?.() || '' }; }
  })();
  const options = {
    body: String(data.body || '').slice(0, 300),
    icon: '/logo.png',
    badge: '/logo.png',
    data: { url: sameOriginPath(data?.data?.url, '/dashboard/notifications') },
  };
  event.waitUntil(self.registration.showNotification(String(data.title || 'Smart Lost & Found').slice(0, 120), options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = sameOriginPath(event.notification?.data?.url, '/dashboard/notifications');
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === self.location.origin && clientUrl.pathname === new URL(urlToOpen, self.location.origin).pathname && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(urlToOpen) : undefined;
    }),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;

  const destination = request.destination;
  const cacheable = ['script', 'style', 'font', 'image', 'manifest'].includes(destination);
  if (!cacheable) return;

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (!response.ok || response.type !== 'basic') return response;
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined);
      return response;
    })),
  );
});
