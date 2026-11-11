import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import StatusCheck from "@/components/domain/uc10-auth/status-check";
import { asLocale } from "@/lib/i18n/config";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.statusCheck" });
  return { title: `${t("title")} — CashmereTrace`, description: t("subtitle") };
}

/** Бүртгэлийн төлөв шалгах — UC-10 E3 / BR-12 (public, no session). */
export default async function StatusPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <StatusCheck locale={asLocale(locale)} />;
}
