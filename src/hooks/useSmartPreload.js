import {useEffect, useRef} from 'react';
import {predictAssets} from '../utils/predictAssets';

export function useSmartPreload(pageName) {
  const lastPageRef = useRef(null);

  useEffect(() => {
    // Skip if we're preloading for the same page again
    if (lastPageRef.current === pageName) {
      return;
    }

    lastPageRef.current = pageName;

    const preloadAssets = () => {
      // Reset the prediction run flag before calling predictAssets
      window.__predictAssetsRun = false;

      const assets = predictAssets(pageName);
      const seen = new Set();

      // Filter out any duplicates to ensure we don't double-preload
      const uniqueAssets = assets.filter(asset => {
        const key = `${asset.url}:${asset.type}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Only preload high-priority assets (images and scripts)
      uniqueAssets.forEach(asset => {
        if (asset.as !== 'image' && asset.as !== 'script') return;

        // Check if this asset already has a preload link
        const existingLink = document.querySelector(`link[rel="preload"][href="${asset.url}"]`);
        if (existingLink) return;

        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = asset.url;
        if (asset.as) link.setAttribute('as', asset.as);
        link.setAttribute('fetchpriority', asset.as === 'script' ? 'high' : 'low');
        // Tag preload links for identification
        link.dataset.smartpreload = pageName;
        document.head.appendChild(link);
      });
    };

    preloadAssets();

    return () => {
      // Clean up only the preload links created by this hook instance
      document.querySelectorAll(`link[rel="preload"][data-smartpreload="${pageName}"]`).forEach(link => {
        link.remove();
      });
    };
  }, [pageName]);
}