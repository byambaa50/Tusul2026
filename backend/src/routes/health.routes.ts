import { Router } from 'express';
import { sendSuccess } from '../lib/http-response.js';

export const healthRouter = Router();

healthRouter.get('/health', (req, res) => {
  sendSuccess(
    res,
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    req.requestId,
  );
});
