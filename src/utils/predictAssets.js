// src/utils/predictAssets.js
import {UAParser} from 'ua-parser-js';
import {predictNextPage} from './predictNextPage';

// Load encoders dynamically
async function loadEncoders() {
  try {
    const response = await fetch('/encoders.json');
    return await response.json();
  } catch (error) {
    console.error('Failed to load encoders:', error);
    return {
      device: ['desktop', 'mobile', 'tablet'],
      os: ['Windows', 'Mac OS', 'iOS', 'Linux'],
      browser: ['Chrome', 'Safari', 'Firefox'],
      page: ['Home', 'ProductList', 'ProductDetails', 'About', 'Contact']
    };
  }
}

const pageImageMap = {
  'Home': '/predictpulse/assets/page1.jpg',
  'ProductList': '/predictpulse/assets/page2.jpg',
  'ProductDetails': '/predictpulse/assets/page3.jpg',
  'About': '/predictpulse/assets/page4.jpg',
  'Contact': '/predictpulse/assets/page5.jpg'
};

/**
 * Predicts which assets should be preloaded for a given page
 * @param {string} pageName - The current page name
 * @returns {Array} - Array of assets to preload with their configurations
 */
export async function predictAssets(pageName) {
  const encoders = await loadEncoders();
  const parser = new UAParser();
  const uaResult = parser.getResult();

  // Cold-start features
  const hour = new Date().getHours();
  const device = uaResult.device.type || 'desktop';
  const os = uaResult.os.name || 'Unknown';
  const browser = uaResult.browser.name || 'Unknown';
  const screen_width = window.innerWidth;
  const navPath = JSON.parse(sessionStorage.getItem('nav_path') || '[]');
  const prev_page = navPath.length > 1 ? navPath[navPath.length - 2] : pageName;

  // Encode features
  const encode = (value, classes) => {
    const idx = classes.indexOf(value);
    return idx !== -1 ? idx : 0;
  };
  const device_encoded = encode(device, encoders.device);
  const os_encoded = encode(os, encoders.os);
  const browser_encoded = encode(browser, encoders.browser);
  const current_page_encoded = encode(pageName, encoders.page);
  const prev_page_encoded = encode(prev_page, encoders.page);

  // Predict next page
  const nextPage = predictNextPage(
    hour,
    device_encoded,
    os_encoded,
    browser_encoded,
    screen_width,
    current_page_encoded,
    prev_page_encoded
  );

  // Network-aware prefetch (cold-start enhancement)
  const connection = navigator.connection || {};
  const assets = [
    {
      type: 'prefetch',
      url: '/predictpulse/assets/styles.css',
      priority: 'low',
      as: 'style',
      delay: connection.downlink && connection.downlink < 2 ? 1000 : 0
    },
    {
      type: 'prefetch',
      url: '/predictpulse/assets/fonts.css',
      priority: 'low',
      as: 'style',
      delay: connection.downlink && connection.downlink < 2 ? 1000 : 0
    },
    {type: 'preload', url: '/predictpulse/assets/font.woff2', priority: 'high', as: 'font', crossOrigin: 'anonymous', delay: 500},
    {type: 'preload', url: '/predictpulse/assets/utils.js', priority: 'high', as: 'script', delay: 0},
    {type: 'preload', url: pageImageMap[pageName], priority: 'high', as: 'image', delay: 0},
    {
      type: 'prefetch',
      url: pageImageMap[nextPage],
      priority: 'medium',
      as: 'image',
      delay: connection.downlink && connection.downlink < 2 ? 1000 : 0
    }
  ];

  console.log(`predictAssets for ${pageName}, next: ${nextPage}`, assets);
  return assets;
}

/**
 * Filters assets to include only those relevant to the current page
 * @param {string} pageName - The current page name
 * @param {Array} resources - All resources loaded on the page
 * @returns {Array} - Filtered array of assets
 */
export function filterPageAssets(pageName, resources) {
  const pageImage = pageImageMap[pageName];
  const requiredAssets = [
    '/predictpulse/assets/styles.css',
    '/predictpulse/assets/fonts.css',
    '/predictpulse/assets/font.woff2',
    '/predictpulse/assets/utils.js',
    pageImage
  ];

  const filteredAssets = resources
    .filter(resource => requiredAssets.includes(resource.url))
    .map(resource => ({
      url: resource.url,
      type: getAssetType(resource.url),
      fromCache: resource.fromCache
    }));

  // Ensure all required assets are included
  requiredAssets.forEach(requiredUrl => {
    if (!filteredAssets.some(asset => asset.url === requiredUrl)) {
      filteredAssets.push({
        url: requiredUrl,
        type: getAssetType(requiredUrl),
        fromCache: false
      });
    }
  });

  return filteredAssets;
}

function getAssetType(url) {
  if (url.endsWith('.css')) return 'style';
  if (url.endsWith('.js')) return 'script';
  if (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.gif') || url.endsWith('.svg')) return 'img';
  if (url.endsWith('.woff2')) return 'other';
  return 'other';
}