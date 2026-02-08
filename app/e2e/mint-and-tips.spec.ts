import { test, expect } from '@playwright/test';

test.describe('Wallet-gated flows', () => {
  test('mint page renders and shows connect button', async ({ page }) => {
    await page.goto('/mint', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /agent registration/i })).toBeVisible();
    await expect(page.locator('#main-content').getByRole('button', { name: 'Connect wallet' })).toBeVisible();
    await expect(page.getByLabel(/display name/i)).toBeVisible();
  });

  test('tips submission requires a connected wallet', async ({ page }) => {
    await page.goto('/tips', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /tips/i })).toBeVisible();

    // Wait for client hydration + pricing fetch.
    await expect(page.getByRole('button', { name: /^low/i })).toBeEnabled({ timeout: 30_000 });

    // Submit is wallet-gated.
    await expect(page.getByRole('button', { name: 'Submit Tip' })).toBeDisabled();

    // Preview is permissionless (no wallet required).
    const textarea = page.getByLabel('Tip text');
    await textarea.fill('Test tip preview from Playwright');
    await expect(textarea).toHaveValue('Test tip preview from Playwright');
    await expect(page.getByRole('button', { name: 'Preview' })).toBeEnabled();
  });
});
