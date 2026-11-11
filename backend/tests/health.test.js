import { jest } from '@jest/globals';
import request from 'supertest';

// We need to mock the DB connection for tests
let app;

beforeAll(async () => {
  // Import the app without starting the server
  const module = await import('../src/app.js');
  app = module.default;
});

describe('GET /api/health', () => {
  it('should return health status', async () => {
    const res = await request(app).get('/api/health');
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.app).toBe('MediBridge API');
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('environment');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('database');
    expect(res.body.database).toHaveProperty('state');
  });

  it('should return valid timestamp', async () => {
    const res = await request(app).get('/api/health');
    const timestamp = new Date(res.body.timestamp);
    expect(timestamp).toBeInstanceOf(Date);
    expect(isNaN(timestamp.getTime())).toBe(false);
  });

  it('should return uptime as a number', async () => {
    const res = await request(app).get('/api/health');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
  });
});

