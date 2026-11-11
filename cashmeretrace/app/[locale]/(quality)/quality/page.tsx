import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import QualityDashboard from "@/components/domain/quality/quality-dashboard";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "quality.dashboard" });
  return { title: `${t("title")} — CashmereTrace`, description: t("subtitle") };
}

/** UC-07…UC-09 — quality officer dashboard and workflow entry points. */
export default async function QualityHome({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <QualityDashboard />;
}
