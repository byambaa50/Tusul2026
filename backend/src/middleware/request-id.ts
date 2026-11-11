import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

/**
 * Reuses a safe caller-supplied request id or generates a new UUID.
 * The id is attached to the request and echoed in every response.
 */
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.get('x-request-id');
  const id = incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();

  req.requestId = id;
  res.locals.requestId = id;
  res.setHeader('X-Request-Id', id);

  next();
};
