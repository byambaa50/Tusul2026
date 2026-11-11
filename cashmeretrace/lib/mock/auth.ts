/**
 * MOCK SIGN-IN LOOKUP (UC-10 / FR-1.2) — identifies a supplier by either the
 * username or the registered email, then checks the demo password. The real
 * system performs this on the server (NFR-08/09); the demo keeps it in the
 * client so no backend is required.
 */
import { passwordForSupplier } from "@/lib/mock/credentials";
import { allSuppliers } from "@/lib/mock/suppliers";
import type { Supplier } from "@/lib/types/domain";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** Accepts the FR-1.2 «нэвтрэх нэр (имэйл)» as either username or email. */
export function findSupplierByIdentifier(identifier: string): Supplier | null {
  const value = normalize(identifier);
  if (!value) return null;
  return (
    allSuppliers().find(
      (supplier) =>
        normalize(supplier.username) === value || normalize(supplier.email) === value,
    ) ?? null
  );
}

/**
 * Returns the matching supplier only when both the identifier and password
 * are correct. Callers show one generic error otherwise, so the demo does not
 * reveal whether an account exists.
 */
export function verifySupplierCredentials(
  identifier: string,
  password: string,
): Supplier | null {
  const supplier = findSupplierByIdentifier(identifier);
  if (!supplier) return null;
  const expected = passwordForSupplier(supplier.id);
  if (!expected || expected !== password) return null;
  return supplier;
}
