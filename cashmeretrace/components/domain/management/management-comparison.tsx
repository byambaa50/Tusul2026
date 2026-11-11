"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { GitCompare, RotateCcw } from "lucide-react";

import EmptyState from "@/components/domain/shared/empty-state";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import {
  ManagementChartCard,
  ManagementInfoNote,
  ManagementMiniMetric,
  ManagementPageSkeleton,
  ManagementReadOnlyNote,
} from "@/components/domain/management/management-ui";
import {
  AmountByCategoryChart,
  QualityByAimagChart,
} from "@/components/domain/management/management-charts";
import {
  AimagStatsTable,
  SoumStatsTable,
} from "@/components/domain/management/management-tables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber } from "@/lib/format/mn";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useBatches } from "@/lib/mock/batches";
import {
  buildManagementAnalytics,
  DEMO_MANAGEMENT_FROM,
  DEMO_MANAGEMENT_TO,
} from "@/lib/mock/management";
import { useQualityTests } from "@/lib/mock/quality";
import { useSuppliers } from "@/lib/mock/suppliers";

/** UC-11 — aimag/soum comparison over the existing registry data. */
export default function ManagementComparison() {
  const hydrated = useHydrated();
  if (!hydrated) return <ManagementPageSkeleton />;
  return <ManagementComparisonContent />;
}

function ManagementComparisonContent() {
  const t = useTranslations("management.comparison");
  const tc = useTranslations("management.common");

  const suppliers = useSuppliers();
  const batches = useBatches();
  const tests = useQualityTests();

  const [from, setFrom] = useState(DEMO_MANAGEMENT_FROM);
  const [to, setTo] = useState(DEMO_MANAGEMENT_TO);
  const [aimag, setAimag] = useState("all");

  const aimagOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const supplier of suppliers) unique.add(supplier.aimag);
    for (const batch of batches) unique.add(batch.aimag);
    return [...unique].sort((a, b) => a.localeCompare(b));
  }, [suppliers, batches]);

  const invalidRange = Boolean(from && to && from > to);

  const analytics = useMemo(() => {
    if (invalidRange) return null;
    return buildManagementAnalytics({
      suppliers,
      batches,
      tests,
      filters: {
        from,
        to,
        aimag: aimag === "all" ? null : aimag,
      },
    });
  }, [suppliers, batches, tests, from, to, aimag, invalidRange]);

  const reset = () => {
    setFrom(DEMO_MANAGEMENT_FROM);
    setTo(DEMO_MANAGEMENT_TO);
    setAimag("all");
  };

  const amountData =
    analytics?.aimags.map((row) => ({
      category: row.aimag,
      totalKg: row.totalKg,
    })) ?? [];
  const qualityData =
    analytics?.aimags.map((row) => ({
      aimag: row.aimag,
      cleanYieldPct: row.avgCleanYieldPct,
      finenessMicron: row.avgFinenessMicron,
    })) ?? [];
  const hasQuality = qualityData.some(
    (row) => row.cleanYieldPct !== null || row.finenessMicron !== null,
  );

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <ManagementReadOnlyNote className="mb-4" />

      <GlassPanel tier="g2" className="p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-forest-900 font-display text-base font-semibold">
              {t("filterTitle")}
            </h2>
            <p className="text-ink-500 mt-1 text-xs">{t("filterHint")}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={reset}
            className="bg-linen/60 rounded-field"
          >
            <RotateCcw aria-hidden />
            {tc("reset")}
          </Button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="comparison-from">{tc("from")}</Label>
            <Input
              id="comparison-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="bg-linen/80 h-10 rounded-field"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="comparison-to">{tc("to")}</Label>
            <Input
              id="comparison-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="bg-linen/80 h-10 rounded-field"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{tc("aimag")}</Label>
            <Select value={aimag} onValueChange={setAimag}>
              <SelectTrigger className="bg-linen/80 h-10 w-full rounded-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tc("allAimags")}</SelectItem>
                {aimagOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {invalidRange ? (
          <p role="alert" className="text-terracotta-600 mt-3 text-xs">
            {t("invalidRange")}
          </p>
        ) : null}
      </GlassPanel>

      {analytics ? (
        <GlassPanel tier="g2" className="mt-4 p-5 sm:p-6">
          <h2 className="text-forest-900 font-display text-base font-semibold">
            {t("summaryTitle")}
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <ManagementMiniMetric
              label={tc("metrics.aimagsCovered")}
              value={formatNumber(analytics.aimags.length)}
            />
            <ManagementMiniMetric
              label={tc("metrics.soumsCovered")}
              value={formatNumber(analytics.soums.length)}
            />
            <ManagementMiniMetric
              label={tc("metrics.registeredBatches")}
              value={formatNumber(analytics.batches.total)}
              hint={`${formatNumber(analytics.batches.tested)} ${t("qualityTested").toLowerCase()}`}
            />
            <ManagementMiniMetric
              label={`${tc("metrics.totalAmount")} (${tc("unitKg")})`}
              value={formatNumber(analytics.batches.totalKg)}
            />
            <ManagementMiniMetric
              label={tc("metrics.testedShare")}
              value={`${analytics.batches.testedPct}${tc("unitPercent")}`}
            />
          </div>
          <ManagementInfoNote className="mt-3">{t("note")}</ManagementInfoNote>
        </GlassPanel>
      ) : null}

      {!analytics || analytics.batches.total === 0 ? (
        <EmptyState
          icon={GitCompare}
          title={invalidRange ? t("invalidRange") : t("emptyTitle")}
          description={invalidRange ? undefined : t("emptyHint")}
          className="mt-4"
        />
      ) : (
        <>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <ManagementChartCard
              title={t("amountChartTitle")}
              description={t("amountChartDescription")}
            >
              <AmountByCategoryChart
                data={amountData}
                amountLabel={`${tc("columns.amount")} (${tc("unitKg")})`}
              />
            </ManagementChartCard>
            <ManagementChartCard
              title={t("qualityChartTitle")}
              description={t("qualityChartDescription")}
            >
              {hasQuality ? (
                <QualityByAimagChart
                  data={qualityData}
                  labels={{
                    yield: `${tc("columns.yield")} (${tc("unitPercent")})`,
                    fineness: `${tc("columns.fineness")} (${tc("unitMicron")})`,
                  }}
                />
              ) : (
                <p className="text-ink-500 py-14 text-center text-xs">
                  {tc("noData")}
                </p>
              )}
            </ManagementChartCard>
          </div>

          <GlassPanel tier="g2" className="mt-4 p-0">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-forest-900 font-display text-base font-semibold">
                {t("aimagTableTitle")}
              </h2>
              <p className="text-ink-500 mt-1 text-xs">
                {t("aimagTableDescription")}
              </p>
            </div>
            <AimagStatsTable rows={analytics.aimags} />
          </GlassPanel>

          <GlassPanel tier="g2" className="mt-4 p-0">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-forest-900 font-display text-base font-semibold">
                {t("soumTableTitle")}
              </h2>
              <p className="text-ink-500 mt-1 text-xs">
                {t("soumTableDescription")}
              </p>
            </div>
            <SoumStatsTable rows={analytics.soums} />
          </GlassPanel>
        </>
      )}
    </>
  );
}
