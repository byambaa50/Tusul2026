"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import type { ManagementReport } from "@/lib/mock/management";

type CsvCell = string | number | null | undefined;
type CsvRow = CsvCell[];

/** Quotes only when needed; keeps numbers machine-readable for spreadsheets. */
function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows: CsvRow[]): string {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

function round(value: number | null, digits = 1): number | null {
  if (value === null) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Localized, report-aware CSV export. PDF generation uses the browser's
 * print dialog from the preview page; CSV is a real client-side download
 * with a UTF-8 BOM so Cyrillic opens correctly in Excel. Everything is
 * derived from the immutable snapshot stored with the report.
 */
export function useReportDownload() {
  const t = useTranslations("management");

  const buildReportCsv = useCallback(
    (report: ManagementReport): string => {
      const { snapshot } = report;
      const rows: CsvRow[] = [];
      const push = (...cells: CsvCell[]) => rows.push(cells);
      const section = (title: string) => {
        rows.push([]);
        push(title);
      };

      push(t("common.reportId"), report.id);
      push(t("common.type"), t(`reportTypes.${report.type}`));
      push(t("common.format"), t(`reportFormats.${report.format}`));
      push(t("common.period"), `${report.filters.from} – ${report.filters.to}`);
      push(t("common.aimag"), report.filters.aimag ?? t("common.allAimags"));
      push(t("common.createdAt"), report.createdAt);

      section(t("preview.summaryTitle"));
      push(t("common.metrics.totalSuppliers"), snapshot.suppliers.total);
      push(t("common.metrics.registeredBatches"), snapshot.batches.total);
      push(
        `${t("common.metrics.totalAmount")} (${t("common.unitKg")})`,
        snapshot.batches.totalKg,
      );
      push(t("common.metrics.totalLivestock"), snapshot.batches.totalLivestock);
      push(t("common.metrics.testedBatches"), snapshot.batches.tested);
      push(
        t("common.metrics.testedShare"),
        `${snapshot.batches.testedPct}${t("common.unitPercent")}`,
      );

      if (report.type === "comprehensive") {
        section(t("preview.supplierTitle"));
        push(t("preview.supplierStatusTitle"));
        push(t("supplierStatus.active"), snapshot.suppliers.active);
        push(t("supplierStatus.pending"), snapshot.suppliers.pending);
        push(t("supplierStatus.rejected"), snapshot.suppliers.rejected);
        push(t("supplierStatus.locked"), snapshot.suppliers.locked);
        push(t("preview.supplierTypeTitle"));
        for (const row of snapshot.suppliers.byType) {
          push(t(`supplierTypes.${row.type}`), row.count);
        }
        section(t("preview.batchTitle"));
        push(t("common.metrics.testedBatches"), snapshot.batches.tested);
        push(t("common.metrics.untestedBatches"), snapshot.batches.untested);
      }

      if (report.type !== "origin") {
        section(t("preview.monthlyTitle"));
        push(
          t("common.columns.month"),
          t("common.columns.batches"),
          `${t("common.columns.amount")} (${t("common.unitKg")})`,
          t("common.columns.tested"),
        );
        for (const row of snapshot.monthly) {
          push(row.month, row.batchCount, row.totalKg, row.testedBatches);
        }
      }

      if (report.type === "comprehensive" || report.type === "quality") {
        section(t("preview.qualityTitle"));
        push(
          t("common.metrics.avgFineness"),
          round(snapshot.quality.avgFinenessMicron),
        );
        push(
          t("common.metrics.avgCleanYield"),
          round(snapshot.quality.avgCleanYieldPct),
        );
        push(t("common.metrics.avgAdmixture"), round(snapshot.quality.avgImpurityPct));
        push(t("common.metrics.latestTest"), snapshot.quality.latestTestedOn);
      }

      section(t("preview.aimagTitle"));
      push(
        t("common.columns.aimag"),
        t("common.columns.soums"),
        t("common.columns.batches"),
        `${t("common.columns.amount")} (${t("common.unitKg")})`,
        t("common.columns.tested"),
        `${t("common.columns.fineness")} (${t("common.unitMicron")})`,
        `${t("common.columns.yield")} (${t("common.unitPercent")})`,
        `${t("common.columns.admixture")} (${t("common.unitPercent")})`,
      );
      for (const row of snapshot.aimags) {
        push(
          row.aimag,
          row.soumCount,
          row.batchCount,
          row.totalKg,
          row.testedBatches,
          round(row.avgFinenessMicron),
          round(row.avgCleanYieldPct),
          round(row.avgImpurityPct),
        );
      }

      section(t("preview.soumTitle"));
      push(
        t("common.columns.aimag"),
        t("common.columns.soum"),
        t("common.columns.batches"),
        `${t("common.columns.amount")} (${t("common.unitKg")})`,
        t("common.columns.tested"),
        `${t("common.columns.fineness")} (${t("common.unitMicron")})`,
        `${t("common.columns.yield")} (${t("common.unitPercent")})`,
        `${t("common.columns.admixture")} (${t("common.unitPercent")})`,
      );
      for (const row of snapshot.soums) {
        push(
          row.aimag,
          row.soum,
          row.batchCount,
          row.totalKg,
          row.testedBatches,
          round(row.avgFinenessMicron),
          round(row.avgCleanYieldPct),
          round(row.avgImpurityPct),
        );
      }

      if (report.type !== "quality") {
        section(t("preview.recentTitle"));
        push(
          t("common.columns.batch"),
          t("common.columns.origin"),
          `${t("common.columns.amount")} (${t("common.unitKg")})`,
          t("common.columns.livestock"),
          t("common.columns.registeredOn"),
          t("common.columns.quality"),
        );
        for (const row of snapshot.recentBatches) {
          push(
            row.id,
            `${row.aimag} · ${row.soum}`,
            row.amountKg,
            row.livestockCount,
            row.registeredOn,
            row.tested ? t("common.status.tested") : t("common.status.registered"),
          );
        }
      }

      section(t("preview.footerNote"));
      push(t("preview.footerUnitNote"));

      return `\uFEFF${toCsv(rows)}\r\n`;
    },
    [t],
  );

  const downloadCsvReport = useCallback(
    (report: ManagementReport) => {
      const blob = new Blob([buildReportCsv(report)], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${report.id}.csv`;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    [buildReportCsv],
  );

  const printReport = useCallback(() => {
    window.print();
  }, []);

  return { buildReportCsv, downloadCsvReport, printReport };
}
