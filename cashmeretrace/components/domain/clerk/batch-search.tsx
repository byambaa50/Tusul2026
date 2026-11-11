"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import DemoNote from "@/components/domain/shared/demo-note";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import BatchFilters, {
  emptyBatchFilters,
  filterBatches,
  type BatchFiltersState,
} from "@/components/domain/clerk/batch-filters";
import BatchTable from "@/components/domain/clerk/batch-table";
import { ClerkPageSkeleton } from "@/components/domain/clerk/clerk-ui";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useBatches } from "@/lib/mock/batches";
import { useQrRecords } from "@/lib/mock/qr";
import { useSuppliers } from "@/lib/mock/suppliers";

/**
 * UC-07 — batch search: the header quick-search hands `q` over as the
 * initial query; the same number/supplier/origin/status/QR filters as the
 * registry list apply.
 */
export default function BatchSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const hydrated = useHydrated();
  if (!hydrated) return <ClerkPageSkeleton />;
  return <BatchSearchContent initialQuery={initialQuery} />;
}

function BatchSearchContent({ initialQuery }: { initialQuery: string }) {
  const t = useTranslations("clerk.search");
  const tc = useTranslations("clerk.common");
  const batches = useBatches();
  const suppliers = useSuppliers();
  const qrRecords = useQrRecords();

  const [filters, setFilters] = useState<BatchFiltersState>({
    ...emptyBatchFilters,
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
    () => filterBatches(batches, filters, supplierName, qrByBatch),
    [batches, filters, supplierName, qrByBatch],
  );

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />

      <GlassPanel tier="g2" className="p-5 sm:p-6">
        <p className="text-ink-500 mb-3 text-xs font-medium tracking-wide uppercase">
          {t("queryLabel")}
        </p>
        <BatchFilters filters={filters} onChange={setFilters} aimags={aimags} years={years} />
        <p className="text-ink-500 mt-3 text-xs">
          {t("resultCount", { count: filtered.length })} · {tc("results", { count: filtered.length })}
        </p>
      </GlassPanel>

      <GlassPanel tier="g2" className="mt-4 p-0">
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <h2 className="text-forest-900 font-display text-base font-semibold">
            {t("resultTitle")}
          </h2>
          <span className="text-ink-500 text-xs tabular-nums">{filtered.length}</span>
        </div>
        <BatchTable batches={filtered} supplierName={supplierName} qrByBatch={qrByBatch} />
      </GlassPanel>

      <DemoNote className="mt-4">{tc("demoNote")}</DemoNote>
    </>
  );
}
