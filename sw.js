// ============================================================
// MeteoLog – Service Worker v12
// ============================================================
const CACHE = 'meteolog-v13';
const STATIC = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './app.js',
  './auth.js',
  './auth-providers.js',
  './db.js',
  './utils.js',
  './state.js',
  './dashboard.js',
  './log.js',
  './history.js',
  './charts.js',
  './locations.js',
  './firebase-config.js',
  './chart.min.js',
  './icon-192.svg',
  './icon-512.svg',
  './favicon.svg',
  './favicon.ico',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // Egyenként cache-elünk, hogy egy hibás fájl ne akassza meg az egészet
      return Promise.allSettled(
        STATIC.map(url => cache.add(url).catch(err => console.warn('Cache skip:', url, err)))
      );
    }).then(() => self.skipWaiting())
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
  // Firebase / Google API hívások – mindig network
  if (e.request.url.includes('firestore') ||
      e.request.url.includes('firebase') ||
      e.request.url.includes('googleapis') ||
      e.request.url.includes('gstatic')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
