// ============================================================
// MeteoLog – Service Worker
// ============================================================
const CACHE = 'meteolog-v11';
const STATIC = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './app.js',
  './auth.js',
  './db.js',
  './utils.js',
  './dashboard.js',
  './log.js',
  './history.js',
  './charts.js',
  './locations.js',
  './firebase-config.js',
  './icon-192.svg',
  './icon-512.svg',
  './chart.min.js',
  // CDN fájlokat nem cache-eljük (tracking prevention miatt)
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('firestore') ||
      e.request.url.includes('firebase') ||
      e.request.url.includes('googleapis')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok && e.request.method === 'GET') {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
