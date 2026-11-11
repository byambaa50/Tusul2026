/**
 * MOCK MANAGEMENT ANALYTICS + REPORTS (UC-11)
 *
 * Management is read-only over the registry. This module only derives
 * aggregates from the existing mock suppliers, batches and INSERT-ONLY
 * quality tests — it never mutates registry records. Generated report
 * metadata/snapshots are stored separately under
 * `ct.mock.management.reports` so a report preview keeps the numbers from
 * the moment it was generated.
 *
 * Supported metrics are limited to data the registry actually stores:
 * supplier counts/types, batch counts/amounts/origin, and the latest quality
 * result per batch. No laboratory thresholds, pass/fail verdicts, revenue,
 * forecast or other unsupported analytics are invented.
 */
import { useSyncExternalStore } from "react";

import { demoBatches } from "@/lib/mock/batches";
import { demoQualityTests } from "@/lib/mock/quality";
import { demoSuppliers } from "@/lib/mock/suppliers";
import { writeJson } from "@/lib/mock/storage";
import {
  supplierTypes,
  type Batch,
  type QualityResult,
  type QualityTest,
  type Supplier,
  type SupplierType,
} from "@/lib/types/domain";

export const managementReportTypes = ["comprehensive", "supply", "quality", "origin"] as const;
export type ManagementReportType = (typeof managementReportTypes)[number];

export const managementReportFormats = ["pdf", "csv"] as const;
export type ManagementReportFormat = (typeof managementReportFormats)[number];

/** Demo reporting year — the seeded registry data is dated 2026. */
export const DEMO_MANAGEMENT_FROM = "2026-01-01";
export const DEMO_MANAGEMENT_TO = "2026-12-31";

export interface ManagementFilters {
  /** Batch registration date range (inclusive). */
  from: string;
  to: string;
  /** Origin aimag filter; null = all aimags. */
  aimag: string | null;
}

export interface ManagementSupplierStats {
  total: number;
  active: number;
  pending: number;
  rejected: number;
  locked: number;
  byType: Array<{ type: SupplierType; count: number }>;
}

export interface ManagementBatchStats {
  total: number;
  totalKg: number;
  totalLivestock: number;
  tested: number;
  untested: number;
  testedPct: number;
}

export interface ManagementQualityStats {
  testedBatches: number;
  avgFinenessMicron: number | null;
  avgCleanYieldPct: number | null;
  avgImpurityPct: number | null;
  latestTestedOn: string | null;
}

export interface ManagementMonthRow {
  /** ISO month key, e.g. 2026-05. */
  month: string;
  /** Display label, e.g. 2026.05. */
  label: string;
  batchCount: number;
  totalKg: number;
  testedBatches: number;
}

export interface ManagementAimagRow {
  aimag: string;
  batchCount: number;
  totalKg: number;
  testedBatches: number;
  soumCount: number;
  avgFinenessMicron: number | null;
  avgCleanYieldPct: number | null;
  avgImpurityPct: number | null;
}

export interface ManagementSoumRow {
  aimag: string;
  soum: string;
  batchCount: number;
  totalKg: number;
  testedBatches: number;
  avgFinenessMicron: number | null;
  avgCleanYieldPct: number | null;
  avgImpurityPct: number | null;
}

export interface ManagementRecentBatch {
  id: string;
  aimag: string;
  soum: string;
  amountKg: number;
  livestockCount: number | null;
  registeredOn: string;
  tested: boolean;
}

