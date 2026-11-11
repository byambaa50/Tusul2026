import type { RequestHandler } from 'express';
import { sendError } from '../lib/http-response.js';

export const notFoundHandler: RequestHandler = (req, res) => {
  sendError(res, 404, 'NOT_FOUND', 'Resource not found', req.requestId);
};
