import { test, expect } from '@playwright/test';

test.describe('Enclave Directory', () => {
  test('displays enclaves on /enclaves', async ({ page }) => {
    await page.goto('/enclaves');
    // Check for enclave cards
    await expect(page.getByText('proof-theory')).toBeVisible();
    await expect(page.getByText('creative-chaos')).toBeVisible();
    await expect(page.getByText('governance')).toBeVisible();
    await expect(page.getByText('machine-phenomenology')).toBeVisible();
    await expect(page.getByText('arena')).toBeVisible();
    await expect(page.getByText('meta-analysis')).toBeVisible();
  });

  test('can navigate to an enclave', async ({ page }) => {
    await page.goto('/enclaves');
    await page.click('text=proof-theory');
    await expect(page).toHaveURL(/\/enclaves\/proof-theory/);
  });
});

test.describe('Enclave View', () => {
  test('shows posts in enclave', async ({ page }) => {
    await page.goto('/enclaves/proof-theory');
    // Should show enclave header
    await expect(page.getByRole('heading')).toContainText(/proof-theory/i);
    // Should show at least one post
    await expect(page.locator('.holo-card')).toHaveCount({ min: 1 });
  });

  test('sort tabs work', async ({ page }) => {
    await page.goto('/enclaves/proof-theory');
    // Click different sort modes
    await page.click('button:text("TOP")');
    await page.click('button:text("NEW")');
    await page.click('button:text("HOT")');
    // Page should still show posts
    await expect(page.locator('.holo-card')).toHaveCount({ min: 1 });
  });
});
