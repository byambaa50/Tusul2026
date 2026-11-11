/**
 * Public QR verification (UC-13). The result is a projection of the §9.1
 * whitelist: only fields the quality officer marked published. Supplier
 * identity, contact, address, notes, audit, lab text, and earlier tests are
 * never copied into this object.
 */
import { compareQualityTests } from "@/lib/mock/quality";
import { normalizePublicFields } from "@/lib/mock/publish";
import type { Batch, PublicField, PublishConfig, QrRecord, QualityTest } from "@/lib/types/domain";

/** Seed tokens used by the public demo. */
export const demoVerifyTokens = {
  published: "demo7f3c2a91b4",
  partial: "demo5a0b9e73d1",
  unpublished: "demo81d6e4a2c9",
} as const;

export type PublicVerificationState = "verified" | "pending";

/** Values that may appear on the public card. Unselected fields stay null. */
export interface PublicBatchCard {
  kind: "published";
  fields: PublicField[];
  batchCode: string;
  aimag: string | null;
  soum: string | null;
  supplyAmountKg: number | null;
  livestockCount: number | null;
  finenessMicron: number | null;
  cleanYieldPct: number | null;
  impurityPct: number | null;
  testedOn: string | null;
  verification: PublicVerificationState | null;
}

export type PublicVerification =
  | { kind: "invalid" }
  | { kind: "unavailable" }
  | PublicBatchCard;

/** Accept a raw token or a pasted QR URL and return the opaque token. */
export function parseVerifyToken(raw: string): string {
  let value = raw.trim();
  if (!value) return "";
  for (let pass = 0; pass < 2; pass += 1) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }
  const withoutQuery = value.split(/[?#]/)[0] ?? "";
  const parts = withoutQuery.split("/").filter(Boolean);
  return (parts[parts.length - 1] ?? "").trim();
}

function latestTest(tests: readonly QualityTest[], batchId: string): QualityTest | null {
  let latest: QualityTest | null = null;
  for (const test of tests) {
    if (test.batchId !== batchId) continue;
    if (!latest || compareQualityTests(test, latest) < 0) latest = test;
  }
  return latest;
}

function has(fields: readonly PublicField[], field: PublicField): boolean {
  return fields.includes(field);
}

/**
 * Resolve a public card. An unknown token is invalid. A known token whose
 * batch is missing, unpublished, or hidden returns no batch data.
 */
export function resolvePublicVerification(
  raw: string,
  qrRecords: readonly QrRecord[],
  batches: readonly Batch[],
  configs: readonly PublishConfig[],
  tests: readonly QualityTest[],
): PublicVerification {
  const token = parseVerifyToken(raw);
  if (!token) return { kind: "invalid" };

  const qr = qrRecords.find((record) => record.token === token);
  if (!qr) return { kind: "invalid" };

  const batch = batches.find((entry) => entry.id === qr.batchId);
  const config = configs.find((entry) => entry.batchId === qr.batchId);
  if (!batch || !config || config.status !== "published") {
    return { kind: "unavailable" };
  }

  const fields = normalizePublicFields(config.fields);
  const latest = latestTest(tests, batch.id);

  return {
    kind: "published",
    fields,
    batchCode: batch.id,
    aimag: has(fields, "origin") ? batch.aimag : null,
    soum: has(fields, "origin") ? batch.soum : null,
    supplyAmountKg: has(fields, "supplyAmount") ? batch.amountKg : null,
    livestockCount: has(fields, "livestockCount") ? (batch.livestockCount ?? null) : null,
    finenessMicron: has(fields, "fineness") && latest ? latest.finenessMicron : null,
    cleanYieldPct: has(fields, "cleanYield") && latest ? latest.cleanYieldPct : null,
    impurityPct: has(fields, "admixture") && latest ? latest.impurityPct : null,
    testedOn: has(fields, "testedOn") && latest ? latest.testedOn : null,
    verification: has(fields, "verificationStatus")
      ? qr.status === "ready"
        ? "verified"
        : "pending"
      : null,
  };
}