export interface ManagementSnapshot {
  filters: ManagementFilters;
  suppliers: ManagementSupplierStats;
  batches: ManagementBatchStats;
  quality: ManagementQualityStats;
  monthly: ManagementMonthRow[];
  aimags: ManagementAimagRow[];
  soums: ManagementSoumRow[];
  recentBatches: ManagementRecentBatch[];
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function maxDate(values: Array<string | undefined>): string | null {
  let latest: string | null = null;
  for (const value of values) {
    if (value && (!latest || value > latest)) latest = value;
  }
  return latest;
}

type BatchQualityRow = {
  batch: Batch;
  result: QualityResult;
};

/**
 * Pure aggregation used by the dashboard, comparison screen, report form
 * preview and the generated report snapshot.
 */
export function buildManagementAnalytics(input: {
  suppliers: Supplier[];
  batches: Batch[];
  tests: QualityTest[];
  filters: ManagementFilters;
}): ManagementSnapshot {
  const { suppliers, batches, tests, filters } = input;

  const filteredBatches = batches.filter((batch) => {
    if (filters.from && batch.registeredOn < filters.from) return false;
    if (filters.to && batch.registeredOn > filters.to) return false;
    if (filters.aimag && batch.aimag !== filters.aimag) return false;
    return true;
  });

  const filteredSuppliers = filters.aimag
    ? suppliers.filter((supplier) => supplier.aimag === filters.aimag)
    : suppliers;

  const orderedTests = [...tests].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
  );
  const latestByBatch = new Map<string, QualityTest>();
  for (const test of orderedTests) {
    if (!latestByBatch.has(test.batchId)) latestByBatch.set(test.batchId, test);
  }

  const rowsWithQuality = filteredBatches.map((batch) => {
    const result = latestByBatch.get(batch.id) ?? batch.test;
    return { batch, result };
  });
  const qualityRows = rowsWithQuality.filter(
    (row): row is BatchQualityRow => row.result !== null,
  );

  const totalKg = filteredBatches.reduce((sum, batch) => sum + batch.amountKg, 0);
  const totalLivestock = filteredBatches.reduce(
    (sum, batch) => sum + (batch.livestockCount ?? 0),
    0,
  );
  const tested = qualityRows.length;
  const total = filteredBatches.length;

  const suppliersByStatus = {
    active: filteredSuppliers.filter((supplier) => supplier.status === "active").length,
    pending: filteredSuppliers.filter((supplier) => supplier.status === "pending").length,
    rejected: filteredSuppliers.filter((supplier) => supplier.status === "rejected").length,
    locked: filteredSuppliers.filter((supplier) => supplier.status === "locked").length,
  };

  const monthlyMap = new Map<string, ManagementMonthRow>();
  for (const row of rowsWithQuality) {
    const month = row.batch.registeredOn.slice(0, 7);
    const current = monthlyMap.get(month) ?? {
      month,
      label: month.replace("-", "."),
      batchCount: 0,
      totalKg: 0,
      testedBatches: 0,
    };
    current.batchCount += 1;
    current.totalKg += row.batch.amountKg;
    if (row.result) current.testedBatches += 1;
    monthlyMap.set(month, current);
  }

  type OriginAccumulator = {
    aimag: string;
    soum?: string;
    batchCount: number;
    totalKg: number;
    testedBatches: number;
    fineness: number[];
    cleanYield: number[];
    admixture: number[];
    soums: Set<string>;
  };

  const aimagMap = new Map<string, OriginAccumulator>();
  const soumMap = new Map<string, OriginAccumulator>();

  for (const row of rowsWithQuality) {
    const { batch, result } = row;
    const aimagAcc = aimagMap.get(batch.aimag) ?? {
      aimag: batch.aimag,
      batchCount: 0,
      totalKg: 0,
      testedBatches: 0,
      fineness: [],
      cleanYield: [],
      admixture: [],
      soums: new Set<string>(),
    };
    aimagAcc.batchCount += 1;
    aimagAcc.totalKg += batch.amountKg;
    aimagAcc.soums.add(batch.soum);
    if (result) {
      aimagAcc.testedBatches += 1;
      aimagAcc.fineness.push(result.finenessMicron);
      aimagAcc.cleanYield.push(result.cleanYieldPct);
      aimagAcc.admixture.push(result.impurityPct);
    }
    aimagMap.set(batch.aimag, aimagAcc);

    const soumKey = `${batch.aimag}\u0000${batch.soum}`;
    const soumAcc = soumMap.get(soumKey) ?? {
      aimag: batch.aimag,
      soum: batch.soum,
      batchCount: 0,
      totalKg: 0,
      testedBatches: 0,
      fineness: [],
      cleanYield: [],
      admixture: [],
      soums: new Set<string>(),
    };
    soumAcc.batchCount += 1;
    soumAcc.totalKg += batch.amountKg;
    if (result) {
      soumAcc.testedBatches += 1;
      soumAcc.fineness.push(result.finenessMicron);
      soumAcc.cleanYield.push(result.cleanYieldPct);
      soumAcc.admixture.push(result.impurityPct);
    }
    soumMap.set(soumKey, soumAcc);
  }

