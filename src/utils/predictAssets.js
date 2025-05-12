import { predictNextPage } from './predictNextPage';
import assetMap from '../../public/asset_map.json';

export function predictAssets(currentPage) {
  // Use window to persist state across calls
  if (window.__predictAssetsRun) {
    console.info('[predictAssets] Already run, skipping');
    return [];
  }
  window.__predictAssetsRun = true;
  console.info('[predictAssets] Running for', currentPage);

  // Extract hashes from DOM
  const jsScript = document.querySelector('script[src*="/assets/index-"]');
  const jsHash = jsScript ? jsScript.src.match(/index-(.+)\.js/)[1] : 'placeholder-js';
  const cssLink = document.querySelector('link[href*="/assets/index-"]');
  const cssHash = cssLink ? cssLink.href.match(/index-(.+)\.css/)[1] : 'placeholder-css';
  const assetHashes = { js: jsHash, css: cssHash };

  // Parse device and browser from user agent, converting to lowercase
  const userAgent = navigator.userAgent || '';
  let device = 'unknown';
  const userAgentLower = userAgent.toLowerCase();
  if (userAgentLower.includes('mobile')) {
    device = 'mobile';
  } else if (userAgentLower.includes('tablet')) {
    device = 'tablet';
  } else {
    device = 'desktop';
  }
  let browser = 'unknown';
  if (userAgentLower.includes('chrome')) {
    browser = 'chrome';
  } else if (userAgentLower.includes('firefox')) {
    browser = 'firefox';
  } else if (userAgentLower.includes('safari')) {
    browser = 'safari';
  } else if (userAgentLower.includes('edge')) {
    browser = 'edge';
  }

  const nextPage = predictNextPage({
    page: currentPage.toLowerCase(),
    browser: browser,
    device: device,
    screenWidth: window.innerWidth,
    loadTime: performance.getEntriesByType('navigation')[0]?.duration || 100
  });

  const assets = assetMap[nextPage] || [];
  const loadedAssets = new Set([
    `/predictpulse/assets/index-${assetHashes.js}.js`,
    `/predictpulse/assets/index-${assetHashes.css}.css`,
    '/predictpulse/assets/utils.js',
    '/predictpulse/assets/fonts.css',
    '/predictpulse/assets/font.woff2',
    `/predictpulse/assets/page1.jpg`
  ]);
  const seenUrls = new Set();
  const filteredAssets = assets
    .reduce((acc, asset) => {
      let url = asset.url;
      if (url.includes('index-.*.js') || url.includes('placeholder-js')) {
        url = `/predictpulse/assets/index-${assetHashes.js}.js`;
      } else if (url.includes('index-.*.css') || url.includes('placeholder-css')) {
        url = `/predictpulse/assets/index-${assetHashes.css}.css`;
      } else {
        url = url.startsWith('/predictpulse') ? url : `/predictpulse/assets/${url.replace(/^\/+/, '')}`;
      }
      if (loadedAssets.has(url) || seenUrls.has(url)) return acc;
      seenUrls.add(url);
      acc.push({ ...asset, url, as: getAsValue(asset.type) });
      return acc;
    }, [])
    .slice(0, 6);

  console.info(`[predictAssets] Predicted for ${currentPage}, next: ${nextPage}, assets:`, filteredAssets);
  return filteredAssets;
}

function getAsValue(type) {
  switch (type) {
    case 'script':
      return 'script';
    case 'style':
      return 'style';
    case 'img':
      return 'image';
    case 'font':
      return 'font';
    default:
      return 'fetch';
  }
}