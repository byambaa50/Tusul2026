"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Download, FileText, Printer } from "lucide-react";

import BrandMark from "@/components/layout/brand-mark";
import EmptyState from "@/components/domain/shared/empty-state";
import PageHeader from "@/components/domain/shared/page-header";
import {
  ManagementPageSkeleton,
  ManagementReadOnlyNote,
} from "@/components/domain/management/management-ui";
import {
  AimagStatsTable,
  MonthlyStatsTable,
  RecentBatchesTable,
  SoumStatsTable,
} from "@/components/domain/management/management-tables";
import { useReportDownload } from "@/components/domain/management/use-report-download";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format/mn";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import {
  managementReportById,
  useManagementReports,
} from "@/lib/mock/management";
import { cn } from "@/lib/utils";

/** UC-11 — printable preview of an immutable report snapshot. */
export default function ManagementReportPreview({
  reportId,
}: {
  reportId: string;
}) {
  const hydrated = useHydrated();
  if (!hydrated) return <ManagementPageSkeleton />;
  return <ManagementReportPreviewContent reportId={reportId} />;
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-brown-500/15 bg-ivory-50/80 rounded-field border p-3">
      <p className="text-ink-500 text-[10px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-forest-900 mt-1 text-lg font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}

function ReportSection({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-7", className)}>
      <h2 className="text-forest-900 font-display text-lg font-semibold">{title}</h2>
      {hint ? (
        <p className="text-ink-500 mt-1 text-xs leading-relaxed">{hint}</p>
      ) : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function BreakdownList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
}) {
  return (
    <div>
      <h3 className="text-forest-800 text-sm font-medium">{title}</h3>
      <ul className="border-brown-500/15 bg-linen/60 rounded-field mt-2 divide-y divide-brown-500/10 border">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
          >
            <span className="text-ink-700">{row.label}</span>
            <span className="text-forest-900 font-semibold tabular-nums">
              {formatNumber(row.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ManagementReportPreviewContent({ reportId }: { reportId: string }) {
  const t = useTranslations("management.preview");
  const tc = useTranslations("management.common");
  const tr = useTranslations("management.reportTypes");
  const tf = useTranslations("management.reportFormats");
  const ts = useTranslations("management.supplierTypes");
  const tss = useTranslations("management.supplierStatus");
  const locale = useCurrentLocale();
  const reports = useManagementReports();
  const { downloadCsvReport, printReport } = useReportDownload();

  const report = useMemo(
    () => reports.find((entry) => entry.id === reportId) ?? managementReportById(reportId),
    [reports, reportId],
  );

  const reportsHref = `/${locale}/management/reports`;

  if (!report) {
    return (
      <>
        <PageHeader
          title={t("title")}
          description={t("subtitle")}
          actions={
            <Button asChild variant="outline" className="bg-linen/60 rounded-field">
              <Link href={reportsHref}>
                <ArrowLeft aria-hidden />
                {t("back")}
              </Link>
            </Button>
          }
        />
        <EmptyState
          icon={FileText}
          title={t("notFound")}
          description={t("notFoundHint")}
        />
      </>
    );
  }

  const { snapshot } = report;
  const totalAimags = snapshot.aimags.length;
  const totalSoums = snapshot.soums.length;

  const supplierStatusRows = [
    { label: tss("active"), value: snapshot.suppliers.active },
    { label: tss("pending"), value: snapshot.suppliers.pending },
    { label: tss("rejected"), value: snapshot.suppliers.rejected },
    { label: tss("locked"), value: snapshot.suppliers.locked },
  ];
  const supplierTypeRows = snapshot.suppliers.byType.map((row) => ({
    label: ts(row.type),
    value: row.count,
  }));

  const showSuppliers = report.type === "comprehensive";
  const showBatches = report.type === "comprehensive" || report.type === "supply";
  const showQuality = report.type === "comprehensive" || report.type === "quality";
  const showMonthly = report.type !== "origin";
  const showRecent = report.type !== "quality";

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <>
            <Button asChild variant="outline" className="bg-linen/60 rounded-field">
              <Link href={reportsHref}>
                <ArrowLeft aria-hidden />
                {t("back")}
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="bg-linen/60 rounded-field"
              onClick={() => downloadCsvReport(report)}
            >
              <Download aria-hidden />
              {t("downloadCsv")}
            </Button>
            <Button
              type="button"
              className="rounded-field font-semibold"
              onClick={printReport}
            >
              <Printer aria-hidden />
              {t("print")}
            </Button>
          </>
        }
        className="no-print"
      />

      <ManagementReadOnlyNote className="no-print mb-4" />

      <article className="report-print border-brown-500/15 bg-linen/80 rounded-block border p-5 shadow-soft sm:p-8">
        <header className="border-brown-500/15 flex flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div>
            <BrandMark />
            <p className="text-ink-500 mt-3 text-[11px] font-medium tracking-[0.12em] uppercase">
              {t("brand")}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-forest-900 font-display text-xl font-semibold">
              {tr(report.type)}
            </p>
            <p className="text-ink-700 mt-1 text-xs font-medium tabular-nums">
              {report.id}
            </p>
            <p className="text-ink-500 mt-1 text-[11px]">
              {t("footerGenerated", {
                date: formatDateTime(report.createdAt),
              })}
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-ink-500 text-[10px] font-medium tracking-wide uppercase">
              {tc("period")}
            </p>
            <p className="text-forest-900 mt-1 text-sm font-medium tabular-nums">
              {formatDate(report.filters.from)} — {formatDate(report.filters.to)}
            </p>
          </div>
          <div>
            <p className="text-ink-500 text-[10px] font-medium tracking-wide uppercase">
              {tc("aimag")}
            </p>
            <p className="text-forest-900 mt-1 text-sm font-medium">
              {report.filters.aimag ?? tc("allAimags")}
            </p>
          </div>
          <div>
            <p className="text-ink-500 text-[10px] font-medium tracking-wide uppercase">
              {tc("format")}
            </p>
            <p className="text-forest-900 mt-1 text-sm font-medium">
              {tf(report.format)}
            </p>
          </div>
          <div>
            <p className="text-ink-500 text-[10px] font-medium tracking-wide uppercase">
              {tc("createdBy")}
            </p>
            <p className="text-forest-900 mt-1 text-sm font-medium">
              {report.createdBy === "management"
                ? tc("roleManagement")
                : report.createdBy}
            </p>
          </div>
        </div>

        <ReportSection title={t("summaryTitle")}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <ReportMetric
              label={tc("metrics.totalSuppliers")}
              value={formatNumber(snapshot.suppliers.total)}
            />
            <ReportMetric
              label={tc("metrics.registeredBatches")}
              value={formatNumber(snapshot.batches.total)}
            />
            <ReportMetric
              label={`${tc("metrics.totalAmount")} (${tc("unitKg")})`}
              value={formatNumber(snapshot.batches.totalKg)}
            />
            <ReportMetric
              label={tc("metrics.testedShare")}
              value={`${snapshot.batches.testedPct}${tc("unitPercent")}`}
            />
            <ReportMetric
              label={t("metricTestedBatches")}
              value={formatNumber(snapshot.batches.tested)}
            />
            <ReportMetric
              label={t("metricAvgFineness")}
              value={
                snapshot.quality.avgFinenessMicron === null
                  ? "—"
                  : `${formatNumber(snapshot.quality.avgFinenessMicron, 1)} ${tc("unitMicron")}`
              }
            />
            <ReportMetric
              label={t("metricAvgYield")}
              value={
                snapshot.quality.avgCleanYieldPct === null
                  ? "—"
                  : `${formatNumber(snapshot.quality.avgCleanYieldPct, 1)}${tc("unitPercent")}`
              }
            />
            <ReportMetric
              label={t("metricAvgAdmixture")}
              value={
                snapshot.quality.avgImpurityPct === null
                  ? "—"
                  : `${formatNumber(snapshot.quality.avgImpurityPct, 1)}${tc("unitPercent")}`
              }
            />
          </div>
          <p className="text-ink-500 mt-3 text-[11px] leading-relaxed">
            {t("snapshotNote")}
          </p>
        </ReportSection>

        {showSuppliers ? (
          <ReportSection title={t("supplierTitle")} hint={t("supplierHint")}>
            <div className="grid gap-4 md:grid-cols-2">
              <BreakdownList
                title={t("supplierStatusTitle")}
                rows={supplierStatusRows}
              />
              <BreakdownList
                title={t("supplierTypeTitle")}
                rows={supplierTypeRows}
              />
            </div>
          </ReportSection>
        ) : null}

        {showBatches ? (
          <ReportSection title={t("batchTitle")} hint={t("batchHint")}>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <ReportMetric
                label={t("metricTotal")}
                value={formatNumber(snapshot.batches.total)}
              />
              <ReportMetric
                label={t("metricTotalAmount")}
                value={`${formatNumber(snapshot.batches.totalKg)} ${tc("unitKg")}`}
              />
              <ReportMetric
                label={t("metricTested")}
                value={formatNumber(snapshot.batches.tested)}
              />
              <ReportMetric
                label={t("metricTestedShare")}
                value={`${snapshot.batches.testedPct}${tc("unitPercent")}`}
              />
            </div>
          </ReportSection>
        ) : null}

        {showQuality ? (
          <ReportSection title={t("qualityTitle")} hint={t("qualityHint")}>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <ReportMetric
                label={t("metricTestedBatches")}
                value={formatNumber(snapshot.quality.testedBatches)}
              />
              <ReportMetric
                label={t("metricAvgFineness")}
                value={
                  snapshot.quality.avgFinenessMicron === null
                    ? "—"
                    : `${formatNumber(snapshot.quality.avgFinenessMicron, 1)} ${tc("unitMicron")}`
                }
              />
              <ReportMetric
                label={t("metricAvgYield")}
                value={
                  snapshot.quality.avgCleanYieldPct === null
                    ? "—"
                    : `${formatNumber(snapshot.quality.avgCleanYieldPct, 1)}${tc("unitPercent")}`
                }
              />
              <ReportMetric
                label={t("metricLatestTest")}
                value={
                  snapshot.quality.latestTestedOn
                    ? formatDate(snapshot.quality.latestTestedOn)
                    : "—"
                }
              />
            </div>
          </ReportSection>
        ) : null}

        {showMonthly ? (
          <ReportSection title={t("monthlyTitle")} hint={t("monthlyHint")}>
            <div className="border-brown-500/15 rounded-field overflow-hidden border">
              <MonthlyStatsTable rows={snapshot.monthly} />
            </div>
          </ReportSection>
        ) : null}

        <ReportSection title={t("aimagTitle")} hint={t("aimagHint")}>
          <div className="border-brown-500/15 rounded-field overflow-hidden border">
            <AimagStatsTable rows={snapshot.aimags} />
          </div>
          <p className="text-ink-500 mt-2 text-[11px]">
            {tc("metrics.aimagsCovered")}: {formatNumber(totalAimags)} ·{" "}
            {tc("metrics.soumsCovered")}: {formatNumber(totalSoums)}
          </p>
        </ReportSection>

        <ReportSection title={t("soumTitle")} hint={t("soumHint")}>
          <div className="border-brown-500/15 rounded-field overflow-hidden border">
            <SoumStatsTable rows={snapshot.soums} />
          </div>
        </ReportSection>

        {showRecent ? (
          <ReportSection title={t("recentTitle")} hint={t("recentHint")}>
            <div className="border-brown-500/15 rounded-field overflow-hidden border">
              <RecentBatchesTable rows={snapshot.recentBatches} />
            </div>
          </ReportSection>
        ) : null}

        <footer className="border-brown-500/15 mt-8 border-t pt-4">
          <p className="text-ink-500 text-[11px] leading-relaxed">
            {t("footerNote")}
          </p>
          <p className="text-ink-500 mt-1 text-[11px] leading-relaxed">
            {t("footerUnitNote")}
          </p>
        </footer>
      </article>
    </>
  );
}
