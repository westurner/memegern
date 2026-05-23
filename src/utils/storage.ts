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
