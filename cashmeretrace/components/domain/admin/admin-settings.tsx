"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import DemoNote from "@/components/domain/shared/demo-note";
import FormRow from "@/components/domain/shared/form-row";
import PageHeader from "@/components/domain/shared/page-header";
import { AdminOnlyNote, AdminPageSkeleton, AdminSection } from "@/components/domain/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format/mn";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { saveAdminSettings, useAdminSettings } from "@/lib/mock/admin";

export default function AdminSettingsPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <AdminPageSkeleton />;
  return <AdminSettingsContent />;
}

function AdminSettingsContent() {
  const t = useTranslations("admin.settings");
  const tc = useTranslations("admin.common");
  const settings = useAdminSettings();
  const [value, setValue] = useState(String(settings.maxFailedLoginAttempts));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
      setError(t("attemptsError"));
      setNotice(null);
      return;
    }
    setError(null);
    try {
      const next = saveAdminSettings(parsed);
      setNotice(
        next.maxFailedLoginAttempts === settings.maxFailedLoginAttempts &&
          next.updatedAt === settings.updatedAt
          ? t("unchanged")
          : t("saved"),
      );
    } catch {
      setNotice(null);
      setError(tc("storageError"));
    }
  };

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <AdminOnlyNote className="mb-4" />

      <AdminSection title={t("attemptsTitle")}>
        <form onSubmit={handleSubmit} className="max-w-sm">
          <FormRow
            label={t("attemptsLabel")}
            htmlFor="failed-attempts"
            hint={t("attemptsHint")}
            error={error}
          >
            <Input
              id="failed-attempts"
              inputMode="numeric"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError(null);
                setNotice(null);
              }}
              className="bg-linen/80 h-10 rounded-field"
            />
          </FormRow>
          <p className="text-ink-500 mb-3 text-xs">
            {settings.updatedAt && settings.updatedBy
              ? t("updated", {
                  name: settings.updatedBy,
                  date: formatDateTime(settings.updatedAt),
                })
              : t("neverUpdated")}
          </p>
          {notice ? <p className="text-forest-800 mb-3 text-sm">{notice}</p> : null}
          <Button type="submit" className="rounded-field font-semibold">
            {t("save")}
          </Button>
        </form>
      </AdminSection>

      <AdminSection className="mt-4" title={t("referenceTitle")} description={t("referenceDescription")}>
        <ul className="text-ink-700 flex list-disc flex-col gap-2 pl-4 text-sm leading-relaxed">
          <li>{t("session")}</li>
          <li>{t("lockDuration")}</li>
          <li>{t("retention")}</li>
        </ul>
      </AdminSection>
      <DemoNote className="mt-4">{tc("demoNote")}</DemoNote>
    </>
  );
}
