const CACHE_NAME = 'ape-game-v1';
const assetsToCache = [
    './',
    './index.html',
    './game.js',
    './manifest.json'
];

// Install Event - Caches the files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            console.log('Opened cache');
            return cache.addAll(assetsToCache);
        })
    );
});

// Fetch Event - Serves files from cache if offline
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
        .then(response => {
            // Return cached version if found, else fetch from network
            return response || fetch(event.request);
        })
    );
});