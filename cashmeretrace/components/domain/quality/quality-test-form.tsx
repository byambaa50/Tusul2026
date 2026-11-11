"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FlaskConical, GitCompare, History } from "lucide-react";

import FormRow from "@/components/domain/shared/form-row";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import { RecordNotFound } from "@/components/domain/clerk/clerk-ui";
import {
  InsertOnlyNote,
  QualityBatchStrip,
  QualityPageSkeleton,
  ReadOnlyRegistrationNote,
} from "@/components/domain/quality/quality-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format/mn";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import { useBatches } from "@/lib/mock/batches";
import { addQualityTest, isValidTestDate, useQualityTests } from "@/lib/mock/quality";
import { useSuppliers } from "@/lib/mock/suppliers";
import type { QualityTest } from "@/lib/types/domain";

type Values = {
  fineness: string;
  cleanYield: string;
  admixture: string;
  testedOn: string;
  labResult: string;
};

type FieldKey = keyof Values;
type FieldErrors = Partial<Record<FieldKey, string>>;

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function emptyValues(): Values {
  return {
    fineness: "",
    cleanYield: "",
    admixture: "",
    testedOn: todayIso(),
    labResult: "",
  };
}

/** Accept both dot and comma decimal separators in the demo inputs. */
function parseDecimal(value: string): number {
  return Number(value.trim().replace(",", "."));
}

/**
 * UC-08 — manual laboratory result entry. No laboratory integration and no
 * invented measurement standards: validation covers required values, numeric
 * shape, mathematical percentage bounds, a non-future test date and the lab
 * information text only.
 */
export default function QualityTestForm({ batchId }: { batchId: string }) {
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
  return <QualityTestFormContent batchId={batch.id} />;
}

