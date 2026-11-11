import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import QualityPublishIndex from "@/components/domain/quality/quality-publish-index";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "quality.publish" });
  return { title: `${t("indexTitle")} — CashmereTrace`, description: t("indexSubtitle") };
}

/** UC-09 — per-batch QR publish configuration index. */
export default async function QualityPublishPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <QualityPublishIndex />;
}
