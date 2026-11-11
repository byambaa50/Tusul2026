import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

describe('unknown endpoint', () => {
  it('returns the standard 404 envelope', async () => {
    const response = await request(app).get('/api/v1/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
      meta: {
        requestId: expect.any(String),
      },
    });
    expect(response.headers['x-request-id']).toBe(response.body.meta.requestId);
  });

  it('does not expose a stack trace', async () => {
    const response = await request(app).get('/api/v1/does-not-exist');

    expect(response.body.error).not.toHaveProperty('stack');
    expect(response.text).not.toContain('at ');
  });
});