  const aimags = [...aimagMap.values()]
    .map((entry) => ({
      aimag: entry.aimag,
      batchCount: entry.batchCount,
      totalKg: entry.totalKg,
      testedBatches: entry.testedBatches,
      soumCount: entry.soums.size,
      avgFinenessMicron: average(entry.fineness),
      avgCleanYieldPct: average(entry.cleanYield),
      avgImpurityPct: average(entry.admixture),
    }))
    .sort((a, b) => b.totalKg - a.totalKg || a.aimag.localeCompare(b.aimag));

  const soums = [...soumMap.values()]
    .map((entry) => ({
      aimag: entry.aimag,
      soum: entry.soum ?? "",
      batchCount: entry.batchCount,
      totalKg: entry.totalKg,
      testedBatches: entry.testedBatches,
      avgFinenessMicron: average(entry.fineness),
      avgCleanYieldPct: average(entry.cleanYield),
      avgImpurityPct: average(entry.admixture),
    }))
    .sort(
      (a, b) =>
        b.totalKg - a.totalKg ||
        a.aimag.localeCompare(b.aimag) ||
        a.soum.localeCompare(b.soum),
    );

  const recentBatches = [...filteredBatches]
    .sort(
      (a, b) =>
        b.registeredOn.localeCompare(a.registeredOn) || b.id.localeCompare(a.id),
    )
    .slice(0, 6)
    .map((batch) => ({
      id: batch.id,
      aimag: batch.aimag,
      soum: batch.soum,
      amountKg: batch.amountKg,
      livestockCount: batch.livestockCount ?? null,
      registeredOn: batch.registeredOn,
      tested: latestByBatch.has(batch.id) || batch.test !== null,
    }));

  return {
    filters,
    suppliers: {
      total: filteredSuppliers.length,
      ...suppliersByStatus,
      byType: supplierTypes.map((type) => ({
        type,
        count: filteredSuppliers.filter((supplier) => supplier.type === type).length,
      })),
    },
    batches: {
      total,
      totalKg,
      totalLivestock,
      tested,
      untested: total - tested,
      testedPct: total > 0 ? Math.round((tested / total) * 100) : 0,
    },
    quality: {
      testedBatches: tested,
      avgFinenessMicron: average(qualityRows.map((row) => row.result.finenessMicron)),
      avgCleanYieldPct: average(qualityRows.map((row) => row.result.cleanYieldPct)),
      avgImpurityPct: average(qualityRows.map((row) => row.result.impurityPct)),
      latestTestedOn: maxDate(qualityRows.map((row) => row.result.testedOn)),
    },
    monthly: [...monthlyMap.values()].sort((a, b) => a.month.localeCompare(b.month)),
    aimags,
    soums,
    recentBatches,
  };
}

/* ------------------------------------------------------------------ */
/* Report metadata + immutable snapshots (mock localStorage store)     */
/* ------------------------------------------------------------------ */

export interface ManagementReport {
  /** RPT-YYYY-000001 */
  id: string;
  type: ManagementReportType;
  format: ManagementReportFormat;
  filters: ManagementFilters;
  createdAt: string;
  createdBy: string;
  /** Aggregates captured when the report was generated. */
  snapshot: ManagementSnapshot;
}

const STORAGE_KEY = "ct.mock.management.reports";
const REPORTS_EVENT = "ct:mock:management-reports-change";

function seedSnapshot(from: string, to: string, aimag: string | null): ManagementSnapshot {
  return buildManagementAnalytics({
    suppliers: demoSuppliers,
    batches: demoBatches,
    tests: demoQualityTests,
    filters: { from, to, aimag },
  });
}

