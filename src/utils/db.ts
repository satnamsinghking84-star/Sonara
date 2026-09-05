const DB_NAME = 'SonoraStudioDB';
const DB_VERSION = 2;
const AUDIO_STORE = 'audioStore';
const MEDIA_STORE = 'mediaStore';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE);
      }
      if (!db.objectStoreNames.contains(MEDIA_STORE)) {
        db.createObjectStore(MEDIA_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAudioTrack(blob: Blob, name: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(AUDIO_STORE, 'readwrite');
    const store = tx.objectStore(AUDIO_STORE);
    store.put({ blob, name, updatedAt: Date.now() }, 'current_audio');
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (e) {
    console.warn('Could not save audio to IndexedDB:', e);
  }
}

export async function getStoredAudioTrack(): Promise<{ blob: Blob; name: string } | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(AUDIO_STORE, 'readonly');
    const store = tx.objectStore(AUDIO_STORE);
    const request = store.get('current_audio');
    return new Promise((resolve) => {
      request.onsuccess = () => {
        if (request.result && request.result.blob) {
          resolve({ blob: request.result.blob, name: request.result.name });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch (e) {
    console.warn('Could not read audio from IndexedDB:', e);
    return null;
  }
}

export async function deleteStoredAudioTrack(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(AUDIO_STORE, 'readwrite');
    const store = tx.objectStore(AUDIO_STORE);
    store.delete('current_audio');
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (e) {
    console.warn('Could not delete audio from IndexedDB:', e);
  }
}

export async function saveBgAudioTrack(blob: Blob, name: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(AUDIO_STORE, 'readwrite');
    const store = tx.objectStore(AUDIO_STORE);
    store.put({ blob, name, updatedAt: Date.now() }, 'bg_audio');
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (e) {
    console.warn('Could not save background audio to IndexedDB:', e);
  }
}

export async function getStoredBgAudioTrack(): Promise<{ blob: Blob; name: string } | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(AUDIO_STORE, 'readonly');
    const store = tx.objectStore(AUDIO_STORE);
    const request = store.get('bg_audio');
    return new Promise((resolve) => {
      request.onsuccess = () => {
        if (request.result && request.result.blob) {
          resolve({ blob: request.result.blob, name: request.result.name });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch (e) {
    console.warn('Could not read background audio from IndexedDB:', e);
    return null;
  }
}

export async function deleteStoredBgAudioTrack(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(AUDIO_STORE, 'readwrite');
    const store = tx.objectStore(AUDIO_STORE);
    store.delete('bg_audio');
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (e) {
    console.warn('Could not delete background audio from IndexedDB:', e);
  }
}

export async function saveMediaAssets(assets: { id: string; name: string; type: 'image' | 'video'; blob: Blob }[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(MEDIA_STORE, 'readwrite');
    const store = tx.objectStore(MEDIA_STORE);
    store.clear();
    assets.forEach((item, idx) => {
      store.put({ id: item.id, name: item.name, type: item.type, blob: item.blob }, idx);
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (e) {
    console.warn('Could not save media assets to IndexedDB:', e);
  }
}

export async function getStoredMediaAssets(): Promise<{ id: string; name: string; type: 'image' | 'video'; blob: Blob }[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(MEDIA_STORE, 'readonly');
    const store = tx.objectStore(MEDIA_STORE);
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => resolve([]);
    });
  } catch (e) {
    console.warn('Could not read media assets from IndexedDB:', e);
    return [];
  }
}

export async function deleteStoredMediaAssets(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(MEDIA_STORE, 'readwrite');
    const store = tx.objectStore(MEDIA_STORE);
    store.clear();
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (e) {
    console.warn('Could not delete media assets from IndexedDB:', e);
  }
}

