/**
 * Saves a generated meme data URL to the browser's IndexedDB.
 * Used to power the offline gallery component without relying on remote sync.
 *
 * @param dataUrl - The serialized base-64 image payload ready for immediate display.
 * @returns A promise resolving to true upon successful transaction completion.
 */
export const saveMemeToGallery = async (dataUrl: string) => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MemeGallery', 1);
    
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('memes')) {
        db.createObjectStore('memes', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      const tx = db.transaction('memes', 'readwrite');
      const store = tx.objectStore('memes');
      const addRequest = store.add({ image: dataUrl, createdAt: Date.now() });
      
      addRequest.onsuccess = () => resolve(true);
      addRequest.onerror = () => reject(addRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
};

/**
 * Fetches the entire indexed list of saved memes.
 * Used internally by the offline gallery viewer.
 *
 * @returns A promise resolving to an array of cached meme objects mapping `{ id, image, createdAt }`.
 */
export const getGalleryMemes = async () => {
  return new Promise<any[]>((resolve, reject) => {
    const request = indexedDB.open('MemeGallery', 1);
    
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('memes')) {
        db.createObjectStore('memes', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      const tx = db.transaction('memes', 'readonly');
      const store = tx.objectStore('memes');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
};
