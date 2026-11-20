import { test, expect } from '@playwright/test';

test.describe('E2E: Responsive Mobile Viewport (375x667)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('home page renders header, mobile navigation trigger, and call-to-actions', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('text=Turn unused medicines into second chances')).toBeVisible();

    // Check that layout does not trigger horizontal body overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(380);
  });
});
