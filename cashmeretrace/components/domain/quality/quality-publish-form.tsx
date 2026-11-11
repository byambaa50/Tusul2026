"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Eye, FlaskConical, Lock, QrCode, Save, ShieldCheck } from "lucide-react";

import DemoNote from "@/components/domain/shared/demo-note";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import StatusBadge from "@/components/domain/shared/status-badge";
import { RecordNotFound } from "@/components/domain/clerk/clerk-ui";
import {
  QualityBatchStrip,
  QualityPageSkeleton,
  ReadOnlyRegistrationNote,
} from "@/components/domain/quality/quality-ui";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format/mn";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import { useBatches } from "@/lib/mock/batches";
import {
  MANDATORY_PUBLIC_FIELD,
  defaultPublishConfig,
  normalizePublicFields,
  savePublishConfig,
  usePublishConfigs,
} from "@/lib/mock/publish";
import { useQualityTests } from "@/lib/mock/quality";
import { useQrRecords } from "@/lib/mock/qr";
import { useSuppliers } from "@/lib/mock/suppliers";
import {
  publicFields,
  type PublicField,
  type PublishStatus,
} from "@/lib/types/domain";

/**
 * UC-09 publish-field selector. The UI can only choose from the §9.1
 * whitelist; `batchCode` is permanently checked and the store normalises the
 * submitted list again. The selector writes `publish_config` only — it never
 * touches batch registration data or quality rows.
 */
export default function QualityPublishForm({ batchId }: { batchId: string }) {
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
  return <QualityPublishFormContent batchId={batch.id} />;
}

