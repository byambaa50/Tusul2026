import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

const server = createServer(createApp());

server.listen(env.PORT, () => {
  logger.info('CashmereTrace API started', {
    port: env.PORT,
    environment: env.NODE_ENV,
  });
});

server.on('error', (error) => {
  logger.error('HTTP server error', {
    errorName: error.name,
    code: 'code' in error && typeof error.code === 'string' ? error.code : undefined,
  });
  process.exit(1);
});

let shuttingDown = false;

function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info('Shutdown requested', { signal });

  const forceExitTimer = setTimeout(() => {
    logger.error('Forced shutdown after timeout', { signal });
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  server.close((error) => {
    clearTimeout(forceExitTimer);

    if (error) {
      logger.error('HTTP server close failed', {
        signal,
        errorName: error.name,
      });
      process.exit(1);
    }

    logger.info('HTTP server closed', { signal });
    process.exit(0);
  });

  server.closeIdleConnections();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
