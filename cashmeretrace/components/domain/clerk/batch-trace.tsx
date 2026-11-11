"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, FlaskConical, Package, QrCode, Truck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
 * FR-2.9 / UC-07 — origin traceability: batch → supplier → supply → quality
 * → QR. Every link is rendered from the local mock store; a mismatch
 * between the batch origin and its linked supply is called out.
 */
export default function BatchTrace({ batchId }: { batchId: string }) {
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
  return <BatchTraceContent batchId={batch.id} />;
}

function BatchTraceContent({ batchId }: { batchId: string }) {
  const t = useTranslations("clerk.trace");
  const tb = useTranslations("clerk.batch");
  const ts = useTranslations("status");
  const tq = useTranslations("clerk.qr");
  const tsup = useTranslations("clerk.supplier");
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

  const originMismatch = Boolean(
    supply && (supply.aimag !== batch.aimag || supply.soum !== batch.soum),
  );

  return (
    <>
      <PageHeader
        title={`${t("title")} · ${batch.id}`}
        description={t("subtitle")}
        actions={
          <Button asChild variant="outline" className="bg-linen/60 rounded-field">
            <Link href={`/${locale}/clerk/batches/${batch.id}`}>{t("backToBatch")}</Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-ink-500 text-xs font-medium tracking-wide uppercase">
          {t("chainTitle")}
        </span>
        <span className="text-ink-500 text-xs">→</span>
        <span className="text-forest-800 text-xs font-medium">{batch.id}</span>
      </div>

      {originMismatch ? (
        <p
          role="alert"
          className="border-terracotta-500/40 bg-terracotta-500/10 text-terracotta-700 rounded-field mb-4 flex items-start gap-2 border p-3 text-sm leading-relaxed"
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("originMismatch")}
        </p>
      ) : supply ? (
        <p className="border-sage-500/40 bg-sage-100/70 text-forest-800 rounded-field mb-4 border p-3 text-sm">
          {t("originMatch")}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassPanel tier="g2" className="p-6">
          <TraceHeader icon={Users} step={t("supplierStep")} />
          {supplier ? (
            <>
              <p className="text-forest-900 mt-4 text-base font-semibold">{supplier.name}</p>
              <p className="text-ink-500 tabular-nums text-xs">{supplier.id}</p>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <DetailItem label={tsup("field.phone")}>
                  <span className="tabular-nums">{supplier.phone}</span>
                </DetailItem>
                <DetailItem label={tsup("field.email")}>{supplier.email}</DetailItem>
                <DetailItem label={tsup("field.origin")}>
                  {supplier.aimag} · {supplier.soum}
                </DetailItem>
                <DetailItem label={tsup("field.status")}>
                  <StatusBadge
                    status={`supplier-${supplier.status}`}
                    label={ts(`supplier.${supplier.status}`)}
                  />
                </DetailItem>
              </dl>
              <Button asChild variant="outline" size="sm" className="bg-linen/60 rounded-field mt-4">
                <Link href={`/${locale}/clerk/suppliers/${supplier.id}`}>
                  {t("supplierLink")}
                </Link>
              </Button>
            </>
          ) : (
            <p className="text-ink-500 mt-4 text-sm">{t("supplierMissing")}</p>
          )}
        </GlassPanel>

        <GlassPanel tier="g2" className="p-6">
          <TraceHeader icon={Truck} step={t("supplyStep")} />
          {supply ? (
            <>
              <p className="text-forest-900 mt-4 font-display text-base font-semibold tabular-nums">
                {supply.id}
              </p>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <DetailItem label={t("supplyDate")}>
                  <span className="tabular-nums">{formatDate(supply.dateIso)}</span>
                </DetailItem>
                <DetailItem label={t("supplyAmount")}>
                  <span className="tabular-nums">
                    {formatNumber(supply.amountKg, 1)} {tb("field.amountUnit")}
                  </span>
                </DetailItem>
                <DetailItem label={tb("field.aimag")}>{supply.aimag}</DetailItem>
                <DetailItem label={tb("field.soum")}>{supply.soum}</DetailItem>
                <DetailItem label={t("livestock")}>
                  <span className="tabular-nums">{formatNumber(supply.livestockCount)}</span>
                </DetailItem>
              </dl>
            </>
          ) : (
            <div className="mt-4">
              <p className="text-forest-800 text-sm font-medium">{t("supplyMissing")}</p>
              <p className="text-ink-500 mt-1 text-xs leading-relaxed">{t("supplyMissingHint")}</p>
            </div>
          )}
        </GlassPanel>

        <GlassPanel tier="g2" className="p-6">
          <TraceHeader icon={Package} step={t("batchStep")} />
          <p className="text-forest-900 mt-4 font-display text-base font-semibold tabular-nums">
            {batch.id}
          </p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <DetailItem label={tb("field.amount")}>
              <span className="tabular-nums">
                {formatNumber(batch.amountKg, 1)} {tb("field.amountUnit")}
              </span>
            </DetailItem>
            <DetailItem label={tb("field.livestock")}>
              <span className="tabular-nums">
                {batch.livestockCount ? formatNumber(batch.livestockCount) : "—"}
              </span>
            </DetailItem>
            <DetailItem label={tb("field.aimag")}>{batch.aimag}</DetailItem>
            <DetailItem label={tb("field.soum")}>{batch.soum}</DetailItem>
            <DetailItem label={tb("field.date")}>
              <span className="tabular-nums">{formatDate(batch.registeredOn)}</span>
            </DetailItem>
            <DetailItem label={tb("field.status")}>
              <StatusBadge status={`batch-${batch.status}`} label={ts(`batch.${batch.status}`)} />
            </DetailItem>
          </dl>
        </GlassPanel>

        <GlassPanel tier="g2" className="p-6">
          <TraceHeader icon={FlaskConical} step={t("qualityStep")} />
          {batch.test ? (
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <DetailItem label={tb("fineness")}>
                <span className="tabular-nums">
                  {formatNumber(batch.test.finenessMicron, 1)} {tb("unitMicron")}
                </span>
              </DetailItem>
              <DetailItem label={tb("yield")}>
                <span className="tabular-nums">
                  {formatNumber(batch.test.cleanYieldPct, 1)} {tb("unitPercent")}
                </span>
              </DetailItem>
              <DetailItem label={tb("impurity")}>
                <span className="tabular-nums">
                  {formatNumber(batch.test.impurityPct, 1)} {tb("unitPercent")}
                </span>
              </DetailItem>
              <DetailItem label={tb("testedOn")}>
                <span className="tabular-nums">{formatDate(batch.test.testedOn)}</span>
              </DetailItem>
            </dl>
          ) : (
            <p className="text-ink-500 mt-4 text-sm">{t("qualityMissing")}</p>
          )}
        </GlassPanel>

        <GlassPanel tier="g2" className="p-6 lg:col-span-2">
          <TraceHeader icon={QrCode} step={t("qrStep")} />
          {qr ? (
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={qr.status === "ready" ? "qr-ready" : "qr-created"}
                    label={ts(`qr.${qr.status}`)}
                  />
                  <span className="text-ink-500 text-xs tabular-nums">
                    {tq("createdAt")}: {formatDateTime(qr.createdAt)}
                  </span>
                </div>
                <p className="text-ink-500 mt-2 max-w-xl truncate text-xs">{qr.payload}</p>
              </div>
              <Button asChild variant="outline" className="bg-linen/60 rounded-field shrink-0">
                <Link href={`/${locale}/clerk/batches/${batch.id}/qr`}>
                  {tb("viewQr")}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-ink-500 text-sm">{t("qrMissing")}</p>
              <Button asChild variant="outline" className="bg-linen/60 rounded-field">
                <Link href={`/${locale}/clerk/batches/${batch.id}/qr`}>
                  {tb("qrGenerate")}
                </Link>
              </Button>
            </div>
          )}
        </GlassPanel>
      </div>

      <DemoNote className="mt-4">{t("verifiedNote")}</DemoNote>
    </>
  );
}

function TraceHeader({ icon: Icon, step }: { icon: LucideIcon; step: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="bg-sage-100 text-olive-600 grid size-8 place-items-center rounded-full">
        <Icon aria-hidden className="size-4" />
      </span>
      <h2 className="text-forest-900 font-display text-sm font-semibold">{step}</h2>
    </div>
  );
}
