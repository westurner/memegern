import { encodeConfig, decodeConfig, applyConfig, loadSharedConfig } from '../shareurl';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as crypto from '../../../../utils/crypto';

vi.mock('../../../../utils/crypto', () => ({
  verifySignature: vi.fn(),
}));

describe('shareurl utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('encodes and decodes config correctly', () => {
    const config = {
      templateKey: 'philosoraptor',
      canvasBgColor: '#000000',
      topText: 'Hello',
      topSettings: {
        color: '#ffffff',
        bgColor: '#000000',
        font: 'Impact',
        fontSize: 40,
        shadow: true
      },
      bottomText: 'World',
      bottomSettings: {
        color: '#ff0000',
        bgColor: '#00ff00',
        font: 'Arial',
        fontSize: 20,
        shadow: false
      }
    };
    
    const encoded = encodeConfig(config);
    const decoded = decodeConfig(encoded) as any;
    
    expect(decoded.templateKey).toBe(config.templateKey);
    expect(decoded.canvasBgColor).toBe(config.canvasBgColor);
    expect(decoded.topText).toBe(config.topText);
    expect(decoded.bottomText).toBe(config.bottomText);
    expect(decoded.topSettings.color).toBe(config.topSettings.color);
    expect(decoded.bottomSettings.shadow).toBe(config.bottomSettings.shadow);
    expect(decoded.bottomSettings.fontSize).toBe(config.bottomSettings.fontSize);
  });

  it('encodes and decodes with missing settings handling fallback and empty strings', () => {
    const config: any = {
      templateKey: 'doge',
      topText: 'Much wow\\|', // testing escape
      // missing settings intentionally
    };
    
    const encoded = encodeConfig(config);
    const decoded = decodeConfig(encoded) as any;
    
    expect(decoded.templateKey).toBe('doge');
    expect(typeof decoded.topText).toBe('string');
    expect(decoded.topSettings.color).toBe('');
  });

  it('decodes legacy JSON config', () => {
    const config = { legacy: true, foo: 'bar' };
    const str = JSON.stringify(config);
    // base64url encode the json string
    const b64 = btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const decoded = decodeConfig(b64) as any;
    
    expect(decoded.legacy).toBe(true);
    expect(decoded.foo).toBe('bar');
  });

  it('fails gracefully when JSON parse fails on legacy formatted looking string', () => {
    const str = '{bad json';
    const b64 = btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const decoded = decodeConfig(b64) as any;
    // Will not be parsed as valid config probably
    expect(decoded.templateKey).not.toBeUndefined();
  });

  it('decodeConfig ignores padding characters during decode', () => {
    const encoded = encodeConfig({ templateKey: 'test' });
    // Strip trailing padding to simulate url
    const stripped = encoded.replace(/=+$/, '');
    const decoded = decodeConfig(stripped) as any;
    expect(decoded.templateKey).toBe('test');
  });

  it('applyConfig applies decoded values to setters', () => {
    const setters = {
      setTemplateKey: vi.fn(),
      setTopText: vi.fn(),
      setBottomText: vi.fn(),
      setTopSettings: vi.fn(),
      setBottomSettings: vi.fn(),
      setCanvasBgColor: vi.fn(),
    };
    const config = {
      templateKey: 'test-template',
      topText: 'top',
      bottomText: 'bottom',
      topSettings: { color: 'white' },
      bottomSettings: { color: 'black' },
      canvasBgColor: 'gray'
    };
    const encoded = encodeConfig(config);
    applyConfig(encoded, setters);
    
    expect(setters.setTemplateKey).toHaveBeenCalledWith('test-template');
    expect(setters.setTopText).toHaveBeenCalledWith('top');
    expect(setters.setBottomText).toHaveBeenCalledWith('bottom');
    expect(setters.setTopSettings).toHaveBeenCalledWith(expect.objectContaining({ color: 'white' }));
    expect(setters.setBottomSettings).toHaveBeenCalledWith(expect.objectContaining({ color: 'black' }));
    expect(setters.setCanvasBgColor).toHaveBeenCalledWith('gray');
  });

  it('applyConfig catches and console.errors invalid decode', () => {
    const setters = {
      setTemplateKey: vi.fn(),
      setTopText: vi.fn(),
      setBottomText: vi.fn(),
      setTopSettings: vi.fn(),
      setBottomSettings: vi.fn(),
      setCanvasBgColor: vi.fn(),
    };
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Pass completely invalid b64 which causes atob to throw
    applyConfig('ññññ', setters);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('loadSharedConfig verifies and applies config when signature is valid', async () => {
    const setters = {
      setTemplateKey: vi.fn(),
      setTopText: vi.fn(),
      setBottomText: vi.fn(),
      setTopSettings: vi.fn(),
      setBottomSettings: vi.fn(),
      setCanvasBgColor: vi.fn(),
    };
    const config = { templateKey: 'test' };
    const encoded = encodeConfig(config);
    
    vi.mocked(crypto.verifySignature).mockResolvedValueOnce(true);
    await loadSharedConfig(encoded, 'valid-sig', setters);
    
    expect(crypto.verifySignature).toHaveBeenCalledWith(encoded, 'valid-sig');
    expect(setters.setTemplateKey).toHaveBeenCalledWith('test');
  });

  it('loadSharedConfig warns and does not apply config when signature is invalid', async () => {
    const setters = {
      setTemplateKey: vi.fn(),
      setTopText: vi.fn(),
      setBottomText: vi.fn(),
      setTopSettings: vi.fn(),
      setBottomSettings: vi.fn(),
      setCanvasBgColor: vi.fn(),
    };
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    vi.mocked(crypto.verifySignature).mockResolvedValueOnce(false);
    await loadSharedConfig('config', 'invalid-sig', setters);
    
    expect(setters.setTemplateKey).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Invalid signature for shared meme config');
    consoleSpy.mockRestore();
  });

  it('loadSharedConfig errors silently on verification throw', async () => {
    const setters = {
      setTemplateKey: vi.fn(),
      setTopText: vi.fn(),
      setBottomText: vi.fn(),
      setTopSettings: vi.fn(),
      setBottomSettings: vi.fn(),
      setCanvasBgColor: vi.fn(),
    };
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    vi.mocked(crypto.verifySignature).mockRejectedValueOnce(new Error('verify failed'));
    await loadSharedConfig('config', 'sig', setters);
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('encodeConfig handles null gracefully', () => {
    const encoded = encodeConfig(null);
    const decoded = decodeConfig(encoded) as any;
    expect(decoded.templateKey).toBe('');
  });
});

  it('applyConfig branch coverage for missing fields', () => {
    const setters = {
      setTemplateKey: vi.fn(),
      setTopText: vi.fn(),
      setBottomText: vi.fn(),
      setTopSettings: vi.fn(),
      setBottomSettings: vi.fn(),
      setCanvasBgColor: vi.fn(),
    };
    // encode an empty object directly
    const mockB64 = btoa('{}');
    // Using a legacy JSON parseable string that doesn't have any of the fields
    applyConfig(mockB64, setters);
    expect(setters.setTemplateKey).not.toHaveBeenCalled();
    expect(setters.setTopText).not.toHaveBeenCalled();
    expect(setters.setBottomText).not.toHaveBeenCalled();
  });
