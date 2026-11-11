"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Leaf } from "lucide-react";

import FormRow from "@/components/domain/shared/form-row";
import GlassPanel from "@/components/domain/shared/glass-panel";
import SupplierStatusBanner from "@/components/domain/supplier/supplier-status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifySupplierCredentials } from "@/lib/mock/auth";
import type { Supplier } from "@/lib/types/domain";
import type { Locale } from "@/lib/i18n/config";

type FieldErrors = { identifier?: string; password?: string };

/**
 * Бүртгэлийн төлөв шалгах — UC-10 E3 / BR-12. A pending or rejected supplier
 * cannot sign in, so this public screen lets them verify their own record
 * with the same username/email + password and see the registration status.
 * Active accounts are pointed back to the sign-in page.
 */
export default function StatusCheck({ locale }: { locale: Locale }) {
  const t = useTranslations("auth.statusCheck");
  const ta = useTranslations("auth");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTopError(null);
    setSupplier(null);

    const next: FieldErrors = {};
    if (!identifier.trim()) next.identifier = ta("error.required");
    if (!password) next.password = ta("error.required");
    setErrors(next);
    if (next.identifier || next.password) return;

    const found = verifySupplierCredentials(identifier, password);
    if (!found) {
      setTopError(ta("error.credentials"));
      return;
    }
    setSupplier(found);
  }

  const statusHint =
    supplier?.status === "active"
      ? t("activeHint")
      : supplier?.status === "rejected"
        ? t("rejectedHint")
        : supplier?.status === "locked"
          ? t("lockedHint")
          : t("pendingHint");

  return (
    <GlassPanel tier="g2" className="w-full max-w-lg p-8 sm:p-10">
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
        <FormRow
          label={t("identifier")}
          htmlFor="status-identifier"
          required
          error={errors.identifier}
        >
          <Input
            id="status-identifier"
            name="identifier"
            autoComplete="username"
            value={identifier}
            onChange={(event) => {
              setIdentifier(event.target.value);
              setSupplier(null);
              setTopError(null);
            }}
            placeholder={t("identifierPlaceholder")}
            className="bg-linen/80 h-11 rounded-field"
          />
        </FormRow>

        <FormRow
          label={t("password")}
          htmlFor="status-password"
          required
          error={errors.password}
        >
          <Input
            id="status-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setSupplier(null);
              setTopError(null);
            }}
            placeholder={t("passwordPlaceholder")}
            className="bg-linen/80 h-11 rounded-field"
          />
        </FormRow>

        {topError ? (
          <p
            role="alert"
            className="border-terracotta-500/40 bg-terracotta-500/10 text-terracotta-700 rounded-field border p-3 text-sm leading-relaxed"
          >
            {topError}
          </p>
        ) : null}

        <Button type="submit" className="h-11 rounded-field font-semibold">
          {t("submit")}
        </Button>
      </form>

      {supplier ? (
        <section className="mt-6 flex flex-col gap-3" aria-live="polite">
          <h2 className="text-forest-900 font-display text-lg font-semibold">
            {t("resultTitle")}
          </h2>
          <p className="text-ink-700 text-sm leading-relaxed">
            {t("account", { name: supplier.name })}
          </p>
          <SupplierStatusBanner status={supplier.status} reason={supplier.rejectReason} />
          <p className="text-ink-700 text-sm leading-relaxed">{statusHint}</p>
          {supplier.status === "active" ? (
            <Button asChild className="rounded-field font-semibold">
              <Link href={`/${locale}/login`}>{t("loginLink")}</Link>
            </Button>
          ) : null}
        </section>
      ) : null}

      <p className="mt-5 text-center">
        <Link
          href={`/${locale}/login`}
          className="text-forest-700 text-sm underline-offset-4 hover:underline"
        >
          {t("back")}
        </Link>
      </p>
    </GlassPanel>
  );
}
