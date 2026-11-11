import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import BatchList from "@/components/domain/clerk/batch-list";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "clerk.batch" });
  return { title: `${t("listTitle")} — CashmereTrace`, description: t("listSubtitle") };
}

/** UC-05/UC-07 — batch registry list. */
export default async function ClerkBatchesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <BatchList />;
}
