import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import ManagementReports from "@/components/domain/management/management-reports";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "management.reports" });
  return { title: `${t("title")} — CashmereTrace`, description: t("subtitle") };
}

/** UC-11 — report generation and download list. */
export default async function ManagementReportsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ManagementReports />;
}
