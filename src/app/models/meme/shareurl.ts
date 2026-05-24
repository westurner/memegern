import { verifySignature } from '../../../utils/crypto';

/**
 * Schema for encoding and decoding Meme configuration into Share URLs.
 *
 * MAINTENANCE INSTRUCTIONS:
 * 1. The payload is tightly coupled to the indices of `fields`.
 * 2. When adding new settings or configuration fields, append them to the END 
 *    of the `fields` array in `encodeConfig`.
 * 3. Similarly add them to the END of the parsing extraction in `decodeConfig` 
 *    so older URLs with fewer pipes ('|') can still safely decode existing properties.
 * 4. Update `applyConfig` and `loadSharedConfig` type definitions and property mappings 
 *    to handle any newly appended keys appropriately on the React side.
 * 5. Never remove or re-order existing fields, as it will invalidate previously shared URLs.
 */

/**
 * Serializes text layer settings into an ordered array of values.
 * This establishes the fixed-index property schema used during URL compression.
 * 
 * @param settings - The styling object applied to a specific text layer.
 * @param settings.color - The text color.
 * @param settings.bgColor - The text background color.
 * @param settings.font - The font family name.
 * @param settings.fontSize - The numeric size of the font.
 * @param settings.shadow - Flag indicating if a drop shadow is applied.
 * @returns An array of these settings in sequence
 */
function serializeSettings(settings: any = {}) {
  return [
    settings.color,
    settings.bgColor,
    settings.font,
    settings.fontSize,
    settings.shadow,
  ];
}

/**
 * Encodes a partial or complete meme configuration object into a compact,
 * URL-safe Base64 string by joining its values with pipes ('|').
 * 
 * @param config - The meme configuration object containing text, styling, and template selections.
 * @returns A compact, base64url-encoded string representing the ordered field values.
 */
export function encodeConfig(config: unknown): string {
  const conf: any = config || {};
  const escapeField = (str: unknown) => {
    if (str == null) return '';
    return String(str).replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
  };

  // WARNING: Always append new fields to the end!
  const fields = [
    /** Schema Version */
    'V1',
    conf.templateKey,
    conf.canvasBgColor,
    conf.topText,
    ...serializeSettings(conf.topSettings),
    conf.bottomText,
    ...serializeSettings(conf.bottomSettings),
  ];

  const str = fields.map(escapeField).join('|');

  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodes a previously compressed, pipe-delimited base64url string back into
 * an object mapping the meme properties by index. Falls back to `JSON.parse` 
 * to handle legacy URLs generated before the schema compaction.
 * 
 * @param base64urlStr - The encoded text configuration payload.
 * @returns A loosely typed JavaScript object matching the original configuration fields.
 */
export function decodeConfig(base64urlStr: string): unknown {
  let base64 = base64urlStr.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decoder = new TextDecoder();
  const str = decoder.decode(bytes);

  // Fallback for older JSON-encoded share URLs
  if (str.startsWith('{')) {
    try {
      return JSON.parse(str);
    } catch(e) {}
  }

  const unescapeField = (s: string) => {
    return s.replace(/\\(.)/g, '$1');
  };

  const splitWithEscape = (s: string, separator: string): string[] => {
    const result: string[] = [];
    let current = '';
    let escaped = false;
    for (let i = 0; i < s.length; i++) {
      const char = s[i];
      if (escaped) {
        current += char;
        escaped = false;
      } else if (char === '\\') {
        current += char;
        escaped = true;
      } else if (char === separator) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const rawFields = splitWithEscape(str, '|');
  const fields = rawFields.map(unescapeField);

  let offset = 0;
  if (fields[0] === 'V1') {
    offset = 1;
  }

  const deserializeSettings = (baseOffset: number) => ({
    color: fields[baseOffset],
    bgColor: fields[baseOffset + 1],
    font: fields[baseOffset + 2],
    fontSize: fields[baseOffset + 3] ? Number(fields[baseOffset + 3]) : undefined,
    shadow: fields[baseOffset + 4] === 'true',
  });

  // Read fields strictly by index to support backwards compatibility
  return {
    templateKey: fields[offset + 0],
    canvasBgColor: fields[offset + 1],
    topText: fields[offset + 2],
    topSettings: deserializeSettings(offset + 3),
    bottomText: fields[offset + 8],
    bottomSettings: deserializeSettings(offset + 9),
  };
}

/**
 * Unpacks an encoded configuration payload and applies its keys directly to 
 * the provided React setter functions, repopulating the local editor state.
 * 
 * @param configStr - Base64 encoded pipe payload extracted from the URL query arguments.
 * @param setters - An object holding bound React `useState` dispatch functions.
 */
export function applyConfig(
  configStr: string,
  setters: {
    setTemplateKey: (val: any) => void;
    setTopText: (val: string) => void;
    setBottomText: (val: string) => void;
    setTopSettings: (val: any) => void;
    setBottomSettings: (val: any) => void;
    setCanvasBgColor: (val: string) => void;
  }
) {
  try {
    const config = decodeConfig(configStr) as any;
    if (config.templateKey) setters.setTemplateKey(config.templateKey);
    if (config.topText !== undefined) setters.setTopText(config.topText);
    if (config.bottomText !== undefined) setters.setBottomText(config.bottomText);
    if (config.topSettings) setters.setTopSettings(config.topSettings);
    if (config.bottomSettings) setters.setBottomSettings(config.bottomSettings);
    if (config.canvasBgColor) setters.setCanvasBgColor(config.canvasBgColor);
  } catch (e) {
    console.error('Error decoding config on client', e);
  }
}

/**
 * Rehydrates the application state safely by first executing a cryptographic
 * signature validation check, and then mapping over the React component setters.
 * 
 * @param configStr - Remote encoded base64 configuration payload.
 * @param sigStr - Remote HMAC SHA-256 signature accompanying the payload.
 * @param setters - Component state handlers for injecting verified options.
 */
export function loadSharedConfig(
  configStr: string,
  sigStr: string,
  setters: {
    setTemplateKey: (val: any) => void;
    setTopText: (val: string) => void;
    setBottomText: (val: string) => void;
    setTopSettings: (val: any) => void;
    setBottomSettings: (val: any) => void;
    setCanvasBgColor: (val: string) => void;
  }
) {
  verifySignature(configStr, sigStr).then(isValid => {
    if (isValid) {
      applyConfig(configStr, setters);
    } else {
      console.warn('Invalid signature for shared meme config');
    }
  }).catch(console.error);
}