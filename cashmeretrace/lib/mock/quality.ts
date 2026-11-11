/**
 * MOCK QUALITY TESTS (UC-08 / FR-2.2) — laboratory results are INSERT-ONLY
 * (§5.3). This module intentionally exposes no update or delete function:
 * a corrected measurement is entered as a NEW result, preserving history.
 *
 * Latest ordering is `created_at DESC, id DESC` (plan §5.3). `test_date`
 * (`testedOn`) is display/reporting date only and never decides which result
 * is newest.
 */
import { useSyncExternalStore } from "react";

import { applyQualityTestResult, batchById } from "@/lib/mock/batches";
import { writeJson } from "@/lib/mock/storage";
import type { QualityTest } from "@/lib/types/domain";

const STORAGE_KEY = "ct.mock.quality.tests";
const QUALITY_EVENT = "ct:mock:quality-tests-change";

export const QUALITY_TEST_PREFIX = "QT";

/** QT-YYYY-000001 insert id. */
export function formatQualityTestId(year: number, sequence: number): string {
  return `${QUALITY_TEST_PREFIX}-${year}-${String(sequence).padStart(6, "0")}`;
}

/**
 * Demo seed: one result for every batch seeded as tested in `demoBatches`,
 * plus an earlier result for MN-2026-000001 and MN-2026-000002 so the
 * previous-result comparison screen has real history on first load. The
 * newest seed per batch matches `Batch.test`, keeping supplier/clerk views
 * consistent.
 */
export const demoQualityTests: QualityTest[] = [
  {
    id: "QT-2026-000001",
    batchId: "MN-2026-000001",
    finenessMicron: 15.8,
    cleanYieldPct: 64.9,
    impurityPct: 3.6,
    labResult:
      "Демо лабораторийн бүртгэл №L-2605-011. Дээжийн хэмжилтийн үр дүнг протоколд тусгасан.",
    testedOn: "2026-05-17",
    createdAt: "2026-05-18T09:10:00.000Z",
    createdBy: "quality",
  },
  {
    id: "QT-2026-000002",
    batchId: "MN-2026-000001",
    finenessMicron: 15.4,
    cleanYieldPct: 66.2,
    impurityPct: 3.1,
    labResult:
      "Демо лабораторийн бүртгэл №L-2605-018. Давтан дээжийн хэмжилтийн үр дүнг бүртгэв.",
    testedOn: "2026-05-21",
    createdAt: "2026-05-22T10:30:00.000Z",
    createdBy: "quality",
  },
  {
    id: "QT-2026-000003",
    batchId: "MN-2026-000002",
    finenessMicron: 16.3,
    cleanYieldPct: 63.2,
    impurityPct: 4,
    labResult:
      "Демо лабораторийн бүртгэл №L-2605-024. Эхний дээжийн хэмжилтийн бүртгэл.",
    testedOn: "2026-05-24",
    createdAt: "2026-05-25T08:15:00.000Z",
    createdBy: "quality",
  },
  {
    id: "QT-2026-000004",
    batchId: "MN-2026-000002",
    finenessMicron: 15.9,
    cleanYieldPct: 64.5,
    impurityPct: 3.8,
    labResult:
      "Демо лабораторийн бүртгэл №L-2605-031. Хоёр дахь дээжийн хэмжилтийн үр дүнг бүртгэв.",
    testedOn: "2026-05-28",
    createdAt: "2026-05-29T09:40:00.000Z",
    createdBy: "quality",
  },
  {
    id: "QT-2026-000005",
    batchId: "MN-2026-000003",
    finenessMicron: 16.1,
    cleanYieldPct: 61.8,
    impurityPct: 4.4,
    labResult:
      "Демо лабораторийн бүртгэл №L-2606-007. Дээжийн хэмжилтийн үр дүнг бүртгэв.",
    testedOn: "2026-06-10",
    createdAt: "2026-06-11T10:05:00.000Z",
    createdBy: "quality",
  },
  {
    id: "QT-2026-000006",
    batchId: "MN-2026-000006",
    finenessMicron: 15.2,
    cleanYieldPct: 67.4,
    impurityPct: 2.8,
    labResult:
      "Демо лабораторийн бүртгэл №L-2607-003. Дээжийн хэмжилтийн үр дүнг бүртгэв.",
    testedOn: "2026-07-04",
    createdAt: "2026-07-05T09:00:00.000Z",
    createdBy: "quality",
  },
  {
    id: "QT-2026-000007",
    batchId: "MN-2026-000008",
    finenessMicron: 16.4,
    cleanYieldPct: 62.1,
    impurityPct: 4.9,
    labResult:
      "Демо лабораторийн бүртгэл №L-2607-021. Дээжийн хэмжилтийн үр дүнг бүртгэв.",
    testedOn: "2026-07-29",
    createdAt: "2026-07-30T09:25:00.000Z",
    createdBy: "quality",
  },
];

const EMPTY: QualityTest[] = [];

function readStored(): QualityTest[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QualityTest[]) : [];
  } catch {
    return EMPTY;
  }
}

/** Latest first: created_at DESC, id DESC (plan §5.3). */
export function compareQualityTests(a: QualityTest, b: QualityTest): number {
  const byCreatedAt = b.createdAt.localeCompare(a.createdAt);
  return byCreatedAt !== 0 ? byCreatedAt : b.id.localeCompare(a.id);
}

