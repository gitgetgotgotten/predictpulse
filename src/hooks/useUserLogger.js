import {useEffect, useRef} from 'react';
import {openDB} from '../utils/db';
import {v4 as uuidv4} from 'uuid';

let uploadTimeout = null;
let lastLogTime = 0;

export function useUserLogger(page) {
  const isLogging = useRef(false);
  const lastLoggedPage = useRef(null);
  const assetsRef = useRef([]);

  const uploadLogs = async () => {
    try {
      const db = await openDB('predictpulse_logs', 1);
      const newLogs = await db.getAll('logs');
      console.info(`[useUserLogger] Retrieved ${newLogs.length} logs from IndexedDB`);
      if (newLogs.length === 0) return;

      const response = await fetch('https://server-alis-projects-bdb60a7c.vercel.app/api/upload-logs', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(newLogs)
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      await db.clear('logs');
      console.info(`[useUserLogger] Uploaded ${newLogs.length} logs to server`);
    } catch (error) {
      console.error('[useUserLogger] Error uploading logs:', error);
    }
  };

  const scheduleUpload = () => {
    const now = Date.now();
    lastLogTime = now;
    if (uploadTimeout) clearTimeout(uploadTimeout);
    uploadTimeout = setTimeout(() => {
      if (now === lastLogTime) uploadLogs();
    }, 8000);
  };

  useEffect(() => {
    let observer = null;
    let paintObserver = null;

    const logVisit = async () => {
      if (!localStorage.getItem('consent') || isLogging.current || lastLoggedPage.current === page) return;
      isLogging.current = true;
      lastLoggedPage.current = page;

      const sessionId = sessionStorage.getItem('sessionId') || uuidv4();
      sessionStorage.setItem('sessionId', sessionId);
      let navPath = JSON.parse(sessionStorage.getItem('navPath') || '[]');
      if (navPath[navPath.length - 1] !== page) navPath.push(page);
      sessionStorage.setItem('navPath', JSON.stringify(navPath));

      assetsRef.current = [];
      paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') assetsRef.current.push({url: 'fcp', type: 'paint'});
        }
      });
      paintObserver.observe({entryTypes: ['paint']});

      observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (['img', 'script', 'link', 'font'].includes(entry.initiatorType)) {
            assetsRef.current.push({
              url: entry.name.replace('https://gitgetgotgotten.github.io', ''),
              type: entry.initiatorType,
              fromCache: entry.transferSize === 0
            });
          }
        });
        if (assetsRef.current.length > 50) {
          observer.disconnect();
        }
      });
      observer.observe({entryTypes: ['resource']});

      await new Promise(resolve => setTimeout(resolve, 2000));
      const navTiming = performance.getEntriesByType('navigation')[0];
      const loadTime = navTiming ? navTiming.duration : 100;

      const logEntry = {
        visitId: `${sessionId}-${uuidv4()}`,
        page,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        navPath,
        assets: assetsRef.current,
        screenWidth: window.innerWidth,
        loadTime
      };

      const db = await openDB('predictpulse_logs', 1);
      await db.put('logs', logEntry);
      scheduleUpload();
      isLogging.current = false;
    };

    logVisit();
    return () => {
      if (observer) observer.disconnect();
      if (paintObserver) paintObserver.disconnect();
    };
  }, [page]);
}