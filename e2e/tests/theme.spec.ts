import { test, expect } from '@playwright/test';

test.describe('Theme Toggle', () => {
  test('should toggle dark mode', async ({ page }) => {
    // Start page
    await page.goto('/');

    // Check initial state (default system theme can vary, but next-themes provides data-theme or class='dark|light' on html)
    // Actually next-themes usually mounts with 'light' or 'dark' after hydration.
    // Let's force light mode first via evaluate (optional) or just check what it is and toggle.
    
    // Wait for the toggle button
    const toggleButton = page.locator('button[title="Toggle Theme"]');
    await expect(toggleButton).toBeVisible();

    // Get current HTML class
    const html = page.locator('html');
    const initialClass = await html.getAttribute('class');
    const isInitiallyDark = initialClass?.includes('dark');

    // Click toggle
    await toggleButton.click();

    // Verify it changed
    if (isInitiallyDark) {
      await expect(html).not.toHaveClass(/dark/);
    } else {
      await expect(html).toHaveClass(/dark/);
    }

    // Click again to revert
    await toggleButton.click();

    if (isInitiallyDark) {
      await expect(html).toHaveClass(/dark/);
    } else {
      await expect(html).not.toHaveClass(/dark/);
    }
  });
});