function QualityTestFormContent({ batchId }: { batchId: string }) {
  const t = useTranslations("quality.test");
  const tc = useTranslations("quality.common");
  const locale = useCurrentLocale();

  const batches = useBatches();
  const suppliers = useSuppliers();
  const tests = useQualityTests();

  const [values, setValues] = useState<Values>(emptyValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [summary, setSummary] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [saved, setSaved] = useState<QualityTest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const foundBatch = batches.find((entry) => entry.id === batchId);
  if (!foundBatch) return null;
  const batch = foundBatch;

  const supplier = suppliers.find((entry) => entry.id === batch.supplierId) ?? null;
  const testsForBatch = tests.filter((test) => test.batchId === batch.id);
  const latest = testsForBatch[0] ?? null;

  function clearError(key: FieldKey) {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function setValue<K extends FieldKey>(key: K, value: Values[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setTopError(null);
    clearError(key);
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    const finenessRaw = values.fineness.trim();
    const fineness = parseDecimal(finenessRaw);
    if (!finenessRaw || !Number.isFinite(fineness) || fineness <= 0) {
      next.fineness = t("errorFineness");
    }

    const cleanYieldRaw = values.cleanYield.trim();
    const cleanYield = parseDecimal(cleanYieldRaw);
    if (!cleanYieldRaw || !Number.isFinite(cleanYield) || cleanYield < 0 || cleanYield > 100) {
      next.cleanYield = t("errorPercent");
    }

    const admixtureRaw = values.admixture.trim();
    const admixture = parseDecimal(admixtureRaw);
    if (!admixtureRaw || !Number.isFinite(admixture) || admixture < 0 || admixture > 100) {
      next.admixture = t("errorPercent");
    }

    if (!values.testedOn) {
      next.testedOn = t("errorFutureDate");
    } else if (!isValidTestDate(values.testedOn)) {
      next.testedOn = t("errorInvalidDate");
    } else if (values.testedOn > todayIso()) {
      next.testedOn = t("errorFutureDate");
    }

    if (!values.labResult.trim()) {
      next.labResult = t("errorLab");
    }

    return next;
  }

  function resetForm() {
    setValues(emptyValues());
    setErrors({});
    setSummary(false);
    setTopError(null);
    setSaved(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    const next = validate();
    if (Object.keys(next).length > 0) {
      setErrors(next);
      setSummary(true);
      return;
    }
    setErrors({});
    setSummary(false);
    setTopError(null);

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const created = addQualityTest({
        batchId: batch.id,
        finenessMicron: parseDecimal(values.fineness),
        cleanYieldPct: parseDecimal(values.cleanYield),
        impurityPct: parseDecimal(values.admixture),
        labResult: values.labResult.trim(),
        testedOn: values.testedOn,
      });
      setSaved(created);
      setSuccessOpen(true);
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_QUALITY_TEST") {
        setTopError(t("errorInvalid"));
        return;
      }
      setTopError(t("errorStorage"));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function closeSuccess(open: boolean) {
    setSuccessOpen(open);
    if (!open) resetForm();
  }

  return (
    <>
      <PageHeader
        title={`${t("title")} · ${batch.id}`}
        description={t("subtitle")}
        actions={
          <Button asChild variant="outline" className="bg-linen/60 rounded-field">
            <Link href={`/${locale}/quality/batches/${batch.id}`}>{tc("backToBatch")}</Link>
          </Button>
        }
      />

      <QualityBatchStrip
        batch={batch}
        supplierName={supplier?.name ?? batch.supplierId}
        latest={latest}
        className="mb-4"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <GlassPanel tier="g2" className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <header>
              <h2 className="text-forest-900 font-display text-base font-semibold">
                {t("sectionResult")}
              </h2>
              <p className="text-ink-500 mt-1 text-xs leading-relaxed">{t("sectionResultHint")}</p>
            </header>

            {summary ? (
              <p
                role="alert"
                className="border-terracotta-500/40 bg-terracotta-500/10 text-terracotta-700 rounded-field border p-3 text-sm leading-relaxed"
              >
                {t("errorSummary")}
              </p>
            ) : null}

            {topError ? (
              <p
                role="alert"
                className="border-terracotta-500/40 bg-terracotta-500/10 text-terracotta-700 rounded-field border p-3 text-sm leading-relaxed"
              >
                {topError}
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3">
              <FormRow
                label={`${t("fineness")} (${tc("unitMicron")})`}
                htmlFor="quality-fineness"
                required
                error={errors.fineness}
                hint={t("finenessHint")}
              >
                <Input
                  id="quality-fineness"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={values.fineness}
                  onChange={(event) => setValue("fineness", event.target.value)}
                  aria-invalid={errors.fineness ? true : undefined}
                  className="bg-linen/80 h-11 rounded-field"
                  placeholder="15.4"
                />
              </FormRow>

              <FormRow
                label={`${t("cleanYield")} (${tc("unitPercent")})`}
                htmlFor="quality-yield"
                required
                error={errors.cleanYield}
                hint={t("cleanYieldHint")}
              >
                <Input
                  id="quality-yield"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.1"
                  value={values.cleanYield}
                  onChange={(event) => setValue("cleanYield", event.target.value)}
                  aria-invalid={errors.cleanYield ? true : undefined}
                  className="bg-linen/80 h-11 rounded-field"
                  placeholder="66.2"
                />
              </FormRow>

              <FormRow
                label={`${t("admixture")} (${tc("unitPercent")})`}
                htmlFor="quality-admixture"
                required
                error={errors.admixture}
                hint={t("admixtureHint")}
              >
                <Input
                  id="quality-admixture"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.1"
                  value={values.admixture}
                  onChange={(event) => setValue("admixture", event.target.value)}
                  aria-invalid={errors.admixture ? true : undefined}
                  className="bg-linen/80 h-11 rounded-field"
                  placeholder="3.1"
                />
              </FormRow>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormRow
                label={t("testedOn")}
                htmlFor="quality-tested-on"
                required
                error={errors.testedOn}
                hint={t("testedOnHint")}
              >
                <Input
                  id="quality-tested-on"
                  type="date"
                  value={values.testedOn}
                  onChange={(event) => setValue("testedOn", event.target.value)}
                  aria-invalid={errors.testedOn ? true : undefined}
                  className="bg-linen/80 h-11 rounded-field"
                />
              </FormRow>
            </div>

            <FormRow
              label={t("labResult")}
              htmlFor="quality-lab-result"
              required
              error={errors.labResult}
              hint={t("labResultHint")}
            >
              <textarea
                id="quality-lab-result"
                rows={4}
                value={values.labResult}
                onChange={(event) => setValue("labResult", event.target.value)}
                aria-invalid={errors.labResult ? true : undefined}
                placeholder={t("labPlaceholder")}
                className="border-input bg-linen/80 rounded-field focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 w-full resize-y border px-3 py-2.5 text-sm outline-none focus-visible:ring-3"
              />
            </FormRow>

            <p className="text-ink-500 text-xs leading-relaxed">{t("unitNote")}</p>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="rounded-field font-semibold" disabled={submitting}>
                <FlaskConical aria-hidden />
                {t("submit")}
              </Button>
              <Button asChild variant="outline" className="bg-linen/60 rounded-field">
                <Link href={`/${locale}/quality/batches/${batch.id}`}>{t("cancel")}</Link>
              </Button>
            </div>
          </form>

          <InsertOnlyNote className="mt-5" />
          <ReadOnlyRegistrationNote className="mt-3" />
        </GlassPanel>

        <div className="flex flex-col gap-4">
          <GlassPanel tier="g2" className="p-6">
            <h2 className="text-forest-900 font-display text-base font-semibold">
              {t("previousTitle")}
            </h2>
            <p className="text-ink-500 mt-1 text-xs leading-relaxed">{t("previousHint")}</p>

            {latest ? (
              <div className="mt-4 flex flex-col gap-3">
                <dl className="grid gap-2.5">
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
                <p className="border-camel-500/30 bg-camel-500/10 text-brown-600 rounded-field border p-2.5 text-xs leading-relaxed">
                  {t("newBecomesLatest")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm" className="bg-linen/60 rounded-field">
                    <Link href={`/${locale}/quality/batches/${batch.id}/history`}>
                      <History aria-hidden />
                      {tc("viewHistory")}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="bg-linen/60 rounded-field">
                    <Link href={`/${locale}/quality/batches/${batch.id}/compare`}>
                      <GitCompare aria-hidden />
                      {tc("compare")}
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="border-brown-500/20 bg-linen/50 rounded-field text-ink-700 mt-4 border border-dashed p-4 text-sm leading-relaxed">
                {t("noPrevious")}
              </p>
            )}
          </GlassPanel>

          <GlassPanel tier="g2" className="p-6">
            <h2 className="text-forest-900 font-display text-base font-semibold">
              {tc("latestOrderNote")}
            </h2>
            <p className="text-ink-500 mt-2 text-xs leading-relaxed">{tc("unitNote")}</p>
            <p className="text-ink-500 mt-2 text-xs leading-relaxed">{tc("insertOnlyBody")}</p>
          </GlassPanel>
        </div>
      </div>

      <Dialog open={successOpen} onOpenChange={closeSuccess}>
        <DialogContent className="glass-g2 rounded-block gap-3">
          <DialogHeader>
            <DialogTitle>{t("successTitle")}</DialogTitle>
            <DialogDescription>{t("successBody")}</DialogDescription>
          </DialogHeader>

          {saved ? (
            <dl className="bg-linen/70 rounded-field grid gap-2 border p-3 text-xs">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">{tc("testId")}</dt>
                <dd className="text-ink-900 tabular-nums">{saved.id}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">{tc("fineness")}</dt>
                <dd className="text-ink-900 tabular-nums">
                  {formatNumber(saved.finenessMicron, 1)} {tc("unitMicron")}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">{tc("testDate")}</dt>
                <dd className="text-ink-900 tabular-nums">{formatDate(saved.testedOn)}</dd>
              </div>
            </dl>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button asChild className="rounded-field font-semibold">
              <Link href={`/${locale}/quality/batches/${batch.id}/history`}>
                <History aria-hidden />
                {t("successHistory")}
              </Link>
            </Button>
            {testsForBatch.length > 1 ? (
              <Button asChild variant="outline" className="bg-linen/60 rounded-field">
                <Link href={`/${locale}/quality/batches/${batch.id}/compare`}>
                  <GitCompare aria-hidden />
                  {t("successCompare")}
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" className="bg-linen/60 rounded-field">
              <Link href={`/${locale}/quality/batches/${batch.id}`}>{t("successDetail")}</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="rounded-field"
              onClick={() => {
                setSuccessOpen(false);
                resetForm();
              }}
            >
              {t("successAgain")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
