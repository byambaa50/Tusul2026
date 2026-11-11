"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Eye, FlaskConical, GitCompare, History, QrCode } from "lucide-react";

import DemoNote from "@/components/domain/shared/demo-note";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import StatusBadge from "@/components/domain/shared/status-badge";
import { RecordNotFound, DetailItem } from "@/components/domain/clerk/clerk-ui";
import {
  InsertOnlyNote,
  QualityBatchStrip,
  QualityPageSkeleton,
  ReadOnlyRegistrationNote,
} from "@/components/domain/quality/quality-ui";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format/mn";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import { useBatches } from "@/lib/mock/batches";
import { usePublishConfigs } from "@/lib/mock/publish";
import { useQualityTests } from "@/lib/mock/quality";
import { useQrRecords } from "@/lib/mock/qr";
import { useSuppliers } from "@/lib/mock/suppliers";

/**
 * UC-07/UC-08 — read-only batch detail for the quality officer. Registration
 * fields have no edit affordance; the only writes are on the quality
 * workflows (new result, publish config).
 */
export default function QualityBatchDetail({ batchId }: { batchId: string }) {
  const t = useTranslations("quality.detail");
  const tc = useTranslations("quality.common");
  const hydrated = useHydrated();
  const locale = useCurrentLocale();
  const batches = useBatches();
  const batch = batches.find((entry) => entry.id === batchId) ?? null;

  if (!hydrated) return <QualityPageSkeleton />;
  if (!batch) {
    return (
      <RecordNotFound
        title={tc("notFound")}
        description={tc("notFoundHint")}
        backHref={`/${locale}/quality/search`}
        backLabel={t("back")}
      />
    );
  }
  return <QualityBatchDetailContent batchId={batch.id} />;
}

