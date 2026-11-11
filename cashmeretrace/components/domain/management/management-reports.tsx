"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  Download,
  FileText,
  Printer,
  Sparkles,
} from "lucide-react";

import EmptyState from "@/components/domain/shared/empty-state";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import {
  ManagementInfoNote,
  ManagementMiniMetric,
  ManagementPageSkeleton,
  ManagementReadOnlyNote,
} from "@/components/domain/management/management-ui";
import { useReportDownload } from "@/components/domain/management/use-report-download";
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
import { formatDate, formatDateTime, formatNumber } from "@/lib/format/mn";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import { useBatches } from "@/lib/mock/batches";
import {
  buildManagementAnalytics,
  createManagementReport,
  DEMO_MANAGEMENT_FROM,
  DEMO_MANAGEMENT_TO,
  managementReportFormats,
  managementReportTypes,
  useManagementReports,
  type ManagementReportFormat,
  type ManagementReportType,
} from "@/lib/mock/management";
import { useQualityTests } from "@/lib/mock/quality";
import { useSuppliers } from "@/lib/mock/suppliers";
import { cn } from "@/lib/utils";

/** UC-11 — generate reports from immutable aggregate snapshots. */
export default function ManagementReports() {
  const hydrated = useHydrated();
  if (!hydrated) return <ManagementPageSkeleton />;
  return <ManagementReportsContent />;
}

