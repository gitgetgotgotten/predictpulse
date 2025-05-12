
const CACHE_NAME = 'predictpulse-cache-v3';

// Resources to cache
const urlsToCache = [
  '/predictpulse/assets/fonts.css',
  '/predictpulse/assets/utils.js',
  '/predictpulse/assets/font.woff2',
  '/predictpulse/assets/index-BSq4T1Ox.js',
  '/predictpulse/assets/index-CPeIIt-n.css'
];

// Optional resources that might fail (will be cached if available)
const optionalUrlsToCache = [
  '/predictpulse/assets/page1.jpg',
  '/predictpulse/assets/page2.jpg',
  '/predictpulse/assets/page3.jpg',
  '/predictpulse/assets/page4.jpg',
  '/predictpulse/assets/page5.jpg'
];

// Install event handler with improved error handling
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // First cache the critical resources
        return cache.addAll(urlsToCache)
          .then(() => {
            // Then try to cache optional resources, but don't fail if they're not available
            return Promise.allSettled(
              optionalUrlsToCache.map(url => 
                cache.add(url).catch(error => {
                  console.warn('Could not cache optional resource:', url, error);
                  // Don't fail the whole caching process
                  return Promise.resolve();
                })
              )
            );
          });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event handler - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('predictpulse-cache-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event handler with improved error handling
self.addEventListener('fetch', event => {
  // Skip cross-origin requests and API calls
  if (!event.request.url.startsWith(self.location.origin) || 
      event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        // Clone the request because it's a one-time use stream
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest)
          .then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response because it's a one-time use stream
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              })
              .catch(error => {
                console.error('Failed to cache response:', error);
              });
              
            return response;
          })
          .catch(error => {
            console.error('Fetch failed:', error);
            // You could return a custom offline page here
          });
      })
  );
});