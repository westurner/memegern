import { saveMemeToGallery, getGalleryMemes, deleteMemeFromGallery, updateMemeStatus, emptyTrash } from '../storage';
import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('Storage Utils', () => {
  beforeEach(() => {
    // Reset indexedDB mock before each test
    const dummyDB = {
      objectStoreNames: { contains: vi.fn().mockReturnValue(false) },
      createObjectStore: vi.fn(),
      transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn().mockReturnValue({
          add: vi.fn().mockImplementation(() => {
            const req: any = {};
            setTimeout(() => req.onsuccess && req.onsuccess(), 0);
            return req;
          }),
          getAll: vi.fn().mockImplementation(() => {
            const req: any = { result: [{ id: 1, image: 'mock-url', inTrash: true }, { id: 2, image: 'mock-url2', inTrash: false }] };
            setTimeout(() => req.onsuccess && req.onsuccess(), 0);
            return req;
          }),
          delete: vi.fn().mockImplementation(() => {
            const req: any = {};
            setTimeout(() => req.onsuccess && req.onsuccess(), 0);
            return req;
          }),
          get: vi.fn().mockImplementation(() => {
            const req: any = { result: { id: 1, inTrash: false } };
            setTimeout(() => req.onsuccess && req.onsuccess(), 0);
            return req;
          }),
          put: vi.fn().mockImplementation(() => {
            const req: any = {};
            setTimeout(() => req.onsuccess && req.onsuccess(), 0);
            return req;
          })
        })
      })
    };

    (global as any).indexedDB = {
      open: vi.fn().mockImplementation(() => {
        const req: any = {};
        setTimeout(() => {
          if (req.onupgradeneeded) req.onupgradeneeded({ target: { result: dummyDB } });
          if (req.onsuccess) req.onsuccess({ target: { result: dummyDB } });
        }, 0);
        return req;
      })
    };
  });

  it('saves a meme to the gallery', async () => {
    const result = await saveMemeToGallery('data:image/jpeg;base64,123');
    expect(result).toBe(true);
  });

  it('gets memes from the gallery', async () => {
    const memes = await getGalleryMemes();
    expect(memes).toHaveLength(2);
    expect(memes[0].id).toBe(1);
  });

  it('deletes a meme from the gallery', async () => {
    const result = await deleteMemeFromGallery(1);
    expect(result).toBe(true);
  });

  it('updates meme status', async () => {
    const result = await updateMemeStatus(1, true);
    expect(result).toBe(true);
  });

  it('returns false when updating status of non-existent meme', async () => {
    const dummyDB = {
      transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn().mockReturnValue({
          get: vi.fn().mockImplementation(() => {
            const req: any = { result: null };
            setTimeout(() => req.onsuccess && req.onsuccess(), 0);
            return req;
          })
        })
      })
    };
    (global as any).indexedDB = {
      open: vi.fn().mockImplementation(() => {
        const req: any = {};
        setTimeout(() => {
          if (req.onsuccess) req.onsuccess({ target: { result: dummyDB } });
        }, 0);
        return req;
      })
    };

    const result = await updateMemeStatus(999, true);
    expect(result).toBe(false);
  });

  it('empties trash', async () => {
    const result = await emptyTrash();
    expect(result).toBe(true);
  });

  it('handles existing object store and onerror for all ops', async () => {
    // Modify indexedDB mock to trigger onerror
    const dummyDB = {
      objectStoreNames: { contains: vi.fn().mockReturnValue(true) }, // existing store
      createObjectStore: vi.fn(),
      transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn().mockReturnValue({
          add: vi.fn().mockImplementation(() => {
            const req: any = { error: new Error('Add failed') };
            setTimeout(() => req.onerror && req.onerror(), 0);
            return req;
          }),
          getAll: vi.fn().mockImplementation(() => {
            const req: any = { error: new Error('Get failed') };
            setTimeout(() => req.onerror && req.onerror(), 0);
            return req;
          }),
          delete: vi.fn().mockImplementation(() => {
            const req: any = { error: new Error('Delete failed') };
            setTimeout(() => req.onerror && req.onerror(), 0);
             return req;
          }),
          get: vi.fn().mockImplementation(() => {
            const req: any = { error: new Error('Get failed') };
            setTimeout(() => req.onerror && req.onerror(), 0);
            return req;
          }),
          put: vi.fn().mockImplementation(() => {
            const req: any = { error: new Error('Put failed') };
            setTimeout(() => req.onerror && req.onerror(), 0);
            return req;
          })
        })
      })
    };

    (global as any).indexedDB = {
      open: vi.fn().mockImplementation(() => {
        const req: any = {};
        setTimeout(() => {
          if (req.onupgradeneeded) req.onupgradeneeded({ target: { result: dummyDB } });
          if (req.onsuccess) req.onsuccess({ target: { result: dummyDB } });
        }, 0);
        return req;
      })
    };

    await expect(saveMemeToGallery('test')).rejects.toThrow();
    await expect(getGalleryMemes()).rejects.toThrow();
    await expect(deleteMemeFromGallery(1)).rejects.toThrow();
    await expect(updateMemeStatus(1, true)).rejects.toThrow();
    await expect(emptyTrash()).rejects.toThrow();
  });

  it('handles put error when updating status', async () => {
    const dummyDB = {
      transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn().mockReturnValue({
          get: vi.fn().mockImplementation(() => {
            const req: any = { result: { id: 1, inTrash: false } };
            setTimeout(() => req.onsuccess && req.onsuccess(), 0);
            return req;
          }),
          put: vi.fn().mockImplementation(() => {
            const req: any = { error: new Error('Put failed') };
            setTimeout(() => req.onerror && req.onerror(), 0);
            return req;
          })
        })
      })
    };
    (global as any).indexedDB = {
      open: vi.fn().mockImplementation(() => {
        const req: any = {};
        setTimeout(() => {
          if (req.onsuccess) req.onsuccess({ target: { result: dummyDB } });
        }, 0);
        return req;
      })
    };

    await expect(updateMemeStatus(1, true)).rejects.toThrow();
  });

  it('handles indexedDB.open onerror for all', async () => {
    (global as any).indexedDB = {
      open: vi.fn().mockImplementation(() => {
        const req: any = { error: new Error('Open failed') };
        setTimeout(() => {
          if (req.onerror) req.onerror();
        }, 0);
        return req;
      })
    };

    await expect(saveMemeToGallery('test')).rejects.toThrow();
    await expect(getGalleryMemes()).rejects.toThrow();
    await expect(deleteMemeFromGallery(1)).rejects.toThrow();
    await expect(updateMemeStatus(1, true)).rejects.toThrow();
    await expect(emptyTrash()).rejects.toThrow();
  });
});