/** Two realistic examples so the report list is useful on first load. */
export const demoManagementReports: ManagementReport[] = [
  {
    id: "RPT-2026-000001",
    type: "comprehensive",
    format: "pdf",
    filters: { from: "2026-05-01", to: "2026-07-31", aimag: null },
    createdAt: "2026-08-01T09:10:00.000Z",
    createdBy: "management",
    snapshot: seedSnapshot("2026-05-01", "2026-07-31", null),
  },
  {
    id: "RPT-2026-000002",
    type: "quality",
    format: "csv",
    filters: { from: "2026-01-01", to: "2026-12-31", aimag: "Хөвсгөл" },
    createdAt: "2026-09-03T10:25:00.000Z",
    createdBy: "management",
    snapshot: seedSnapshot("2026-01-01", "2026-12-31", "Хөвсгөл"),
  },
];

const EMPTY_REPORTS: ManagementReport[] = [];

function readStored(): ManagementReport[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_REPORTS;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_REPORTS;
    return parsed.filter(
      (entry): entry is ManagementReport =>
        Boolean(entry) &&
        typeof entry === "object" &&
        typeof (entry as ManagementReport).id === "string" &&
        typeof (entry as ManagementReport).type === "string" &&
        typeof (entry as ManagementReport).format === "string" &&
        Boolean((entry as ManagementReport).snapshot) &&
        typeof (entry as ManagementReport).snapshot === "object",
    );
  } catch {
    return EMPTY_REPORTS;
  }
}

function mergeReports(): ManagementReport[] {
  const byId = new Map<string, ManagementReport>();
  for (const report of demoManagementReports) byId.set(report.id, report);
  for (const report of readStored()) byId.set(report.id, report);
  return [...byId.values()].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
  );
}

/** Plain reader (client) — newest report first. */
export function allManagementReports(): ManagementReport[] {
  if (typeof window === "undefined") {
    return [...demoManagementReports].sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
    );
  }
  return mergeReports();
}

export function managementReportById(id: string | null): ManagementReport | null {
  if (!id) return null;
  return allManagementReports().find((report) => report.id === id) ?? null;
}

/**
 * Generates the next RPT-YYYY-000001 id and appends the report metadata +
 * snapshot. There is no update/delete path: a corrected report is generated
 * as a new record, leaving earlier generated reports available.
 */
export function createManagementReport(input: {
  type: ManagementReportType;
  format: ManagementReportFormat;
  filters: ManagementFilters;
  snapshot: ManagementSnapshot;
}): ManagementReport {
  const now = new Date();
  const year = now.getFullYear();
  const prefix = `RPT-${year}-`;
  const nextSequence =
    allManagementReports().reduce((current, report) => {
      if (!report.id.startsWith(prefix)) return current;
      const sequence = Number(report.id.slice(prefix.length));
      return Number.isInteger(sequence) ? Math.max(current, sequence) : current;
    }, 0) + 1;

  const created: ManagementReport = {
    id: `${prefix}${String(nextSequence).padStart(6, "0")}`,
    type: input.type,
    format: input.format,
    filters: input.filters,
    createdAt: now.toISOString(),
    createdBy: "management",
    snapshot: input.snapshot,
  };

  writeJson(STORAGE_KEY, [...readStored(), created]);
  window.dispatchEvent(new Event(REPORTS_EVENT));
  return created;
}

let cacheSig = "";
let cacheList: ManagementReport[] = EMPTY_REPORTS;

function getSnapshot(): ManagementReport[] {
  if (typeof window === "undefined") return EMPTY_REPORTS;
  const list = mergeReports();
  const sig = list.map((report) => `${report.id}:${report.createdAt}`).join("|");
  if (sig !== cacheSig) {
    cacheSig = sig;
    cacheList = list;
  }
  return cacheList;
}

const getServerSnapshot = (): ManagementReport[] => EMPTY_REPORTS;

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(REPORTS_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(REPORTS_EVENT, callback);
  };
}

/** Reactive report list for the management report screens. */
export function useManagementReports(): ManagementReport[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
