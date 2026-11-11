"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, FlaskConical, GitCompare, History } from "lucide-react";

import EmptyState from "@/components/domain/shared/empty-state";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import { RecordNotFound } from "@/components/domain/clerk/clerk-ui";
import {
  InsertOnlyNote,
  QualityBatchStrip,
  QualityPageSkeleton,
} from "@/components/domain/quality/quality-ui";
import { Button } from "@/components/ui/button";
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

/** Signed delta; zero stays unsigned and no judgement colour is applied. */
function formatDelta(value: number, digits: number): string {
  const rounded = Number(value.toFixed(digits));
  if (rounded === 0) return "0";
  return `${rounded > 0 ? "+" : ""}${formatNumber(rounded, digits)}`;
}

/**
 * UC-08 previous-result comparison. The latest result is `tests[0]` and the
 * previous one is `tests[1]` under the `created_at DESC, id DESC` order; the
 * screen shows only numeric differences and never invents a quality verdict.
 */
export default function QualityCompare({ batchId }: { batchId: string }) {
  const hydrated = useHydrated();
  if (!hydrated) return <QualityPageSkeleton />;
  return <QualityCompareContent batchId={batchId} />;
}

function QualityCompareContent({ batchId }: { batchId: string }) {
  const t = useTranslations("quality.compare");
  const tc = useTranslations("quality.common");
  const locale = useCurrentLocale();

  const batches = useBatches();
  const suppliers = useSuppliers();
  const tests = useQualityTests();

  const batch = batches.find((entry) => entry.id === batchId) ?? null;
  if (!batch) {
    return (
      <RecordNotFound
        title={tc("notFound")}
        description={tc("notFoundHint")}
        backHref={`/${locale}/quality/search`}
        backLabel={t("backToBatch")}
      />
    );
  }

  const supplier = suppliers.find((entry) => entry.id === batch.supplierId) ?? null;
  const testsForBatch = tests.filter((test) => test.batchId === batch.id);
  const latest = testsForBatch[0] ?? null;
  const previous = testsForBatch[1] ?? null;

  return (
    <>
      <PageHeader
        title={`${t("title")} · ${batch.id}`}
        description={t("subtitle")}
        actions={
          <>
            <Button asChild variant="outline" className="bg-linen/60 rounded-field">
              <Link href={`/${locale}/quality/batches/${batch.id}`}>
                <ArrowLeft aria-hidden />
                {t("backToBatch")}
              </Link>
            </Button>
            <Button asChild className="rounded-field font-semibold">
              <Link href={`/${locale}/quality/batches/${batch.id}/test`}>
                <FlaskConical aria-hidden />
                {t("addTest")}
              </Link>
            </Button>
          </>
        }
      />

      <QualityBatchStrip
        batch={batch}
        supplierName={supplier?.name ?? batch.supplierId}
        latest={latest}
        className="mb-4"
      />

      {!latest || !previous ? (
        <GlassPanel tier="g2" className="p-5 sm:p-6">
          <EmptyState
            icon={GitCompare}
            title={latest ? t("oneTestTitle") : t("noTestsTitle")}
            description={latest ? t("oneTestHint") : t("noTestsHint")}
            className="border-transparent bg-transparent"
          />
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button asChild className="rounded-field font-semibold">
              <Link href={`/${locale}/quality/batches/${batch.id}/test`}>
                <FlaskConical aria-hidden />
                {t("addTest")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="bg-linen/60 rounded-field">
              <Link href={`/${locale}/quality/batches/${batch.id}/history`}>
                <History aria-hidden />
                {t("viewHistory")}
              </Link>
            </Button>
          </div>
        </GlassPanel>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <GlassPanel tier="g2" className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-forest-900 font-display text-base font-semibold">
                  {t("latestTitle")}
                </h2>
                <span className="border-sage-500/40 bg-sage-100 text-forest-800 inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium">
                  {t("currentBadge")}
                </span>
              </div>
              <p className="text-ink-500 mt-1 text-xs tabular-nums">{latest.id}</p>
              <dl className="mt-4 grid gap-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500 text-xs">{tc("fineness")}</dt>
                  <dd className="text-ink-900 font-medium tabular-nums">
                    {formatNumber(latest.finenessMicron, 1)} {tc("unitMicron")}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500 text-xs">{tc("cleanYield")}</dt>
                  <dd className="text-ink-900 font-medium tabular-nums">
                    {formatNumber(latest.cleanYieldPct, 1)} {tc("unitPercent")}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500 text-xs">{tc("admixture")}</dt>
                  <dd className="text-ink-900 font-medium tabular-nums">
                    {formatNumber(latest.impurityPct, 1)} {tc("unitPercent")}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500 text-xs">{t("testDate")}</dt>
                  <dd className="text-ink-900 tabular-nums">{formatDate(latest.testedOn)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500 text-xs">{t("enteredAt")}</dt>
                  <dd className="text-ink-700 text-xs tabular-nums">
                    {formatDateTime(latest.createdAt)}
                  </dd>
                </div>
              </dl>
              <div className="border-brown-500/15 bg-linen/50 rounded-field mt-4 border p-3">
                <p className="text-ink-500 text-[11px] font-medium tracking-wide uppercase">
                  {t("labResult")}
                </p>
                <p className="text-ink-700 mt-1 text-sm leading-relaxed">{latest.labResult}</p>
              </div>
            </GlassPanel>

            <GlassPanel tier="g2" className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-forest-900 font-display text-base font-semibold">
                  {t("previousTitle")}
                </h2>
                <span className="border-brown-500/30 bg-cream-200 text-ink-700 inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium">
                  {t("previousBadge")}
                </span>
              </div>
              <p className="text-ink-500 mt-1 text-xs tabular-nums">{previous.id}</p>
              <dl className="mt-4 grid gap-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500 text-xs">{tc("fineness")}</dt>
                  <dd className="text-ink-900 font-medium tabular-nums">
                    {formatNumber(previous.finenessMicron, 1)} {tc("unitMicron")}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500 text-xs">{tc("cleanYield")}</dt>
                  <dd className="text-ink-900 font-medium tabular-nums">
                    {formatNumber(previous.cleanYieldPct, 1)} {tc("unitPercent")}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500 text-xs">{tc("admixture")}</dt>
                  <dd className="text-ink-900 font-medium tabular-nums">
                    {formatNumber(previous.impurityPct, 1)} {tc("unitPercent")}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500 text-xs">{t("testDate")}</dt>
                  <dd className="text-ink-900 tabular-nums">
                    {formatDate(previous.testedOn)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500 text-xs">{t("enteredAt")}</dt>
                  <dd className="text-ink-700 text-xs tabular-nums">
                    {formatDateTime(previous.createdAt)}
                  </dd>
                </div>
              </dl>
              <div className="border-brown-500/15 bg-linen/50 rounded-field mt-4 border p-3">
                <p className="text-ink-500 text-[11px] font-medium tracking-wide uppercase">
                  {t("labResult")}
                </p>
                <p className="text-ink-700 mt-1 text-sm leading-relaxed">{previous.labResult}</p>
              </div>
            </GlassPanel>
          </div>

          <GlassPanel tier="g2" className="mt-4 p-0">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-forest-900 font-display text-base font-semibold">
                {t("deltaCol")}
              </h2>
              <p className="text-ink-500 mt-1 text-xs leading-relaxed">{t("deltaHint")}</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("metricCol")}</TableHead>
                  <TableHead className="text-right">{t("previousCol")}</TableHead>
                  <TableHead className="text-right">{t("latestCol")}</TableHead>
                  <TableHead className="text-right">{t("deltaCol")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-ink-700">{tc("fineness")}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(previous.finenessMicron, 1)} {tc("unitMicron")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(latest.finenessMicron, 1)} {tc("unitMicron")}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatDelta(latest.finenessMicron - previous.finenessMicron, 1)}{" "}
                    {tc("unitMicron")}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-ink-700">{tc("cleanYield")}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(previous.cleanYieldPct, 1)} {tc("unitPercent")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(latest.cleanYieldPct, 1)} {tc("unitPercent")}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatDelta(latest.cleanYieldPct - previous.cleanYieldPct, 1)}{" "}
                    {tc("unitPercent")}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-ink-700">{tc("admixture")}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(previous.impurityPct, 1)} {tc("unitPercent")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(latest.impurityPct, 1)} {tc("unitPercent")}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatDelta(latest.impurityPct - previous.impurityPct, 1)}{" "}
                    {tc("unitPercent")}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </GlassPanel>
        </>
      )}

      <GlassPanel tier="g2" className="mt-4 p-5">
        <p className="text-ink-700 text-sm leading-relaxed">{t("noStandardNote")}</p>
        <p className="text-ink-500 mt-2 text-xs leading-relaxed">{t("orderNote")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="bg-linen/60 rounded-field">
            <Link href={`/${locale}/quality/batches/${batch.id}/history`}>
              <History aria-hidden />
              {t("viewHistory")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="bg-linen/60 rounded-field">
            <Link href={`/${locale}/quality/batches/${batch.id}`}>{t("backToBatch")}</Link>
          </Button>
        </div>
      </GlassPanel>

      <InsertOnlyNote className="mt-4" />
    </>
  );
}
