import {useState} from 'react';
import {openDB, clearAllDatabases} from '../utils/db';

export default function Simulation() {
  const [isRunning, setIsRunning] = useState(false);
  const [visitCount, setVisitCount] = useState(0);
  const [totalVisits, setTotalVisits] = useState(15);

  const transitionProbs = {
    '/': {'/product-list': 0.6, '/about': 0.3, '/contact': 0.1},
    '/product-list': {'/product-details': 0.7, '/': 0.2, '/about': 0.1},
    '/product-details': {'/about': 0.5, '/': 0.3, '/contact': 0.2},
    '/about': {'/contact': 0.6, '/': 0.3, '/product-list': 0.1},
    '/contact': {'/': 0.7, '/product-list': 0.2, '/about': 0.1}
  };
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0'
  ];

  const startSimulation = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setVisitCount(0);
    try {
      console.log('Clearing previous data...');
      await clearAllDatabases();
      localStorage.removeItem('recent_visits');
      sessionStorage.removeItem('nav_path');
      localStorage.setItem('consent', 'true');
      setTimeout(() => navigateNextPage(0, '/'), 1000);
    } catch (error) {
      console.error('Error starting simulation:', error);
      setIsRunning(false);
    }
  };

  const navigateNextPage = (currentCount, currentPath) => {
    if (currentCount >= totalVisits) {
      console.log('Simulation complete, exporting JSON...');
      exportLogs();
      setIsRunning(false);
      return;
    }
    const probs = transitionProbs[currentPath];
    const rand = Math.random();
    let cumulative = 0;
    let nextPath = currentPath;
    for (const [path, prob] of Object.entries(probs)) {
      cumulative += prob;
      if (rand <= cumulative) {
        nextPath = path;
        break;
      }
    }
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    console.log(`Navigating to: ${nextPath} (${currentCount + 1}/${totalVisits})`);
    Object.defineProperty(navigator, 'userAgent', {value: userAgent, writable: true});
    window.history.pushState({}, '', nextPath);
    window.dispatchEvent(new PopStateEvent('popstate', {state: {}}));
    setVisitCount(currentCount + 1);
    setTimeout(() => navigateNextPage(currentCount + 1, nextPath), 5500);
  };

  const exportLogs = async () => {
    try {
      const db = await openDB('predictpulse_logs');
      const logs = await db.getAll('logs');
      if (logs.length === 0) {
        alert('No logs found.');
        return;
      }
      console.log(`Exported logs: ${logs.length} entries`);
      const jsonString = JSON.stringify(logs, null, 2);
      const blob = new Blob([jsonString], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'predictpulse_mockdata.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export logs:', error);
      alert(`Error exporting logs: ${error.message}`);
    }
  };

  const switchToFiftyVisits = () => setTotalVisits(50);

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      zIndex: 1000,
      background: '#f0f0f0',
      padding: '10px',
      borderRadius: '5px'
    }}>
      {!isRunning ? (
        <>
          <button onClick={startSimulation}>Start {totalVisits} Visit Simulation</button>
          {totalVisits === 15 && (
            <button onClick={switchToFiftyVisits} style={{marginLeft: '10px'}}>Switch to 50 Visits</button>
          )}
          <button onClick={exportLogs} style={{marginLeft: '10px'}}>Download Logs</button>
        </>
      ) : (
        <div>Simulating: {visitCount}/{totalVisits} visits</div>
      )}
    </div>
  );
}