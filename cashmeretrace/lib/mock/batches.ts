/**
 * MOCK BATCHES (UC-05 / UC-07) — the registry is mutable: clerk-created and
 * edited batches persist to `ct.mock.clerk.batches` and merge with the seed.
 *
 * FR-2.4: the batch number is generated, never typed by the clerk, using
 * MN-YYYY-000001. FR-2.5 / BR-01: every save re-checks uniqueness before
 * writing. The number is immutable after creation.
 */
import { useSyncExternalStore } from "react";

import { supplierById } from "@/lib/mock/suppliers";
import { writeJson } from "@/lib/mock/storage";
import type { Batch, QualityResult } from "@/lib/types/domain";

const STORAGE_KEY = "ct.mock.clerk.batches";
const BATCHES_EVENT = "ct:mock:clerk-batches-change";

export const BATCH_NUMBER_PREFIX = "MN";

/** FR-2.4 batch-number format, e.g. MN-2026-000001. */
export function formatBatchNumber(year: number, sequence: number): string {
  return `${BATCH_NUMBER_PREFIX}-${year}-${String(sequence).padStart(6, "0")}`;
}

export const demoBatches: Batch[] = [
  {
    id: "MN-2026-000001",
    supplierId: "SP-001",
    amountKg: 320,
    aimag: "Хөвсгөл",
    soum: "Мөрөн",
    livestockCount: 450,
    registeredOn: "2026-05-04",
    status: "tested",
    supplyId: "SUP-0001",
    test: {
      finenessMicron: 15.4,
      cleanYieldPct: 66.2,
      impurityPct: 3.1,
      testedOn: "2026-05-21",
    },
  },
  {
    id: "MN-2026-000002",
    supplierId: "SP-001",
    amountKg: 380,
    aimag: "Хөвсгөл",
    soum: "Цагаан-Уул",
    livestockCount: 690,
    registeredOn: "2026-05-13",
    status: "tested",
    supplyId: "SUP-0003",
    test: {
      finenessMicron: 15.9,
      cleanYieldPct: 64.5,
      impurityPct: 3.8,
      testedOn: "2026-05-28",
    },
  },
  {
    id: "MN-2026-000003",
    supplierId: "SP-001",
    amountKg: 410,
    aimag: "Хөвсгөл",
    soum: "Түнэл",
    livestockCount: 730,
    registeredOn: "2026-05-26",
    status: "tested",
    supplyId: "SUP-0004",
    test: {
      finenessMicron: 16.1,
      cleanYieldPct: 61.8,
      impurityPct: 4.4,
      testedOn: "2026-06-10",
    },
  },
  {
    id: "MN-2026-000004",
    supplierId: "SP-001",
    amountKg: 350,
    aimag: "Хөвсгөл",
    soum: "Мөрөн",
    livestockCount: 520,
    registeredOn: "2026-06-04",
    status: "registered",
    supplyId: "SUP-0005",
    test: null,
  },
  {
    id: "MN-2026-000005",
    supplierId: "SP-001",
    amountKg: 190,
    aimag: "Хөвсгөл",
    soum: "Мөрөн",
    livestockCount: 480,
    registeredOn: "2026-06-15",
    status: "registered",
    supplyId: "SUP-0006",
    test: null,
  },
  {
    id: "MN-2026-000006",
    supplierId: "SP-004",
    amountKg: 280,
    aimag: "Архангай",
    soum: "Эрдэнэбулган",
    livestockCount: 360,
    registeredOn: "2026-06-20",
    status: "tested",
    test: {
      finenessMicron: 15.2,
      cleanYieldPct: 67.4,
      impurityPct: 2.8,
      testedOn: "2026-07-04",
    },
  },
  {
    id: "MN-2026-000007",
    supplierId: "SP-005",
    amountKg: 240,
    aimag: "Хөвсгөл",
    soum: "Түнэл",
    livestockCount: 310,
    registeredOn: "2026-07-02",
    status: "registered",
    test: null,
  },
  {
    id: "MN-2026-000008",
    supplierId: "SP-004",
    amountKg: 360,
    aimag: "Архангай",
    soum: "Цэцэрлэг",
    livestockCount: 540,
    registeredOn: "2026-07-15",
    status: "tested",
    test: {
      finenessMicron: 16.4,
      cleanYieldPct: 62.1,
      impurityPct: 4.9,
      testedOn: "2026-07-29",
    },
  },
  {
    id: "MN-2026-000009",
    supplierId: "SP-006",
    amountKg: 150,
    aimag: "Өмнөговь",
    soum: "Даланзадгад",
    livestockCount: 210,
    registeredOn: "2026-08-01",
    status: "registered",
    test: null,
  },
];

