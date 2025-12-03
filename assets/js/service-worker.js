const CACHE_NAME = 'sekolah-daringku-v1';
const urlsToCache = [
  '/',
  '../index.html',
  '/login.html',
  '/route.html',
  '/main.js',
  '/auth.js',
  '/route.js',
  '/supabase.js',
  '../css/styles.css',
  '../img/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  )
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  )
});