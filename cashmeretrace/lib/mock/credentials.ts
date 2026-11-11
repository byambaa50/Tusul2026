/**
 * MOCK CREDENTIALS (UC-10 / FR-1.2) — demo-only password store. The real
 * system hashes passwords server-side (NFR-06); this frontend demo keeps
 * them in localStorage so a newly registered supplier can check status or
 * sign in after reload. Credentials are never rendered in the profile.
 */
import type { Role } from "@/lib/constants/nav";

import { writeJson } from "@/lib/mock/storage";

const STORAGE_KEY = "ct.mock.credentials";

/** Shared password for every demo account shown on the sign-in screen. */
export const DEMO_PASSWORD = "demo1234";

/** Demo supplier accounts: SP-001 active, SP-002 pending, SP-003 rejected. */
const demoSupplierPasswords: Record<string, string> = {
  "SP-001": DEMO_PASSWORD,
  "SP-002": DEMO_PASSWORD,
  "SP-003": DEMO_PASSWORD,
};

/** Non-supplier demo accounts use their role name as the username. */
const demoRoleUsernames: Record<Role, string | null> = {
  supplier: null,
  clerk: "clerk",
  quality: "quality",
  management: "management",
  admin: "admin",
};

interface StoredCredential {
  supplierId: string;
  password: string;
}

function readAll(): StoredCredential[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is StoredCredential =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as StoredCredential).supplierId === "string" &&
        typeof (entry as StoredCredential).password === "string",
    );
  } catch {
    return [];
  }
}

function persist(list: StoredCredential[]) {
  writeJson(STORAGE_KEY, list);
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Demo password for seeded suppliers or the stored password for a
 * self-registration. Records created before this store existed fall back to
 * the demo password so the local demo remains usable.
 */
export function passwordForSupplier(supplierId: string): string | null {
  if (demoSupplierPasswords[supplierId]) return demoSupplierPasswords[supplierId];
  return (
    readAll().find((entry) => entry.supplierId === supplierId)?.password ??
    DEMO_PASSWORD
  );
}

/** Persists a self-registration password; throws MockStorageError on failure. */
export function saveCredential(supplierId: string, password: string): void {
  const list = readAll().filter((entry) => entry.supplierId !== supplierId);
  persist([...list, { supplierId, password }]);
}

/** UC-10 demo check for clerk/quality/management/admin accounts. */
export function verifyRoleCredentials(
  role: Role,
  identifier: string,
  password: string,
): boolean {
  const expected = demoRoleUsernames[role];
  return Boolean(expected) && normalize(identifier) === expected && password === DEMO_PASSWORD;
}
