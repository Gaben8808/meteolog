// MeteoLog – Service Worker v14
const CACHE = 'meteolog-v14';

// Csak az alapvető fájlokat cache-eljük, hibatűrően
const CORE = [
  './index.html',
  './style.css',
  './manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.allSettled(CORE.map(u => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Firebase hívások - mindig network
  if (e.request.url.includes('firebase') ||
      e.request.url.includes('firestore') ||
      e.request.url.includes('gstatic') ||
      e.request.url.includes('googleapis')) {
    return;
  }
  // Minden más: network first, cache fallback
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
