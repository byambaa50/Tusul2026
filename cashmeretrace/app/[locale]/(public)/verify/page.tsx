import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { VerifyLookup } from "@/components/domain/verify/verify-page";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "verify" });
  return { title: `${t("metaTitle")} — CashmereTrace`, description: t("metaDescription") };
}

/** Public QR lookup (UC-13). Anonymous; no app shell. */
export default async function VerifyLookupPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <VerifyLookup />;
}
