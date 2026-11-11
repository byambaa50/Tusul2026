import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import BatchQuality from "@/components/domain/uc03-quality/batch-quality";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "supplier.quality" });
  return { title: `${t("title")} — CashmereTrace`, description: t("onlyOwn") };
}

/** Багцын чанарын мэдээлэл — UC-03 (FR-1.5): өөрийн багц → дэлгэрэнгүй диалог. */
export default async function SupplierQualityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <BatchQuality />;
}
