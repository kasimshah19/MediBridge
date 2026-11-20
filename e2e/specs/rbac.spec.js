import { test, expect } from '@playwright/test';

test.describe('E2E: Strict Role-Based Access Control (RBAC)', () => {
  test('unauthenticated users are redirected from protected dashboard routes to login', async ({ page }) => {
    // Attempt visiting admin dashboard directly
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/.*login/);

    // Attempt visiting donor dashboard directly
    await page.goto('/donor/dashboard');
    await expect(page).toHaveURL(/.*login/);

    // Attempt visiting pharmacist queue directly
    await page.goto('/pharmacist/verification');
    await expect(page).toHaveURL(/.*login/);

    // Attempt visiting NGO requirements directly
    await page.goto('/ngo/requirements');
    await expect(page).toHaveURL(/.*login/);
  });

  test('public routes are accessible without credentials', async ({ page }) => {
    await page.goto('/for-ngos');
    await expect(page).toHaveURL(/.*for-ngos/);

    await page.goto('/about');
    await expect(page).toHaveURL(/.*about/);

    await page.goto('/terms');
    await expect(page).toHaveURL(/.*terms/);

    await page.goto('/privacy');
    await expect(page).toHaveURL(/.*privacy/);
  });
});
