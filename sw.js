// ============================================================
// MeteoLog – Service Worker v17
// Web Push + offline cache
// ============================================================

// Firebase Messaging SW importálása (FCM push fogadáshoz)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase inicializálás a SW-ben
// A config értékeket be kell másolni ide is!
const SW_FIREBASE_CONFIG = {
  apiKey:            "IDE_IRD_A_TE_API_KULCSODAT",
  authDomain:        "projekt-azonosito.firebaseapp.com",
  projectId:         "projekt-azonosito",
  storageBucket:     "projekt-azonosito.appspot.com",
  messagingSenderId: "123456789012",
  appId:             "1:123456789012:web:abcdef1234567890"
};

firebase.initializeApp(SW_FIREBASE_CONFIG);
const messaging = firebase.messaging();

// Háttérben érkező push értesítések kezelése
messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'MeteoLog', {
    body: body || 'Rögzítsd a mai időjárást!',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: 'meteolog-daily',
    renotify: true,
    data: { url: self.registration.scope },
  });
});

// Értesítésre kattintáskor megnyitja az appot
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(self.registration.scope);
    })
  );
});

// ── Cache ─────────────────────────────────────────────────────
const CACHE = 'meteolog-v21';
const CORE  = ['./index.html', './style.css', './manifest.json', './chart.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.allSettled(CORE.map(u => cache.add(u).catch(() => {}))))
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
  if (e.request.url.includes('firebase') ||
      e.request.url.includes('firestore') ||
      e.request.url.includes('gstatic') ||
      e.request.url.includes('googleapis')) {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && e.request.method === 'GET') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