const EMPTY: Batch[] = [];

function readStored(): Batch[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Batch[]) : [];
  } catch {
    return EMPTY;
  }
}

function mergeBatches(): Batch[] {
  const byId = new Map<string, Batch>();
  for (const batch of demoBatches) byId.set(batch.id, batch);
  for (const batch of readStored()) byId.set(batch.id, batch);
  return [...byId.values()].sort(
    (a, b) => b.registeredOn.localeCompare(a.registeredOn) || b.id.localeCompare(a.id),
  );
}

/** Plain reader — newest registration first. */
export function allBatches(): Batch[] {
  if (typeof window === "undefined") return [...demoBatches];
  return mergeBatches();
}

/** One batch by immutable number (UC-06/UC-07). */
export function batchById(id: string | null): Batch | null {
  if (!id) return null;
  return allBatches().find((batch) => batch.id === id) ?? null;
}

/** FR-2.5 / BR-01 duplicate check (case-insensitive, trimmed). */
export function batchNumberExists(id: string, excludeId?: string): boolean {
  const needle = id.trim().toUpperCase();
  return allBatches().some(
    (batch) => batch.id !== excludeId && batch.id.toUpperCase() === needle,
  );
}

/**
 * FR-2.4: next unique number for the current year. Scans every batch with
 * the same year so deleted/edited records never free a number for reuse.
 */
export function generateBatchNumber(now = new Date()): string {
  const year = now.getFullYear();
  const prefix = `${BATCH_NUMBER_PREFIX}-${year}-`;
  const max = allBatches().reduce((current, batch) => {
    if (!batch.id.startsWith(prefix)) return current;
    const sequence = Number(batch.id.slice(prefix.length));
    return Number.isInteger(sequence) ? Math.max(current, sequence) : current;
  }, 0);
  return formatBatchNumber(year, max + 1);
}

/** Own batches only (BR-05), newest registration first. */
export function batchesFor(supplierId: string | null): Batch[] {
  if (!supplierId) return EMPTY;
  return allBatches().filter((batch) => batch.supplierId === supplierId);
}

export class DuplicateBatchError extends Error {
  readonly batchNumber: string;

  constructor(batchNumber: string) {
    super(`Batch number already exists: ${batchNumber}`);
    this.name = "DuplicateBatchError";
    this.batchNumber = batchNumber;
  }
}

export type BatchDraft = {
  supplierId: string;
  amountKg: number;
  aimag: string;
  soum: string;
  livestockCount?: number;
  registeredOn: string;
  supplyId?: string;
  notes?: string;
  /** Previewed system number; regenerated only if it is no longer unique. */
  id?: string;
};

function assertSupplier(supplierId: string) {
  if (!supplierById(supplierId)) {
    throw new Error("SUPPLIER_NOT_FOUND");
  }
}

/**
 * UC-05 steps 6–8: validates the supplier link (BR-02), generates/checks the
 * unique number (BR-01), then persists. Storage failures throw so the form
 * keeps its data and shows UC-05 E4.
 */
export function createBatch(draft: BatchDraft): Batch {
  assertSupplier(draft.supplierId);

  const requested = draft.id?.trim();
  if (requested && batchNumberExists(requested)) {
    throw new DuplicateBatchError(requested);
  }
  const id = requested || generateBatchNumber();
  if (batchNumberExists(id)) {
    throw new DuplicateBatchError(id);
  }

  const created: Batch = {
    id,
    supplierId: draft.supplierId,
    amountKg: draft.amountKg,
    aimag: draft.aimag,
    soum: draft.soum,
    livestockCount: draft.livestockCount,
    registeredOn: draft.registeredOn,
    status: "registered",
    test: null,
    supplyId: draft.supplyId || undefined,
    notes: draft.notes?.trim() || undefined,
  };

  writeJson(STORAGE_KEY, [...readStored(), created]);
  window.dispatchEvent(new Event(BATCHES_EVENT));
  return created;
}

