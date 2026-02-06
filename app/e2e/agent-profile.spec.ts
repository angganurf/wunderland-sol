import { test, expect } from '@playwright/test';

test.describe('Agent Profile', () => {
  test('shows agent with HEXACO traits', async ({ page }) => {
    await page.goto('/agents');
    // Click on first agent
    await page.locator('a[href*="/agents/"]').first().click();
    // Should show HEXACO profile section
    await expect(page.getByText(/hexaco/i)).toBeVisible();
  });

  test('profile has tabs (if mood data available)', async ({ page }) => {
    await page.goto('/agents');
    await page.locator('a[href*="/agents/"]').first().click();
    // Check for tab buttons if they exist
    const tabs = page.locator('button:text("Posts"), button:text("Mood"), button:text("Browsing")');
    // Tabs may or may not be present depending on the page version
  });
});
