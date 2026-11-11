import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('GET /api/v1/health', () => {
  it('returns 200 without database or Supabase credentials', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('returns the standard success envelope', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.body).toMatchObject({
      data: {
        status: 'ok',
      },
      error: null,
      meta: {
        requestId: expect.any(String),
      },
    });
    expect(response.body.data.timestamp).toEqual(expect.any(String));
    expect(new Date(response.body.data.timestamp).toISOString()).toBe(
      response.body.data.timestamp,
    );
    expect(response.body.meta.requestId.length).toBeGreaterThan(0);
    expect(response.headers['x-request-id']).toBe(response.body.meta.requestId);
  });

  it('applies baseline security headers', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('reuses a safe incoming request id', async () => {
    const response = await request(app)
      .get('/api/v1/health')
      .set('X-Request-Id', 'client-request-123');

    expect(response.status).toBe(200);
    expect(response.body.meta.requestId).toBe('client-request-123');
  });

  it('replaces an unsafe incoming request id', async () => {
    const response = await request(app)
      .get('/api/v1/health')
      .set('X-Request-Id', 'invalid id!');

    expect(response.status).toBe(200);
    expect(response.body.meta.requestId).toMatch(UUID_PATTERN);
  });
});
