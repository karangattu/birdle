// Birdle service worker — offline cache
const CACHE = 'birdle-v6';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './js/game.js',
  './manifest.webmanifest',
  './assets/Birdle game poster.jpg',
  './assets/backdrop.jpg',
  './assets/binocular.png',
  './assets/sfbbo_logo.png',
  './assets/american_crow.png',
  './assets/american_robin.png',
  './assets/black_pheobe.png',
  './assets/california_towhee.png',
  './assets/cedar_waxwing.png',
  './assets/dark_eyed_junco.png',
  './assets/hermit_thrush.png',
  './assets/house_finch.png',
  './assets/scrub_jay.png',
  './assets/spotted_towhee.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Cache same-origin successful responses
        if (res && res.ok && new URL(req.url).origin === location.origin) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
