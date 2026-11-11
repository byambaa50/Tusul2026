import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import ManagementDashboard from "@/components/domain/management/management-dashboard";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "management.dashboard" });
  return { title: `${t("title")} — CashmereTrace`, description: t("subtitle") };
}

/** UC-11 — read-only management analytics dashboard. */
export default async function ManagementHome({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ManagementDashboard />;
}
