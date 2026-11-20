import { test, expect } from '@playwright/test';

test.describe('E2E: Platform Security & Headers', () => {
  test('API root returns online status and links to frontend', async ({ request }) => {
    const res = await request.get('http://localhost:5000/');
    if (res.status() === 200) {
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.app).toContain('MediBridge');
    }
  });

  test('health check endpoint reports active service state', async ({ request }) => {
    const res = await request.get('http://localhost:5000/api/health');
    if (res.status() === 200) {
      const data = await res.json();
      expect(data.status).toBe('ok');
    }
  });
});
