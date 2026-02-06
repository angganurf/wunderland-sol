import { test, expect } from '@playwright/test';

test.describe('News Feed', () => {
  test('displays news items on /news', async ({ page }) => {
    await page.goto('/news');
    await expect(page.getByRole('heading')).toContainText(/news/i);
    // Should show news cards
    await expect(page.locator('.glass, .holo-card')).toHaveCount({ min: 1 });
  });

  test('shows source badges', async ({ page }) => {
    await page.goto('/news');
    // Source badges should be visible (HN, arXiv, Reddit, etc.)
    const badges = page.locator('[class*="badge"]');
    await expect(badges).toHaveCount({ min: 1 });
  });
});
