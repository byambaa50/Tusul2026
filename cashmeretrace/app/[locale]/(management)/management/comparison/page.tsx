import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import ManagementComparison from "@/components/domain/management/management-comparison";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "management.comparison" });
  return { title: `${t("title")} — CashmereTrace`, description: t("subtitle") };
}

/** UC-11 — aimag/soum comparison. */
export default async function ManagementComparisonPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ManagementComparison />;
}
