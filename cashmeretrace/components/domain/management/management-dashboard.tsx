"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ChartColumn,
  FileText,
  FlaskConical,
  GitCompare,
  Scale,
  Users,
} from "lucide-react";

import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import {
  ManagementChartCard,
  ManagementInfoNote,
  ManagementMiniMetric,
  ManagementPageSkeleton,
  ManagementReadOnlyNote,
  ManagementStatCard,
} from "@/components/domain/management/management-ui";
import {
  QualityByAimagChart,
  SupplierTypeChart,
  SupplyTrendChart,
} from "@/components/domain/management/management-charts";
import {
  AimagStatsTable,
  RecentBatchesTable,
} from "@/components/domain/management/management-tables";
import { Button } from "@/components/ui/button";
import { formatDate, formatNumber } from "@/lib/format/mn";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import { useBatches } from "@/lib/mock/batches";
import { buildManagementAnalytics } from "@/lib/mock/management";
import { useQualityTests } from "@/lib/mock/quality";
import { useSuppliers } from "@/lib/mock/suppliers";

/** UC-11 — read-only management dashboard. */
export default function ManagementDashboard() {
  const hydrated = useHydrated();
  if (!hydrated) return <ManagementPageSkeleton />;
  return <ManagementDashboardContent />;
}

function ManagementDashboardContent() {
  const t = useTranslations("management.dashboard");
  const tc = useTranslations("management.common");
  const ts = useTranslations("management.supplierTypes");
  const locale = useCurrentLocale();

  const suppliers = useSuppliers();
  const batches = useBatches();
  const tests = useQualityTests();

  const analytics = useMemo(
    () =>
      buildManagementAnalytics({
        suppliers,
        batches,
        tests,
        filters: { from: "", to: "", aimag: null },
      }),
    [suppliers, batches, tests],
  );

  const monthly = analytics.monthly.map((row) => ({
    label: row.label,
    totalKg: row.totalKg,
    batchCount: row.batchCount,
  }));
  const supplierTypes = analytics.suppliers.byType.map((row) => ({
    name: ts(row.type),
    value: row.count,
  }));
  const qualityByAimag = analytics.aimags.map((row) => ({
    aimag: row.aimag,
    cleanYieldPct: row.avgCleanYieldPct,
    finenessMicron: row.avgFinenessMicron,
  }));

  const quality = analytics.quality;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <>
            <span className="border-sage-500/40 bg-sage-100/70 text-olive-600 inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-medium whitespace-nowrap">
              {t("badge")}
            </span>
            <Button asChild variant="outline" className="bg-linen/60 rounded-field">
              <Link href={`/${locale}/management/comparison`}>
                <GitCompare aria-hidden />
                {tc("viewComparison")}
              </Link>
            </Button>
            <Button asChild className="rounded-field font-semibold">
              <Link href={`/${locale}/management/reports`}>
                <FileText aria-hidden />
                {tc("viewReports")}
              </Link>
            </Button>
          </>
        }
      />

      <ManagementReadOnlyNote className="mb-4" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ManagementStatCard
          label={tc("metrics.totalSuppliers")}
          value={formatNumber(analytics.suppliers.total)}
          hint={t("statSuppliersHint", {
            active: formatNumber(analytics.suppliers.active),
            pending: formatNumber(analytics.suppliers.pending),
          })}
          icon={Users}
        />
        <ManagementStatCard
          label={tc("metrics.registeredBatches")}
          value={formatNumber(analytics.batches.total)}
          hint={t("statBatchesHint", {
            amount: formatNumber(analytics.batches.totalKg),
          })}
          icon={ChartColumn}
        />
        <ManagementStatCard
          label={tc("metrics.totalAmount")}
          value={`${formatNumber(analytics.batches.totalKg)} ${tc("unitKg")}`}
          hint={t("statAmountHint", {
            livestock: formatNumber(analytics.batches.totalLivestock),
          })}
          icon={Scale}
        />
        <ManagementStatCard
          label={tc("metrics.testedBatches")}
          value={formatNumber(analytics.batches.tested)}
          hint={t("statTestedHint", { pct: analytics.batches.testedPct })}
          icon={FlaskConical}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ManagementChartCard
          title={t("trendTitle")}
          description={t("trendDescription")}
        >
          {monthly.length === 0 ? (
            <p className="text-ink-500 py-14 text-center text-xs">{tc("noData")}</p>
          ) : (
            <SupplyTrendChart
              data={monthly}
              labels={{
                amount: `${tc("columns.amount")} (${tc("unitKg")})`,
                batches: tc("columns.batches"),
              }}
            />
          )}
        </ManagementChartCard>

        <ManagementChartCard
          title={t("supplierMixTitle")}
          description={t("supplierMixDescription")}
        >
          {analytics.suppliers.total === 0 ? (
            <p className="text-ink-500 py-14 text-center text-xs">{tc("noData")}</p>
          ) : (
            <SupplierTypeChart data={supplierTypes} />
          )}
        </ManagementChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <ManagementChartCard
          title={t("qualityTitle")}
          description={t("qualityDescription")}
        >
          {quality.testedBatches === 0 ? (
            <div className="border-brown-500/20 bg-linen/50 rounded-field border border-dashed px-5 py-10 text-center">
              <p className="text-forest-800 font-display text-base font-medium">
                {t("qualityEmpty")}
              </p>
              <p className="text-ink-500 mt-1 text-xs">{t("qualityEmptyHint")}</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <ManagementMiniMetric
                label={`${tc("metrics.avgFineness")} (${tc("unitMicron")})`}
                value={
                  quality.avgFinenessMicron === null
                    ? "—"
                    : formatNumber(quality.avgFinenessMicron, 1)
                }
              />
              <ManagementMiniMetric
                label={`${tc("metrics.avgCleanYield")} (${tc("unitPercent")})`}
                value={
                  quality.avgCleanYieldPct === null
                    ? "—"
                    : formatNumber(quality.avgCleanYieldPct, 1)
                }
              />
              <ManagementMiniMetric
                label={`${tc("metrics.avgAdmixture")} (${tc("unitPercent")})`}
                value={
                  quality.avgImpurityPct === null
                    ? "—"
                    : formatNumber(quality.avgImpurityPct, 1)
                }
              />
              <ManagementMiniMetric
                label={tc("metrics.testedBatches")}
                value={formatNumber(quality.testedBatches)}
                hint={
                  quality.latestTestedOn
                    ? t("latestTestHint", {
                        date: formatDate(quality.latestTestedOn),
                      })
                    : t("latestTestNone")
                }
              />
            </div>
          )}
          <ManagementInfoNote className="mt-3">{tc("unitNote")}</ManagementInfoNote>
        </ManagementChartCard>

        <ManagementChartCard
          title={t("qualityChartTitle")}
          description={t("qualityChartDescription")}
        >
          {qualityByAimag.length === 0 ? (
            <p className="text-ink-500 py-14 text-center text-xs">{tc("noData")}</p>
          ) : (
            <QualityByAimagChart
              data={qualityByAimag}
              labels={{
                yield: `${tc("columns.yield")} (${tc("unitPercent")})`,
                fineness: `${tc("columns.fineness")} (${tc("unitMicron")})`,
              }}
            />
          )}
        </ManagementChartCard>
      </div>

      <GlassPanel tier="g2" className="mt-4 p-0">
        <div className="flex flex-wrap items-end justify-between gap-2 px-5 pt-5 pb-3">
          <div>
            <h2 className="text-forest-900 font-display text-base font-semibold">
              {t("aimagTableTitle")}
            </h2>
            <p className="text-ink-500 mt-1 text-xs">{t("aimagTableDescription")}</p>
          </div>
          <Button asChild variant="outline" size="sm" className="bg-linen/60 rounded-field">
            <Link href={`/${locale}/management/comparison`}>
              {tc("viewComparison")}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
        <AimagStatsTable rows={analytics.aimags} />
      </GlassPanel>

      <GlassPanel tier="g2" className="mt-4 p-0">
        <div className="flex flex-wrap items-end justify-between gap-2 px-5 pt-5 pb-3">
          <div>
            <h2 className="text-forest-900 font-display text-base font-semibold">
              {t("recentTitle")}
            </h2>
            <p className="text-ink-500 mt-1 text-xs">{t("recentDescription")}</p>
          </div>
        </div>
        <RecentBatchesTable rows={analytics.recentBatches} />
      </GlassPanel>

      <p className="text-ink-500 mt-4 text-xs leading-relaxed">
        {tc("sourceNote")} {tc("unitNote")}
      </p>
    </>
  );
}
