import {useEffect, useRef} from 'react';
import {openDB} from '../utils/db';
import {v4 as uuidv4} from 'uuid';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'https://server-alis-projects-bdb60a7c.vercel.app';
const MAX_RETRIES = 3;
let uploadTimeout = null;
let lastLogTime = 0;

export function useUserLogger(page) {
  const isLogging = useRef(false);
  const lastLoggedPage = useRef(null);
  const assetsRef = useRef([]);

  const uploadLogs = async (retries = 0) => {
    try {
      const db = await openDB('predictpulse_logs', 1);
      const newLogs = await db.getAll('logs');
      if (!newLogs.length) return;

      const response = await fetch(`${SERVER_URL}/api/upload-logs`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(newLogs),
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      await db.clear('logs');
      console.info(`Uploaded ${newLogs.length} logs`);
    } catch (error) {
      console.error('Upload error:', error);
      if (retries < MAX_RETRIES) {
        const delay = Math.pow(2, retries) * 1000; // Exponential backoff
        setTimeout(() => uploadLogs(retries + 1), delay);
      }
    }
  };

  const scheduleUpload = () => {
    const now = Date.now();
    lastLogTime = now;
    if (uploadTimeout) clearTimeout(uploadTimeout);
    uploadTimeout = setTimeout(() => now === lastLogTime && uploadLogs(), 8000);
  };

  useEffect(() => {
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
      const observer = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          if (['img', 'script', 'link', 'font'].includes(entry.initiatorType)) {
            assetsRef.current.push({
              url: entry.name.replace(/^https?:\/\/[^/]+/, ''),
              type: entry.initiatorType,
              fromCache: entry.transferSize === 0,
            });
          }
        });
      });
      observer.observe({entryTypes: ['resource']});

      await new Promise(resolve => setTimeout(resolve, 2000));
      observer.disconnect();

      const navTiming = performance.getEntriesByType('navigation')[0];
      const logEntry = {
        visitId: `${sessionId}-${uuidv4()}`,
        page,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        navPath,
        assets: assetsRef.current,
        screenWidth: window.innerWidth,
        loadTime: navTiming?.duration || 100,
      };

      const db = await openDB('predictpulse_logs', 1);
      await db.put('logs', logEntry);
      scheduleUpload();
      isLogging.current = false;
    };

    logVisit();
    return () => uploadTimeout && clearTimeout(uploadTimeout);
  }, [page]);
}