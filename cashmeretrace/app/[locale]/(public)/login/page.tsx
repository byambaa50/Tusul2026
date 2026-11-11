import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import LoginForm from "@/components/domain/uc10-auth/login-form";
import { asLocale } from "@/lib/i18n/config";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: `${t("title")} — CashmereTrace`, description: t("subtitle") };
}

/** НэвтрэхХуудас — UC-10 (Phase 1: mock UI). */
export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LoginForm locale={asLocale(locale)} />;
}
