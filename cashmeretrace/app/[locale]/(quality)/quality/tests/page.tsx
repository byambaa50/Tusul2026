import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import QualityHistory from "@/components/domain/quality/quality-history";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "quality.history" });
  return { title: `${t("title")} — CashmereTrace`, description: t("subtitle") };
}

/** UC-08 — global insert-only quality result history. */
export default async function QualityTestsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <QualityHistory />;
}
