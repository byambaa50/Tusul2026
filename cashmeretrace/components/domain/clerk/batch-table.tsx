"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Eye, GitCompare, Pencil, QrCode } from "lucide-react";

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
import type { Batch, QrRecord } from "@/lib/types/domain";

/**
 * UC-05/UC-07 batch table shared by the registry list and the search screen.
 * Numbers link to details; the QR state is joined from the QR store.
 */
export default function BatchTable({
  batches,
  supplierName,
  qrByBatch,
  showActions = true,
}: {
  batches: Batch[];
  supplierName: (supplierId: string) => string;
  qrByBatch: Map<string, QrRecord>;
  showActions?: boolean;
}) {
  const t = useTranslations("clerk.batch");
  const tc = useTranslations("clerk.common");
  const ts = useTranslations("status");
  const tq = useTranslations("clerk.qr");
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
          <TableHead>{t("colDate")}</TableHead>
          <TableHead>{t("colStatus")}</TableHead>
          <TableHead>{t("colTest")}</TableHead>
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
          const qr = qrByBatch.get(batch.id);
          return (
            <TableRow key={batch.id}>
              <TableCell>
                <Link
                  href={`/${locale}/clerk/batches/${batch.id}`}
                  className="text-forest-800 font-medium tabular-nums underline-offset-4 hover:underline"
                >
                  {batch.id}
                </Link>
                {batch.notes ? (
                  <p className="text-ink-500 max-w-48 truncate text-[11px]">{batch.notes}</p>
                ) : null}
              </TableCell>
              <TableCell className="text-ink-700">
                <Link
                  href={`/${locale}/clerk/suppliers/${batch.supplierId}`}
                  className="underline-offset-4 hover:underline"
                >
                  {supplierName(batch.supplierId)}
                </Link>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(batch.amountKg, 1)}
              </TableCell>
              <TableCell className="text-ink-700">
                {batch.aimag} · {batch.soum}
              </TableCell>
              <TableCell className="text-ink-700 tabular-nums">
                {formatDate(batch.registeredOn)}
              </TableCell>
              <TableCell>
                <StatusBadge
                  status={`batch-${batch.status}`}
                  label={ts(`batch.${batch.status}`)}
                />
              </TableCell>
              <TableCell className="text-ink-700 tabular-nums text-xs">
                {batch.test
                  ? `${formatNumber(batch.test.finenessMicron, 1)} ${t("unitMicron")}`
                  : "—"}
              </TableCell>
              <TableCell>
                {qr ? (
                  <Link href={`/${locale}/clerk/batches/${batch.id}/qr`}>
                    <StatusBadge
                      status={qr.status === "ready" ? "qr-ready" : "qr-created"}
                      label={ts(`qr.${qr.status}`)}
                    />
                  </Link>
                ) : (
                  <span className="text-ink-500 text-xs">{tq("statusMissing")}</span>
                )}
              </TableCell>
              {showActions ? (
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button asChild variant="ghost" size="icon-sm" title={tc("view")}>
                      <Link
                        href={`/${locale}/clerk/batches/${batch.id}`}
                        aria-label={`${tc("view")} ${batch.id}`}
                      >
                        <Eye aria-hidden />
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon-sm" title={tc("edit")}>
                      <Link
                        href={`/${locale}/clerk/batches/${batch.id}/edit`}
                        aria-label={`${tc("edit")} ${batch.id}`}
                      >
                        <Pencil aria-hidden />
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon-sm" title={t("viewTrace")}>
                      <Link
                        href={`/${locale}/clerk/batches/${batch.id}/trace`}
                        aria-label={`${t("viewTrace")} ${batch.id}`}
                      >
                        <GitCompare aria-hidden />
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon-sm" title={t("viewQr")}>
                      <Link
                        href={`/${locale}/clerk/batches/${batch.id}/qr`}
                        aria-label={`${t("viewQr")} ${batch.id}`}
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
