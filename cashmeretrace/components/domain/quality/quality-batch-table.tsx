"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Eye, FlaskConical, History, QrCode } from "lucide-react";

import EmptyState from "@/components/domain/shared/empty-state";
import StatusBadge from "@/components/domain/shared/status-badge";
import TablePager, { usePageSlice } from "@/components/domain/shared/table-pager";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatNumber } from "@/lib/format/mn";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import type { Batch, QualityTest, QrRecord } from "@/lib/types/domain";

/**
 * UC-07/UC-08 quality batch table: read-only batch context plus the entry
 * points to the result form, history and publish selector. No edit/delete
 * action for registration data or previous results exists here.
 */
export default function QualityBatchTable({
  batches,
  supplierName,
  latestByBatch,
  testCountByBatch,
  qrByBatch,
  showActions = true,
}: {
  batches: Batch[];
  supplierName: (supplierId: string) => string;
  latestByBatch: Map<string, QualityTest>;
  testCountByBatch: Map<string, number>;
  qrByBatch: Map<string, QrRecord>;
  showActions?: boolean;
}) {
  const t = useTranslations("quality.search");
  const tc = useTranslations("quality.common");
  const ts = useTranslations("status");
  const locale = useCurrentLocale();
  const pageSlice = usePageSlice(batches, batches.map((batch) => batch.id).join(","));

  if (batches.length === 0) {
    return (
      <EmptyState
        title={tc("noResults")}
        description={tc("noResultsHint")}
        className="border-transparent bg-transparent"
      />
    );
  }

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>{t("colCode")}</TableHead>
          <TableHead>{t("colSupplier")}</TableHead>
          <TableHead className="text-right">{t("colAmount")}</TableHead>
          <TableHead>{t("colOrigin")}</TableHead>
          <TableHead>{t("colRegistered")}</TableHead>
          <TableHead>{t("colResult")}</TableHead>
          <TableHead className="text-center">{t("colTests")}</TableHead>
          <TableHead>{t("colQr")}</TableHead>
          {showActions ? (
            <TableHead className="text-right">
              <span className="sr-only">{t("colActions")}</span>
            </TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {pageSlice.rows.map((batch) => {
          const latest = latestByBatch.get(batch.id);
          const testCount = testCountByBatch.get(batch.id) ?? 0;
          const qr = qrByBatch.get(batch.id);
          return (
            <TableRow key={batch.id}>
              <TableCell>
                <Link
                  href={`/${locale}/quality/batches/${batch.id}`}
                  className="text-forest-800 font-medium tabular-nums underline-offset-4 hover:underline"
                >
                  {batch.id}
                </Link>
                {batch.notes ? (
                  <p className="text-ink-500 max-w-48 truncate text-[11px]">{batch.notes}</p>
                ) : null}
              </TableCell>
              <TableCell className="text-ink-700">{supplierName(batch.supplierId)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(batch.amountKg, 1)}
              </TableCell>
              <TableCell className="text-ink-700">
                {batch.aimag} · {batch.soum}
              </TableCell>
              <TableCell className="text-ink-700 tabular-nums">
                {formatDate(batch.registeredOn)}
              </TableCell>
              <TableCell className="text-ink-700 text-xs">
                {latest ? (
                  <span className="tabular-nums">
                    <span className="text-ink-900 font-medium">
                      {formatNumber(latest.finenessMicron, 1)} {tc("unitMicron")}
                    </span>
                    <span className="text-ink-500 block">
                      {formatDate(latest.testedOn)}
                    </span>
                  </span>
                ) : (
                  <span className="text-ink-500">{tc("noResult")}</span>
                )}
              </TableCell>
              <TableCell className="text-center text-ink-700 tabular-nums text-xs">
                {testCount > 0 ? tc("testCount", { count: testCount }) : "—"}
              </TableCell>
              <TableCell>
                {qr ? (
                  <StatusBadge
                    status={qr.status === "ready" ? "qr-ready" : "qr-created"}
                    label={ts(`qr.${qr.status}`)}
                  />
                ) : (
                  <span className="text-ink-500 text-xs">{tc("qrMissing")}</span>
                )}
              </TableCell>
              {showActions ? (
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button asChild variant="ghost" size="icon-sm" title={tc("viewDetail")}>
                      <Link
                        href={`/${locale}/quality/batches/${batch.id}`}
                        aria-label={`${tc("viewDetail")} ${batch.id}`}
                      >
                        <Eye aria-hidden />
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon-sm" title={tc("enterTest")}>
                      <Link
                        href={`/${locale}/quality/batches/${batch.id}/test`}
                        aria-label={`${tc("enterTest")} ${batch.id}`}
                      >
                        <FlaskConical aria-hidden />
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon-sm" title={tc("viewHistory")}>
                      <Link
                        href={`/${locale}/quality/batches/${batch.id}/history`}
                        aria-label={`${tc("viewHistory")} ${batch.id}`}
                      >
                        <History aria-hidden />
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon-sm" title={tc("publishFields")}>
                      <Link
                        href={`/${locale}/quality/batches/${batch.id}/publish`}
                        aria-label={`${tc("publishFields")} ${batch.id}`}
                      >
                        <QrCode aria-hidden />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    <TablePager
      page={pageSlice.page}
      pages={pageSlice.pages}
      total={pageSlice.total}
      from={pageSlice.from}
      to={pageSlice.to}
      onPage={pageSlice.setPage}
    />
    </>
  );
}
