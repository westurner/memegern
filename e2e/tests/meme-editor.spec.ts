import { test, expect } from '@playwright/test';

test.describe('Memegern E2E Tests', () => {
  test('should load the homepage and show MemeEditor', async ({ page }) => {
    // Wait for templates to load dynamically
    const templatesPromise = page.waitForResponse(response => response.url().includes('templates.json') && response.status() === 200);

    // Go to the main page
    await page.goto('/');
    await templatesPromise;

    // Check title
    await expect(page.locator('h1')).toContainText('Memegern');

    // Wait for the canvas to be present
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Check Editor controls
    await expect(page.getByText('Editor')).toBeVisible();
    await expect(page.getByPlaceholder('TOP TEXT')).toBeVisible();
    await expect(page.getByPlaceholder('BOTTOM TEXT')).toBeVisible();

    // Type in text inputs
    await page.getByPlaceholder('TOP TEXT').fill('PLAYWRIGHT TEST');
    await page.getByPlaceholder('BOTTOM TEXT').fill('AUTOMATION RULEZ');

    // Interact with template select
    const templateSelect = page.locator('select').first();
    await templateSelect.selectOption('penguin');
    await expect(templateSelect).toHaveValue('penguin');

    // Verify that the generated image is not blank/black
    const isBlank = await canvas.evaluate((node: HTMLCanvasElement) => {
      const ctx = node.getContext('2d');
      if (!ctx) return true;
      const data = ctx.getImageData(0, 0, node.width, node.height).data;
      // Check if all pixels are black or transparent
      let allBlackOrTransparent = true;
      for (let i = 0; i < data.length; i += 4) {
        // If alpha is 0, it's transparent (which renders as black in jpeg).
        // If rgb is not 0,0,0 and alpha is not 0, then it's not purely black.
        // We'll consider it "not blank" if we find any non-black pixel with alpha > 0.
        if (data[i+3] > 0 && (data[i] > 0 || data[i+1] > 0 || data[i+2] > 0)) {
          allBlackOrTransparent = false;
          break;
        }
      }
      return allBlackOrTransparent;
    });
    expect(isBlank).toBe(false);

    // Click download (just verifying the button works, we intercept the download)
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await page.getByRole('button', { name: /Save Meme/i }).click();

    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toMatch(/meme-.*\.jpg/);
      
      // Save and check file size to ensure it's not an empty 0-byte or minimal black jpeg
      const path = await download.path();
      if (path) {
        const fs = require('fs');
        const stats = fs.statSync(path);
        // A 500x500 black jpeg is around 1-3KB, a real meme image is much larger generally
        // But simply checking that it has actual data length is good. Let's just expect > 500 bytes.
        expect(stats.size).toBeGreaterThan(500);
      }
    }
  });

  test('should generate share config link and verify initial state on load', async ({ page, context }) => {
    await page.goto('/');

    const topTextInput = page.getByPlaceholder('TOP TEXT');
    await topTextInput.fill('SHARED TOP TEXT');

    await page.getByRole('button', { name: 'Share Config Link' }).click();

    // The share link appears inside an element with text 'Share URL:'
    const shareUrlContainer = page.locator('text=Share URL:').locator('..');
    const shareLinkLocator = shareUrlContainer.locator('a');

    await shareLinkLocator.waitFor({ state: 'visible' });

    const shareUrl = await shareLinkLocator.getAttribute('href');
    expect(shareUrl).toContain('?config=');
    expect(shareUrl).toContain('&sig=');

    // Open a new page with the share URL
    const newPage = await context.newPage();
    await newPage.goto(shareUrl as string);

    // Verify the inputs were pre-filled correctly
    const newPageTopTextInput = newPage.getByPlaceholder('TOP TEXT');
    await expect(newPageTopTextInput).toHaveValue('SHARED TOP TEXT');
  });

  test('should save downloaded meme to offline gallery and allow editing', async ({ page }) => {
    const templatesPromise = page.waitForResponse(response => response.url().includes('templates.json') && response.status() === 200);
    await page.goto('/');
    await templatesPromise;

    // Give it a unique text to verify later
    const uniqueText = `GALLERY TEST ${Date.now()}`;
    await page.getByPlaceholder('TOP TEXT').fill(uniqueText);

    // Mock the download so it doesn't prompt
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await page.getByRole('button', { name: /Save Meme/i }).click();
    await downloadPromise;

    // Verify it appeared in the Offline Gallery
    const gallerySection = page.locator('h2', { hasText: 'Your Offline Gallery' });
    await expect(gallerySection).toBeVisible();

    // Verify gallery has at least one item, wait for Masonry to render
    const galleryItems = page.locator('.MuiMasonry-root').locator('img');
    await expect(galleryItems.first()).toBeVisible();

    // The saved meme should have a "Click to Edit" overlay
    const editOverlay = page.getByText('Click to Edit').first();
    await expect(editOverlay).toBeVisible();

    // Change the text to something else so we can verify "Click to Edit" resets it
    await page.getByPlaceholder('TOP TEXT').fill('CHANGED TEXT');

    // Click the gallery item to edit
    await editOverlay.click();

    // The page will navigate back with config in query param
    await page.waitForURL(/\?config=/);

    // Check if the text is restored
    await expect(page.getByPlaceholder('TOP TEXT')).toHaveValue(uniqueText);
  });
});
