"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, EyeOff, Pencil, QrCode, ShieldCheck } from "lucide-react";

import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import StatusBadge from "@/components/domain/shared/status-badge";
import { RecordNotFound } from "@/components/domain/clerk/clerk-ui";
import { QualityPageSkeleton } from "@/components/domain/quality/quality-ui";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format/mn";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import { useBatches } from "@/lib/mock/batches";
import { defaultPublishConfig, usePublishConfigs } from "@/lib/mock/publish";
import { useQualityTests } from "@/lib/mock/quality";
import { useQrRecords } from "@/lib/mock/qr";
import type { PublicField } from "@/lib/types/domain";

type VerificationState = "verified" | "pending" | "unavailable";

function verificationClass(state: VerificationState): string {
  if (state === "verified") {
    return "border-forest-700/30 bg-forest-700/10 text-forest-800";
  }
  if (state === "pending") {
    return "border-camel-500/40 bg-camel-500/10 text-camel-600";
  }
  return "border-slate-400/40 bg-slate-300/50 text-slate-700";
}

/**
 * UC-09/UC-13 public QR field preview. It renders ONLY the selected §9.1
 * whitelist values and never reads or displays supplier identity/contact,
 * supplier id, internal notes, audit data, previous test history, lab result
 * text or the QR token. The latest quality values come from `tests[0]`.
 */
export default function QualityPublicPreview({ batchId }: { batchId: string }) {
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
        backLabel={tc("backToSearch")}
      />
    );
  }
  return <QualityPublicPreviewContent batchId={batch.id} />;
}

