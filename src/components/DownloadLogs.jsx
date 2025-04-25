import {openDB} from '../utils/db';

export default function DownloadLogs() {
  const exportLogs = async () => {
    try {
      const db = await openDB('predictpulse_logs');
      const tx = db.transaction('logs', 'readonly');
      const store = tx.objectStore('logs');

      const logs = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = reject;
      });

      // Fix the Blob creation
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
    }
  };
  return (
    <button
      style={{position: 'fixed', top: '10px', right: '10px', zIndex: 1000}}
      onClick={exportLogs}
    >
      Download Logs
    </button>
  );
}