function ManagementReportsContent() {
  const t = useTranslations("management.reports");
  const tc = useTranslations("management.common");
  const tr = useTranslations("management.reportTypes");
  const tf = useTranslations("management.reportFormats");
  const locale = useCurrentLocale();
  const router = useRouter();
  const { downloadCsvReport } = useReportDownload();

  const suppliers = useSuppliers();
  const batches = useBatches();
  const tests = useQualityTests();
  const reports = useManagementReports();

  const [type, setType] = useState<ManagementReportType>("comprehensive");
  const [format, setFormat] = useState<ManagementReportFormat>("pdf");
  const [from, setFrom] = useState(DEMO_MANAGEMENT_FROM);
  const [to, setTo] = useState(DEMO_MANAGEMENT_TO);
  const [aimag, setAimag] = useState("all");
  const [error, setError] = useState<string | null>(null);

  const aimagOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const supplier of suppliers) unique.add(supplier.aimag);
    for (const batch of batches) unique.add(batch.aimag);
    return [...unique].sort((a, b) => a.localeCompare(b));
  }, [suppliers, batches]);

  const liveSnapshot = useMemo(() => {
    if (!from || !to || from > to) return null;
    return buildManagementAnalytics({
      suppliers,
      batches,
      tests,
      filters: { from, to, aimag: aimag === "all" ? null : aimag },
    });
  }, [suppliers, batches, tests, from, to, aimag]);

  const handleGenerate = () => {
    if (!from || !to) {
      setError(t("errorDates"));
      return;
    }
    if (from > to) {
      setError(t("errorRange"));
      return;
    }

    setError(null);
    const filters = { from, to, aimag: aimag === "all" ? null : aimag };
    const snapshot = buildManagementAnalytics({
      suppliers,
      batches,
      tests,
      filters,
    });

    try {
      const report = createManagementReport({ type, format, filters, snapshot });
      router.push(`/${locale}/management/reports/${report.id}`);
    } catch {
      setError(t("errorStorage"));
    }
  };

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <ManagementReadOnlyNote className="mb-4" />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <GlassPanel tier="g2" className="p-5 sm:p-6">
          <h2 className="text-forest-900 font-display text-base font-semibold">
            {t("generateTitle")}
          </h2>
          <p className="text-ink-500 mt-1 text-xs leading-relaxed">
            {t("generateHint")}
          </p>

          <div className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t("typeLabel")}</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as ManagementReportType)}
              >
                <SelectTrigger className="bg-linen/80 h-10 w-full rounded-field">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {managementReportTypes.map((option) => (
                    <SelectItem key={option} value={option}>
                      {tr(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-ink-500 text-xs leading-relaxed">
                {t(`typeHints.${type}`)}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("formatLabel")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {managementReportFormats.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={format === option}
                    onClick={() => setFormat(option)}
                    className={cn(
                      "rounded-field flex items-center gap-2 border px-3 py-2.5 text-left transition-colors",
                      format === option
                        ? "border-forest-700/40 bg-sage-100/70 text-forest-900"
                        : "border-brown-500/20 bg-linen/60 text-ink-700 hover:bg-sage-100/40",
                    )}
                  >
                    {option === "pdf" ? (
                      <Printer aria-hidden className="text-olive-600 size-4" />
                    ) : (
                      <Download aria-hidden className="text-olive-600 size-4" />
                    )}
                    <span className="text-sm font-medium">{tf(option)}</span>
                  </button>
                ))}
              </div>
              <p className="text-ink-500 text-xs leading-relaxed">
                {t(`formatHints.${format}`)}
              </p>
            </div>

            <div>
              <Label className="mb-1.5">{t("periodLabel")}</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="report-from" className="text-ink-500 text-xs">
                    {tc("from")}
                  </Label>
                  <Input
                    id="report-from"
                    type="date"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                    className="bg-linen/80 h-10 rounded-field"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="report-to" className="text-ink-500 text-xs">
                    {tc("to")}
                  </Label>
                  <Input
                    id="report-to"
                    type="date"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    className="bg-linen/80 h-10 rounded-field"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("aimagLabel")}</Label>
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

            <div className="border-brown-500/15 bg-linen/60 rounded-field border p-3.5">
              <p className="text-ink-500 text-[11px] font-medium tracking-wide uppercase">
                {t("previewTitle")}
              </p>
              <p className="text-ink-500 mt-1 text-xs">{t("previewHint")}</p>
              {liveSnapshot ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <ManagementMiniMetric
                    label={t("metrics.suppliers")}
                    value={formatNumber(liveSnapshot.suppliers.total)}
                  />
                  <ManagementMiniMetric
                    label={t("metrics.batches")}
                    value={formatNumber(liveSnapshot.batches.total)}
                  />
                  <ManagementMiniMetric
                    label={`${t("metrics.amount")} (${tc("unitKg")})`}
                    value={formatNumber(liveSnapshot.batches.totalKg)}
                  />
                  <ManagementMiniMetric
                    label={t("metrics.tested")}
                    value={formatNumber(liveSnapshot.batches.tested)}
                  />
                </div>
              ) : (
                <p className="text-terracotta-600 mt-2 text-xs">{t("errorRange")}</p>
              )}
            </div>

            {error ? (
              <p
                role="alert"
                className="text-terracotta-600 flex items-center gap-1.5 text-xs"
              >
                <AlertCircle aria-hidden className="size-4 shrink-0" />
                {error}
              </p>
            ) : null}

            <Button
              type="button"
              onClick={handleGenerate}
              className="rounded-field h-11 w-full font-semibold"
            >
              <Sparkles aria-hidden />
              {t("generate")}
            </Button>

            <ManagementInfoNote>{t("snapshotNote")}</ManagementInfoNote>
          </div>
        </GlassPanel>

        <section aria-labelledby="generated-reports-heading">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2
                id="generated-reports-heading"
                className="text-forest-900 font-display text-base font-semibold"
              >
                {t("listTitle")}
              </h2>
              <p className="text-ink-500 mt-1 text-xs">{t("listHint")}</p>
            </div>
            <span className="border-sage-500/40 bg-sage-100/70 text-olive-600 inline-flex h-7 items-center rounded-full border px-2.5 text-[11px] font-medium tabular-nums">
              {t("listCount", { count: reports.length })}
            </span>
          </div>

          {reports.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={t("empty")}
              description={t("emptyHint")}
              className="mt-4"
            />
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {reports.map((report) => {
                const href = `/${locale}/management/reports/${report.id}`;
                return (
                  <GlassPanel key={report.id} tier="g2" className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-forest-900 font-medium tabular-nums">
                          {report.id}
                        </p>
                        <p className="text-ink-500 mt-0.5 text-xs tabular-nums">
                          {formatDateTime(report.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="border-forest-700/25 bg-forest-700/10 text-forest-800 inline-flex h-6 items-center rounded-full border px-2.5 text-[11px] font-medium">
                          {tr(report.type)}
                        </span>
                        <span className="border-camel-500/35 bg-camel-500/10 text-camel-600 inline-flex h-6 items-center rounded-full border px-2.5 text-[11px] font-medium">
                          {tf(report.format)}
                        </span>
                      </div>
                    </div>

                    <p className="text-ink-700 mt-3 text-xs leading-relaxed">
                      {t("dateRange", {
                        from: formatDate(report.filters.from),
                        to: formatDate(report.filters.to),
                      })}
                      {" · "}
                      {report.filters.aimag ?? tc("allAimags")}
                    </p>

                    <div className="text-ink-500 mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
                      <span>
                        {formatNumber(report.snapshot.batches.total)}{" "}
                        {tc("columns.batches").toLowerCase()}
                      </span>
                      <span>
                        {formatNumber(report.snapshot.batches.totalKg)} {tc("unitKg")}
                      </span>
                      <span>
                        {formatNumber(report.snapshot.batches.tested)}{" "}
                        {tc("columns.tested").toLowerCase()}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="bg-linen/60 rounded-field"
                      >
                        <Link href={href}>{t("preview")}</Link>
                      </Button>
                      {report.format === "csv" ? (
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-field font-semibold"
                          onClick={() => downloadCsvReport(report)}
                        >
                          <Download aria-hidden />
                          {t("downloadCsv")}
                        </Button>
                      ) : (
                        <Button asChild size="sm" className="rounded-field font-semibold">
                          <Link href={href}>
                            <Printer aria-hidden />
                            {t("printPdf")}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </GlassPanel>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
