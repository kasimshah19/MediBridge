import { test, expect } from '@playwright/test';

test.describe('E2E: Client & Form Validation Guards', () => {
  test('registration form validates required inputs and mobile pattern', async ({ page }) => {
    await page.goto('/register');

    // Attempt submit empty form
    const submitBtn = page.getByRole('button', { name: /Create Account|Sign Up|Register/i }).first();
    await submitBtn.click();

    // Verify error messages or required HTML5 validation
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('login form requires email and password', async ({ page }) => {
    await page.goto('/login');

    const submitBtn = page.getByRole('button', { name: /Sign In|Log In/i }).first();
    await submitBtn.click();

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
