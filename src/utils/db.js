import {openDB as idbOpenDB} from 'idb';

export function openDB(dbName) {
  return idbOpenDB(dbName, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('logs')) {
        db.createObjectStore('logs', {keyPath: 'visitId'});
        console.log(`Created store logs in database ${dbName}`);
      }
    }
  });
}

export function clearAllDatabases() {
  return new Promise((resolve, reject) => {
    const deleteRequest = indexedDB.deleteDatabase('predictpulse_logs');
    deleteRequest.onsuccess = () => {
      console.log('Database deleted successfully');
      resolve();
    };
    deleteRequest.onerror = (event) => {
      console.error('Error deleting database:', event.target.error);
      reject(event.target.error);
    };
  });
}