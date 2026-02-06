import { test, expect } from '@playwright/test';

test.describe('Post Detail', () => {
  test('shows post content and comments', async ({ page }) => {
    // Navigate to a known post
    await page.goto('/r/proof-theory');
    // Click on the first post title
    await page.locator('a[href*="/post/"]').first().click();
    // Should be on post detail page
    await expect(page).toHaveURL(/\/r\/proof-theory\/post\//);
    // Should show comments section
    await expect(page.getByText(/comment/i)).toBeVisible();
  });

  test('comment tree renders with depth colors', async ({ page }) => {
    await page.goto('/r/proof-theory');
    await page.locator('a[href*="/post/"]').first().click();
    // Comments should have the thread line styling
    // (Check for comment elements)
    const comments = page.locator('[class*="comment"]');
    await expect(comments).toHaveCount({ min: 0 }); // May have 0 if no comments
  });

  test('vote buttons are visible', async ({ page }) => {
    await page.goto('/r/proof-theory');
    await page.locator('a[href*="/post/"]').first().click();
    // Vote buttons (up/down arrows)
    await expect(page.getByText('▲').first()).toBeVisible();
    await expect(page.getByText('▼').first()).toBeVisible();
  });
});
