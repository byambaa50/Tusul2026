"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import DemoNote from "@/components/domain/shared/demo-note";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import { QualityPageSkeleton } from "@/components/domain/quality/quality-ui";
import QualityBatchTable from "@/components/domain/quality/quality-batch-table";
import QualityFilters, {
  emptyQualityFilters,
  filterQualityBatches,
  type QualityFiltersState,
} from "@/components/domain/quality/quality-filters";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useBatches } from "@/lib/mock/batches";
import { useQualityTests } from "@/lib/mock/quality";
import { useQrRecords } from "@/lib/mock/qr";
import { useSuppliers } from "@/lib/mock/suppliers";

/**
 * UC-07 — quality batch search. The header quick-search passes `q` as the
 * initial query. Results are read-only; the row actions only open quality
 * workflows (details, result entry, history, publish fields).
 */
export default function QualitySearch({ initialQuery = "" }: { initialQuery?: string }) {
  const hydrated = useHydrated();
  if (!hydrated) return <QualityPageSkeleton />;
  return <QualitySearchContent initialQuery={initialQuery} />;
}

function QualitySearchContent({ initialQuery }: { initialQuery: string }) {
  const t = useTranslations("quality.search");
  const tc = useTranslations("quality.common");
  const batches = useBatches();
  const suppliers = useSuppliers();
  const tests = useQualityTests();
  const qrRecords = useQrRecords();

  const [filters, setFilters] = useState<QualityFiltersState>({
    ...emptyQualityFilters,
    query: initialQuery,
  });

  const supplierById = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier])),
    [suppliers],
  );
  const supplierName = useCallback(
    (supplierId: string) => supplierById.get(supplierId)?.name ?? supplierId,
    [supplierById],
  );
  const qrByBatch = useMemo(
    () => new Map(qrRecords.map((record) => [record.batchId, record])),
    [qrRecords],
  );

  const latestByBatch = useMemo(() => {
    const map = new Map<string, (typeof tests)[number]>();
    for (const test of tests) {
      if (!map.has(test.batchId)) map.set(test.batchId, test);
    }
    return map;
  }, [tests]);

  const testCountByBatch = useMemo(() => {
    const map = new Map<string, number>();
    for (const test of tests) {
      map.set(test.batchId, (map.get(test.batchId) ?? 0) + 1);
    }
    return map;
  }, [tests]);

  const aimags = useMemo(
    () => [...new Set(batches.map((batch) => batch.aimag))].sort((a, b) => a.localeCompare(b)),
    [batches],
  );
  const years = useMemo(
    () =>
      [...new Set(batches.map((batch) => batch.registeredOn.slice(0, 4)))].sort((a, b) =>
        b.localeCompare(a),
      ),
    [batches],
  );

  const filtered = useMemo(
    () => filterQualityBatches(batches, filters, supplierName, latestByBatch, qrByBatch),
    [batches, filters, supplierName, latestByBatch, qrByBatch],
  );

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />

      <GlassPanel tier="g2" className="p-5 sm:p-6">
        <p className="text-ink-500 mb-3 text-xs font-medium tracking-wide uppercase">
          {t("queryLabel")}
        </p>
        <QualityFilters filters={filters} onChange={setFilters} aimags={aimags} years={years} />
        <p className="text-ink-500 mt-3 text-xs">{t("resultCount", { count: filtered.length })}</p>
      </GlassPanel>

      <GlassPanel tier="g2" className="mt-4 p-0">
        <div className="flex flex-wrap items-end justify-between gap-2 px-5 pt-5 pb-3">
          <div>
            <h2 className="text-forest-900 font-display text-base font-semibold">
              {t("resultTitle")}
            </h2>
            <p className="text-ink-500 mt-1 text-xs">{t("tableHint")}</p>
          </div>
          <span className="text-ink-500 text-xs tabular-nums">
            {tc("results", { count: filtered.length })}
          </span>
        </div>
        <QualityBatchTable
          batches={filtered}
          supplierName={supplierName}
          latestByBatch={latestByBatch}
          testCountByBatch={testCountByBatch}
          qrByBatch={qrByBatch}
        />
      </GlassPanel>

      <DemoNote className="mt-4">{tc("demoNote")}</DemoNote>
    </>
  );
}
