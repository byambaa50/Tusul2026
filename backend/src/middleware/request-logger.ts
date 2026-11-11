import type { RequestHandler } from 'express';
import { getLogPath } from '../lib/log-path.js';
import { logger } from '../lib/logger.js';

/**
 * Logs one structured line when the response finishes. Request bodies,
 * headers, query strings, cookies, and tokens are never logged.
 */
export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    logger.info('request completed', {
      requestId: req.requestId,
      method: req.method,
      path: getLogPath(req),
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(3)),
    });
  });

  next();
};
