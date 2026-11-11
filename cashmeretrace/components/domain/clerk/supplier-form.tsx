"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import ConfirmDialog from "@/components/domain/shared/confirm-dialog";
import DemoNote from "@/components/domain/shared/demo-note";
import FormRow from "@/components/domain/shared/form-row";
import GeoSelect from "@/components/domain/shared/geo-select";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import StatusBadge from "@/components/domain/shared/status-badge";
import { ClerkPageSkeleton, RecordNotFound } from "@/components/domain/clerk/clerk-ui";
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
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import {
  createSupplier,
  duplicateSupplierExists,
  updateSupplier,
  useSuppliers,
  usernameTaken,
} from "@/lib/mock/suppliers";
import type { Supplier, SupplierType } from "@/lib/types/domain";
import { supplierTypes } from "@/lib/types/domain";

type Values = {
  name: string;
  type: SupplierType | "";
  phone: string;
  email: string;
  username: string;
  aimag: string | null;
  soum: string | null;
  notes: string;
};

type FieldKey = "name" | "type" | "phone" | "email" | "username" | "aimag" | "soum";
type FieldErrors = Partial<Record<FieldKey, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\d{8}$/;

function valuesFrom(supplier: Supplier | null): Values {
  return {
    name: supplier?.name ?? "",
    type: supplier?.type ?? "",
    phone: supplier?.phone ?? "",
    email: supplier?.email ?? "",
    username: supplier?.username ?? "",
    aimag: supplier?.aimag ?? null,
    soum: supplier?.soum ?? null,
    notes: supplier?.notes ?? "",
  };
}

/**
 * UC-04 / FR-2.2, FR-2.6 — clerk create/edit supplier. The clerk enters the
 * permitted registry fields; status is displayed read-only (admin-only) and
 * duplicate username/phone/email checks run before the storage write.
 */
export default function SupplierForm({ supplierId }: { supplierId?: string }) {
  const t = useTranslations("clerk.supplier");
  const hydrated = useHydrated();
  const locale = useCurrentLocale();
  const suppliers = useSuppliers();
  const supplier = supplierId
    ? suppliers.find((entry) => entry.id === supplierId) ?? null
    : null;

  if (!hydrated) return <ClerkPageSkeleton />;

  if (supplierId && !supplier) {
    return (
      <RecordNotFound
        title={t("notFound")}
        description={t("notFoundHint")}
        backHref={`/${locale}/clerk/suppliers`}
        backLabel={t("backToList")}
      />
    );
  }

  return <SupplierFormFields supplier={supplier} />;
}

