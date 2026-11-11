"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Leaf } from "lucide-react";

import ConfirmDialog from "@/components/domain/shared/confirm-dialog";
import DemoNote from "@/components/domain/shared/demo-note";
import FormRow from "@/components/domain/shared/form-row";
import GeoSelect from "@/components/domain/shared/geo-select";
import GlassPanel from "@/components/domain/shared/glass-panel";
import SupplierStatusBanner from "@/components/domain/supplier/supplier-status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supplierTypes, type Supplier } from "@/lib/types/domain";
import {
  duplicateSupplierExists,
  usernameTaken,
} from "@/lib/mock/suppliers";
import { addRegistration } from "@/lib/mock/registry";
import { getLocaleFromPathname } from "@/lib/i18n/config";

type FieldKey =
  | "name"
  | "type"
  | "phone"
  | "aimag"
  | "soum"
  | "email"
  | "username"
  | "password";

type Values = {
  name: string;
  type: string;
  phone: string;
  aimag: string | null;
  soum: string | null;
  email: string;
  username: string;
  password: string;
};

const EMPTY_VALUES: Values = {
  name: "",
  type: "",
  phone: "",
  aimag: null,
  soum: null,
  email: "",
  username: "",
  password: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * UC-01 — Нийлүүлэгч бүртгэх (self-registration, mock):
 * all PDF fields (нэр, төрөл, утас, аймаг, сум, имэйл, нэвтрэх нэр,
 * нууц үг), then the exception flows E1 (required fields marked,
 * back to the form), E2 (username taken → notify, back to the form) and
 * E3 (same supplier under another record → refuse + contact clerk).
 * A1 «Цуцлах» asks through ConfirmDialog and discards. Step 7 creates a
 * «Баталгаажуулалт хүлээгдэж буй» record (BR-12) shown in the success
 * panel; E4 (storage failure) rolls the registry back and keeps the form.
 */
export default function RegisterForm() {
  const t = useTranslations("supplier.register");
  const tc = useTranslations("common");
  const ta = useTranslations("auth");
  const pathname = usePathname() ?? "/";
  const locale = getLocaleFromPathname(pathname);

  const [values, setValues] = useState<Values>(EMPTY_VALUES);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [summary, setSummary] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [created, setCreated] = useState<Supplier | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setTopError(null);
  };

  function reset() {
    setValues(EMPTY_VALUES);
    setErrors({});
    setSummary(false);
    setTopError(null);
    setCreated(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTopError(null);

    const requiredMessage = tc("errors.required");
    const next: Partial<Record<FieldKey, string>> = {};
    (
      ["name", "phone", "email", "username", "password"] as const
    ).forEach((key) => {
      if (!values[key].trim()) next[key] = requiredMessage;
    });
    if (!values.type) next.type = requiredMessage; // UC-01 E1
    if (!values.aimag) next.aimag = requiredMessage;
    if (!values.soum) next.soum = requiredMessage;

    if (!next.phone && !/^\d{8}$/.test(values.phone.trim())) {
      next.phone = t("error.phone");
    }
    if (!next.email && !EMAIL_RE.test(values.email.trim())) {
      next.email = t("error.email");
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      setSummary(true);
      return;
    }
    setErrors({});
    setSummary(false);

    // UC-01 E2: нэвтрэх нэр бүртгэлтэй → notify used, back to the form.
    if (usernameTaken(values.username.trim())) {
      setErrors({ username: t("error.usernameTaken") });
      setSummary(true);
      return;
    }

    // UC-01 E3: same supplier under another record → refuse + contact clerk.
    if (
      duplicateSupplierExists({
        phone: values.phone.trim(),
        email: values.email.trim(),
      })
    ) {
      setTopError(t("error.duplicateSupplier"));
      return;
    }

    try {
      const record = addRegistration(
        {
          name: values.name.trim(),
          username: values.username.trim(),
          type: values.type as Supplier["type"],
          phone: values.phone.trim(),
          email: values.email.trim(),
          aimag: values.aimag ?? "",
          soum: values.soum ?? "",
          status: "pending", // UC-01 step 7 (BR-12)
          registeredOn: todayIso(),
        },
        values.password,
      );
      setCreated(record);
    } catch {
      // UC-01 E4: storage failure → registry rolled back, keep the form data.
      setTopError(t("error.storage"));
    }
  }

  if (created) {
    return (
      <GlassPanel tier="g2" className="w-full max-w-lg p-8 sm:p-10">
        <header className="mb-5 text-center">
          <span
            aria-hidden
            className="text-ivory-50 bg-forest-700 shadow-soft mx-auto mb-4 grid size-14 place-items-center rounded-full"
          >
            <Leaf className="size-6" />
          </span>
          <h1 className="text-forest-900 font-display text-2xl font-semibold">
            {t("success")}
          </h1>
        </header>

        <SupplierStatusBanner status={created.status} className="mb-4" />

        <p className="text-ink-700 text-sm leading-relaxed">{t("successNote")}</p>
        <DemoNote className="mt-3">{t("successDemo")}</DemoNote>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button asChild className="rounded-field font-semibold">
            <Link href={`/${locale}/status`}>{t("checkStatus")}</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="bg-linen/60 rounded-field"
            onClick={reset}
          >
            {t("close")}
          </Button>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel tier="g2" className="w-full max-w-lg p-6 sm:p-10">
      <header className="mb-6 text-center">
        <span
          aria-hidden
          className="text-ivory-50 bg-forest-700 shadow-soft mx-auto mb-4 grid size-14 place-items-center rounded-full"
        >
          <Leaf className="size-6" />
        </span>
        <h1 className="text-forest-900 font-display text-2xl font-semibold">{t("title")}</h1>
        <p className="text-ink-700 mt-1 text-sm leading-relaxed">{t("subtitle")}</p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {topError ? (
          <p
            role="alert"
            className="border-terracotta-500/40 bg-terracotta-500/10 text-terracotta-700 rounded-field border p-3 text-sm leading-relaxed"
          >
            {topError}
          </p>
        ) : null}
        {summary && !topError ? (
          <p
            role="alert"
            className="border-terracotta-500/40 bg-terracotta-500/10 text-terracotta-700 rounded-field border p-3 text-sm leading-relaxed"
          >
            {t("error.summaryRequired")}
          </p>
        ) : null}

        <FormRow label={t("field.name")} htmlFor="reg-name" required error={errors.name}>
          <Input
            id="reg-name"
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            placeholder={t("placeholder.name")}
            className="bg-linen/80 h-11 rounded-field"
          />
        </FormRow>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label={t("field.type")} htmlFor="reg-type" required error={errors.type}>
            <Select value={values.type} onValueChange={(value) => set("type", value)}>
              <SelectTrigger
                id="reg-type"
                aria-invalid={errors.type ? true : undefined}
                className="bg-linen/80 h-11 w-full rounded-field"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-field">
                {supplierTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`type.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>

          <FormRow label={t("field.phone")} htmlFor="reg-phone" required error={errors.phone}>
            <Input
              id="reg-phone"
              inputMode="numeric"
              autoComplete="tel"
              value={values.phone}
              onChange={(event) => set("phone", event.target.value)}
              placeholder={t("placeholder.phone")}
              className="bg-linen/80 h-11 rounded-field tabular-nums"
            />
          </FormRow>
        </div>

        <GeoSelect
          aimag={values.aimag}
          soum={values.soum}
          onAimagChange={(value) => {
            set("aimag", value);
            set("soum", null); // dependent reset: sums belong to the aimag
          }}
          onSoumChange={(value) => set("soum", value)}
          labels={{
            aimag: t("field.aimag"),
            soum: t("field.soum"),
            aimagPlaceholder: t("aimagPlaceholder"),
            soumPlaceholder: t("soumPlaceholder"),
            soumNone: t("soumNone"),
          }}
          aimagError={errors.aimag}
          soumError={errors.soum}
        />

        <FormRow label={t("field.email")} htmlFor="reg-email" required error={errors.email}>
          <Input
            id="reg-email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => set("email", event.target.value)}
            placeholder={t("placeholder.email")}
            className="bg-linen/80 h-11 rounded-field"
          />
        </FormRow>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label={t("field.username")} htmlFor="reg-username" required error={errors.username}>
            <Input
              id="reg-username"
              autoComplete="username"
              value={values.username}
              onChange={(event) => set("username", event.target.value)}
              placeholder={t("placeholder.username")}
              className="bg-linen/80 h-11 rounded-field"
            />
          </FormRow>
          <FormRow label={t("field.password")} htmlFor="reg-password" required error={errors.password}>
            <Input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              value={values.password}
              onChange={(event) => set("password", event.target.value)}
              placeholder={t("placeholder.password")}
              className="bg-linen/80 h-11 rounded-field"
            />
          </FormRow>
        </div>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="bg-linen/60 rounded-field"
            onClick={() => setCancelOpen(true)}
          >
            {tc("actions.cancel")}
          </Button>
          <Button type="submit" className="rounded-field font-semibold">
            {t("submit")}
          </Button>
        </div>
      </form>

      <p className="text-ink-500 mt-5 text-center text-xs">
        {ta("registerHint")}{" "}
        <Link href={`/${locale}/login`} className="text-forest-700 underline-offset-4 hover:underline">
          {tc("actions.login")}
        </Link>
      </p>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("cancelTitle")}
        description={t("cancelBody")}
        confirmLabel={t("confirmCancel")}
        cancelLabel={t("continue")}
        danger
        onConfirm={reset} // UC-01 A1: no record created
      />
    </GlassPanel>
  );
}

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
