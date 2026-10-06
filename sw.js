// Birdle service worker — split precache (core + background media)
const CACHE = 'birdle-v19';

const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './js/audio-utils.js',
  './js/birds.js',
  './js/bird-motion.js',
  './js/field-guide.js',
  './js/fullscreen-utils.js',
  './js/game.js',
  './js/intro-utils.js',
  './js/leaderboard-utils.js',
  './js/pwa-install-utils.js',
  './js/rank-utils.js',
  './js/scoring-utils.js',
  './js/spawn-utils.js',
  './js/wake-lock-utils.js',
  './manifest.webmanifest',
  './assets/birdle_logo.png',
  './assets/sfbbo_logo.png',
  './assets/apple-touch-icon.png',
  './assets/pwa-icon-192.png',
  './assets/pwa-icon-512.png'
];

const MEDIA_ASSETS = [
  './assets/Birdle game poster.jpg',
  './assets/backdrop.jpg',
  './assets/binocular.png',
  './assets/intro_video.mp4',
  './assets/reference_sheet.png',
  './assets/american_crow.png',
  './assets/american_crow.mp3',
  './assets/american_robin.png',
  './assets/american_robin.mp3',
  './assets/black_phoebe.png',
  './assets/black_phoebe.mp3',
  './assets/california_towhee.png',
  './assets/california_towhee.mp3',
  './assets/cedar_waxwing.png',
  './assets/cedar_waxwing.mp3',
  './assets/dark_eyed_junco.png',
  './assets/dark_eyed_junco.mp3',
  './assets/hermit_thrush.png',
  './assets/hermit_thrush.mp3',
  './assets/house_finch.png',
  './assets/house_finch.mp3',
  './assets/lesser_goldfinch.png',
  './assets/scrub_jay.png',
  './assets/scrub_jay.mp3',
  './assets/spotted_towhee.png',
  './assets/spotted_towhee.mp3',
  './assets/american_crow_takeoff.png',
  './assets/american_robin_takeoff.png',
  './assets/black_phoebe_takeoff.png',
  './assets/california_towhee_takeoff.png',
  './assets/cedar_waxwing_takeoff.png',
  './assets/dark_eyed_junco_takeoff.png',
  './assets/hermit_thrush_takeoff.png',
  './assets/house_finch_takeoff.png',
  './assets/scrub_jay_takeoff.png',
  './assets/spotted_towhee_takeoff.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => {
      self.clients.claim();
      caches.open(CACHE).then((c) => {
        return Promise.allSettled(MEDIA_ASSETS.map((asset) => c.add(asset)));
      });
    })
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok && new URL(req.url).origin === location.origin) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
