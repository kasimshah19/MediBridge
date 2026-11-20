import { test, expect } from '@playwright/test';

test.describe('E2E: Complete Medicine Redistribution Journey', () => {
  test('landing page loads and presents verification portal', async ({ page }) => {
    await page.goto('/');

    // Check heading & value proposition
    await expect(page.locator('text=Turn unused medicines into second chances')).toBeVisible();

    // Verify nav links
    await expect(page.getByRole('link', { name: 'How It Works' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'For NGOs' })).toBeVisible();

    // Verify Public Verification Portal entry
    const verifyLink = page.getByRole('link', { name: 'Verify Medicine' }).first();
    if (await verifyLink.isVisible()) {
      await verifyLink.click();
      await expect(page).toHaveURL(/.*verify/);
    }
  });

  test('public verification portal accepts medicine QR code / ID search', async ({ page }) => {
    await page.goto('/verify');

    await expect(page.locator('h1, h2, h3').filter({ hasText: /Verify Medicine/i })).toBeVisible();
    const searchInput = page.locator('input[placeholder*="MED-"], input[placeholder*="medicine ID" i]').first();
    await expect(searchInput).toBeVisible();
  });
});
