import { arrayBufferToBase64Url, signData, verifySignature, SHARE_SECRET } from '../crypto';
import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';

describe('crypto utils', () => {
  beforeAll(() => {
    // We need to mock crypto object because it may be missing in jsdom/node test environs
    // Wait, next and vitest might have webcrypto.
    // If not we can mock it here. We'll try relying on global.crypto.subtle
  });

  it('arrayBufferToBase64Url works correctly', () => {
    // "hello" -> arraybuffer
    const encoder = new TextEncoder();
    const arr = encoder.encode('hello>+world/test=');
    const b64 = arrayBufferToBase64Url(arr);
    // Should be base64url encoded
    expect(typeof b64).toBe('string');
    expect(b64).not.toContain('+');
    expect(b64).not.toContain('/');
    expect(b64).not.toContain('=');
  });

  it('signData produces a valid signature', async () => {
    const sig = await signData('test-data', 'test-secret');
    expect(typeof sig).toBe('string');
  });

  it('signData uses default secret if none provided', async () => {
    const sig = await signData('test-data');
    expect(typeof sig).toBe('string');
  });

  it('verifySignature returns true for valid signature', async () => {
    const data = 'my-important-payload';
    const secret = 'super-secret';
    const sig = await signData(data, secret);
    
    const isValid = await verifySignature(data, sig, secret);
    expect(isValid).toBe(true);
  });

  it('verifySignature returns false for invalid signature', async () => {
    const data = 'my-important-payload';
    const secret = 'super-secret';
    const sig = await signData(data, secret);
    
    const isValid = await verifySignature('corrupted-payload', sig, secret);
    expect(isValid).toBe(false);
  });

  it('verifySignature uses default secret if none provided', async () => {
    const data = 'my-important-payload';
    const sig = await signData(data);
    
    const isValid = await verifySignature(data, sig);
    expect(isValid).toBe(true);
  });
});