function mergeTests(): QualityTest[] {
  const byId = new Map<string, QualityTest>();
  for (const test of demoQualityTests) byId.set(test.id, test);
  // Stored records are always inserts; a matching id would be a corrupt
  // legacy value, so the stored record wins defensively.
  for (const test of readStored()) byId.set(test.id, test);
  return [...byId.values()].sort(compareQualityTests);
}

/** Plain reader — newest insert first. */
export function allQualityTests(): QualityTest[] {
  if (typeof window === "undefined") return [...demoQualityTests].sort(compareQualityTests);
  return mergeTests();
}

/** All inserted results for one batch, newest first. */
export function qualityTestsFor(batchId: string | null): QualityTest[] {
  if (!batchId) return EMPTY;
  return allQualityTests().filter((test) => test.batchId === batchId);
}

/** Latest result by created_at (never by test_date). */
export function latestQualityTest(batchId: string | null): QualityTest | null {
  return qualityTestsFor(batchId)[0] ?? null;
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True only for a real calendar date written as yyyy-mm-dd. This is a format
 * check for the manually typed test date, not a laboratory standard.
 */
export function isValidTestDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function nextQualityTestId(now: Date): string {
  const year = now.getFullYear();
  const prefix = `${QUALITY_TEST_PREFIX}-${year}-`;
  const max = allQualityTests().reduce((current, test) => {
    if (!test.id.startsWith(prefix)) return current;
    const sequence = Number(test.id.slice(prefix.length));
    return Number.isInteger(sequence) ? Math.max(current, sequence) : current;
  }, 0);
  return formatQualityTestId(year, max + 1);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export type QualityTestDraft = Pick<
  QualityTest,
  "batchId" | "finenessMicron" | "cleanYieldPct" | "impurityPct" | "labResult" | "testedOn"
> & {
  createdBy?: string;
};

/**
 * UC-08 steps 5–7: validates the required values and appends a NEW result.
 * Validation is limited to required/numeric/mathematical bounds, the test
 * date not being in the future, and the lab information being present. No
 * laboratory standards, min/max quality thresholds or pass/fail verdicts are
 * invented here (plan §5.3).
 *
 * The batch read model is projected afterwards so supplier/clerk screens see
 * the newest values. The quality history remains the source of truth.
 */
export function addQualityTest(draft: QualityTestDraft): QualityTest {
  if (!batchById(draft.batchId)) {
    throw new Error("BATCH_NOT_FOUND");
  }

  const fineness = draft.finenessMicron;
  const cleanYield = draft.cleanYieldPct;
  const admixture = draft.impurityPct;
  const labResult = draft.labResult.trim();

  if (!isFiniteNumber(fineness) || fineness <= 0) {
    throw new Error("INVALID_QUALITY_TEST");
  }
  if (!isFiniteNumber(cleanYield) || cleanYield < 0 || cleanYield > 100) {
    throw new Error("INVALID_QUALITY_TEST");
  }
  if (!isFiniteNumber(admixture) || admixture < 0 || admixture > 100) {
    throw new Error("INVALID_QUALITY_TEST");
  }
  if (
    !draft.testedOn ||
    !isValidTestDate(draft.testedOn) ||
    draft.testedOn > todayIso()
  ) {
    throw new Error("INVALID_QUALITY_TEST");
  }
  if (!labResult) {
    throw new Error("INVALID_QUALITY_TEST");
  }

  const createdAt = new Date().toISOString();
  const created: QualityTest = {
    id: nextQualityTestId(new Date(createdAt)),
    batchId: draft.batchId,
    finenessMicron: fineness,
    cleanYieldPct: cleanYield,
    impurityPct: admixture,
    labResult,
    testedOn: draft.testedOn,
    createdAt,
    createdBy: draft.createdBy?.trim() || "quality",
  };

  writeJson(STORAGE_KEY, [...readStored(), created]);
  window.dispatchEvent(new Event(QUALITY_EVENT));

  try {
    applyQualityTestResult(created.batchId, {
      finenessMicron: created.finenessMicron,
      cleanYieldPct: created.cleanYieldPct,
      impurityPct: created.impurityPct,
      testedOn: created.testedOn,
    });
  } catch {
    // The INSERT itself succeeded; the batch projection is a convenience
    // read model. Do not report a false save failure.
  }

  return created;
}

let cacheSig = "";
let cacheList: QualityTest[] = EMPTY;

function getSnapshot(): QualityTest[] {
  if (typeof window === "undefined") return EMPTY;
  const list = mergeTests();
  const sig = JSON.stringify(list);
  if (sig !== cacheSig) {
    cacheSig = sig;
    cacheList = list;
  }
  return cacheList;
}

const getServerSnapshot = (): QualityTest[] => EMPTY;

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(QUALITY_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(QUALITY_EVENT, callback);
  };
}

/** Reactive, newest-first quality history for the quality screens. */
export function useQualityTests(): QualityTest[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Disclosure shown on every quality screen. */
export const qualityInsertOnlyNote =
  "Чанарын үр дүн INSERT-ONLY: засах, устгах боломжгүй. Шинэ хэмжилт нь шинэ бичлэг болж нэмэгдэнэ (plan §5.3).";
