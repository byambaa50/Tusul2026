"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { GitCompare, PackagePlus, Pencil, QrCode } from "lucide-react";

import DemoNote from "@/components/domain/shared/demo-note";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import StatusBadge from "@/components/domain/shared/status-badge";
import { ClerkPageSkeleton, DetailItem, RecordNotFound } from "@/components/domain/clerk/clerk-ui";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format/mn";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import { useBatches } from "@/lib/mock/batches";
import { useQrRecords } from "@/lib/mock/qr";
import { useSuppliers } from "@/lib/mock/suppliers";
import { useSupplies } from "@/lib/mock/supplies";

/**
 * UC-05/UC-06 — batch detail: registry data, linked supplier/supply, the
 * quality result (read-only for the clerk) and the QR status.
 */
export default function BatchDetail({ batchId }: { batchId: string }) {
  const t = useTranslations("clerk.batch");
  const hydrated = useHydrated();
  const locale = useCurrentLocale();
  const batches = useBatches();
  const batch = batches.find((entry) => entry.id === batchId) ?? null;

  if (!hydrated) return <ClerkPageSkeleton />;
  if (!batch) {
    return (
      <RecordNotFound
        title={t("notFound")}
        description={t("notFoundHint")}
        backHref={`/${locale}/clerk/batches`}
        backLabel={t("backToBatches")}
      />
    );
  }
  return <BatchDetailContent batchId={batch.id} />;
}

