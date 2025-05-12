import fs from 'fs/promises'; // Use promises for async operations
import {sync as globSync} from 'glob';
import path from 'path';

async function generateAssetHashes() {
  try {
    const jsFiles = globSync('dist/assets/index-*.js');
    const cssFiles = globSync('dist/assets/index-*.css');

    if (!jsFiles.length || !cssFiles.length) {
      throw new Error('No JS or CSS files found in dist/assets');
    }

    // Identify main entry files (e.g., largest file or via manifest)
    const jsFile = jsFiles.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
    const cssFile = cssFiles.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];

    const jsHash = path.basename(jsFile).match(/index-(.+)\.js/)?.[1];
    const cssHash = path.basename(cssFile).match(/index-(.+)\.css/)?.[1];

    if (!jsHash || !cssHash) {
      throw new Error('Failed to extract hashes from file names');
    }

    const hashes = {js: jsHash, css: cssHash, additional: {js: jsFiles.slice(1), css: cssFiles.slice(1)}};

    const output = JSON.stringify(hashes, null, 2);
    await Promise.all([
      fs.writeFile('public/asset_hashes.json', output),
      fs.writeFile('dist/asset_hashes.json', output),
    ]);

    await fs.writeFile('public/sw.js', `
const CACHE_NAME = 'predictpulse-cache-v3';

// Resources to cache
const urlsToCache = [
  '/predictpulse/assets/fonts.css',
  '/predictpulse/assets/utils.js',
  '/predictpulse/assets/font.woff2',
  '/predictpulse/assets/index-${jsHash}.js',
  '/predictpulse/assets/index-${cssHash}.css'
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
});`);

    console.log('Asset hashes updated:', hashes);
  } catch (error) {
    console.error('Error generating asset hashes:', error.message);
    process.exit(1);
  }
}

generateAssetHashes();