function QualityPublicPreviewContent({ batchId }: { batchId: string }) {
  const t = useTranslations("quality.preview");
  const tp = useTranslations("quality.publish");
  const tc = useTranslations("quality.common");
  const ts = useTranslations("status");
  const locale = useCurrentLocale();

  const batches = useBatches();
  const tests = useQualityTests();
  const publishConfigs = usePublishConfigs();
  const qrRecords = useQrRecords();

  const foundBatch = batches.find((entry) => entry.id === batchId);
  if (!foundBatch) return null;
  const batch = foundBatch;

  const latest = tests.find((test) => test.batchId === batch.id) ?? null;
  const config = publishConfigs.find((entry) => entry.batchId === batch.id) ?? null;
  const effective = config ?? defaultPublishConfig(batch.id);
  const qr = qrRecords.find((record) => record.batchId === batch.id) ?? null;
  const verification: VerificationState = qr
    ? qr.status === "ready"
      ? "verified"
      : "pending"
    : "unavailable";

  const showVerification = effective.fields.includes("verificationStatus");
  const optionalFields = effective.fields.filter(
    (field) => field !== "batchCode" && field !== "verificationStatus",
  );

  function fieldValue(field: PublicField) {
    switch (field) {
      case "batchCode":
        return batch.id;
      case "origin":
        return `${batch.aimag} · ${batch.soum}`;
      case "supplyAmount":
        return `${formatNumber(batch.amountKg, 1)} ${tc("unitKg")}`;
      case "livestockCount":
        return typeof batch.livestockCount === "number"
          ? `${formatNumber(batch.livestockCount)} ${tc("unitHead")}`
          : "—";
      case "fineness":
        return latest
          ? `${formatNumber(latest.finenessMicron, 1)} ${tc("unitMicron")}`
          : tp("noLatest");
      case "cleanYield":
        return latest
          ? `${formatNumber(latest.cleanYieldPct, 1)} ${tc("unitPercent")}`
          : tp("noLatest");
      case "admixture":
        return latest
          ? `${formatNumber(latest.impurityPct, 1)} ${tc("unitPercent")}`
          : tp("noLatest");
      case "testedOn":
        return latest ? formatDate(latest.testedOn) : tp("noLatest");
      case "verificationStatus":
        return t(`verificationState.${verification}`);
      default:
        return "—";
    }
  }

  return (
    <>
      <PageHeader
        title={`${t("title")} · ${batch.id}`}
        description={t("subtitle")}
        actions={
          <>
            <Button asChild variant="outline" className="bg-linen/60 rounded-field">
              <Link href={`/${locale}/quality/batches/${batch.id}`}>
                <ArrowLeft aria-hidden />
                {t("backToBatch")}
              </Link>
            </Button>
            <Button asChild className="rounded-field font-semibold">
              <Link href={`/${locale}/quality/batches/${batch.id}/publish`}>
                <Pencil aria-hidden />
                {t("editFields")}
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <GlassPanel tier="g2" className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-forest-900 font-display text-base font-semibold">
                  {effective.status === "published" ? t("published") : t("draftHidden")}
                </h2>
                <p className="text-ink-500 mt-1 max-w-md text-xs leading-relaxed">
                  {effective.status === "published"
                    ? t("publishedHint")
                    : t("draftHiddenHint")}
                </p>
              </div>
              <StatusBadge
                status={
                  effective.status === "published" ? "publish-published" : "publish-hidden"
                }
                label={ts(`publish.${effective.status}`)}
              />
            </div>
            <p className="text-ink-500 mt-3 text-xs tabular-nums">
              {t("selectedCount", { count: effective.fields.length })}
            </p>
            {effective.updatedAt ? (
              <p className="text-ink-500 mt-1 text-xs tabular-nums">
                {t("lastUpdated")}: {formatDateTime(effective.updatedAt)}
              </p>
            ) : null}
          </GlassPanel>

          {!qr ? (
            <GlassPanel tier="g2" className="p-5 sm:p-6">
              <div className="flex items-start gap-2">
                <QrCode aria-hidden className="text-camel-600 mt-0.5 size-5 shrink-0" />
                <div>
                  <h2 className="text-forest-900 font-display text-base font-semibold">
                    {t("qrMissing")}
                  </h2>
                  <p className="text-ink-500 mt-1 text-xs leading-relaxed">{t("qrMissingHint")}</p>
                </div>
              </div>
            </GlassPanel>
          ) : null}

          <GlassPanel tier="g2" className="p-5 sm:p-6">
            <h2 className="text-forest-900 font-display text-base font-semibold">
              {t("excludedTitle")}
            </h2>
            <p className="text-ink-500 mt-1 text-xs leading-relaxed">{t("excludedHint")}</p>
            <ul className="mt-3 grid gap-2 text-xs">
              {[
                t("excludedSupplier"),
                t("excludedContact"),
                t("excludedAddress"),
                t("excludedInternal"),
                t("excludedHistory"),
                t("excludedLab"),
              ].map((item) => (
                <li key={item} className="text-ink-700 flex items-center gap-2">
                  <EyeOff aria-hidden className="text-terracotta-500 size-3.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </GlassPanel>
        </div>

        <div className="mx-auto w-full max-w-xl">
          <div className="border-brown-500/20 bg-linen shadow-soft rounded-block border p-5 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <span className="text-olive-600 font-display text-sm font-semibold tracking-wide">
                {t("brand")}
              </span>
              {showVerification ? (
                <span
                  className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium ${verificationClass(
                    verification,
                  )}`}
                >
                  <ShieldCheck aria-hidden className="mr-1.5 size-3.5" />
                  {t(`verificationState.${verification}`)}
                </span>
              ) : null}
            </div>

            <div className="mt-6 text-center">
              <p className="text-ink-500 text-[11px] font-medium tracking-[0.14em] uppercase">
                {t("publicCardTitle")}
              </p>
              <p className="text-forest-900 font-display mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                {batch.id}
              </p>
              <p className="text-ink-500 mt-1 text-xs">{t("publicCardSubtitle")}</p>
            </div>

            <div className="border-brown-500/15 mt-6 border-t pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-ink-500 text-xs font-medium tracking-wide uppercase">
                  {t("fieldsTitle")}
                </h3>
                <span className="text-ink-500 text-[11px] tabular-nums">
                  {t("selectedCount", { count: effective.fields.length })}
                </span>
              </div>

              {optionalFields.length === 0 ? (
                showVerification ? null : (
                  <p className="text-ink-500 mt-3 text-sm leading-relaxed">
                    {t("noOptionalFields")}
                  </p>
                )
              ) : (
                <dl className="mt-3 grid gap-x-5 gap-y-4 sm:grid-cols-2">
                  {optionalFields.map((field) => (
                    <div key={field} className="min-w-0">
                      <dt className="text-ink-500 text-[11px] font-medium tracking-wide uppercase">
                        {tp(`fields.${field}`)}
                      </dt>
                      <dd className="text-forest-900 mt-0.5 text-sm font-medium break-words tabular-nums">
                        {fieldValue(field)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            <p className="text-ink-500 border-brown-500/15 mt-6 border-t pt-4 text-[11px] leading-relaxed">
              {t("footerNote")}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
