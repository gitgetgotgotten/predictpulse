import {useEffect} from 'react';
import {predictAssets} from '../utils/predictAssets';

/**
 * Hook to preload assets for a page
 * @param {string} pageName - The current page name
 */
export function useSmartPreload(pageName) {
  const cleanupPreloadLinks = () => {
    const links = document.querySelectorAll('link[rel="preload"], link[rel="prefetch"]');
    links.forEach(link => link.remove());
  };

  useEffect(() => {
    // Remove any existing preload/prefetch links
    cleanupPreloadLinks();

    let isMounted = true;
    const preloadAssets = async () => {
      const assets = await predictAssets(pageName);
      if (!isMounted) return;
      assets.forEach(asset => {
        const {type, url, priority, as, crossOrigin, delay = 0} = asset;

        setTimeout(() => {
          if (!isMounted) return;
          const link = document.createElement('link');
          link.rel = type;
          link.href = url;

          if (as) link.setAttribute('as', as);
          if (crossOrigin) link.crossOrigin = crossOrigin;

          document.head.appendChild(link);
        }, delay);
      });
    };
    preloadAssets();

    // Clean up when navigating away
    return () => {
      isMounted = false;
      cleanupPreloadLinks();
    };
  }, [pageName]);
}
