const CACHE_NAME = 'predictpulse-cache-v2';
const urlsToCache = [
  '/predictpulse/assets/fonts.css',
  '/predictpulse/assets/utils.js',
  '/predictpulse/assets/font.woff2',
  '/predictpulse/assets/page1.jpg',
  '/predictpulse/assets/page2.jpg',
  '/predictpulse/assets/page3.jpg',
  '/predictpulse/assets/page4.jpg',
  '/predictpulse/assets/page5.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request).then(response => {
        if (response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return response;
      }))
  );
});