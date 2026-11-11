import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { sendError } from '../lib/http-response.js';
import { getLogPath } from '../lib/log-path.js';
import { logger } from '../lib/logger.js';

const INTERNAL_ERROR_MESSAGE = 'An unexpected error occurred';

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const requestId = req.requestId ?? 'unknown';

  if (error instanceof ZodError) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', requestId);
    return;
  }

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error('request failed', {
        requestId,
        method: req.method,
        path: getLogPath(req),
        status: error.statusCode,
        errorName: error.name,
      });
    }

    const message = error.statusCode >= 500 ? INTERNAL_ERROR_MESSAGE : error.message;
    sendError(res, error.statusCode, error.code, message, requestId);
    return;
  }

  const bodyErrorType = getBodyErrorType(error);

  if (bodyErrorType === 'entity.parse.failed') {
    sendError(res, 400, 'INVALID_JSON', 'Malformed JSON body', requestId);
    return;
  }

  if (bodyErrorType === 'entity.too.large') {
    sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body is too large', requestId);
    return;
  }

  logger.error('unhandled request error', {
    requestId,
    method: req.method,
    path: getLogPath(req),
    status: 500,
    errorName: error instanceof Error ? error.name : 'UnknownError',
  });

  sendError(res, 500, 'INTERNAL', INTERNAL_ERROR_MESSAGE, requestId);
};

function getBodyErrorType(error: unknown): string | undefined {
  if (error instanceof Error && 'type' in error) {
    const bodyError = error as Error & { type?: unknown };
    return typeof bodyError.type === 'string' ? bodyError.type : undefined;
  }

  return undefined;
}
