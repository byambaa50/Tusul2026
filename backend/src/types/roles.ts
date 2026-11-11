/**
 * Canonical authorization roles shared by the database and the API.
 *
 * These values are the lowercase identifiers stored in `profiles.app_role`
 * and enforced by RLS. UI labels may be Mongolian and may differ. Do not use a
 * display label as an authorization value.
 *
 * Authentication middleware and route authorization are Phase 2 work.
 */
export const APP_ROLES = [
  'supplier',
  'registration_clerk',
  'quality_staff',
  'management',
  'admin',
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (APP_ROLES as readonly string[]).includes(value);
}
