// src/services/offlineStorage.js

const DB_NAME = 'workbase-offline';
const DB_VERSION = 1;
const RECEIPTS_STORE = 'receipts';
const UPLOAD_QUEUE_STORE = 'uploadQueue';

// Open/create database
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create receipts store (for caching)
      if (!db.objectStoreNames.contains(RECEIPTS_STORE)) {
        const receiptStore = db.createObjectStore(RECEIPTS_STORE, { keyPath: 'id' });
        receiptStore.createIndex('projectId', 'projectId', { unique: false });
        receiptStore.createIndex('synced', 'synced', { unique: false });
      }

      // Create upload queue store (for pending uploads)
      if (!db.objectStoreNames.contains(UPLOAD_QUEUE_STORE)) {
        const queueStore = db.createObjectStore(UPLOAD_QUEUE_STORE, { 
          keyPath: 'id',
          autoIncrement: true 
        });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// ============================================
// RECEIPT CACHING (for offline viewing)
// ============================================

export async function cacheReceipt(receipt) {
  try {
    const db = await openDB();
    const transaction = db.transaction([RECEIPTS_STORE], 'readwrite');
    const store = transaction.objectStore(RECEIPTS_STORE);
    
    await store.put({
      ...receipt,
      cachedAt: new Date().toISOString(),
      synced: true
    });

    return { success: true };
  } catch (error) {
    console.error('Error caching receipt:', error);
    return { success: false, error: error.message };
  }
}

export async function getCachedReceipts(projectId) {
  try {
    const db = await openDB();
    const transaction = db.transaction([RECEIPTS_STORE], 'readonly');
    const store = transaction.objectStore(RECEIPTS_STORE);
    const index = store.index('projectId');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(projectId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting cached receipts:', error);
    return [];
  }
}

export async function getCachedReceipt(receiptId) {
  try {
    const db = await openDB();
    const transaction = db.transaction([RECEIPTS_STORE], 'readonly');
    const store = transaction.objectStore(RECEIPTS_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.get(receiptId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting cached receipt:', error);
    return null;
  }
}

// ============================================
// UPLOAD QUEUE (for offline uploads)
// ============================================

export async function addToUploadQueue(receiptData) {
  try {
    const db = await openDB();
    const transaction = db.transaction([UPLOAD_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(UPLOAD_QUEUE_STORE);
    
    const queueItem = {
      ...receiptData,
      timestamp: new Date().toISOString(),
      retries: 0
    };

    return new Promise((resolve, reject) => {
      const request = store.add(queueItem);
      request.onsuccess = () => resolve({ success: true, id: request.result });
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error adding to queue:', error);
    return { success: false, error: error.message };
  }
}

export async function getUploadQueue() {
  try {
    const db = await openDB();
    const transaction = db.transaction([UPLOAD_QUEUE_STORE], 'readonly');
    const store = transaction.objectStore(UPLOAD_QUEUE_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting queue:', error);
    return [];
  }
}

export async function removeFromQueue(id) {
  try {
    const db = await openDB();
    const transaction = db.transaction([UPLOAD_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(UPLOAD_QUEUE_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve({ success: true });
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error removing from queue:', error);
    return { success: false, error: error.message };
  }
}

export async function clearQueue() {
  try {
    const db = await openDB();
    const transaction = db.transaction([UPLOAD_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(UPLOAD_QUEUE_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve({ success: true });
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error clearing queue:', error);
    return { success: false, error: error.message };
  }
}