function QualityPublishFormContent({ batchId }: { batchId: string }) {
  const t = useTranslations("quality.publish");
  const tc = useTranslations("quality.common");
  const td = useTranslations("quality.detail");
  const ts = useTranslations("status");
  const locale = useCurrentLocale();

  const batches = useBatches();
  const suppliers = useSuppliers();
  const tests = useQualityTests();
  const publishConfigs = usePublishConfigs();
  const qrRecords = useQrRecords();

  const config = publishConfigs.find((entry) => entry.batchId === batchId) ?? null;
  const initial = config ?? defaultPublishConfig(batchId);

  const [fields, setFields] = useState<PublicField[]>(initial.fields);
  const [status, setStatus] = useState<PublishStatus>(initial.status);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const foundBatch = batches.find((entry) => entry.id === batchId);
  if (!foundBatch) return null;
  const batch = foundBatch;

  const supplier = suppliers.find((entry) => entry.id === batch.supplierId) ?? null;
  const latest = tests.find((test) => test.batchId === batch.id) ?? null;
  const qr = qrRecords.find((record) => record.batchId === batch.id) ?? null;

  function toggleField(field: PublicField) {
    if (field === MANDATORY_PUBLIC_FIELD) return;
    setFields((current) =>
      normalizePublicFields(
        current.includes(field)
          ? current.filter((entry) => entry !== field)
          : [...current, field],
      ),
    );
    setSaved(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      savePublishConfig(batch.id, fields, status);
      setSaved(true);
      setError(null);
    } catch {
      setError(t("errorStorage"));
    }
  }

  const selectedQualityFields = fields.filter((field) =>
    (["fineness", "cleanYield", "admixture", "testedOn"] as PublicField[]).includes(field),
  );

  return (
    <>
      <PageHeader
        title={`${t("title")} · ${batch.id}`}
        description={t("subtitle")}
        actions={
          <Button asChild variant="outline" className="bg-linen/60 rounded-field">
            <Link href={`/${locale}/quality/batches/${batch.id}`}>
              <ArrowLeft aria-hidden />
              {t("backToBatch")}
            </Link>
          </Button>
        }
      />

      <QualityBatchStrip
        batch={batch}
        supplierName={supplier?.name ?? batch.supplierId}
        latest={latest}
        className="mb-4"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <GlassPanel tier="g2" className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
            <div>
              <h2 className="text-forest-900 font-display text-base font-semibold">
                {t("statusTitle")}
              </h2>
              <p className="text-ink-500 mt-1 text-xs leading-relaxed">{t("statusHint")}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] sm:items-center">
                <Select
                  value={status}
                  onValueChange={(value) => {
                    setStatus(value as PublishStatus);
                    setSaved(false);
                  }}
                >
                  <SelectTrigger
                    className="bg-linen/80 h-11 w-full rounded-field"
                    aria-label={t("statusTitle")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hidden">{ts("publish.hidden")}</SelectItem>
                    <SelectItem value="published">{ts("publish.published")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-ink-500 text-xs leading-relaxed">
                  {status === "published" ? t("statusPublishedHint") : t("statusHiddenHint")}
                </p>
              </div>
            </div>

            <div className="border-brown-500/15 border-t pt-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-forest-900 font-display text-base font-semibold">
                    {t("fieldsTitle")}
                  </h2>
                  <p className="text-ink-500 mt-1 max-w-xl text-xs leading-relaxed">
                    {t("fieldsHint")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-linen/60 rounded-field"
                    onClick={() => {
                      setFields([...publicFields]);
                      setSaved(false);
                    }}
                  >
                    {t("selectAll")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-linen/60 rounded-field"
                    onClick={() => {
                      setFields([MANDATORY_PUBLIC_FIELD]);
                      setSaved(false);
                    }}
                  >
                    {t("clearAll")}
                  </Button>
                </div>
              </div>

              <fieldset className="mt-4">
                <legend className="sr-only">{t("fieldsTitle")}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {publicFields.map((field) => {
                    const checked = fields.includes(field);
                    const mandatory = field === MANDATORY_PUBLIC_FIELD;
                    const isQualityField = selectedQualityFields.includes(field);
                    return (
                      <label
                        key={field}
                        htmlFor={`publish-field-${field}`}
                        className="border-brown-500/15 bg-linen/50 hover:bg-sage-100/50 rounded-field flex cursor-pointer items-start gap-3 border p-3 transition-colors"
                      >
                        <input
                          id={`publish-field-${field}`}
                          type="checkbox"
                          checked={checked}
                          disabled={mandatory}
                          onChange={() => toggleField(field)}
                          className="accent-forest-700 border-brown-500/40 mt-0.5 size-4 shrink-0 rounded"
                        />
                        <span className="min-w-0">
                          <span className="text-ink-900 flex items-center gap-1.5 text-sm font-medium">
                            {t(`fields.${field}`)}
                            {mandatory ? (
                              <Lock aria-hidden className="text-olive-600 size-3.5" />
                            ) : null}
                          </span>
                          <span className="text-ink-500 mt-0.5 block text-xs leading-relaxed">
                            {mandatory
                              ? t("mandatoryHint")
                              : isQualityField && !latest
                                ? t("noTestHint")
                                : t(`fieldHints.${field}`)}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <p className="text-ink-500 mt-3 text-xs tabular-nums">
                {t("selectedCount", { count: fields.length })}
              </p>

              {selectedQualityFields.length > 0 && !latest ? (
                <div className="border-camel-500/30 bg-camel-500/10 text-brown-600 rounded-field mt-3 border p-3 text-xs leading-relaxed">
                  <p className="font-semibold">{t("noTestTitle")}</p>
                  <p className="mt-0.5">{t("noTestHint")}</p>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="bg-linen/60 rounded-field mt-2"
                  >
                    <Link href={`/${locale}/quality/batches/${batch.id}/test`}>
                      <FlaskConical aria-hidden />
                      {t("addTest")}
                    </Link>
                  </Button>
                </div>
              ) : null}
            </div>

            {!qr ? (
              <p className="border-camel-500/30 bg-camel-500/10 text-brown-600 rounded-field border p-3 text-xs leading-relaxed">
                <span className="font-semibold">{t("qrMissing")}. </span>
                {t("qrMissingHint")}
              </p>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="border-terracotta-500/40 bg-terracotta-500/10 text-terracotta-700 rounded-field border p-3 text-sm leading-relaxed"
              >
                {error}
              </p>
            ) : null}

            {saved ? (
              <div
                role="status"
                className="border-sage-500/40 bg-sage-100/70 text-forest-800 rounded-field border p-3 text-sm leading-relaxed"
              >
                <p className="font-semibold">{t("savedMessage")}</p>
                <p className="mt-0.5 text-xs">{t("savedHint")}</p>
                <Button asChild size="sm" className="rounded-field mt-2 font-semibold">
                  <Link href={`/${locale}/quality/batches/${batch.id}/preview`}>
                    <Eye aria-hidden />
                    {t("openPreview")}
                  </Link>
                </Button>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="rounded-field font-semibold">
                <Save aria-hidden />
                {t("save")}
              </Button>
              <Button asChild variant="outline" className="bg-linen/60 rounded-field">
                <Link href={`/${locale}/quality/batches/${batch.id}/preview`}>
                  <Eye aria-hidden />
                  {t("previewAction")}
                </Link>
              </Button>
              <Button asChild variant="ghost" className="rounded-field">
                <Link href={`/${locale}/quality/batches/${batch.id}`}>{t("backToBatch")}</Link>
              </Button>
            </div>
          </form>

          <ReadOnlyRegistrationNote className="mt-6" />
        </GlassPanel>

        <div className="flex flex-col gap-4">
          <GlassPanel tier="g2" className="p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-forest-900 font-display text-base font-semibold">
                {t("latestTitle")}
              </h2>
              {latest ? (
                <span className="border-sage-500/40 bg-sage-100 text-forest-800 inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium">
                  {tc("latestBadge")}
                </span>
              ) : null}
            </div>
            <p className="text-ink-500 mt-1 text-xs leading-relaxed">{t("latestHint")}</p>

            {latest ? (
              <dl className="mt-4 grid gap-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500 text-xs">{tc("fineness")}</dt>
                  <dd className="text-ink-900 font-medium tabular-nums">
                    {formatNumber(latest.finenessMicron, 1)} {tc("unitMicron")}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500 text-xs">{tc("cleanYield")}</dt>
                  <dd className="text-ink-900 font-medium tabular-nums">
                    {formatNumber(latest.cleanYieldPct, 1)} {tc("unitPercent")}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500 text-xs">{tc("admixture")}</dt>
                  <dd className="text-ink-900 font-medium tabular-nums">
                    {formatNumber(latest.impurityPct, 1)} {tc("unitPercent")}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500 text-xs">{tc("testDate")}</dt>
                  <dd className="text-ink-900 tabular-nums">{formatDate(latest.testedOn)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500 text-xs">{tc("enteredAt")}</dt>
                  <dd className="text-ink-700 text-xs tabular-nums">
                    {formatDateTime(latest.createdAt)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="border-brown-500/20 bg-linen/50 rounded-field text-ink-700 mt-4 border border-dashed p-4 text-sm leading-relaxed">
                {t("noLatest")}
              </p>
            )}
          </GlassPanel>

          <GlassPanel tier="g2" className="p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-forest-900 font-display text-base font-semibold">
                {tc("qrStatus")}
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
            {qr ? (
              <p className="text-ink-500 mt-3 text-xs leading-relaxed">
                {qr.status === "ready" ? ts("qr.ready") : ts("qr.created")} ·{" "}
                {formatDateTime(qr.createdAt)}
              </p>
            ) : (
              <p className="text-ink-500 mt-3 text-xs leading-relaxed">{t("qrMissingHint")}</p>
            )}
          </GlassPanel>

          <GlassPanel tier="g2" className="p-6">
            <div className="flex items-start gap-2">
              <ShieldCheck aria-hidden className="text-olive-600 mt-0.5 size-4 shrink-0" />
              <div>
                <h2 className="text-forest-900 font-display text-base font-semibold">
                  {t("mandatory")}
                </h2>
                <p className="text-ink-500 mt-1 text-xs leading-relaxed">{t("whitelistNote")}</p>
              </div>
            </div>
            {config?.updatedAt ? (
              <p className="text-ink-500 mt-3 text-xs tabular-nums">
                {td("publishUpdatedAt")}: {formatDateTime(config.updatedAt)}
              </p>
            ) : null}
          </GlassPanel>

          <GlassPanel tier="g2" className="p-6">
            <QrCode aria-hidden className="text-olive-600 size-5" />
            <p className="text-ink-500 mt-2 text-xs leading-relaxed">{tc("unitNote")}</p>
          </GlassPanel>
        </div>
      </div>

      <DemoNote className="mt-4">{tc("demoNote")}</DemoNote>
    </>
  );
}
