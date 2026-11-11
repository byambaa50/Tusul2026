import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppError } from '../src/lib/errors.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { requestId } from '../src/middleware/request-id.js';

const nameSchema = z.object({
  name: z.string().min(1),
});

function createTestApp(): express.Express {
  const testApp = express();

  testApp.use(requestId);
  testApp.use(express.json({ limit: '1kb' }));

  testApp.get('/known-error', () => {
    throw new AppError(409, 'DUPLICATE', 'Duplicate batch number');
  });

  testApp.get('/validation-error', () => {
    nameSchema.parse({});
  });

  testApp.get('/unexpected-error', () => {
    throw new Error('postgres://user:secret@localhost/database');
  });

  testApp.post('/echo', (req, res) => {
    res.json(req.body);
  });

  testApp.use(errorHandler);

  return testApp;
}

describe('centralized error handler', () => {
  it('returns the standard envelope for a known application error', async () => {
    const response = await request(createTestApp()).get('/known-error');

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'DUPLICATE',
        message: 'Duplicate batch number',
      },
      meta: {
        requestId: expect.any(String),
      },
    });
    expect(response.headers['x-request-id']).toBe(response.body.meta.requestId);
  });

  it('maps a Zod validation failure to 400', async () => {
    const response = await request(createTestApp()).get('/validation-error');

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
    });
  });

  it('hides unexpected error details in the response', async () => {
    const response = await request(createTestApp()).get('/unexpected-error');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'INTERNAL',
        message: 'An unexpected error occurred',
      },
      meta: {
        requestId: expect.any(String),
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('postgres://');
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });

  it('returns a safe error for malformed JSON', async () => {
    const response = await request(createTestApp())
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send('{"name":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON body',
      },
      meta: {
        requestId: expect.any(String),
      },
    });
  });
});
