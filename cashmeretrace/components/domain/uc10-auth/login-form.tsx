"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Leaf } from "lucide-react";

import FormRow from "@/components/domain/shared/form-row";
import GlassPanel from "@/components/domain/shared/glass-panel";
import SupplierStatusBanner from "@/components/domain/supplier/supplier-status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/components/providers/session-provider";
import { homeOf } from "@/lib/constants/nav";
import { staffByUsername } from "@/lib/mock/admin";
import { findSupplierByIdentifier } from "@/lib/mock/auth";
import { DEMO_PASSWORD, passwordForSupplier } from "@/lib/mock/credentials";
import type { Supplier, SupplierStatus } from "@/lib/types/domain";
import type { Locale } from "@/lib/i18n/config";

type FieldErrors = { username?: string; password?: string };

/**
 * НэвтрэхХуудас (UC-10, FR-1.2):
 * - username (нэвтрэх нэр эсвэл имэйл) + password with inline required
 *   errors; the account is matched by name first, then its real role is used,
 * - UNVERIFIED ACCOUNTS CANNOT SIGN IN (UC-10 E3 / state machine):
 *   a pending/rejected/locked supplier with correct credentials sees the
 *   status panel instead of a session; active suppliers bind supplierId
 *   (BR-05). Wrong credentials never reveal whether the account exists.
 * The real server-side auth/session (NFR-08/09, BR-11 lock) remains Phase 3.
 */
export default function LoginForm({ locale }: { locale: Locale }) {
  const t = useTranslations("auth");
  const session = useSession();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<Supplier | null>(null);
  const [staffBlocked, setStaffBlocked] = useState<SupplierStatus | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBlocked(null);
    setStaffBlocked(null);
    setTopError(null);

    const enteredPassword = password.trim();
    const next: FieldErrors = {};
    const required = t("error.required");
    if (!username.trim()) next.username = required;
    if (!enteredPassword) next.password = required;
    setErrors(next);
    if (next.username || next.password) return;

    const supplier = findSupplierByIdentifier(username);
    if (supplier) {
      if (passwordForSupplier(supplier.id) !== enteredPassword) {
        setTopError(t("error.credentials"));
        return;
      }
      if (supplier.status !== "active") {
        setBlocked(supplier);
        return;
      }
      session.login({ role: "supplier", supplierId: supplier.id });
      router.replace(`/${locale}${homeOf.supplier}`);
      return;
    }

    const staff = staffByUsername(username);
    if (staff && enteredPassword === DEMO_PASSWORD) {
      if (staff.status !== "active") {
        setStaffBlocked(staff.status);
        return;
      }
      session.login({ role: staff.role });
      router.replace(`/${locale}${homeOf[staff.role]}`);
      return;
    }

    setTopError(t("error.credentials"));
  }

  return (
    <GlassPanel tier="g2" className="w-full max-w-sm p-8 sm:p-10">
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
        <FormRow label={t("username")} htmlFor="username" required error={errors.username}>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setBlocked(null);
              setStaffBlocked(null);
              setTopError(null);
            }}
            placeholder={t("usernamePlaceholder")}
            className="bg-linen/80 h-11 rounded-field"
          />
        </FormRow>

        <FormRow label={t("password")} htmlFor="password" required error={errors.password}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setBlocked(null);
              setStaffBlocked(null);
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

      {staffBlocked && staffBlocked !== "active" ? (
        <div className="mt-5 flex flex-col gap-2">
          <p role="alert" className="text-terracotta-700 text-sm font-semibold">
            {t("blocked.title")}
          </p>
          <p className="text-ink-700 text-sm leading-relaxed">
            {t(`blocked.${staffBlocked}Body`)}
          </p>
        </div>
      ) : null}

      {blocked ? (
        <div className="mt-5 flex flex-col gap-2">
          <p role="alert" className="text-terracotta-700 text-sm font-semibold">
            {t("blocked.title")}
          </p>
          <p className="text-ink-700 text-sm leading-relaxed">{t("blocked.hint")}</p>
          <SupplierStatusBanner status={blocked.status} reason={blocked.rejectReason} />
        </div>
      ) : null}

      <p className="text-center mt-6">
        <Link
          href={`/${locale}/register`}
          className="text-forest-700 text-sm underline-offset-4 hover:underline"
        >
          {t("registerLink")}
        </Link>
      </p>

      <p className="text-center mt-2">
        <Link
          href={`/${locale}/status`}
          className="text-forest-700 text-sm underline-offset-4 hover:underline"
        >
          {t("checkStatusLink")}
        </Link>
      </p>

      <p className="text-ink-500 mt-4 text-center text-xs leading-relaxed">{t("mock.accounts")}</p>
    </GlassPanel>
  );
}
