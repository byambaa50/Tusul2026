"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PackagePlus } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import { useBatches } from "@/lib/mock/batches";
import { useQrRecords } from "@/lib/mock/qr";
import { useSuppliers } from "@/lib/mock/suppliers";

/**
 * UC-05/UC-07 — batch registry: all suppliers' batches, searchable and
 * filterable, with edit/trace/QR entry points.
 */
export default function BatchList() {
  const hydrated = useHydrated();
  if (!hydrated) return <ClerkPageSkeleton />;
  return <BatchListContent />;
}

function BatchListContent() {
  const t = useTranslations("clerk.batch");
  const tc = useTranslations("clerk.common");
  const locale = useCurrentLocale();
  const batches = useBatches();
  const suppliers = useSuppliers();
  const qrRecords = useQrRecords();

  const [filters, setFilters] = useState<BatchFiltersState>(emptyBatchFilters);

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
      <PageHeader
        title={t("listTitle")}
        description={t("listSubtitle")}
        actions={
          <Button asChild className="rounded-field font-semibold">
            <Link href={`/${locale}/clerk/batches/new`}>
              <PackagePlus aria-hidden />
              {t("new")}
            </Link>
          </Button>
        }
      />

      <GlassPanel tier="g2" className="p-5 sm:p-6">
        <BatchFilters filters={filters} onChange={setFilters} aimags={aimags} years={years} />
        <p className="text-ink-500 mt-3 text-xs">{tc("results", { count: filtered.length })}</p>
      </GlassPanel>

      <GlassPanel tier="g2" className="mt-4 p-0">
        <BatchTable batches={filtered} supplierName={supplierName} qrByBatch={qrByBatch} />
      </GlassPanel>

      <DemoNote className="mt-4">{tc("demoNote")}</DemoNote>
    </>
  );
}
