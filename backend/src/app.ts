import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { requestId } from './middleware/request-id.js';
import { requestLogger } from './middleware/request-logger.js';
import { healthRouter } from './routes/health.routes.js';

const JSON_BODY_LIMIT = '1mb';

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('json escape', true);

  app.use(requestId);
  app.use(requestLogger);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST', 'PATCH', 'PUT'],
      allowedHeaders: ['Authorization', 'Content-Type'],
      credentials: false,
      maxAge: 86_400,
      optionsSuccessStatus: 204,
    }),
  );

  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.use('/api/v1', healthRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
