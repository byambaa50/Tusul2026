"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, RefreshCw, Search } from "lucide-react";

import ConfirmDialog from "@/components/domain/shared/confirm-dialog";
import DemoNote from "@/components/domain/shared/demo-note";
import EmptyState from "@/components/domain/shared/empty-state";
import FormRow from "@/components/domain/shared/form-row";
import GeoSelect from "@/components/domain/shared/geo-select";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import { ClerkPageSkeleton, DetailItem, RecordNotFound } from "@/components/domain/clerk/clerk-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatNumber } from "@/lib/format/mn";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import {
  createBatch,
  DuplicateBatchError,
  generateBatchNumber,
  updateBatch,
  useBatches,
} from "@/lib/mock/batches";
import { useSuppliers } from "@/lib/mock/suppliers";
import { useSupplies } from "@/lib/mock/supplies";
import type { Batch } from "@/lib/types/domain";

type Mode = "create" | "edit";

type Values = {
  supplierId: string;
  supplyId: string;
  amount: string;
  date: string;
  aimag: string | null;
  soum: string | null;
  livestock: string;
  notes: string;
};

type FieldKey = "supplier" | "amount" | "date" | "aimag" | "soum" | "livestock";
type FieldErrors = Partial<Record<FieldKey, string>>;

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function valuesFrom(batch: Batch | null, initialSupplierId?: string): Values {
  return {
    supplierId: batch?.supplierId ?? initialSupplierId ?? "",
    supplyId: batch?.supplyId ?? "",
    amount: batch ? String(batch.amountKg) : "",
    date: batch?.registeredOn ?? todayIso(),
    aimag: batch?.aimag ?? null,
    soum: batch?.soum ?? null,
    livestock: batch?.livestockCount ? String(batch.livestockCount) : "",
    notes: batch?.notes ?? "",
  };
}

/**
 * UC-05 / FR-2.4–2.6 — one form for both registration and editing.
 * Create mode previews the generated MN-YYYY-000001 number and continuously
 * validates uniqueness (BR-01); edit mode keeps the number immutable and
 * shows the supplier as read-only.
 */
export default function BatchForm({
  mode,
  batchId,
  initialSupplierId,
}: {
  mode: Mode;
  batchId?: string;
  initialSupplierId?: string;
}) {
  const t = useTranslations("clerk.batch");
  const hydrated = useHydrated();
  const locale = useCurrentLocale();
  const batches = useBatches();
  const suppliers = useSuppliers();
  const batch = batchId ? batches.find((entry) => entry.id === batchId) ?? null : null;
  // A query-string supplier prefill is honoured only for active suppliers:
  // pending/rejected/locked records cannot receive new batches.
  const activeInitialSupplierId =
    initialSupplierId &&
    suppliers.some(
      (supplier) => supplier.id === initialSupplierId && supplier.status === "active",
    )
      ? initialSupplierId
      : undefined;

  if (!hydrated) return <ClerkPageSkeleton />;

  if (mode === "edit" && !batch) {
    return (
      <RecordNotFound
        title={t("notFound")}
        description={t("notFoundHint")}
        backHref={`/${locale}/clerk/batches`}
        backLabel={t("backToBatches")}
      />
    );
  }

  return (
    <BatchFormFields
      mode={mode}
      batch={batch}
      initialSupplierId={activeInitialSupplierId}
    />
  );
}

