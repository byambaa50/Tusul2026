import { describe, expect, it } from 'vitest';
import { EnvironmentValidationError, parseEnv } from '../src/config/env.js';

describe('environment validation', () => {
  it('applies development defaults when optional values are absent', () => {
    const result = parseEnv({ NODE_ENV: 'development' });

    expect(result.PORT).toBe(4000);
    expect(result.CORS_ORIGIN).toBe('http://localhost:3000');
    expect(result.LOG_LEVEL).toBe('info');
  });

  it('rejects a missing CORS_ORIGIN in production', () => {
    expect(() => parseEnv({ NODE_ENV: 'production' })).toThrow(EnvironmentValidationError);
    expect(() => parseEnv({ NODE_ENV: 'production' })).toThrow(/CORS_ORIGIN/);
  });

  it('rejects an invalid PORT', () => {
    expect(() => parseEnv({ PORT: 'not-a-number' })).toThrow(/PORT/);
    expect(() => parseEnv({ PORT: '70000' })).toThrow(/PORT/);
  });

  it('rejects a CORS_ORIGIN that includes a path', () => {
    expect(() => parseEnv({ CORS_ORIGIN: 'https://example.com/app' })).toThrow(/CORS_ORIGIN/);
  });

  it('normalizes a trailing slash in CORS_ORIGIN', () => {
    const result = parseEnv({ CORS_ORIGIN: 'https://example.com/' });

    expect(result.CORS_ORIGIN).toBe('https://example.com');
  });

  it('accepts optional Supabase and migration settings', () => {
    const result = parseEnv({
      NODE_ENV: 'test',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'sb_publishable_example',
      DATABASE_URL: 'postgresql://postgres:[YOUR-PASSWORD]@db.example.supabase.co:5432/postgres',
    });

    expect(result.SUPABASE_URL).toBe('https://example.supabase.co');
    expect(result.SUPABASE_ANON_KEY).toBe('sb_publishable_example');
    expect(result.DATABASE_URL).toContain('db.example.supabase.co');
  });

  it('rejects an invalid SUPABASE_URL', () => {
    expect(() => parseEnv({ NODE_ENV: 'test', SUPABASE_URL: 'not-a-url' })).toThrow(
      /SUPABASE_URL/,
    );
  });

  it('rejects a DATABASE_URL that is not PostgreSQL', () => {
    expect(() =>
      parseEnv({
        NODE_ENV: 'test',
        DATABASE_URL: 'mysql://user:password@example.com/db',
      }),
    ).toThrow(/DATABASE_URL/);
  });
});
