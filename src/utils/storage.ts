/**
 * Saves a generated meme data URL to the browser's IndexedDB.
 * Used to power the offline gallery component without relying on remote sync.
 *
 * @param dataUrl - The serialized base-64 image payload ready for immediate display.
 * @param config - The encoded configuration string for re-editing the meme.
 * @returns A promise resolving to true upon successful transaction completion.
 */
export const saveMemeToGallery = async (dataUrl: string, config?: string) => {
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
      const addRequest = store.add({ image: dataUrl, config, createdAt: Date.now() });
      
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
 * @returns A promise resolving to an array of cached meme objects mapping `{ id, image, config, createdAt }`.
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
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
};

/**
 * Deletes a meme from the browser's IndexedDB.
 *
 * @param id - The ID of the meme to delete.
 * @returns A promise resolving to true upon successful deletion.
 */
export const deleteMemeFromGallery = async (id: number) => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MemeGallery', 1);
    
    request.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      const tx = db.transaction('memes', 'readwrite');
      const store = tx.objectStore('memes');
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve(true);
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
};

/**
 * Updates the trash status of a meme.
 */
export const updateMemeStatus = async (id: number, inTrash: boolean) => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MemeGallery', 1);
    
    request.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      const tx = db.transaction('memes', 'readwrite');
      const store = tx.objectStore('memes');
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const data = getRequest.result;
        if (data) {
          data.inTrash = inTrash;
          const putRequest = store.put(data);
          putRequest.onsuccess = () => resolve(true);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(false);
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
};

/**
 * Empties all memes currently in the trash.
 */
export const emptyTrash = async () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MemeGallery', 1);
    
    request.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      const tx = db.transaction('memes', 'readwrite');
      const store = tx.objectStore('memes');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        const memes = getAllRequest.result as SavedMeme[];
        memes.forEach(meme => {
          if (meme.inTrash) {
            store.delete(meme.id);
          }
        });
        resolve(true);
      };
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
};
