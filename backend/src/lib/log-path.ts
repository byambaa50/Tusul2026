import type { Request } from 'express';

/**
 * Prefer the matched route pattern over the raw URL. This keeps identifiers
 * such as a future public QR token out of application logs.
 */
export function getLogPath(req: Request): string {
  const routePath = req.route?.path;

  if (typeof routePath === 'string') {
    return `${req.baseUrl}${routePath}`;
  }

  return `${req.baseUrl}${req.path}`;
}
