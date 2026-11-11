"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { PackagePlus, Pencil } from "lucide-react";

import DemoNote from "@/components/domain/shared/demo-note";
import EmptyState from "@/components/domain/shared/empty-state";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import StatusBadge from "@/components/domain/shared/status-badge";
import { ClerkPageSkeleton, DetailItem, RecordNotFound } from "@/components/domain/clerk/clerk-ui";
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
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import { useBatchesFor } from "@/lib/mock/batches";
import { useSuppliers } from "@/lib/mock/suppliers";
import { useSupplies } from "@/lib/mock/supplies";

/**
 * UC-04 — supplier detail: registry data, supply history and the batches
 * registered against this supplier (FR-2.7/FR-2.9).
 */
export default function SupplierDetail({ supplierId }: { supplierId: string }) {
  const hydrated = useHydrated();
  const suppliers = useSuppliers();
  const supplier = suppliers.find((entry) => entry.id === supplierId) ?? null;

  if (!hydrated) return <ClerkPageSkeleton />;
  if (!supplier) return <SupplierNotFound supplierId={supplierId} />;
  return <SupplierDetailContent supplierId={supplier.id} />;
}

function SupplierNotFound({ supplierId }: { supplierId: string }) {
  const t = useTranslations("clerk.supplier");
  const locale = useCurrentLocale();
  return (
    <RecordNotFound
      title={t("notFound")}
      description={`${t("notFoundHint")} (${supplierId})`}
      backHref={`/${locale}/clerk/suppliers`}
      backLabel={t("backToList")}
    />
  );
}

