"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { FlaskConical, PackagePlus } from "lucide-react";

import DemoNote from "@/components/domain/shared/demo-note";
import EmptyState from "@/components/domain/shared/empty-state";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import StatusBadge from "@/components/domain/shared/status-badge";
import SupplierStatusBanner from "@/components/domain/supplier/supplier-status-banner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSession } from "@/components/providers/session-provider";
import { useSupplies } from "@/lib/mock/supplies";
import { useBatchesFor } from "@/lib/mock/batches";
import { supplierById } from "@/lib/mock/suppliers";
import { formatDate, formatNumber } from "@/lib/format/mn";
import { getLocaleFromPathname } from "@/lib/i18n/config";

/**
 * Нийлүүлэгчийн самбар — dashboard (task 1): own registration status banner
 * (task 10), summary stats (deferred decision — derived aggregates), the
 * most recent own batches and quick links into UC-02 / UC-03. Data is
 * filtered strictly by the session's supplierId (BR-05).
 */
export default function SupplierHome() {
  const t = useTranslations("supplier.dashboard");
  const ts = useTranslations("status");
  const tf = useTranslations("supplier.supply");
  const session = useSession();
  const pathname = usePathname() ?? "/";
  const locale = getLocaleFromPathname(pathname);

  const supplier = supplierById(session.supplierId);
  const records = useSupplies(session.supplierId);
  const batches = useBatchesFor(session.supplierId);

  if (!supplier) return null; // shell guard redirects missing bindings

  const totalAmount = records.reduce((sum, record) => sum + record.amountKg, 0);
  const testedCount = batches.filter((batch) => batch.status === "tested").length;
  const recentBatches = batches.slice(0, 3);

  return (
    <>
      <PageHeader
        title={t("welcome", { name: supplier.name })}
        description={t("subtitle")}
      />

      <SupplierStatusBanner status={supplier.status} reason={supplier.rejectReason} className="mb-8" />

      <div className="grid gap-4 sm:grid-cols-3">
        <GlassPanel tier="g2" className="p-5">
          <p className="text-ink-500 text-xs font-medium tracking-[0.08em] uppercase">
            {t("statAmount")}
          </p>
          <p className="text-forest-900 mt-2 font-display text-2xl font-semibold tabular-nums sm:text-3xl">
            {formatNumber(totalAmount)}
            <span className="text-olive-600 ml-1.5 text-base font-medium">
              {tf("field.amountUnit")}
            </span>
          </p>
          <p className="text-ink-500 mt-2 text-xs">{t("statAmountHint", { count: formatNumber(records.length) })}</p>
        </GlassPanel>

        <GlassPanel tier="g2" className="p-5">
          <p className="text-ink-500 text-xs font-medium tracking-[0.08em] uppercase">
            {t("statSupplies")}
          </p>
          <p className="text-forest-900 mt-2 font-display text-2xl font-semibold tabular-nums sm:text-3xl">
            {formatNumber(records.length)}
          </p>
          <p className="text-ink-500 mt-2 text-xs">{t("statSuppliesHint")}</p>
        </GlassPanel>

        <GlassPanel tier="g2" className="p-5">
          <p className="text-ink-500 text-xs font-medium tracking-[0.08em] uppercase">
            {t("statBatches")}
          </p>
          <p className="text-forest-900 mt-2 font-display text-2xl font-semibold tabular-nums sm:text-3xl">
            {formatNumber(batches.length)}
          </p>
          <p className="text-ink-500 mt-2 text-xs">{t("statBatchesHint", { tested: formatNumber(testedCount) })}</p>
        </GlassPanel>
      </div>

      <GlassPanel tier="g2" className="mt-6 p-6 sm:p-8">
        <h2 className="text-forest-900 mb-4 font-display text-lg font-semibold">
          {t("recentBatches")}
        </h2>
        {recentBatches.length === 0 ? (
          <EmptyState
            title={t("emptyBatches")}
            description={t("emptyBatchesHint")}
            className="border-transparent bg-transparent py-10"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("colCode")}</TableHead>
                <TableHead>{t("colDate")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentBatches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell>
                    <span className="bg-ivory-50 text-ink-900 rounded-field tabular-nums border px-2.5 py-1 text-xs font-medium tracking-wide">
                      {batch.id}
                    </span>
                  </TableCell>
                  <TableCell className="text-ink-700 tabular-nums">
                    {formatDate(batch.registeredOn)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={batch.status === "tested" ? "batch-tested" : "batch-registered"} label={ts(`batch.${batch.status}`)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassPanel>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Button asChild className="h-12 rounded-field font-semibold">
          <Link href={`/${locale}/supplier/records`}>
            <PackagePlus aria-hidden className="size-4" />
            {t("linkSupply")}
          </Link>
        </Button>
        <Button asChild variant="outline" className="bg-linen/60 h-12 rounded-field font-semibold">
          <Link href={`/${locale}/supplier/quality`}>
            <FlaskConical aria-hidden className="size-4" />
            {t("linkQuality")}
          </Link>
        </Button>
      </div>

      <DemoNote className="mt-6">
        {t("demoNote")}
      </DemoNote>
    </>
  );
}
