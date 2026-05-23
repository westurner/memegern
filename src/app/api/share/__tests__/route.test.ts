import { POST } from '../route';
import { describe, expect, it } from 'vitest';

describe('Share API Route', () => {
  it('returns a successful response with a generated URL', async () => {
    const request = new Request('http://localhost:3000/api/share', {
      method: 'POST',
      body: JSON.stringify({ image: 'data:image/jpeg;base64,12345' }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.url).toBeDefined();
  });

  it('handles errors properly', async () => {
    // A request without a valid JSON body will throw an error
    const request = new Request('http://localhost:3000/api/share', {
      method: 'POST',
      body: 'invalid-json'
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe('Failed to share meme');
  });
});