function SupplierFormFields({ supplier }: { supplier: Supplier | null }) {
  const t = useTranslations("clerk.supplier");
  const tc = useTranslations("clerk.common");
  const tg = useTranslations("common");
  const ts = useTranslations("status");
  const locale = useCurrentLocale();
  const router = useRouter();

  const isEdit = Boolean(supplier);
  const [values, setValues] = useState<Values>(() => valuesFrom(supplier));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [summary, setSummary] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [saved, setSaved] = useState<Supplier | null>(supplier);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setTopError(null);
  };

  function reset() {
    setValues(valuesFrom(null));
    setErrors({});
    setSummary(false);
    setTopError(null);
  }

  function markConflict(error: unknown) {
    if (error instanceof Error && error.message === "USERNAME_TAKEN") {
      setErrors({ username: t("error.usernameTaken") });
      setSummary(true);
      return;
    }
    if (error instanceof Error && error.message === "DUPLICATE_SUPPLIER") {
      setErrors({
        phone: t("error.duplicateSupplier"),
        email: t("error.duplicateSupplier"),
      });
      setSummary(true);
      return;
    }
    setTopError(t("error.storage"));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const required = tg("errors.required");
    const next: FieldErrors = {};
    if (!values.name.trim()) next.name = required;
    if (!values.type) next.type = required;
    if (!values.phone.trim()) next.phone = required;
    if (!values.email.trim()) next.email = required;
    if (!values.username.trim()) next.username = required;
    if (!values.aimag) next.aimag = required;
    if (!values.soum) next.soum = required;

    if (!next.phone && !PHONE_PATTERN.test(values.phone.trim())) {
      next.phone = t("error.phone");
    }
    if (!next.email && !EMAIL_PATTERN.test(values.email.trim())) {
      next.email = t("error.email");
    }
    if (!next.username) {
      if (usernameTaken(values.username, supplier?.id)) {
        next.username = t("error.usernameTaken");
      }
    }
    if (!next.phone && !next.email) {
      if (
        duplicateSupplierExists(
          { phone: values.phone.trim(), email: values.email.trim() },
          supplier?.id,
        )
      ) {
        next.phone = t("error.duplicateSupplier");
        next.email = t("error.duplicateSupplier");
      }
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      setSummary(true);
      return;
    }
    setErrors({});
    setSummary(false);

    const payload = {
      name: values.name.trim(),
      type: values.type as SupplierType,
      phone: values.phone.trim(),
      email: values.email.trim(),
      username: values.username.trim(),
      aimag: values.aimag ?? "",
      soum: values.soum ?? "",
      notes: values.notes.trim() || undefined,
    };

    try {
      const result = supplier
        ? updateSupplier(supplier.id, payload)
        : createSupplier(payload);
      setSaved(result);
      setSuccessOpen(true);
    } catch (error) {
      markConflict(error);
    }
  }

  const backHref = supplier
    ? `/${locale}/clerk/suppliers/${supplier.id}`
    : `/${locale}/clerk/suppliers`;

  return (
    <>
      <PageHeader
        title={isEdit ? t("editTitle") : t("createTitle")}
        description={isEdit ? t("editSubtitle") : t("createSubtitle")}
        actions={
          <Button asChild variant="outline" className="bg-linen/60 rounded-field">
            <Link href={backHref}>{t("backToList")}</Link>
          </Button>
        }
      />

      {supplier ? (
        <div className="border-brown-500/15 bg-ivory-50/60 rounded-field mb-4 flex flex-wrap items-center gap-3 border p-3">
          <span className="text-ink-500 text-xs font-medium tracking-wide uppercase">
            {t("field.status")}
          </span>
          <StatusBadge
            status={`supplier-${supplier.status}`}
            label={ts(`supplier.${supplier.status}`)}
          />
          <span className="text-ink-500 text-xs">{t("readOnlyStatus")}</span>
          <span className="text-ink-500 ml-auto text-xs">
            {t("field.registeredOn")}: <span className="tabular-nums">{supplier.registeredOn}</span>
          </span>
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
                {t("sectionInfo")}
              </h2>
            </header>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormRow label={t("field.name")} htmlFor="supplier-name" required error={errors.name}>
                <Input
                  id="supplier-name"
                  value={values.name}
                  onChange={(event) => set("name", event.target.value)}
                  placeholder={t("placeholder.name")}
                  className="bg-linen/80 h-11 rounded-field"
                />
              </FormRow>

              <FormRow label={t("field.type")} htmlFor="supplier-type" required error={errors.type}>
                <Select
                  value={values.type}
                  onValueChange={(value) => set("type", value as SupplierType)}
                >
                  <SelectTrigger
                    id="supplier-type"
                    aria-invalid={errors.type ? true : undefined}
                    className="bg-linen/80 h-11 w-full rounded-field"
                  >
                    <SelectValue placeholder={tc("selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {supplierTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`type.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>

              <FormRow
                label={t("field.username")}
                htmlFor="supplier-username"
                required
                hint={t("hint.username")}
                error={errors.username}
              >
                <Input
                  id="supplier-username"
                  value={values.username}
                  onChange={(event) => set("username", event.target.value)}
                  placeholder={t("placeholder.username")}
                  className="bg-linen/80 h-11 rounded-field"
                />
              </FormRow>
            </div>
          </section>

          <section className="border-brown-500/15 flex flex-col gap-4 border-t pt-6">
            <header>
              <h2 className="text-forest-900 font-display text-base font-semibold">
                {t("sectionContact")}
              </h2>
            </header>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormRow
                label={t("field.phone")}
                htmlFor="supplier-phone"
                required
                hint={t("hint.phone")}
                error={errors.phone}
              >
                <Input
                  id="supplier-phone"
                  type="tel"
                  inputMode="numeric"
                  value={values.phone}
                  onChange={(event) => set("phone", event.target.value)}
                  placeholder={t("placeholder.phone")}
                  className="bg-linen/80 h-11 rounded-field tabular-nums"
                />
              </FormRow>

              <FormRow label={t("field.email")} htmlFor="supplier-email" required error={errors.email}>
                <Input
                  id="supplier-email"
                  type="email"
                  value={values.email}
                  onChange={(event) => set("email", event.target.value)}
                  placeholder={t("placeholder.email")}
                  className="bg-linen/80 h-11 rounded-field"
                />
              </FormRow>
            </div>
          </section>

          <section className="border-brown-500/15 flex flex-col gap-4 border-t pt-6">
            <header>
              <h2 className="text-forest-900 font-display text-base font-semibold">
                {t("sectionOrigin")}
              </h2>
            </header>

            <GeoSelect
              aimag={values.aimag}
              soum={values.soum}
              onAimagChange={(value) => {
                set("aimag", value);
                set("soum", null);
              }}
              onSoumChange={(value) => set("soum", value)}
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

            <FormRow
              label={t("field.notes")}
              htmlFor="supplier-notes"
              hint={t("hint.notes")}
            >
              <textarea
                id="supplier-notes"
                value={values.notes}
                onChange={(event) => set("notes", event.target.value)}
                placeholder={t("placeholder.notes")}
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
            <Button type="submit" className="rounded-field font-semibold">
              {isEdit ? t("submitEdit") : t("submitCreate")}
            </Button>
          </div>
        </form>
      </GlassPanel>

      <DemoNote className="mt-4">{tc("demoNote")}</DemoNote>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={tc("cancelTitle")}
        description={tc("cancelBody")}
        confirmLabel={tc("confirmCancel")}
        cancelLabel={tc("continueEditing")}
        danger
        onConfirm={() => {
          setCancelOpen(false);
          router.push(backHref);
        }}
      />

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="glass-g2 rounded-block gap-3" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-forest-900 font-display text-lg font-semibold">
              {isEdit ? t("successEditTitle") : t("successCreateTitle")}
            </DialogTitle>
            <DialogDescription className="text-ink-700 leading-relaxed">
              {isEdit ? t("successEditBody") : t("successCreateBody")}
            </DialogDescription>
          </DialogHeader>

          {saved ? (
            <div className="border-brown-500/15 bg-ivory-50/60 rounded-field border p-3">
              <p className="text-ink-900 text-sm font-medium">{saved.name}</p>
              <p className="text-ink-500 tabular-nums text-xs">
                {saved.id} · {saved.aimag} · {saved.soum}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
            {!isEdit ? (
              <Button
                type="button"
                variant="outline"
                className="bg-linen/60 rounded-field"
                onClick={() => {
                  reset();
                  setSaved(null);
                  setSuccessOpen(false);
                }}
              >
                {t("successNext")}
              </Button>
            ) : null}
            <Button asChild variant="outline" className="bg-linen/60 rounded-field">
              <Link href={`/${locale}/clerk/suppliers`}>{t("backToList")}</Link>
            </Button>
            {saved ? (
              <Button asChild className="rounded-field font-semibold">
                <Link href={`/${locale}/clerk/suppliers/${saved.id}`}>
                  {t("viewDetail")}
                </Link>
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
