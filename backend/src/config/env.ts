import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

/**
 * Load .env for local development only. Host-provided environment variables
 * take precedence. This module is imported before any other application code.
 */
function loadLocalEnvFile(): void {
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }
}

loadLocalEnvFile();

const DEFAULT_DEVELOPMENT_CORS_ORIGIN = 'http://localhost:3000';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
    CORS_ORIGIN: z.string().trim().optional(),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    // Supabase settings are optional in Phase 1. The health route must still
    // work without credentials, but a value that is present must be valid.
    SUPABASE_URL: z.string().trim().url().optional(),
    SUPABASE_ANON_KEY: z.string().trim().min(1).optional(),

    // Used by manual migration tooling. The API runtime does not connect with
    // this URL, but validating it here catches malformed local setup early.
    DATABASE_URL: z
      .string()
      .trim()
      .url()
      .refine((value) => /^postgres(ql)?:\/\//i.test(value), {
        message: 'must use the postgres:// or postgresql:// scheme',
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    const corsOrigin =
      value.CORS_ORIGIN ??
      (value.NODE_ENV === 'production' ? undefined : DEFAULT_DEVELOPMENT_CORS_ORIGIN);

    if (!corsOrigin) {
      ctx.addIssue({
        code: 'custom',
        path: ['CORS_ORIGIN'],
        message: 'CORS_ORIGIN is required when NODE_ENV is production',
      });
      return;
    }

    const problem = getOriginProblem(corsOrigin);
    if (problem) {
      ctx.addIssue({
        code: 'custom',
        path: ['CORS_ORIGIN'],
        message: problem,
      });
    }
  })
  .transform((value) => {
    const corsOrigin = value.CORS_ORIGIN ?? DEFAULT_DEVELOPMENT_CORS_ORIGIN;
    return {
      ...value,
      CORS_ORIGIN: new URL(corsOrigin).origin,
    };
  });

export type Env = z.infer<typeof envSchema>;

export class EnvironmentValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid environment configuration: ${issues.join('; ')}`);
    this.name = 'EnvironmentValidationError';
    this.issues = issues;
  }
}

/**
 * Validates an environment source without reading process.env.
 * Exported separately so the rules can be unit tested in isolation.
 */
export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const field = issue.path.length > 0 ? issue.path.join('.') : 'environment';
      return `${field}: ${issue.message}`;
    });
    throw new EnvironmentValidationError(issues);
  }

  return result.data;
}

export const env = parseEnv();

function getOriginProblem(value: string): string | null {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return 'must be a valid absolute URL';
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return 'must use http or https';
  }

  if (url.username || url.password) {
    return 'must not contain credentials';
  }

  if (url.pathname !== '/' || url.search || url.hash) {
    return 'must contain only the scheme, host, and optional port';
  }

  return null;
}
