import type { Response } from 'express';

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiErrorResponse {
  data: null;
  error: ApiError;
  meta: {
    requestId: string;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  requestId: string,
  status = 200,
  meta: Record<string, unknown> = {},
): void {
  res.status(status).json({
    data,
    error: null,
    meta: {
      ...meta,
      requestId,
    },
  });
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  requestId: string,
): void {
  const body: ApiErrorResponse = {
    data: null,
    error: {
      code,
      message,
    },
    meta: {
      requestId,
    },
  };

  res.status(status).json(body);
}
