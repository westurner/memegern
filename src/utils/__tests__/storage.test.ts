import { saveMemeToGallery, getGalleryMemes } from '../storage';
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
            const req: any = { result: [{ id: 1, image: 'mock-url' }] };
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
    expect(memes).toHaveLength(1);
    expect(memes[0].id).toBe(1);
  });

  it('handles existing object store and onerror', async () => {
    // Modify indexedDB mock to trigger onerror
    const dummyDB = {
      objectStoreNames: { contains: vi.fn().mockReturnValue(true) }, // existing store
      createObjectStore: vi.fn(),
      transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn().mockReturnValue({
          add: vi.fn().mockImplementation(() => {
            const req: any = {};
            setTimeout(() => req.onerror && req.onerror({ target: { error: new Error('Add failed') } }), 0);
            return req;
          }),
          getAll: vi.fn().mockImplementation(() => {
            const req: any = {};
            setTimeout(() => req.onerror && req.onerror({ target: { error: new Error('Get failed') } }), 0);
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
  });
});