function QualityBatchDetailContent({ batchId }: { batchId: string }) {
  const t = useTranslations("quality.detail");
  const tc = useTranslations("quality.common");
  const ts = useTranslations("status");
  const locale = useCurrentLocale();

  const batches = useBatches();
  const suppliers = useSuppliers();
  const tests = useQualityTests();
  const publishConfigs = usePublishConfigs();
  const qrRecords = useQrRecords();

  const batch = batches.find((entry) => entry.id === batchId);
  if (!batch) return null;

  const supplier = suppliers.find((entry) => entry.id === batch.supplierId) ?? null;
  const testsForBatch = tests.filter((test) => test.batchId === batch.id);
  const latest = testsForBatch[0] ?? null;
  const previous = testsForBatch.slice(1);
  const config = publishConfigs.find((entry) => entry.batchId === batch.id) ?? null;
  const qr = qrRecords.find((record) => record.batchId === batch.id) ?? null;

  return (
    <>
      <PageHeader
        title={batch.id}
        description={t("subtitle")}
        actions={
          <>
            <Button asChild variant="outline" className="bg-linen/60 rounded-field">
              <Link href={`/${locale}/quality/search`}>{t("back")}</Link>
            </Button>
            <Button asChild className="rounded-field font-semibold">
              <Link href={`/${locale}/quality/batches/${batch.id}/test`}>
                <FlaskConical aria-hidden />
                {t("enterAction")}
              </Link>
            </Button>
          </>
        }
      />

      <QualityBatchStrip
        batch={batch}
        supplierName={supplier?.name ?? batch.supplierId}
        latest={latest}
        className="mb-4"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <GlassPanel tier="g2" className="p-6">
          <h2 className="text-forest-900 font-display mb-1 text-base font-semibold">
            {t("infoTitle")}
          </h2>
          <p className="text-ink-500 mb-5 text-xs leading-relaxed">{t("infoHint")}</p>

          <dl className="grid gap-5 sm:grid-cols-2">
            <DetailItem label={tc("batch")}>
              <span className="tabular-nums">{batch.id}</span>
            </DetailItem>
            <DetailItem label={tc("supplier")}>
              {supplier?.name ?? batch.supplierId}
            </DetailItem>
            <DetailItem label={tc("amount")}>
              <span className="tabular-nums">
                {formatNumber(batch.amountKg, 1)} {tc("unitKg")}
              </span>
            </DetailItem>
            <DetailItem label={tc("livestock")}>
              <span className="tabular-nums">
                {batch.livestockCount ? formatNumber(batch.livestockCount) : "—"}{" "}
                {batch.livestockCount ? tc("unitHead") : ""}
              </span>
            </DetailItem>
            <DetailItem label={tc("origin")}>
              {batch.aimag} · {batch.soum}
            </DetailItem>
            <DetailItem label={tc("registeredOn")}>
              <span className="tabular-nums">{formatDate(batch.registeredOn)}</span>
            </DetailItem>
            <DetailItem label={tc("supplyId")}>
              <span className="tabular-nums">{batch.supplyId ?? "—"}</span>
            </DetailItem>
            <DetailItem label={tc("qualityStatus")}>
              <StatusBadge status={`batch-${batch.status}`} label={ts(`batch.${batch.status}`)} />
            </DetailItem>
          </dl>

          <div className="border-brown-500/15 mt-6 border-t pt-5">
            <h3 className="text-ink-500 text-xs font-medium tracking-wide uppercase">
              {t("notesTitle")}
            </h3>
            <p className="text-ink-700 mt-2 text-sm leading-relaxed">
              {batch.notes || tc("noData")}
            </p>
          </div>

          <ReadOnlyRegistrationNote className="mt-6" />
        </GlassPanel>

        <div className="flex flex-col gap-4">
          <GlassPanel tier="g2" className="p-6">
            <h2 className="text-forest-900 font-display mb-1 text-base font-semibold">
              {t("qualityTitle")}
            </h2>
            <p className="text-ink-500 text-xs">
              {tc("testCount", { count: testsForBatch.length })}
            </p>

            {latest ? (
              <>
                <dl className="mt-4 grid gap-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-500 text-xs">{tc("fineness")}</dt>
                    <dd className="text-ink-900 text-sm font-medium tabular-nums">
                      {formatNumber(latest.finenessMicron, 1)} {tc("unitMicron")}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-500 text-xs">{tc("cleanYield")}</dt>
                    <dd className="text-ink-900 text-sm font-medium tabular-nums">
                      {formatNumber(latest.cleanYieldPct, 1)} {tc("unitPercent")}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-500 text-xs">{tc("admixture")}</dt>
                    <dd className="text-ink-900 text-sm font-medium tabular-nums">
                      {formatNumber(latest.impurityPct, 1)} {tc("unitPercent")}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-500 text-xs">{tc("testDate")}</dt>
                    <dd className="text-ink-900 text-sm tabular-nums">
                      {formatDate(latest.testedOn)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-500 text-xs">{tc("enteredAt")}</dt>
                    <dd className="text-ink-700 text-xs tabular-nums">
                      {formatDateTime(latest.createdAt)}
                    </dd>
                  </div>
                </dl>

                <div className="border-brown-500/15 bg-linen/50 rounded-field mt-4 border p-3">
                  <p className="text-ink-500 text-[11px] font-medium tracking-wide uppercase">
                    {tc("labResult")}
                  </p>
                  <p className="text-ink-700 mt-1 text-sm leading-relaxed">{latest.labResult}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild variant="outline" className="bg-linen/60 rounded-field">
                    <Link href={`/${locale}/quality/batches/${batch.id}/history`}>
                      <History aria-hidden />
                      {t("viewAllHistory")}
                    </Link>
                  </Button>
                  {previous.length > 0 ? (
                    <Button asChild variant="outline" className="bg-linen/60 rounded-field">
                      <Link href={`/${locale}/quality/batches/${batch.id}/compare`}>
                        <GitCompare aria-hidden />
                        {t("compareAction")}
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="border-brown-500/20 bg-linen/50 rounded-field mt-4 border border-dashed p-4">
                <p className="text-forest-800 text-sm font-medium">{t("qualityEmpty")}</p>
                <p className="text-ink-500 mt-1 text-xs leading-relaxed">
                  {t("qualityEmptyHint")}
                </p>
                <Button asChild size="sm" className="rounded-field mt-3 font-semibold">
                  <Link href={`/${locale}/quality/batches/${batch.id}/test`}>
                    <FlaskConical aria-hidden />
                    {t("enterAction")}
                  </Link>
                </Button>
              </div>
            )}
          </GlassPanel>

          {previous.length > 0 ? (
            <GlassPanel tier="g2" className="p-6">
              <h2 className="text-forest-900 font-display text-base font-semibold">
                {t("previousTitle")}
              </h2>
              <p className="text-ink-500 mt-1 text-xs leading-relaxed">{t("previousHint")}</p>
              <ul className="divide-brown-500/15 mt-3 divide-y">
                {previous.slice(0, 3).map((test) => (
                  <li key={test.id} className="py-2.5">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="text-ink-500 tabular-nums">{formatDate(test.testedOn)}</span>
                      <span className="text-ink-900 font-medium tabular-nums">
                        {formatNumber(test.finenessMicron, 1)} {tc("unitMicron")} ·{" "}
                        {formatNumber(test.cleanYieldPct, 1)}
                        {tc("unitPercent")} · {formatNumber(test.impurityPct, 1)}
                        {tc("unitPercent")}
                      </span>
                    </div>
                    <p className="text-ink-500 mt-0.5 text-[11px] tabular-nums">{test.id}</p>
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" size="sm" className="bg-linen/60 rounded-field mt-3">
                <Link href={`/${locale}/quality/batches/${batch.id}/history`}>
                  <History aria-hidden />
                  {t("viewAllHistory")}
                </Link>
              </Button>
            </GlassPanel>
          ) : null}

          <GlassPanel tier="g2" className="p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-forest-900 font-display text-base font-semibold">
                {t("publishTitle")}
              </h2>
              {config ? (
                <StatusBadge
                  status={config.status === "published" ? "publish-published" : "publish-hidden"}
                  label={ts(`publish.${config.status}`)}
                />
              ) : (
                <span className="text-ink-500 text-xs">{t("publishNotConfigured")}</span>
              )}
            </div>

            <dl className="mt-4 grid gap-2 text-xs">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">{t("publishFieldsCount")}</dt>
                <dd className="text-ink-900 tabular-nums">
                  {config ? config.fields.length : 1}
                </dd>
              </div>
              {config?.updatedAt ? (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500">{t("publishUpdatedAt")}</dt>
                  <dd className="text-ink-700 tabular-nums">{formatDateTime(config.updatedAt)}</dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-4 flex flex-col gap-2">
              <Button asChild variant="outline" className="bg-linen/60 rounded-field w-full justify-start">
                <Link href={`/${locale}/quality/batches/${batch.id}/publish`}>
                  <QrCode aria-hidden />
                  {t("publishAction")}
                </Link>
              </Button>
              <Button asChild variant="outline" className="bg-linen/60 rounded-field w-full justify-start">
                <Link href={`/${locale}/quality/batches/${batch.id}/preview`}>
                  <Eye aria-hidden />
                  {t("previewAction")}
                </Link>
              </Button>
            </div>
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
                <span className="text-ink-500 text-xs">{t("qrMissing")}</span>
              )}
            </div>
            {!qr ? (
              <p className="text-ink-500 mt-3 text-xs leading-relaxed">{t("qrMissingHint")}</p>
            ) : (
              <p className="text-ink-500 mt-3 text-xs leading-relaxed">
                {qr.status === "ready" ? ts("qr.ready") : ts("qr.created")} ·{" "}
                {formatDateTime(qr.createdAt)}
              </p>
            )}
          </GlassPanel>
        </div>
      </div>

      <InsertOnlyNote className="mt-4" />
      <DemoNote className="mt-4">{tc("demoNote")}</DemoNote>
    </>
  );
}
