"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import DemoNote from "@/components/domain/shared/demo-note";
import FormRow from "@/components/domain/shared/form-row";
import GeoSelect from "@/components/domain/shared/geo-select";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import { AccountStatusBadge, AdminOnlyNote, AdminPageSkeleton } from "@/components/domain/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { roles } from "@/lib/constants/nav";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import {
  createStaffUser,
  createSupplierAccount,
  type StaffRole,
} from "@/lib/mock/admin";
import { supplierTypes, type SupplierType } from "@/lib/types/domain";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\d{8}$/;
const USERNAME_PATTERN = /^[a-z0-9.]{3,}$/i;

type FieldKey = "name" | "username" | "email" | "phone" | "role" | "type" | "aimag" | "soum";
type FieldErrors = Partial<Record<FieldKey, string>>;

export default function AdminUserForm() {
  const hydrated = useHydrated();
  if (!hydrated) return <AdminPageSkeleton />;
  return <AdminUserFormContent />;
}

function AdminUserFormContent() {
  const t = useTranslations("admin.form");
  const tc = useTranslations("admin.common");
  const tr = useTranslations("nav.roles");
  const tt = useTranslations("management.supplierTypes");
  const locale = useCurrentLocale();
  const router = useRouter();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<(typeof roles)[number]>("clerk");
  const [status, setStatus] = useState<"active" | "pending">("active");
  const [type, setType] = useState<SupplierType | "">("");
  const [aimag, setAimag] = useState<string | null>(null);
  const [soum, setSoum] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const supplierRole = role === "supplier";

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next: FieldErrors = {};
    if (!name.trim()) next.name = t("errorRequired");
    if (!USERNAME_PATTERN.test(username.trim())) next.username = t("errorUsername");
    if (!EMAIL_PATTERN.test(email.trim())) next.email = t("errorEmail");
    if (!PHONE_PATTERN.test(phone.trim())) next.phone = t("errorPhone");
    if (!aimag) next.aimag = t("errorRequired");
    if (!soum) next.soum = t("errorRequired");
    if (supplierRole && !type) next.type = t("errorRequired");
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0 || !aimag || !soum) return;

    try {
      if (supplierRole) {
        const created = createSupplierAccount({
          name,
          username,
          email,
          phone,
          type: type as SupplierType,
          aimag,
          soum,
        });
        router.push(`/${locale}/admin/users/${created.id}`);
        return;
      }
      const created = createStaffUser({
        name,
        username,
        email,
        phone,
        role: role as StaffRole,
        status,
        aimag,
        soum,
      });
      router.push(`/${locale}/admin/users/${created.id}`);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "USERNAME_TAKEN") {
        setErrors({ username: t("errorTaken") });
        return;
      }
      if (code === "DUPLICATE_CONTACT" || code === "DUPLICATE_SUPPLIER") {
        setFormError(t("errorDuplicate"));
        return;
      }
      setFormError(t("errorStorage"));
    }
  };

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Button asChild variant="outline" className="bg-linen/60 rounded-field">
            <Link href={`/${locale}/admin/users`}>{tc("back")}</Link>
          </Button>
        }
      />
      <AdminOnlyNote className="mb-4" />

      <GlassPanel tier="g2" className="p-5 sm:p-6">
        <form onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          <FormRow label={t("name")} htmlFor="user-name" required error={errors.name}>
            <Input id="user-name" value={name} onChange={(event) => setName(event.target.value)} className="bg-linen/80 h-10 rounded-field" />
          </FormRow>
          <FormRow label={t("username")} htmlFor="user-username" required error={errors.username}>
            <Input id="user-username" value={username} onChange={(event) => setUsername(event.target.value)} className="bg-linen/80 h-10 rounded-field" autoComplete="off" />
          </FormRow>
          <FormRow label={t("email")} htmlFor="user-email" required error={errors.email}>
            <Input id="user-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="bg-linen/80 h-10 rounded-field" />
          </FormRow>
          <FormRow label={t("phone")} htmlFor="user-phone" required error={errors.phone}>
            <Input id="user-phone" inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value)} className="bg-linen/80 h-10 rounded-field" />
          </FormRow>
          <FormRow label={t("role")} htmlFor="user-role" required>
            <Select
              value={role}
              onValueChange={(value) => {
                setRole(value as (typeof roles)[number]);
                setErrors({});
              }}
            >
              <SelectTrigger id="user-role" className="bg-linen/80 h-10 w-full rounded-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((option) => (
                  <SelectItem key={option} value={option}>
                    {tr(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
          {supplierRole ? (
            <FormRow label={t("type")} htmlFor="user-type" required error={errors.type}>
              <Select value={type || undefined} onValueChange={(value) => setType(value as SupplierType)}>
                <SelectTrigger id="user-type" className="bg-linen/80 h-10 w-full rounded-field">
                  <SelectValue placeholder={t("type")} />
                </SelectTrigger>
                <SelectContent>
                  {supplierTypes.map((option) => (
                    <SelectItem key={option} value={option}>
                      {tt(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
          ) : (
            <FormRow label={t("status")} htmlFor="user-status" hint={t("staffStatusNote")}>
              <Select value={status} onValueChange={(value) => setStatus(value as "active" | "pending")}>
                <SelectTrigger id="user-status" className="bg-linen/80 h-10 w-full rounded-field">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <AccountStatusBadge status="active" />
                  </SelectItem>
                  <SelectItem value="pending">
                    <AccountStatusBadge status="pending" />
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
          )}
          <div className="sm:col-span-2">
            <GeoSelect
              aimag={aimag}
              soum={soum}
              onAimagChange={(value) => {
                setAimag(value);
                setSoum(null);
              }}
              onSoumChange={setSoum}
              aimagError={errors.aimag}
              soumError={errors.soum}
              labels={{
                aimag: t("aimag"),
                soum: t("soum"),
                aimagPlaceholder: t("aimagPlaceholder"),
                soumPlaceholder: t("soumPlaceholder"),
                soumNone: t("soumNone"),
              }}
            />
          </div>
          {supplierRole ? (
            <p className="text-ink-500 sm:col-span-2 text-xs leading-relaxed">
              {t("supplierStatusNote")} <AccountStatusBadge status="active" />
            </p>
          ) : null}
          <DemoNote className="sm:col-span-2">{t("passwordNote")}</DemoNote>
          {formError ? (
            <p role="alert" className="text-terracotta-700 sm:col-span-2 text-sm">
              {formError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" className="rounded-field font-semibold">
              {t("submit")}
            </Button>
            <Button asChild type="button" variant="outline" className="bg-linen/60 rounded-field">
              <Link href={`/${locale}/admin/users`}>{tc("cancel")}</Link>
            </Button>
          </div>
        </form>
      </GlassPanel>
    </>
  );
}