function SupplierDetailContent({ supplierId }: { supplierId: string }) {
  const t = useTranslations("clerk.supplier");
  const tc = useTranslations("clerk.common");
  const ts = useTranslations("status");
  const tb = useTranslations("clerk.batch");
  const locale = useCurrentLocale();
  const suppliers = useSuppliers();
  const supplies = useSupplies(supplierId);
  const batches = useBatchesFor(supplierId);

  const supplier = suppliers.find((entry) => entry.id === supplierId);
  if (!supplier) return null;

  return (
    <>
      <PageHeader
        title={supplier.name}
        description={t("detailSubtitle")}
        actions={
          <>
            <Button asChild variant="outline" className="bg-linen/60 rounded-field">
              <Link href={`/${locale}/clerk/suppliers`}>{t("backToSuppliers")}</Link>
            </Button>
            <Button asChild className="rounded-field font-semibold">
              <Link href={`/${locale}/clerk/suppliers/${supplier.id}/edit`}>
                <Pencil aria-hidden />
                {t("editAction")}
              </Link>
            </Button>
          </>
        }
      />

      <div className="border-brown-500/15 bg-ivory-50/60 rounded-field mb-4 flex flex-wrap items-center gap-3 border p-3">
        <StatusBadge
          status={`supplier-${supplier.status}`}
          label={ts(`supplier.${supplier.status}`)}
        />
        <span className="text-ink-500 text-xs">{t("readOnlyStatus")}</span>
        <span className="text-ink-500 ml-auto text-xs tabular-nums">{supplier.id}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <GlassPanel tier="g2" className="p-6">
          <h2 className="text-forest-900 font-display mb-5 text-base font-semibold">
            {t("infoTitle")}
          </h2>
          <dl className="grid gap-5 sm:grid-cols-2">
            <DetailItem label={t("field.name")}>{supplier.name}</DetailItem>
            <DetailItem label={t("field.type")}>{t(`type.${supplier.type}`)}</DetailItem>
            <DetailItem label={t("field.username")}>{supplier.username}</DetailItem>
            <DetailItem label={t("field.id")}>{supplier.id}</DetailItem>
            <DetailItem label={t("field.phone")}>
              <span className="tabular-nums">{supplier.phone}</span>
            </DetailItem>
            <DetailItem label={t("field.email")}>{supplier.email}</DetailItem>
            <DetailItem label={t("field.aimag")}>{supplier.aimag}</DetailItem>
            <DetailItem label={t("field.soum")}>{supplier.soum}</DetailItem>
            <DetailItem label={t("field.registeredOn")}>
              <span className="tabular-nums">{formatDate(supplier.registeredOn)}</span>
            </DetailItem>
            <DetailItem label={t("field.updatedOn")}>
              <span className="tabular-nums">
                {supplier.updatedOn ? formatDate(supplier.updatedOn) : "—"}
              </span>
            </DetailItem>
          </dl>

          <div className="border-brown-500/15 mt-6 border-t pt-5">
            <h3 className="text-ink-500 text-xs font-medium tracking-wide uppercase">
              {t("notesTitle")}
            </h3>
            <p className="text-ink-700 mt-2 text-sm leading-relaxed">
              {supplier.notes || t("noNotes")}
            </p>
          </div>
        </GlassPanel>

        <GlassPanel tier="g2" className="p-6">
          <h2 className="text-forest-900 font-display text-base font-semibold">
            {t("batchesTitle")}
          </h2>
          <p className="text-ink-500 mt-1 text-xs">{t("batchesHint")}</p>

          <div className="mt-4">
            {batches.length === 0 ? (
              <EmptyState
                title={t("noBatches")}
                description={t("noBatchesHint")}
                className="px-4 py-8"
              />
            ) : (
              <ul className="divide-brown-500/15 divide-y">
                {batches.slice(0, 6).map((batch) => (
                  <li key={batch.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link
                        href={`/${locale}/clerk/batches/${batch.id}`}
                        className="text-forest-800 text-sm font-medium tabular-nums underline-offset-4 hover:underline"
                      >
                        {batch.id}
                      </Link>
                      <p className="text-ink-500 text-xs tabular-nums">
                        {formatDate(batch.registeredOn)} · {formatNumber(batch.amountKg, 1)}{" "}
                        {tb("field.amountUnit")}
                      </p>
                    </div>
                    <StatusBadge
                      status={`batch-${batch.status}`}
                      label={ts(`batch.${batch.status}`)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {supplier.status === "active" ? (
            <Button asChild className="rounded-field mt-5 w-full font-semibold">
              <Link href={`/${locale}/clerk/batches/new?supplierId=${supplier.id}`}>
                <PackagePlus aria-hidden />
                {t("newBatch")}
              </Link>
            </Button>
          ) : (
            <p className="text-ink-500 mt-5 text-xs leading-relaxed">
              {t("newBatchUnavailable")}
            </p>
          )}
        </GlassPanel>
      </div>

      <GlassPanel tier="g2" className="mt-4 p-0">
        <div className="flex flex-wrap items-end justify-between gap-2 px-5 pt-5 pb-3">
          <div>
            <h2 className="text-forest-900 font-display text-base font-semibold">
              {t("suppliesTitle")}
            </h2>
            <p className="text-ink-500 mt-1 text-xs">{t("suppliesHint")}</p>
          </div>
          <span className="text-ink-500 text-xs">
            {tc("results", { count: supplies.length })}
          </span>
        </div>

        {supplies.length === 0 ? (
          <EmptyState
            title={t("noSupplies")}
            description={t("noSuppliesHint")}
            className="border-transparent bg-transparent"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("colSupplyDate")}</TableHead>
                <TableHead className="text-right">{t("colSupplyAmount")}</TableHead>
                <TableHead>{t("colSupplyOrigin")}</TableHead>
                <TableHead className="text-right">{t("colLivestock")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplies.map((supply) => (
                <TableRow key={supply.id}>
                  <TableCell className="text-ink-700 tabular-nums">
                    {formatDate(supply.dateIso)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(supply.amountKg, 1)}
                  </TableCell>
                  <TableCell className="text-ink-700">
                    {supply.aimag} · {supply.soum}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(supply.livestockCount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassPanel>

      <DemoNote className="mt-4">{tc("demoNote")}</DemoNote>
    </>
  );
}
