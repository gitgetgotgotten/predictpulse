// src/hooks/useUserLogger.js
import {useEffect} from 'react';
import {UAParser} from 'ua-parser-js';
import {filterPageAssets} from '../utils/predictAssets';
import {openDB} from 'idb';

export function useUserLogger(pageName) {
  useEffect(() => {
    if (!localStorage.getItem('consent')) return;

    const navPath = JSON.parse(sessionStorage.getItem('nav_path') || '[]');
    if (navPath.length === 0 || navPath[navPath.length - 1] !== pageName) {
      navPath.push(pageName);
      if (navPath.length > 2) navPath.shift();
      sessionStorage.setItem('nav_path', JSON.stringify(navPath));
    }

    const loggingTimeout = setTimeout(() => {
      logPageVisit(pageName, navPath);
    }, 1000);

    return () => clearTimeout(loggingTimeout);
  }, [pageName]);
}

async function logPageVisit(pageName, navPath) {
  console.log(`Logging for page: ${pageName}`);
  const parser = new UAParser();
  const uaResult = parser.getResult();
  const visitId = `${pageName}-${new Date().toISOString()}`;
  const resources = performance.getEntriesByType('resource').map(entry => ({
    url: entry.name,
    fromCache: entry.transferSize === 0 || entry.decodedBodySize === 0 || entry.initiatorType === 'link',
    transferSize: entry.transferSize,
    decodedBodySize: entry.decodedBodySize
  }));
  const assets = filterPageAssets(pageName, resources);
  const navEntry = performance.getEntriesByType('navigation')[0];
  const loadTime = navEntry ? navEntry.domContentLoadedEventEnd - navEntry.startTime : 100;

  const logEntry = {
    time: new Date().toISOString(),
    page: pageName,
    visitId,
    userAgent: navigator.userAgent,
    device: uaResult.device.type || 'desktop',
    os: uaResult.os.name || 'Unknown',
    browser: uaResult.browser.name || 'Unknown',
    assets,
    navPath: [...navPath],
    screen: {width: window.innerWidth, height: window.innerHeight},
    loadTime
  };

  const db = await openDB('predictpulse_logs', 1, {
    upgrade(db) {
      db.createObjectStore('logs', {keyPath: 'visitId'});
    }
  });
  await db.put('logs', logEntry);

  // Upload to GitHub
  try {
    const repoUrl = 'https://api.github.com/repos/gitgetgotgotten/predictpulse-data/contents/predictpulse_realdata.json';
    // Fetch existing logs
    let existingLogs = [];
    let sha;
    try {
      const getResponse = await fetch(repoUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('github_token')}`
        }
      });
      if (getResponse.ok) {
        const data = await getResponse.json();
        existingLogs = JSON.parse(atob(data.content));
        sha = data.sha;
      }
    } catch (error) {
      if (error.status !== 404) {
        console.error('Failed to fetch existing logs:', error);
      }
    }

    // Append new log
    const updatedLogs = [...existingLogs, logEntry];
    const response = await fetch(repoUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('github_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Append log from ${navigator.userAgent.slice(0, 50)}`,
        content: btoa(JSON.stringify(updatedLogs)),
        branch: 'data',
        sha // Include sha for updates
      })
    });
    if (response.ok) {
      console.log('Log uploaded to GitHub:', visitId);
      await db.delete('logs', visitId);
    }
  } catch (error) {
    console.error('Failed to upload log:', error);
  }
}