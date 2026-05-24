export const SHARE_SECRET = process.env.SHARE_SECRET || 'default-secret-key-for-memegern';

/**
 * Transforms an ArrayBuffer (like an HMAC signature) into a base64url string,
 * suitable for inclusion in a URL query parameter.
 *
 * @param buffer - The raw binary buffer mapping output (e.g., from WebCrypto APIs).
 * @returns A url-safe base64 string excluding padding and standard characters '+', '/'.
 */
export function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Produces a secure hash wrapping an encoded configuration payload using HMAC and 
 * the globally scoped secret key preventing localized tampering.
 *
 * @param data - The base content string to sign.
 * @param secret - An optional override for the server signing secret token (falls back to process.env.SHARE_SECRET).
 * @returns An async promise yielding a url-safe base64 authorization signature.
 */
export async function signData(data: string, secret: string = SHARE_SECRET): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return arrayBufferToBase64Url(signatureBuffer);
}

/**
 * Recalculates the requested data's HMAC signature and checks if the outputs match 
 * exactly as an integrity verification loop verifying untampered source content.
 *
 * @param data - The configuration payload requiring validation.
 * @param signature - The signature asserted by the request query parameters.
 * @param secret - The environment symmetric verification key for checking payload authenticity.
 * @returns Resolves true if signatures safely match without any collision.
 */
export async function verifySignature(data: string, signature: string, secret: string = SHARE_SECRET): Promise<boolean> {
  const expectedSignature = await signData(data, secret);
  return signature === expectedSignature;
}