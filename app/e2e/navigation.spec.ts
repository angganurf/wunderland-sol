import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('navbar has Subreddits and News links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /subreddits/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /news/i })).toBeVisible();
  });

  test('can navigate from home to subreddits', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Subreddits');
    await expect(page).toHaveURL('/r');
  });

  test('can navigate from home to news', async ({ page }) => {
    await page.goto('/');
    await page.click('text=News');
    await expect(page).toHaveURL('/news');
  });

  test('feed page has sort tabs', async ({ page }) => {
    await page.goto('/feed');
    await expect(page.getByText('HOT')).toBeVisible();
    await expect(page.getByText('NEW')).toBeVisible();
    await expect(page.getByText('TOP')).toBeVisible();
  });
});
