"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Eye,
  FlaskConical,
  GitCompare,
  History as HistoryIcon,
  Search,
} from "lucide-react";

import EmptyState from "@/components/domain/shared/empty-state";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import { RecordNotFound, StatCard } from "@/components/domain/clerk/clerk-ui";
import {
  InsertOnlyNote,
  QualityBatchStrip,
  QualityPageSkeleton,
} from "@/components/domain/quality/quality-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format/mn";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import { useBatches } from "@/lib/mock/batches";
import { useQualityTests } from "@/lib/mock/quality";
import { useSuppliers } from "@/lib/mock/suppliers";

/**
 * UC-08 result history. Without `batchId` it lists every inserted result;
 * with `batchId` it is the scoped, read-only history of one batch. Both
 * variants are ordered by `created_at DESC, id DESC` and expose no edit or
 * delete action.
 */
export default function QualityHistory({ batchId }: { batchId?: string }) {
  const hydrated = useHydrated();
  if (!hydrated) return <QualityPageSkeleton />;
  return <QualityHistoryContent batchId={batchId} />;
}

function QualityHistoryContent({ batchId }: { batchId?: string }) {
  const t = useTranslations("quality.history");
  const tc = useTranslations("quality.common");
  const locale = useCurrentLocale();

  const batches = useBatches();
  const suppliers = useSuppliers();
  const tests = useQualityTests();
  const [query, setQuery] = useState("");

  const batch = useMemo(
    () => (batchId ? batches.find((entry) => entry.id === batchId) ?? null : null),
    [batchId, batches],
  );
  const supplierById = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier])),
    [suppliers],
  );
  const supplierName = (supplierId: string) =>
    supplierById.get(supplierId)?.name ?? supplierId;

  const scopedTests = useMemo(
    () => (batchId ? tests.filter((test) => test.batchId === batchId) : tests),
    [batchId, tests],
  );

  const latestIdByBatch = useMemo(() => {
    const latest = new Map<string, string>();
    for (const test of tests) {
      if (!latest.has(test.batchId)) latest.set(test.batchId, test.id);
    }
    return new Map([...latest.entries()].map(([id, testId]) => [testId, id]));
  }, [tests]);

  const testCountByBatch = useMemo(() => {
    const counts = new Map<string, number>();
    for (const test of tests) {
      counts.set(test.batchId, (counts.get(test.batchId) ?? 0) + 1);
    }
    return counts;
  }, [tests]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return scopedTests;
    return scopedTests.filter((test) => {
      const currentBatch = batches.find((entry) => entry.id === test.batchId);
      const name = currentBatch
        ? supplierById.get(currentBatch.supplierId)?.name ?? currentBatch.supplierId
        : "";
      const haystack = [test.id, test.batchId, test.labResult, test.testedOn, name]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [batches, query, scopedTests, supplierById]);

  if (batchId && !batch) {
    return (
      <RecordNotFound
        title={tc("notFound")}
        description={tc("notFoundHint")}
        backHref={`/${locale}/quality/search`}
        backLabel={t("backToSearch")}
      />
    );
  }

  return (
    <>
      <PageHeader
        title={batchId ? t("scopedTitle") : t("title")}
        description={batchId ? t("scopedSubtitle") : t("subtitle")}
        actions={
          <>
            <Button asChild variant="outline" className="bg-linen/60 rounded-field">
              <Link href={`/${locale}/quality/search`}>
                <ArrowLeft aria-hidden />
                {t("backToSearch")}
              </Link>
            </Button>
            {batch ? (
              <Button asChild className="rounded-field font-semibold">
                <Link href={`/${locale}/quality/batches/${batch.id}/test`}>
                  <FlaskConical aria-hidden />
                  {t("addTest")}
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      {batch ? (
        <QualityBatchStrip
          batch={batch}
          supplierName={supplierName(batch.supplierId)}
          latest={scopedTests[0] ?? null}
          className="mb-4"
        />
      ) : null}

      {!batchId ? (
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <StatCard label={t("statResults")} value={tests.length} icon={HistoryIcon} />
          <StatCard
            label={t("statBatches")}
            value={new Set(tests.map((test) => test.batchId)).size}
            icon={FlaskConical}
          />
        </div>
      ) : null}

      <GlassPanel tier="g2" className="p-5 sm:p-6">
        <label
          htmlFor="quality-history-search"
          className="text-ink-500 mb-2 block text-xs font-medium tracking-wide uppercase"
        >
          {t("searchLabel")}
        </label>
        <div className="relative">
          <Search
            aria-hidden
            className="text-ink-500 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            id="quality-history-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="bg-linen/80 h-11 rounded-field pr-3 pl-9"
          />
        </div>
        <p className="text-ink-500 mt-3 text-xs tabular-nums">
          {t("resultCount", { count: filtered.length })}
        </p>
      </GlassPanel>

      <GlassPanel tier="g2" className="mt-4 p-0">
        <div className="flex flex-wrap items-end justify-between gap-2 px-5 pt-5 pb-3">
          <div>
            <h2 className="text-forest-900 font-display text-base font-semibold">
              {batchId ? t("scopedTitle") : t("title")}
            </h2>
            <p className="text-ink-500 mt-1 text-xs">{tc("latestOrderNote")}</p>
          </div>
          {batch ? (
            <Button asChild variant="outline" size="sm" className="bg-linen/60 rounded-field">
              <Link href={`/${locale}/quality/batches/${batch.id}`}>
                <ArrowLeft aria-hidden />
                {t("backToBatch")}
              </Link>
            </Button>
          ) : null}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={batchId ? t("scopedEmpty") : t("empty")}
            description={batchId ? t("scopedEmptyHint") : t("emptyHint")}
            className="border-transparent bg-transparent"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("colBatch")}</TableHead>
                <TableHead>{t("colSupplier")}</TableHead>
                <TableHead>{t("colTest")}</TableHead>
                <TableHead className="text-right">{t("colFineness")}</TableHead>
                <TableHead className="text-right">{t("colYield")}</TableHead>
                <TableHead className="text-right">{t("colAdmixture")}</TableHead>
                <TableHead>{t("colTestDate")}</TableHead>
                <TableHead>{t("colEntered")}</TableHead>
                <TableHead>{t("colLab")}</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">{t("actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((test) => {
                const testBatch = batches.find((entry) => entry.id === test.batchId);
                const isLatest = latestIdByBatch.get(test.id) === test.batchId;
                const canCompare = (testCountByBatch.get(test.batchId) ?? 0) > 1;
                return (
                  <TableRow key={test.id}>
                    <TableCell>
                      <Link
                        href={`/${locale}/quality/batches/${test.batchId}`}
                        className="text-forest-800 font-medium tabular-nums underline-offset-4 hover:underline"
                      >
                        {test.batchId}
                      </Link>
                      {isLatest ? (
                        <span className="border-sage-500/40 bg-sage-100 text-forest-800 ml-2 inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-medium">
                          {t("latest")}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-ink-700">
                      {testBatch ? supplierName(testBatch.supplierId) : "—"}
                    </TableCell>
                    <TableCell className="text-ink-700 text-xs tabular-nums">
                      {test.id}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(test.finenessMicron, 1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(test.cleanYieldPct, 1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(test.impurityPct, 1)}
                    </TableCell>
                    <TableCell className="text-ink-700 tabular-nums">
                      {formatDate(test.testedOn)}
                    </TableCell>
                    <TableCell className="text-ink-700 tabular-nums">
                      {formatDateTime(test.createdAt)}
                    </TableCell>
                    <TableCell className="text-ink-500 max-w-56 truncate text-xs">
                      {test.labResult}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {canCompare ? (
                          <Button
                            asChild
                            variant="ghost"
                            size="icon-sm"
                            title={t("compareAction")}
                          >
                            <Link
                              href={`/${locale}/quality/batches/${test.batchId}/compare`}
                              aria-label={`${t("compareAction")} ${test.batchId}`}
                            >
                              <GitCompare aria-hidden />
                            </Link>
                          </Button>
                        ) : null}
                        <Button
                          asChild
                          variant="ghost"
                          size="icon-sm"
                          title={t("viewBatch")}
                        >
                          <Link
                            href={`/${locale}/quality/batches/${test.batchId}`}
                            aria-label={`${t("viewBatch")} ${test.batchId}`}
                          >
                            <Eye aria-hidden />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </GlassPanel>

      <InsertOnlyNote className="mt-4" />
    </>
  );
}
