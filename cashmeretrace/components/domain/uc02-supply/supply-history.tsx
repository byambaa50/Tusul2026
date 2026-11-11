"use client";

import { useTranslations } from "next-intl";

import DemoNote from "@/components/domain/shared/demo-note";
import EmptyState from "@/components/domain/shared/empty-state";
import GlassPanel from "@/components/domain/shared/glass-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "@/components/providers/session-provider";
import { useSupplies } from "@/lib/mock/supplies";
import { formatDate, formatNumber } from "@/lib/format/mn";

/**
 * UC-02 history (task 8): the user's OWN supply records (BR-05) —
 * огноо / хэмжээ / аймаг / сум / малын тоо, newest first, persisted demo
 * additions included via the supplies store.
 */
export default function SupplyHistory() {
  const t = useTranslations("supplier.history");
  const ts = useTranslations("supplier.supply");
  const session = useSession();
  const records = useSupplies(session.supplierId);

  return (
    <GlassPanel tier="g2" className="p-6 sm:p-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-forest-900 font-display text-lg font-semibold">{t("title")}</h2>
      </header>

      {records.length === 0 ? (
        <EmptyState
          title={t("empty")}
          description={t("emptyHint")}
          className="border-transparent bg-transparent py-10"
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="border-brown-500/20 hover:bg-transparent">
                <TableHead>{t("col.date")}</TableHead>
                <TableHead className="text-right">{t("col.amount")}</TableHead>
                <TableHead>{t("col.aimag")}</TableHead>
                <TableHead>{t("col.soum")}</TableHead>
                <TableHead className="text-right">{t("col.livestock")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id} className="border-brown-500/10">
                  <TableCell className="text-ink-700 tabular-nums">
                    {formatDate(record.dateIso)}
                  </TableCell>
                  <TableCell className="text-forest-800 text-right font-medium tabular-nums">
                    {formatNumber(record.amountKg)}
                  </TableCell>
                  <TableCell className="text-ink-700">{record.aimag}</TableCell>
                  <TableCell className="text-ink-700">{record.soum}</TableCell>
                  <TableCell className="text-ink-700 tabular-nums">
                    {formatNumber(record.livestockCount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-ink-500 mt-3 text-right text-xs tabular-nums">
            {ts("field.amountUnit")}: {formatNumber(records.reduce((sum, r) => sum + r.amountKg, 0))}
          </p>
          <DemoNote className="mt-3">{t("onlyOwn")}</DemoNote>
        </>
      )}
    </GlassPanel>
  );
}
