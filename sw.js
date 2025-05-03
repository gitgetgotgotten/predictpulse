// Service Worker for PredictPulse
const CACHE_NAME = 'predictpulse-cache-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Try to cache core assets, but don't fail if some are missing
        return cache.addAll([
          '/predictpulse/',
          '/predictpulse/index.html',
          '/predictpulse/manifest.json'
        ])
          .catch(error => {
            console.error('Some assets failed to cache:', error);
            // Continue with installation even if some assets fail to cache
          });
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return the response
        if (response) {
          return response;
        }

        // Clone the request because it's a one-time use stream
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response because it's a one-time use stream
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If fetch fails, try to return a fallback for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/predictpulse/index.html');
            }
            return new Response('Network error happened', {
              status: 408,
              headers: {'Content-Type': 'text/plain'}
            });
          });
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
