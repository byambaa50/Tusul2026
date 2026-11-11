import { env } from '../config/env.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY_PATTERN = /password|passwd|secret|token|authorization|cookie|jwt|api[_-]?key/i;

type LogContext = Record<string, unknown>;

/**
 * Lightweight structured logger. It writes JSON lines to stdout/stderr and
 * deliberately redacts anything that looks like a credential.
 */
function write(level: LogLevel, message: string, context: LogContext = {}): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[env.LOG_LEVEL]) {
    return;
  }

  const entry = {
    ...redact(context),
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  const line = `${JSON.stringify(entry)}\n`;
  if (level === 'error') {
    process.stderr.write(line);
  } else {
    process.stdout.write(line);
  }
}

function redact(context: LogContext): LogContext {
  const safe: LogContext = {};

  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      safe[key] = '[REDACTED]';
      continue;
    }

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      safe[key] = redact(value as LogContext);
      continue;
    }

    safe[key] = value;
  }

  return safe;
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    write('debug', message, context);
  },
  info(message: string, context?: LogContext): void {
    write('info', message, context);
  },
  warn(message: string, context?: LogContext): void {
    write('warn', message, context);
  },
  error(message: string, context?: LogContext): void {
    write('error', message, context);
  },
};