function BatchFormFields({
  mode,
  batch,
  initialSupplierId,
}: {
  mode: Mode;
  batch: Batch | null;
  initialSupplierId?: string;
}) {
  const t = useTranslations("clerk.batch");
  const tc = useTranslations("clerk.common");
  const tg = useTranslations("common");
  const ts = useTranslations("status");
  const locale = useCurrentLocale();
  const router = useRouter();
  const isEdit = mode === "edit";

  const suppliers = useSuppliers();
  const batches = useBatches();
  const [values, setValues] = useState<Values>(() => valuesFrom(batch, initialSupplierId));
  const [number, setNumber] = useState(() => batch?.id ?? generateBatchNumber());
  const [numberError, setNumberError] = useState<string | null>(null);
  const [supplierQuery, setSupplierQuery] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [summary, setSummary] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [saved, setSaved] = useState<Batch | null>(batch);

  const supplies = useSupplies(values.supplierId || null);

  const activeSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.status === "active"),
    [suppliers],
  );

  const supplierOptions = useMemo(() => {
    const needle = supplierQuery.trim().toLowerCase();
    const filtered = activeSuppliers.filter((supplier) => {
      if (!needle) return true;
      return [supplier.id, supplier.name, supplier.aimag, supplier.soum, supplier.phone]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
    const selected = activeSuppliers.find((supplier) => supplier.id === values.supplierId);
    if (selected && !filtered.some((supplier) => supplier.id === selected.id)) {
      return [selected, ...filtered];
    }
    return filtered;
  }, [activeSuppliers, supplierQuery, values.supplierId]);

  const selectedSupplier =
    suppliers.find((supplier) => supplier.id === values.supplierId) ?? null;

  const numberExists = useMemo(
    () =>
      mode === "create" &&
      batches.some((entry) => entry.id.trim().toUpperCase() === number.trim().toUpperCase()),
    [mode, number, batches],
  );

  function clearError(key: FieldKey) {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function setValue<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setTopError(null);
    if (key === "amount" || key === "date" || key === "aimag" || key === "soum" || key === "livestock") {
      clearError(key);
    }
  }

  function handleSupplierChange(supplierId: string) {
    const supplier = activeSuppliers.find((entry) => entry.id === supplierId) ?? null;
    setValues((prev) => ({
      ...prev,
      supplierId,
      supplyId: "",
      aimag: supplier?.aimag ?? prev.aimag,
      soum: supplier?.soum ?? prev.soum,
    }));
    clearError("supplier");
    setTopError(null);
  }

  function handleSupplyChange(supplyId: string) {
    if (supplyId === "none") {
      setValues((prev) => ({ ...prev, supplyId: "" }));
      return;
    }
    const supply = supplies.find((entry) => entry.id === supplyId);
    if (!supply) return;
    setValues((prev) => ({
      ...prev,
      supplyId,
      amount: String(supply.amountKg),
      aimag: supply.aimag,
      soum: supply.soum,
      livestock: String(supply.livestockCount),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.amount;
      delete next.aimag;
      delete next.soum;
      delete next.livestock;
      return next;
    });
    setTopError(null);
  }

  function regenerateNumber() {
    setNumber(generateBatchNumber());
    setNumberError(null);
    setTopError(null);
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!values.supplierId) next.supplier = t("error.supplier");
    if (!values.amount.trim() || !(Number(values.amount) > 0)) {
      next.amount = t("error.amount");
    }
    if (!values.date) {
      next.date = t("error.date");
    } else if (values.date > todayIso()) {
      next.date = t("error.dateFuture");
    }
    if (!values.aimag) next.aimag = t("error.aimag");
    if (!values.soum) next.soum = t("error.soum");
    if (values.livestock.trim()) {
      const livestock = Number(values.livestock);
      if (!Number.isInteger(livestock) || livestock <= 0) {
        next.livestock = t("error.livestock");
      }
    }
    return next;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === "create" && numberExists) {
      setNumberError(t("numberDuplicate"));
      return;
    }

    const next = validate();
    if (Object.keys(next).length > 0) {
      setErrors(next);
      setSummary(true);
      return;
    }
    setErrors({});
    setSummary(false);
    setTopError(null);

    const supplier = suppliers.find((entry) => entry.id === values.supplierId) ?? null;
    if (!supplier || (!isEdit && supplier.status !== "active")) {
      setErrors({ supplier: t("error.supplierMissing") });
      setSummary(true);
      return;
    }

    const amountKg = Number(values.amount);
    const livestockCount = values.livestock.trim() ? Number(values.livestock) : undefined;

    try {
      if (mode === "create") {
        const created = createBatch({
          id: number,
          supplierId: values.supplierId,
          amountKg,
          aimag: values.aimag ?? supplier.aimag,
          soum: values.soum ?? supplier.soum,
          livestockCount,
          registeredOn: values.date,
          supplyId: values.supplyId || undefined,
          notes: values.notes.trim() || undefined,
        });
        setSaved(created);
        setSuccessOpen(true);
      } else if (batch) {
        const updated = updateBatch(batch.id, {
          supplierId: batch.supplierId,
          amountKg,
          aimag: values.aimag ?? batch.aimag,
          soum: values.soum ?? batch.soum,
          livestockCount,
          registeredOn: values.date,
          supplyId: values.supplyId || undefined,
          notes: values.notes.trim() || undefined,
        });
        setSaved(updated);
        setSuccessOpen(true);
      }
    } catch (error) {
      if (error instanceof DuplicateBatchError) {
        setNumberError(t("numberDuplicate"));
        return;
      }
      if (error instanceof Error && error.message === "SUPPLIER_NOT_FOUND") {
        setErrors({ supplier: t("error.supplierMissing") });
        setSummary(true);
        return;
      }
      setTopError(t("error.storage"));
    }
  }

  function resetForAnother() {
    setValues({
      supplierId: "",
      supplyId: "",
      amount: "",
      date: todayIso(),
      aimag: null,
      soum: null,
      livestock: "",
      notes: "",
    });
    setNumber(generateBatchNumber());
    setNumberError(null);
    setErrors({});
    setSummary(false);
    setTopError(null);
    setSaved(null);
    setSupplierQuery("");
    setSuccessOpen(false);
  }

  const cancelHref = isEdit
    ? `/${locale}/clerk/batches/${batch?.id ?? ""}`
    : initialSupplierId
      ? `/${locale}/clerk/suppliers/${initialSupplierId}`
      : `/${locale}/clerk/batches`;
  const backHref = isEdit
    ? `/${locale}/clerk/batches/${batch?.id ?? ""}`
    : `/${locale}/clerk/batches`;

  return (
    <>
      <PageHeader
        title={isEdit ? t("editTitle") : t("registerTitle")}
        description={isEdit ? t("editSubtitle") : t("registerSubtitle")}
        actions={
          <Button asChild variant="outline" className="bg-linen/60 rounded-field">
            <Link href={backHref}>{isEdit ? t("backToBatches") : tc("backToList")}</Link>
          </Button>
        }
      />

      {values.supplierId && selectedSupplier ? (
        <div className="border-brown-500/15 bg-ivory-50/60 rounded-field mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 border p-3 text-xs">
          <span className="text-ink-500 uppercase">{t("field.supplier")}</span>
          <span className="text-ink-900 font-medium">{selectedSupplier.name}</span>
          <span className="text-ink-500 tabular-nums">{selectedSupplier.id}</span>
          <span className="text-ink-500">
            {selectedSupplier.aimag} · {selectedSupplier.soum}
          </span>
          {isEdit ? <span className="text-ink-500 ml-auto">{t("editSubtitle")}</span> : null}
        </div>
      ) : null}

      <GlassPanel tier="g2" className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          {summary ? (
            <p
              role="alert"
              className="border-terracotta-500/40 bg-terracotta-500/10 text-terracotta-700 rounded-field border p-3 text-sm leading-relaxed"
            >
              {t("error.summary")}
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

          <section className="flex flex-col gap-4">
            <header>
              <h2 className="text-forest-900 font-display text-base font-semibold">
                {t("sectionSupplier")}
              </h2>
              <p className="text-ink-500 mt-1 text-xs">{t("sectionSupplierHint")}</p>
            </header>

            {isEdit && batch ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailItem label={t("field.supplier")}>
                  <Link
                    href={`/${locale}/clerk/suppliers/${batch.supplierId}`}
                    className="text-forest-800 underline-offset-4 hover:underline"
                  >
                    {selectedSupplier?.name ?? batch.supplierId}
                  </Link>
                </DetailItem>
                <DetailItem label={t("field.supply")}>
                  {batch.supplyId ?? t("noSupply")}
                </DetailItem>
              </div>
            ) : activeSuppliers.length === 0 ? (
              <div className="flex flex-col gap-3">
                <EmptyState
                  title={t("noSupplier")}
                  description={t("noSupplierHint")}
                  className="px-4 py-8"
                />
                <Button asChild className="rounded-field self-start font-semibold">
                  <Link href={`/${locale}/clerk/suppliers/new`}>{t("newSupplierLink")}</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search
                    aria-hidden
                    className="text-ink-500 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                  />
                  <Input
                    value={supplierQuery}
                    onChange={(event) => setSupplierQuery(event.target.value)}
                    placeholder={t("supplierSearch")}
                    aria-label={t("supplierSearch")}
                    className="bg-linen/80 rounded-field h-11 pr-3 pl-9"
                  />
                </div>

                <FormRow
                  label={t("field.supplier")}
                  htmlFor="batch-supplier"
                  required
                  error={errors.supplier}
                >
                  <Select
                    value={values.supplierId || undefined}
                    onValueChange={handleSupplierChange}
                  >
                    <SelectTrigger
                      id="batch-supplier"
                      aria-invalid={errors.supplier ? true : undefined}
                      className="bg-linen/80 rounded-field h-11 w-full"
                    >
                      <SelectValue placeholder={tc("selectPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {supplierOptions.length === 0 ? (
                        <div className="text-ink-500 px-2 py-3 text-xs">{tc("noResults")}</div>
                      ) : (
                        supplierOptions.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name} · {supplier.id} · {supplier.aimag}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </FormRow>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-ink-500 text-xs">{t("sectionSupplierHint")}</p>
                  <Button asChild variant="link" size="sm" className="h-auto p-0">
                    <Link href={`/${locale}/clerk/suppliers/new`}>{t("newSupplierLink")}</Link>
                  </Button>
                </div>

                <FormRow
                  label={t("field.supply")}
                  htmlFor="batch-supply"
                  hint={t("supplyHint")}
                >
                  <Select
                    value={values.supplyId || "none"}
                    onValueChange={handleSupplyChange}
                    disabled={!values.supplierId}
                  >
                    <SelectTrigger
                      id="batch-supply"
                      className="bg-linen/80 rounded-field h-11 w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="none">{t("noSupply")}</SelectItem>
                      {supplies.map((supply) => (
                        <SelectItem key={supply.id} value={supply.id}>
                          {supply.id} · {formatDate(supply.dateIso)} ·{" "}
                          {formatNumber(supply.amountKg, 1)} {t("field.amountUnit")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormRow>
              </div>
            )}
          </section>

          <section className="border-brown-500/15 flex flex-col gap-4 border-t pt-6">
            <header>
              <h2 className="text-forest-900 font-display text-base font-semibold">
                {t("sectionDetails")}
              </h2>
              <p className="text-ink-500 mt-1 text-xs">{t("sectionDetailsHint")}</p>
            </header>

            <div
              className={
                numberExists || numberError
                  ? "border-terracotta-500/40 bg-terracotta-500/10 rounded-field border p-4"
                  : "border-olive-500/25 bg-sage-100/60 rounded-field border p-4"
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-ink-500 text-[11px] font-medium tracking-wide uppercase">
                    {t("numberTitle")}
                  </p>
                  <p className="text-forest-900 font-display mt-1 text-xl font-semibold tabular-nums">
                    {number}
                  </p>
                  <p className="text-ink-500 mt-1 text-xs">{t("numberHint")}</p>
                </div>
                {isEdit ? (
                  <span className="border-brown-500/25 text-ink-600 rounded-full border px-2.5 py-1 text-[11px]">
                    {t("updatedOn")}: {batch?.updatedOn ? formatDate(batch.updatedOn) : "—"}
                  </span>
                ) : null}
              </div>

              {mode === "create" ? (
                numberExists || numberError ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <AlertTriangle aria-hidden className="text-terracotta-600 size-4" />
                    <p className="text-terracotta-700 text-xs">
                      {numberError ?? t("numberDuplicate")}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-linen/60 rounded-field ml-auto"
                      onClick={regenerateNumber}
                    >
                      <RefreshCw aria-hidden />
                      {t("regenerate")}
                    </Button>
                  </div>
                ) : (
                  <p className="text-forest-800 mt-3 flex items-center gap-2 text-xs">
                    <CheckCircle2 aria-hidden className="text-olive-600 size-4" />
                    {t("numberUnique")}
                  </p>
                )
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormRow
                label={t("field.amount")}
                htmlFor="batch-amount"
                required
                error={errors.amount}
              >
                <div className="relative">
                  <Input
                    id="batch-amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    value={values.amount}
                    onChange={(event) => setValue("amount", event.target.value)}
                    aria-invalid={errors.amount ? true : undefined}
                    className="bg-linen/80 rounded-field h-11 pr-12 tabular-nums"
                  />
                  <span className="text-ink-500 pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs">
                    {t("field.amountUnit")}
                  </span>
                </div>
              </FormRow>

              <FormRow
                label={t("field.date")}
                htmlFor="batch-date"
                required
                error={errors.date}
              >
                <Input
                  id="batch-date"
                  type="date"
                  value={values.date}
                  max={todayIso()}
                  onChange={(event) => setValue("date", event.target.value)}
                  aria-invalid={errors.date ? true : undefined}
                  className="bg-linen/80 rounded-field h-11 tabular-nums"
                />
              </FormRow>
            </div>
          </section>

          <section className="border-brown-500/15 flex flex-col gap-4 border-t pt-6">
            <header>
              <h2 className="text-forest-900 font-display text-base font-semibold">
                {t("sectionOrigin")}
              </h2>
              <p className="text-ink-500 mt-1 text-xs">{t("sectionOriginHint")}</p>
            </header>

            <GeoSelect
              aimag={values.aimag}
              soum={values.soum}
              onAimagChange={(value) => {
                setValue("aimag", value);
                setValue("soum", null);
              }}
              onSoumChange={(value) => setValue("soum", value)}
              labels={{
                aimag: t("field.aimag"),
                soum: t("field.soum"),
                aimagPlaceholder: tc("selectPlaceholder"),
                soumPlaceholder: tc("selectPlaceholder"),
                soumNone: tc("selectPlaceholder"),
              }}
              aimagError={errors.aimag}
              soumError={errors.soum}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormRow
                label={t("field.livestock")}
                htmlFor="batch-livestock"
                hint={tc("optional")}
                error={errors.livestock}
              >
                <Input
                  id="batch-livestock"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={values.livestock}
                  onChange={(event) => setValue("livestock", event.target.value)}
                  aria-invalid={errors.livestock ? true : undefined}
                  className="bg-linen/80 rounded-field h-11 tabular-nums"
                />
              </FormRow>
            </div>

            <FormRow label={t("field.notes")} htmlFor="batch-notes" hint={tc("optional")}>
              <textarea
                id="batch-notes"
                value={values.notes}
                onChange={(event) => setValue("notes", event.target.value)}
                rows={3}
                className="border-input bg-linen/80 rounded-field focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-y border px-3 py-2 text-sm outline-none focus-visible:ring-3"
              />
            </FormRow>
          </section>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="bg-linen/60 rounded-field"
              onClick={() => setCancelOpen(true)}
            >
              {tg("actions.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={mode === "create" && numberExists}
              className="rounded-field font-semibold"
            >
              {isEdit ? t("submitEdit") : t("submitCreate")}
            </Button>
          </div>
        </form>
      </GlassPanel>

      <DemoNote className="mt-4">{tc("demoNote")}</DemoNote>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("cancelTitle")}
        description={t("cancelBody")}
        confirmLabel={tc("confirmCancel")}
        cancelLabel={tc("continueEditing")}
        danger
        onConfirm={() => router.push(cancelHref)}
      />

      <Dialog
        open={successOpen}
        onOpenChange={(open) => {
          // Dismissing the success dialog after a create starts a fresh form,
          // otherwise the just-saved number would flag as a duplicate.
          if (!open && mode === "create" && saved) {
            resetForAnother();
            return;
          }
          setSuccessOpen(open);
        }}
      >
        <DialogContent className="glass-g2 rounded-block gap-3" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-forest-900 font-display text-lg font-semibold">
              {isEdit ? t("successEditTitle") : t("successTitle")}
            </DialogTitle>
            <DialogDescription className="text-ink-700 leading-relaxed">
              {isEdit ? t("successEditBody") : t("successBody")}
            </DialogDescription>
          </DialogHeader>

          {saved ? (
            <div className="border-brown-500/15 bg-ivory-50/60 rounded-field border p-3">
              <p className="text-forest-800 font-display text-base font-semibold tabular-nums">
                {saved.id}
              </p>
              <p className="text-ink-500 mt-1 text-xs">
                {suppliers.find((supplier) => supplier.id === saved.supplierId)?.name ??
                  saved.supplierId}{" "}
                · {saved.aimag} · {saved.soum}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-ink-500 text-xs">{t("field.amount")}:</span>
                <span className="text-ink-900 text-xs tabular-nums">
                  {formatNumber(saved.amountKg, 1)} {t("field.amountUnit")}
                </span>
                <span className="text-ink-500 text-xs">{t("field.status")}:</span>
                <span className="text-ink-900 text-xs">{ts(`batch.${saved.status}`)}</span>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
            {!isEdit ? (
              <Button
                type="button"
                variant="outline"
                className="bg-linen/60 rounded-field"
                onClick={resetForAnother}
              >
                {t("successAgain")}
              </Button>
            ) : null}
            {saved ? (
              <>
                <Button asChild variant="outline" className="bg-linen/60 rounded-field">
                  <Link href={`/${locale}/clerk/batches/${saved.id}`}>{t("successView")}</Link>
                </Button>
                <Button asChild className="rounded-field font-semibold">
                  <Link href={`/${locale}/clerk/batches/${saved.id}/qr`}>{t("successQr")}</Link>
                </Button>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