function BatchDetailContent({ batchId }: { batchId: string }) {
  const t = useTranslations("clerk.batch");
  const tc = useTranslations("clerk.common");
  const ts = useTranslations("status");
  const tq = useTranslations("clerk.qr");
  const locale = useCurrentLocale();
  const batches = useBatches();
  const suppliers = useSuppliers();
  const qrRecords = useQrRecords();

  const batch = batches.find((entry) => entry.id === batchId);
  const supplies = useSupplies(batch?.supplierId ?? null);
  if (!batch) return null;

  const supplier = suppliers.find((entry) => entry.id === batch.supplierId) ?? null;
  const supply = batch.supplyId
    ? supplies.find((entry) => entry.id === batch.supplyId) ?? null
    : null;
  const qr = qrRecords.find((record) => record.batchId === batch.id) ?? null;

  return (
    <>
      <PageHeader
        title={batch.id}
        description={t("detailSubtitle")}
        actions={
          <>
            <Button asChild variant="outline" className="bg-linen/60 rounded-field">
              <Link href={`/${locale}/clerk/batches`}>{t("backToBatches")}</Link>
            </Button>
            <Button asChild variant="outline" className="bg-linen/60 rounded-field">
              <Link href={`/${locale}/clerk/batches/${batch.id}/edit`}>
                <Pencil aria-hidden />
                {t("editAction")}
              </Link>
            </Button>
            <Button asChild className="rounded-field font-semibold">
              <Link href={`/${locale}/clerk/batches/${batch.id}/qr`}>
                <QrCode aria-hidden />
                {t("viewQr")}
              </Link>
            </Button>
          </>
        }
      />

      <div className="border-brown-500/15 bg-ivory-50/60 rounded-field mb-4 flex flex-wrap items-center gap-3 border p-3">
        <StatusBadge status={`batch-${batch.status}`} label={ts(`batch.${batch.status}`)} />
        {qr ? (
          <StatusBadge
            status={qr.status === "ready" ? "qr-ready" : "qr-created"}
            label={`QR: ${ts(`qr.${qr.status}`)}`}
          />
        ) : (
          <span className="text-ink-500 text-xs">QR: {tq("statusMissing")}</span>
        )}
        <span className="text-ink-500 text-xs">
          {t("field.date")}:{" "}
          <span className="tabular-nums">{formatDate(batch.registeredOn)}</span>
        </span>
        {batch.updatedOn ? (
          <span className="text-ink-500 text-xs">
            {t("updatedOn")}:{" "}
            <span className="tabular-nums">{formatDate(batch.updatedOn)}</span>
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <GlassPanel tier="g2" className="p-6">
          <h2 className="text-forest-900 font-display mb-5 text-base font-semibold">
            {t("sectionInfo")}
          </h2>

          <dl className="grid gap-5 sm:grid-cols-2">
            <DetailItem label={t("field.number")}>
              <span className="tabular-nums">{batch.id}</span>
            </DetailItem>
            <DetailItem label={t("field.supplier")}>
              {supplier ? (
                <Link
                  href={`/${locale}/clerk/suppliers/${supplier.id}`}
                  className="text-forest-800 underline-offset-4 hover:underline"
                >
                  {supplier.name} · {supplier.id}
                </Link>
              ) : (
                batch.supplierId
              )}
            </DetailItem>
            <DetailItem label={t("field.amount")}>
              <span className="tabular-nums">
                {formatNumber(batch.amountKg, 1)} {t("field.amountUnit")}
              </span>
            </DetailItem>
            <DetailItem label={t("field.livestock")}>
              <span className="tabular-nums">
                {batch.livestockCount ? formatNumber(batch.livestockCount) : "—"}
              </span>
            </DetailItem>
            <DetailItem label={t("field.aimag")}>{batch.aimag}</DetailItem>
            <DetailItem label={t("field.soum")}>{batch.soum}</DetailItem>
            <DetailItem label={t("field.date")}>
              <span className="tabular-nums">{formatDate(batch.registeredOn)}</span>
            </DetailItem>
            <DetailItem label={t("field.supply")}>
              {supply ? (
                <span className="tabular-nums">
                  {supply.id} · {formatDate(supply.dateIso)} ·{" "}
                  {formatNumber(supply.amountKg, 1)} {t("field.amountUnit")}
                </span>
              ) : batch.supplyId ? (
                <span className="tabular-nums">{batch.supplyId}</span>
              ) : (
                t("noSupply")
              )}
            </DetailItem>
          </dl>

          <div className="border-brown-500/15 mt-6 border-t pt-5">
            <h3 className="text-ink-500 text-xs font-medium tracking-wide uppercase">
              {t("notesTitle")}
            </h3>
            <p className="text-ink-700 mt-2 text-sm leading-relaxed">
              {batch.notes || t("noNotes")}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild variant="outline" className="bg-linen/60 rounded-field">
              <Link href={`/${locale}/clerk/batches/${batch.id}/trace`}>
                <GitCompare aria-hidden />
                {t("viewTrace")}
              </Link>
            </Button>
            {supplier ? (
              <Button asChild variant="outline" className="bg-linen/60 rounded-field">
                <Link href={`/${locale}/clerk/suppliers/${supplier.id}`}>
                  {t("viewSupplier")}
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" className="bg-linen/60 rounded-field">
              <Link href={`/${locale}/clerk/batches/new?supplierId=${batch.supplierId}`}>
                <PackagePlus aria-hidden />
                {t("new")}
              </Link>
            </Button>
          </div>
        </GlassPanel>

        <div className="flex flex-col gap-4">
          <GlassPanel tier="g2" className="p-6">
            <h2 className="text-forest-900 font-display text-base font-semibold">
              {t("qualityTitle")}
            </h2>

            {batch.test ? (
              <dl className="mt-4 grid gap-4">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500 text-xs">{t("fineness")}</dt>
                  <dd className="text-ink-900 text-sm font-medium tabular-nums">
                    {formatNumber(batch.test.finenessMicron, 1)} {t("unitMicron")}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500 text-xs">{t("yield")}</dt>
                  <dd className="text-ink-900 text-sm font-medium tabular-nums">
                    {formatNumber(batch.test.cleanYieldPct, 1)} {t("unitPercent")}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500 text-xs">{t("impurity")}</dt>
                  <dd className="text-ink-900 text-sm font-medium tabular-nums">
                    {formatNumber(batch.test.impurityPct, 1)} {t("unitPercent")}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500 text-xs">{t("testedOn")}</dt>
                  <dd className="text-ink-900 text-sm tabular-nums">
                    {formatDate(batch.test.testedOn)}
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="border-brown-500/20 bg-linen/50 rounded-field mt-4 border border-dashed p-4">
                <p className="text-forest-800 text-sm font-medium">{t("qualityEmpty")}</p>
                <p className="text-ink-500 mt-1 text-xs leading-relaxed">{t("qualityHint")}</p>
              </div>
            )}

            <p className="text-ink-500 mt-4 text-xs leading-relaxed">{t("qualityReadOnly")}</p>
          </GlassPanel>

          <GlassPanel tier="g2" className="p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-forest-900 font-display text-base font-semibold">
                {t("qrTitle")}
              </h2>
              {qr ? (
                <StatusBadge
                  status={qr.status === "ready" ? "qr-ready" : "qr-created"}
                  label={ts(`qr.${qr.status}`)}
                />
              ) : (
                <span className="text-ink-500 text-xs">{tq("statusMissing")}</span>
              )}
            </div>

            {qr ? (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-ink-500 text-xs tabular-nums">
                  {tq("createdAt")}: {formatDateTime(qr.createdAt)}
                </p>
                <Button asChild className="rounded-field w-full font-semibold">
                  <Link href={`/${locale}/clerk/batches/${batch.id}/qr`}>
                    <QrCode aria-hidden />
                    {t("qrOpen")}
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-ink-700 text-sm">{t("qrMissing")}</p>
                <p className="text-ink-500 text-xs leading-relaxed">{t("qrMissingHint")}</p>
                <Button asChild className="rounded-field w-full font-semibold">
                  <Link href={`/${locale}/clerk/batches/${batch.id}/qr`}>
                    <QrCode aria-hidden />
                    {t("qrGenerate")}
                  </Link>
                </Button>
              </div>
            )}
          </GlassPanel>
        </div>
      </div>

      <DemoNote className="mt-4">{tc("demoNote")}</DemoNote>
    </>
  );
}
