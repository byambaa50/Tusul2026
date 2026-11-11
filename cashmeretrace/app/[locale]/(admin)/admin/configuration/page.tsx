import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import AdminSettingsPage from "@/components/domain/admin/admin-settings";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.settings" });
  return { title: `${t("title")} — CashmereTrace`, description: t("subtitle") };
}

/** UC-12 — documented system settings. No database connection. */
export default async function AdminConfigurationPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminSettingsPage />;
}