export type BatchPatch = Omit<Batch, "id" | "status" | "test" | "updatedOn">;

/**
 * FR-2.6 / UC-07: edits permitted batch fields. The number is immutable and
 * the quality result remains owned by the quality officer.
 */
export function updateBatch(id: string, patch: BatchPatch): Batch {
  const current = batchById(id);
  if (!current) throw new Error("BATCH_NOT_FOUND");
  assertSupplier(patch.supplierId);

  const updated: Batch = {
    ...current,
    ...patch,
    id: current.id,
    status: current.status,
    test: current.test,
    notes: patch.notes?.trim() || undefined,
    supplyId: patch.supplyId || undefined,
    updatedOn: new Date().toISOString().slice(0, 10),
  };

  const stored = readStored();
  const exists = stored.some((batch) => batch.id === id);
  const next = exists
    ? stored.map((batch) => (batch.id === id ? updated : batch))
    : [...stored, updated];

  writeJson(STORAGE_KEY, next);
  window.dispatchEvent(new Event(BATCHES_EVENT));
  return updated;
}

/**
 * UC-08 read-model projection: the quality store is the source of truth for
 * results, while supplier/clerk screens still read `Batch.test`. Inserting a
 * quality test projects the newest values here and advances the batch state
 * machine to «Шинжилгээтэй». Registration fields and `updatedOn` stay
 * untouched — this is not a clerk edit.
 */
export function applyQualityTestResult(batchId: string, result: QualityResult): Batch {
  const current = batchById(batchId);
  if (!current) throw new Error("BATCH_NOT_FOUND");

  const updated: Batch = {
    ...current,
    status: "tested",
    test: { ...result },
  };

  const stored = readStored();
  const exists = stored.some((batch) => batch.id === batchId);
  const next = exists
    ? stored.map((batch) => (batch.id === batchId ? updated : batch))
    : [...stored, updated];

  writeJson(STORAGE_KEY, next);
  window.dispatchEvent(new Event(BATCHES_EVENT));
  return updated;
}

function batchSignature(list: Batch[]): string {
  return JSON.stringify(list);
}

let cacheSig = "";
let cacheList: Batch[] = EMPTY;

function getSnapshot(): Batch[] {
  if (typeof window === "undefined") return EMPTY;
  const list = mergeBatches();
  const sig = batchSignature(list);
  if (sig !== cacheSig) {
    cacheSig = sig;
    cacheList = list;
  }
  return cacheList;
}

const getServerSnapshot = (): Batch[] => EMPTY;

const filteredCache = new Map<string, { sig: string; list: Batch[] }>();

function getFilteredSnapshot(supplierId: string): Batch[] {
  const all = getSnapshot();
  const sig = batchSignature(all);
  const cached = filteredCache.get(supplierId);
  if (!cached || cached.sig !== sig) {
    const list = all.filter((batch) => batch.supplierId === supplierId);
    filteredCache.set(supplierId, { sig, list });
    return list;
  }
  return cached.list;
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(BATCHES_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(BATCHES_EVENT, callback);
  };
}

/** Reactive all-batches list for clerk search/dashboard/QR (UC-07). */
export function useBatches(): Batch[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Reactive own-batches list for UC-03 supplier screens (BR-05). */
export function useBatchesFor(supplierId: string | null): Batch[] {
  return useSyncExternalStore(
    subscribe,
    () => (supplierId ? getFilteredSnapshot(supplierId) : EMPTY),
    () => EMPTY,
  );
}

/** Format disclosure shown wherever a batch number is displayed. */
export const batchCodeNote =
  "Багцын дугаар нь MN-YYYY-000001 форматтай бөгөөд систем автоматаар үүсгэж, давхардлыг шалгана (FR-2.4, FR-2.5).";
